import { test, expect } from '@playwright/test';

test('calculator in a frame (standalone page wrapped in iframe)', async ({ page }) => {
  await page.setContent('<iframe title="Quote Calculator" name="vf" src="/crm/vf/quote.html?amount=250"></iframe>');
  const vf = page.frameLocator('iframe[title="Quote Calculator"]');
  await vf.getByLabel('Quantity').fill('4');
  await vf.getByLabel('Discount (%)').fill('25');
  await vf.getByRole('button', { name: 'Calculate' }).click();
  await expect(vf.locator('[id="j_id0:quoteForm:netTotal"]')).toHaveText('750,00 €');
});

test.use({ baseURL: process.env.BASE_URL ?? 'http://localhost:4173' });
test('frame object API', async ({ page, baseURL }) => {
  await page.goto(baseURL + '/crm/login.html');
  await page.evaluate(() => { const f = document.createElement('iframe'); f.name = 'vf'; f.src = '/crm/vf/quote.html?amount=10'; document.body.append(f); });
  await expect.poll(() => page.frame({ name: 'vf' })?.url()).toContain('quote.html');
  const frame = page.frame({ name: 'vf' })!;
  await frame.getByRole('button', { name: 'Calculate' }).click();
  await expect(frame.locator('[id="j_id0:quoteForm:netTotal"]')).toHaveText('10,00 €');
});
