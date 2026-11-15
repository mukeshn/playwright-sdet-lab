import { test, expect } from '@playwright/test';

test('renders a stubbed catalog', async ({ page }) => {
  await page.route('**/api/shop/products**', (route) => route.fulfill({ json: { total: 1, page: 1, size: 50, items: [
    { id: 1, sku: 'SKU-0001', name: 'Mocked Boot', category: 'Footwear', price: 1, stock: 1, rating: 5, sizes: ['42'], description: '' } ] } }));
  await page.goto('/shop/index.html');
  await expect(page.getByTestId('product-card')).toHaveCount(1);
  await expect(page.getByTestId('product-name')).toHaveText('Mocked Boot');
});

test('empty state when the API returns nothing', async ({ page }) => {
  await page.route('**/api/shop/products**', (route) => route.fulfill({ json: { total: 0, page: 1, size: 50, items: [] } }));
  await page.goto('/shop/index.html');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('modify a real response: everything out of stock', async ({ page }) => {
  await page.route('**/api/shop/products**', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.items = body.items.map((p: { stock: number }) => ({ ...p, stock: 0 }));
    await route.fulfill({ response, json: body });
  });
  await page.goto('/shop/index.html');
  await expect(page.getByTestId('add-to-cart').first()).toBeDisabled();
  await expect(page.getByTestId('stock').first()).toHaveText('Out of stock');
});

test('search debounces to a single request', async ({ page }) => {
  await page.goto('/shop/index.html');
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  const calls: string[] = [];
  page.on('request', (r) => r.url().includes('q=') && calls.push(r.url()));
  await page.getByTestId('search').pressSequentially('merino', { delay: 30 });
  await page.waitForResponse((r) => r.url().includes('q=merino'));
  expect(calls).toHaveLength(1);
});
