# Classic hero visual checks

Run from `frontend` with the existing npm dependencies and installed Google Chrome:

```powershell
npx.cmd playwright test --config playwright.classic.config.ts
```

The review server uses port 5175. Tests intercept API responses using the existing
test fixtures; the application continues to use its normal API and authentication.
The test server uses the five application fonts in `src/assets/fonts/`, just like
the production build. It does not substitute files from the ignored source collection.

Screenshots, layout measurements and performance samples are written under
`.artifacts/liquid-ribbon/`. Projects cover 1440×900, 1920×1080 and touch 390×844.
Performance samples compare animated and paused states in the same Chrome session;
mobile is viewport/touch emulation, not a physical phone measurement.

To record actual browser frames for a 10.5-second interaction:

```powershell
$env:CLASSIC_RECORD='1'
npx.cmd playwright test --config playwright.classic.config.ts classic-recording.spec.ts --project 1440 --workers 1
Remove-Item Env:CLASSIC_RECORD
```

The recording covers idle motion, pointer interaction, search and clearing search.
A recording-only cursor marker follows pointer events because Chrome CDP omits the
OS cursor. Encode the captured frames using an existing FFmpeg installation:

```powershell
ffmpeg -y -f concat -safe 0 -i ../.artifacts/liquid-ribbon/video/frames.ffconcat -vf fps=30 -t 10.5 -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart ../.artifacts/liquid-ribbon/mts-liquid-ribbon.mp4
```

No recording tools, test fixtures or review-server configuration enter
the production bundle.
