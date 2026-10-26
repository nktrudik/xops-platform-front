# Classic Premium UI — проверка и воспроизведение

Работа выполнена в `feature/classic-premium-ui` от классической `origin/main`
(`8b8d2b0`; актуальность проверена через fetch). Код XOps Signal не переносился.
Изменения подготовлены локально; коммит, push, PR/MR, merge и deploy не выполнялись.

## Изменения

- `ClassicHero.vue`: компактная композиция, встроенный поиск, однократное появление,
  клавиша `/` для поиска и Escape для очистки.
- `LiquidRibbon.vue` и `useRibbonMotion.ts`: отдельная область для ленты на desktop
  и mobile; остановка декоративного движения при недоступном WebGL.
  Существующие геометрия, шейдеры и управление рендерингом сохранены.
- `CopilotCard.vue`: новая структура, статусы, формат, полезное пояснение способа
  открытия, hover/press/focus, общий декоративный мотив. Названия и описания приходят из API.
- `CatalogView.vue`: фильтры по существующим форматам, счётчики из API, две колонки
  при двух карточках, ограниченная ширина одной карточки, три колонки для большого
  каталога. TransitionGroup анимирует добавление, удаление и перемещение.
- `CatalogState.vue`: skeleton, пустой каталог, нулевой результат, ошибка и повтор.
- `use-catalog-query.ts`: поиск и формат сохраняются в URL. Router сохраняет
  прокрутку при смене только query-параметров.
- `AppHeader.vue`, общие стили: компактная навигация, пользователь, выход,
  видимый фокус, единые цвета, интервалы, радиусы и длительности переходов.
- `src/assets/fonts/`: только пять используемых WOFF2. Они разрешены в Git
  и Docker-контексте, подключены через Vite и имеют хешированные имена в сборке.
  `mts_shrift/` и гайды остаются исключёнными. Nginx не менялся:
  используется существующая раздача `/assets/`.

## Направление дизайна

Задача экрана — найти подходящий Copilot и открыть его существующий интерфейс.
Основное действие — поиск и переход к результату. Обязательные состояния:
loading, empty, error, unavailable, coming soon, focus, hover и press.
При двух элементах используется весь ряд, при одном — половина desktop-сетки,
на телефоне — одна колонка и отдельная область для Ribbon.

Применены принципы иерархии и умеренной плотности из
[Linear](https://linear.app/now/behind-the-latest-design-refresh),
клавиатурного управления и движения из
[Vercel](https://vercel.com/design/guidelines),
сдержанной глубины поверхностей из
[Atlassian](https://atlassian.design/foundations/elevation).
Сохранены фирменные MTS Text / MTS Extended и красный `#E30611`.
Новых зависимостей приложения и фиктивных продуктовых данных нет.

## Результаты

На 1440×900:

| Метрика                            | До       | После    |
| ---------------------------------- | -------- | -------- |
| Высота hero                        | 423.6 px | 372.2 px |
| Начало первой карточки             | 712.6 px | 647.2 px |
| Ширина карточки при двух элементах | 437.3 px | 654.5 px |
| Высота карточки                    | 290 px   | 252 px   |
| Полностью видимая первая строка    | Нет      | Да       |

Playwright проверил 1920×1080, 1440×900, 1366×768, 1280×720, 1024×768,
390×844; дополнительно — длинный контент при ширине 320 и 768 px.
Проверены каталоги на 0, 1, 2, 6, 12 и 30 элементов.

97 отдельных проверок Playwright прошли: 60 для новой компоновки и состояний,
32 для существующих сценариев и жизненного цикла анимации,
4 для клавиатуры/axe и 1 для записи движения. Повторные прогоны в это число не включены.

Подтверждены поиск по названию/описанию, комбинация с форматами, восстановление
URL, быстрое изменение запроса, автообновление каталога, чат, отправка сообщений,
сохранение истории, Embedded UI, внешние ссылки, повтор после ошибок,
pause/resume, reduced motion, отсутствие WebGL, потеря/восстановление контекста,
остановка рендеринга при скрытии вкладки, уходе из viewport и смене маршрута.

Измерения локального Chrome: рендер Ribbon около 60 Hz на desktop и 30 Hz
в touch-эмуляции, на паузе — 0. Long tasks в измеренных интервалах не обнаружены.
Завершение поиска с учётом анимации — около 361–375 ms.
Это локальные измерения, не проверка физического мобильного устройства.

axe-core 4.14.0: 0 автоматических нарушений WCAG в каталоге и нулевом результате
на desktop/mobile. Некоторые проверки контраста помечены движком как требующие
ручной оценки из-за перекрывающихся декоративных слоёв; текст и состояния фокуса
проверены визуально. Это не заявление о полной сертификации WCAG.

| Проверка                                    | Результат                                                  |
| ------------------------------------------- | ---------------------------------------------------------- |
| Frontend ESLint                             | Пройдено                                                   |
| Prettier изменённых и новых frontend-файлов | Пройдено                                                   |
| TypeScript / vue-tsc                        | Пройдено                                                   |
| Vitest                                      | 34 passed                                                  |
| Production build                            | Пройдено                                                   |
| Сборка с base path `/review/platform-xops/` | Пройдено                                                   |
| FontFaceSet + Network в production preview  | 5 шрифтов загружены, HTTP 200, корректный MIME и base path |
| Backend Mypy                                | Пройдено, 20 файлов                                        |
| Backend Bandit                              | Замечаний нет                                              |
| Backend Pytest                              | 69 passed, 7 skipped                                       |
| Git diff --check                            | Пройдено                                                   |

## Ограничения и существующие проблемы

- Браузерные тесты запускают настоящее Vue-приложение и WebGL, но используют
  существующие контрактные API-фикстуры. Live backend и production не подключались.
- Общий `npm run check` останавливается на Prettier в 11 нетронутых файлах:
  `package.json`, `playwright.classic.config.ts`, `ChatPanel.vue`,
  `liquid-ribbon/renderer.ts`, `liquid-ribbon/shaders.ts`, `CopilotView.vue`,
  четырёх `classic-*.spec.ts` и `tsconfig.json`.
  Несвязанные файлы не форматировались.
- `npm run security`: одна high-уязвимость в существующем `undici@7.30.0`,
  транзитивной dev-зависимости `jsdom`. Зависимости и lockfile не изменены.
  Подробности: [EventSource](https://github.com/advisories/GHSA-4qv8-2p9j-2685),
  [SRI](https://github.com/advisories/GHSA-f72v-6w45-q472),
  [content-encodings](https://github.com/advisories/GHSA-xjj6-f33q-929c).
- Backend Ruff: 8 существующих E501 в комментариях/docstrings; format check
  отмечает `app/main.py` и `app/settings.py`. Backend не редактировался.
- Семь backend-тестов с PostgreSQL пропущены из-за отсутствия тестовой БД.
- Docker daemon недоступен. Production-образ не запускался; проверены состав
  Vite-сборки, исключение в Docker-контексте и существующий маршрут Nginx.

## Артефакты

Локальный каталог `.artifacts/classic-premium/` исключён из Git:

- `index.html` — галерея сравнения до/после и видео.
- `before/`, `after/` — viewport и full-page PNG для шести разрешений, JSON геометрии.
- `states/<resolution>/` — 0/1/2/6/12/30 элементов, loading, error, availability.
- `motion/classic-premium.mp4` — запись реальных браузерных кадров (~7.6 s).
- `motion/01-entrance.png` … `09-embedded.png` — последовательность взаимодействий.
- `accessibility/` — полные результаты axe.
- `production-fonts.json` и `production-base-path.png` — проверка production preview.
- `../liquid-ribbon/performance/1440x900.json` и `390x844.json` — измерения рендеринга.

## Повторный запуск

Из `frontend`, с установленными зависимостями и Google Chrome:

```powershell
npm.cmd run lint
npm.cmd run type-check
npm.cmd test
npm.cmd run build
npm.cmd exec playwright -- test 'premium.spec.ts$' 'premium-catalog.spec.ts$' --config playwright.premium.config.ts
npm.cmd exec playwright -- test tests/e2e/platform.spec.ts tests/e2e/catalog.spec.ts tests/e2e/classic-lifecycle.spec.ts tests/e2e/classic-performance.spec.ts --config playwright.premium.config.ts --project 1440x900 --project 390x844
npm.cmd exec playwright -- test 'premium-accessibility.spec.ts$' --config playwright.premium.config.ts --project 1440x900 --project 390x844
npm.cmd exec playwright -- test 'premium-motion.spec.ts$' --config playwright.premium.config.ts --project 1440x900 --workers 1
```

Для axe-аудита установите `AXE_SOURCE` в путь к локальному browser bundle
axe-core; без него пропускается только независимый axe scan. Пакет для проверки
сохранён в `.artifacts/classic-premium/qa-tools/axe.min.js` и не входит в приложение.

```powershell
$env:AXE_SOURCE = '../.artifacts/classic-premium/qa-tools/axe.min.js'
npm.cmd exec playwright -- test 'premium-accessibility.spec.ts$' --config playwright.premium.config.ts --project 1440x900 --project 390x844
```

Запись использует CDP screencast. Для MP4 нужен локальный FFmpeg:

```powershell
ffmpeg -y -f concat -safe 0 -i ../.artifacts/classic-premium/motion/frames.ffconcat -vf fps=30 -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart ../.artifacts/classic-premium/motion/classic-premium.mp4
```
