import { test as base, expect } from '@playwright/test';

type W = { catalogSnapshot: { count: number } };
type T = { consoleErrors: string[]; addToCart: (name: string) => Promise<void> };

const test = base.extend<T, W>({
  // fetched once per worker
  catalogSnapshot: [async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL ?? 'http://localhost:4173' });
    const { total } = await (await ctx.get('/api/shop/products')).json();
    await ctx.dispose();
    await use({ count: total });
  }, { scope: 'worker' }],
  // auto fixture: fails any test that logs console errors
  consoleErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await use(errors);
    expect(errors, 'unexpected page errors').toEqual([]);
  }, { auto: true }],
  addToCart: async ({ page }, use) => {
    await use(async (name) => {
      await page.getByTestId('product-card').filter({ hasText: name }).getByRole('button', { name: 'Add to cart' }).click();
    });
  },
});

test('grid shows the same number of products as the API', async ({ page, catalogSnapshot }) => {
  await page.goto('/shop/index.html');
  await expect(page.getByTestId('product-card')).toHaveCount(catalogSnapshot.count);
});

test('helper fixture adds to cart', async ({ page, addToCart }) => {
  await page.goto('/shop/index.html');
  await addToCart('Wool Hiking Socks');
  await addToCart('Wool Hiking Socks');
  await expect(page.getByTestId('cart-count')).toHaveText('2');
});
