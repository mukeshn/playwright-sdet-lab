import { test, expect } from '@playwright/test';

const cases = [
  { locale: 'de-DE', timezoneId: 'Europe/Berlin', price: '59,95 €' },
  { locale: 'fr-FR', timezoneId: 'Europe/Paris', price: '59,95 €' },
  { locale: 'en-IE', timezoneId: 'Europe/Dublin', price: '€59.95' },
  { locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', price: '€ 59,95' },
];

for (const c of cases) {
  test.describe(c.locale, () => {
    test.use({ locale: c.locale, timezoneId: c.timezoneId });

    test('prices follow the browser locale', async ({ page }) => {
      await page.goto('/retail/inventory.html?store=AUG-01&delayMs=0');
      const cell = page.locator('[data-sku="RT-100"] td').nth(2);
      await expect(cell).toHaveText(c.price.replace(/ /g, '\u00a0'));
    });

    test('local time shows the emulated zone', async ({ page }) => {
      await page.goto('/retail/stores.html');
      const tz = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
      expect(tz).toBe(c.timezoneId);
      await expect(page.getByTestId('local-time')).not.toBeEmpty();
    });
  });
}
