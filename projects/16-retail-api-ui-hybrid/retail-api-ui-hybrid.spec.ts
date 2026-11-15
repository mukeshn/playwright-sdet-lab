import { test, expect } from '@playwright/test';

test('click & collect order created via API is handed over in the store UI', async ({ page, request }) => {
  const res = await request.post('/api/retail/click-collect', { data: { storeId: 'MUC-01', customerName: 'Hybrid Test', email: 'hybrid@example.com', lines: [{ sku: 'RT-300', quantity: 1 }] } });
  expect(res.status()).toBe(201);
  const order = await res.json();

  await page.goto(`/retail/orders.html?order=${order.id}`);
  await expect(page.getByTestId('panel-status')).toHaveText('RESERVED');
  await expect(page.getByTestId('panel-line')).toHaveText(['1 × RT-300']);

  await page.getByLabel('Pickup code').fill('000000');
  await page.getByRole('button', { name: 'Hand over' }).click();
  await expect(page.getByTestId('pickup-result')).toHaveText('Pickup code does not match.');

  await page.getByLabel('Pickup code').fill(order.pickupCode);
  await page.getByRole('button', { name: 'Hand over' }).click();
  await expect(page.getByTestId('panel-status')).toHaveText('COLLECTED');

  const after = await (await request.get(`/api/retail/click-collect/${order.id}`)).json();
  expect(after.status).toBe('COLLECTED');
});

test('reservation reduces the on-hand stock shown in the UI', async ({ page, request }) => {
  const before = (await (await request.get('/api/retail/inventory', { params: { store: 'HAM-01', sku: 'RT-600' } })).json()).items[0].onHand;
  test.skip(before < 1, 'needs stock');
  await request.post('/api/retail/click-collect', { data: { storeId: 'HAM-01', customerName: 'Stock Check', email: 's@example.com', lines: [{ sku: 'RT-600', quantity: 1 }] } });
  await page.goto('/retail/inventory.html?store=HAM-01&delayMs=0');
  await expect(page.locator('[data-sku="RT-600"]').getByTestId('on-hand')).toHaveText(String(before - 1));
});
