# For developers

## Run locally

```bash
git clone https://github.com/robotaitai/resoscan.git
cd resoscan
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command             | What it does                  |
| ------------------- | ----------------------------- |
| `npm run dev`       | Dev server                    |
| `npm run build`     | Type-check + production build |
| `npm test`          | Unit tests (Vitest)           |
| `npm run lint`      | ESLint                        |
| `npm run typecheck` | TypeScript check              |
| `npm run format`    | Prettier                      |
| `npm run test:e2e`  | Playwright smoke tests        |

## Tech

Vite + React + TypeScript · Web Audio API · Pure TS DSP (FFT, convolution, deconvolution) · Vitest + Playwright · ESLint + Prettier · GitHub Actions CI/CD · Optional Electron wrapper

## License

[MIT](../LICENSE)
