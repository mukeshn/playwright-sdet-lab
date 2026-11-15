import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SUT_PORT ?? 4173);
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

// Every folder under projects/ is a Playwright project, so each technique runs on its own:
//   npx playwright test --project=02-ecommerce-network-mocking
export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]] : [['list'], ['html', { open: 'never' }]],
  use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL, testIdAttribute: 'data-testid', trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'en-GB', timezoneId: 'Europe/Berlin' },
  projects: [
    { name: '01-retail-geolocation', testDir: './projects/01-retail-geolocation' },
{ name: '02-ecommerce-network-mocking', testDir: './projects/02-ecommerce-network-mocking' },
{ name: '03-ecommerce-accessibility', testDir: './projects/03-ecommerce-accessibility' },
{ name: '04-retail-file-upload-download', testDir: './projects/04-retail-file-upload-download' },
{ name: '05-banking-auth-setup-project', testDir: './projects/05-banking-auth-setup-project' },
{ name: '06-banking-popups-new-tabs', testDir: './projects/06-banking-popups-new-tabs' },
{ name: '07-salesforce-shadow-dom', testDir: './projects/07-salesforce-shadow-dom' },
{ name: '08-salesforce-iframe-frames', testDir: './projects/08-salesforce-iframe-frames' },
{ name: '09-sap-fiori-tables', testDir: './projects/09-sap-fiori-tables' },
{ name: '10-sap-odata-request-assertions', testDir: './projects/10-sap-odata-request-assertions' },
{ name: '11-ecommerce-data-driven-markets', testDir: './projects/11-ecommerce-data-driven-markets' },
{ name: '12-retail-i18n-locale-timezone', testDir: './projects/12-retail-i18n-locale-timezone' },
{ name: '13-ecommerce-mobile-devices', testDir: './projects/13-ecommerce-mobile-devices' },
{ name: '14-banking-clock-api', testDir: './projects/14-banking-clock-api' },
{ name: '15-ecommerce-custom-fixtures-reporter', testDir: './projects/15-ecommerce-custom-fixtures-reporter' },
{ name: '16-retail-api-ui-hybrid', testDir: './projects/16-retail-api-ui-hybrid' },
  ],
  webServer: process.env.BASE_URL ? undefined : { command: 'node sut/server.mjs', url: `${baseURL}/health`, reuseExistingServer: !isCI, env: { SUT_PORT: String(PORT) } },
});
