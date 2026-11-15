import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/crm/login.html');
  await page.getByLabel('Username').fill('qa.admin@crm.test');
  await page.getByLabel('Password').fill('Sales#2026');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('grid', { name: 'Leads' })).toBeVisible();
});

test('picklist values of Lead Status', async ({ page }) => {
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('combobox', { name: 'Lead Status' }).click();
  await expect(page.getByRole('option')).toHaveText(['Open - Not Contacted', 'Working - Contacted', 'Closed - Not Converted']);
});

test('inputs inside nested shadow roots are reachable by label', async ({ page }) => {
  await page.getByRole('button', { name: 'New', exact: true }).click();
  const company = page.getByLabel('* Company');
  await company.fill('Pierce GmbH');
  await expect(company).toHaveValue('Pierce GmbH');
  // the same element found with CSS - Playwright CSS also pierces shadow DOM
  await expect(page.locator('lightning-input[name="Company"] input')).toHaveValue('Pierce GmbH');
});

test('toast is announced via role=alert', async ({ page }) => {
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('* Last Name').fill('Toast');
  await page.getByLabel('* Company').fill(`Toast ${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('crm-toast').getByRole('alert')).toContainText('Lead "Toast" was created.');
});
