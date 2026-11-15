import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
  const { challengeId } = await (await request.post('/api/bank/auth/login', { data: { username: 'j.schneider', password: 'Demo#2026' } })).json();
  const { accessToken } = await (await request.post('/api/bank/auth/otp', { data: { challengeId, otp: '246810' } })).json();
  await page.addInitScript((t) => { if (!location.pathname.endsWith('login.html')) sessionStorage.setItem('nb.token', t); }, accessToken);
  await page.clock.install({ time: new Date('2026-11-16T09:00:00+01:00') });
});

test('countdown decreases while the warning is open', async ({ page }) => {
  await page.goto('/bank/dashboard.html');
  await page.clock.fastForward('04:00');
  const countdown = page.getByTestId('timeout-countdown');
  await expect(countdown).toHaveText('60');
  await page.clock.fastForward(10_000);
  await expect(countdown).toHaveText('50');
});

test('timeout redirects with a reason', async ({ page }) => {
  await page.goto('/bank/dashboard.html');
  await page.clock.fastForward('05:00');
  await expect(page).toHaveURL(/reason=timeout/);
});
