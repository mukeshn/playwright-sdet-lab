import { test, expect, devices } from '@playwright/test';

for (const name of ['iPhone 14', 'Pixel 7', 'Galaxy S9+'] as const) {
  test.describe(name, () => {
    const { defaultBrowserType, ...device } = devices[name];
    void defaultBrowserType;
    test.use({ ...device, channel: 'chrome' } as never);

    test('navigation collapses into the menu button', async ({ page }) => {
      await page.goto('/shop/index.html');
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
      await expect(page.getByTestId('menu-toggle')).toBeVisible();
    });

    test('product grid becomes a single column', async ({ page }) => {
      await page.goto('/shop/index.html');
      const cards = page.getByTestId('product-card');
      await expect(cards.first()).toBeVisible();
      const [a, b] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
      expect(b!.y).toBeGreaterThan(a!.y);
      expect(Math.abs(b!.x - a!.x)).toBeLessThan(2);
    });
  });
}
