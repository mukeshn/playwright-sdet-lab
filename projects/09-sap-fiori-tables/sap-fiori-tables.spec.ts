import { test, expect, type Page } from '@playwright/test';

const idle = (page: Page) => page.waitForFunction(() => (window as unknown as { __pendingRequests: number }).__pendingRequests === 0);

test.beforeEach(async ({ page, request, baseURL }) => {
  const res = await request.post('/sap/bc/ui2/login', { data: { username: 'S4_QA_USER', password: 'Welcome1!' } });
  const value = /SAP_SESSIONID_QA=([^;]+)/.exec(res.headers()['set-cookie'])![1];
  await page.context().addCookies([{ name: 'SAP_SESSIONID_QA', value, url: baseURL! }]);
  await page.goto('/sap/salesorders.html');
  await idle(page);
});

test('More button grows the table until all rows are loaded', async ({ page }) => {
  const rows = page.locator('#listReport--table-tblBody tr');
  const total = Number((await page.locator('#listReport--tableTitle').innerText()).match(/\d+/)![0]);
  while (await page.locator('#listReport--table-trigger').isVisible()) {
    await page.locator('#listReport--table-trigger').click();
    await idle(page);
  }
  await expect(rows).toHaveCount(total);
});

test('column sort toggles aria-sort and order', async ({ page }) => {
  const header = page.locator('#listReport--col-SoldToParty');
  await header.click();
  await idle(page);
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  const values = await page.locator('td[data-col="SoldToParty"]').allInnerTexts();
  expect(values).toEqual([...values].sort());
  await header.click();
  await idle(page);
  await expect(header).toHaveAttribute('aria-sort', 'descending');
});
