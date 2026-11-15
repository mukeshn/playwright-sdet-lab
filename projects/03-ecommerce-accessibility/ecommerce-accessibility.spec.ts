import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

for (const path of ['/shop/index.html', '/shop/cart.html', '/shop/login.html']) {
  test(`no critical a11y violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
}

test('search region scanned in isolation', async ({ page }) => {
  await page.goto('/shop/index.html');
  const { violations } = await new AxeBuilder({ page }).include('[role="search"]').analyze();
  expect(violations).toEqual([]);
});

test('login form focus order', async ({ page }) => {
  await page.goto('/shop/login.html');
  await page.getByLabel('Email').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();
});
