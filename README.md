# ResoScan

Room resonance measurement tool using Web Audio API.

- **Sweep range:** 20 Hz – 15,000 Hz
- **Assumes external speakers** (not built-in laptop speakers)
- Requests raw mic input (`echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: false`) and displays the actual settings the browser applied

## Run locally

```bash
git clone https://github.com/your-username/resoscan.git
cd resoscan
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run dev`        | Start dev server             |
| `npm run build`      | Type-check + production build|
| `npm run lint`       | ESLint                       |
| `npm run typecheck`  | TypeScript type check        |
| `npm test`           | Run unit tests (Vitest)      |
| `npm run format`     | Format with Prettier         |

## Manual test checklist — Audio setup

Use this checklist when verifying the audio setup screen on a real browser (Chrome recommended).

- [ ] Open `http://localhost:5173`, click **Start measurement** — you should see the "Audio setup" screen
- [ ] Click **Grant microphone access** — the browser mic permission dialog appears
- [ ] **Grant** permission — you see:
  - A green "Microphone permission granted" badge
  - A device selector populated with your microphone(s)
  - A settings table showing sample rate, channels, echo cancellation, noise suppression, auto gain control
- [ ] Verify sample rate shows (typically 48 kHz on macOS)
- [ ] Verify echo cancellation, noise suppression, and auto gain control all show **false** (green). If any show "true (browser override!)" in red — that's the browser overriding our request; note which browser/OS
- [ ] If multiple mics are available, switch device in the dropdown — settings table updates
- [ ] **Deny** permission (revoke in browser settings and retry) — you see a red error: "Microphone permission was denied."
- [ ] Test on Chrome macOS with MacBook built-in mic — should work end to end

## Tech stack

- Vite + React + TypeScript
- Web Audio API
- Vitest + Testing Library
- ESLint + Prettier
- GitHub Actions CI

## License

[MIT](LICENSE)
# resoscan
