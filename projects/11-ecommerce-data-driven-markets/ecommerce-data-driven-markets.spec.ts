import { test, expect } from '@playwright/test';
import markets from './markets.json' with { type: 'json' };

for (const m of markets) {
  test(`${m.country}: VAT ${m.vat}% and free shipping`, async ({ page }) => {
    await page.goto('/shop/index.html');
    await page.evaluate(() => localStorage.setItem('summit.cart', JSON.stringify([{ productId: 1, size: '42', quantity: 1 }])));
    await page.goto('/shop/cart.html');
    const pricing = page.waitForResponse('**/api/shop/pricing');
    await page.getByLabel('Ship to').selectOption(m.country);
    await pricing;
    await expect.soft(page.getByTestId('vat-rate')).toHaveText(String(m.vat));
    await expect.soft(page.getByTestId('shipping')).toHaveText('Free');
    await expect(page.getByTestId('total')).toHaveAttribute('data-value', String(+(139 * (1 + m.vat / 100)).toFixed(2)));
  });
}
