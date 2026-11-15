import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
  const { challengeId } = await (await request.post('/api/bank/auth/login', { data: { username: 'm.weber', password: 'Demo#2026' } })).json();
  const { accessToken } = await (await request.post('/api/bank/auth/otp', { data: { challengeId, otp: '246810' } })).json();
  await page.addInitScript((t) => sessionStorage.setItem('nb.token', t), accessToken);
});

test('printable statement opens in a popup with copied session', async ({ page }) => {
  await page.goto('/bank/dashboard.html');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open printable statement' }).click();
  const popup = await popupPromise;
  await expect(popup.getByTestId('statement-title')).toHaveText('Account statement - Girokonto');
  await expect(popup.getByTestId('statement-iban')).toHaveText('DE89 3704 0044 0532 0130 00');
});

test('two tabs in one context share cookies but not sessionStorage', async ({ page, context }) => {
  await page.goto('/bank/dashboard.html');
  const second = await context.newPage();
  await second.goto('/bank/dashboard.html');
  await expect(second).toHaveURL(/login\.html/);
});
