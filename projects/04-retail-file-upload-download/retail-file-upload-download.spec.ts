import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test('import a CSV from memory and see the result', async ({ page }) => {
  await page.goto('/retail/inventory.html?store=BER-01&delayMs=0');
  await page.getByTestId('import-file').setInputFiles({
    name: 'berlin-count.csv', mimeType: 'text/csv',
    buffer: Buffer.from('storeId,sku,onHand\nBER-01,RT-200,33\nBER-01,RT-201,abc\nBER-01,RT-999,4\n'),
  });
  await expect(page.getByTestId('import-result')).toHaveText('Imported berlin-count.csv: 1 row(s) updated, 2 rejected.');
  await expect(page.getByTestId('import-error')).toHaveText(['Line 3: Invalid quantity "abc"', 'Line 4: Unknown store/SKU BER-01/RT-999']);
  await expect(page.locator('[data-sku="RT-200"]').getByTestId('on-hand')).toHaveText('33');
});

test('wrong header is rejected', async ({ page }) => {
  await page.goto('/retail/inventory.html?delayMs=0');
  await page.getByTestId('import-file').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('sku;qty\nRT-100;1') });
  await expect(page.getByTestId('import-result')).toHaveText('Import failed: expected header "storeId,sku,onHand"');
});

test('export downloads the current store as CSV', async ({ page }) => {
  await page.goto('/retail/inventory.html?store=STR-01&delayMs=0');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);
  expect(download.suggestedFilename()).toBe('inventory-STR-01.csv');
  const lines = (await readFile(await download.path(), 'utf8')).trim().split('\n');
  expect(lines[0]).toBe('storeId,sku,name,onHand,reorderPoint');
  expect(lines.slice(1).every((l) => l.startsWith('STR-01,'))).toBe(true);
});
