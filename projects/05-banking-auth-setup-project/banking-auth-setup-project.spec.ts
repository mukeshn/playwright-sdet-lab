import { test as base, expect } from '@playwright/test';

// sessionStorage is not part of storageState, so the token is injected with an init script.
const test = base.extend<{ token: string }>({
  token: async ({ request }, use) => {
    const { challengeId } = await (await request.post('/api/bank/auth/login', { data: { username: 'j.schneider', password: 'Demo#2026' } })).json();
    const { otp } = await (await request.get('/api/bank/__test/otp')).json();
    const { accessToken } = await (await request.post('/api/bank/auth/otp', { data: { challengeId, otp } })).json();
    await use(accessToken);
  },
  page: async ({ page, token }, use) => {
    await page.addInitScript((t) => { sessionStorage.setItem('nb.token', t); sessionStorage.setItem('nb.name', 'Julia Schneider'); }, token);
    await use(page);
  },
});

test('dashboard opens without the UI login', async ({ page }) => {
  await page.goto('/bank/dashboard.html');
  await expect(page.getByTestId('welcome-name')).toHaveText('Julia Schneider');
  await expect(page.getByTestId('account-card')).toHaveCount(3);
});

test('transfer page is reachable directly', async ({ page }) => {
  await page.goto('/bank/transfer.html');
  await expect(page.getByTestId('available-balance')).toHaveText('3.250,75 €');
});
