import { expect, test } from '@playwright/test'
import { apiCopilots } from '../fixtures'
import { installHistoryApi } from '../history-fixture'

const fonts = [
  { file: 'MTSText-Regular', family: 'MTS Text', weight: 400 },
  { file: 'MTSText-Medium', family: 'MTS Text', weight: 500 },
  { file: 'MTSText-Bold', family: 'MTS Text', weight: 700 },
  { file: 'MTSExtended-Medium', family: 'MTS Extended', weight: 500 },
  { file: 'MTSExtended-Bold', family: 'MTS Extended', weight: 700 },
]

test('все используемые шрифты поставляются как WOFF2 и загружаются браузером', async ({
  page,
  baseURL,
}) => {
  await installHistoryApi(page)
  await page.route('**/api/copilots', (route) => route.fulfill({ json: apiCopilots }))
  await page.goto('./')
  for (const font of fonts) {
    const url = new URL(`brand-fonts/${font.file}.woff2`, `${baseURL!.replace(/\/$/, '')}/`)
    const response = await page.request.get(url.href)
    expect(response.status(), font.file).toBe(200)
    expect(response.headers()['content-type']).toMatch(
      /font\/woff2|application\/(?:font-woff2|octet-stream)/,
    )
    expect((await response.body()).subarray(0, 4).toString()).toBe('wOF2')
    expect(
      await page.evaluate(async ({ family, weight }) => {
        const faces = await document.fonts.load(`${weight} 16px "${family}"`)
        return faces.some(
          (face) =>
            face.family === family && face.weight === String(weight) && face.status === 'loaded',
        )
      }, font),
      font.file,
    ).toBe(true)
  }
})
