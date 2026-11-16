import { defineConfig, devices } from '@playwright/test';

const PUERTO = 3200;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PUERTO}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npm run build && npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: true,
    timeout: 300_000,
    env: { WINAPAY_LIMITE_ENVIOS: '1000', WINAPAY_DATA_DIR: '.data-test' },
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testIgnore: /offline/ },
    { name: 'movil', use: { ...devices['Pixel 7'] }, testIgnore: /offline/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /paginas|mapa|landing/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: /paginas|mapa|landing/ },
    { name: 'offline', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testMatch: /offline/ },
  ],
});
