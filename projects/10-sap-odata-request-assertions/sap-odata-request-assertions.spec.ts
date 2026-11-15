import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, request, baseURL }) => {
  const res = await request.post('/sap/bc/ui2/login', { data: { username: 'S4_QA_USER', password: 'Welcome1!' } });
  const value = /SAP_SESSIONID_QA=([^;]+)/.exec(res.headers()['set-cookie'])![1];
  await page.context().addCookies([{ name: 'SAP_SESSIONID_QA', value, url: baseURL! }]);
});

test('filter bar builds the right $filter', async ({ page }) => {
  await page.goto('/sap/salesorders.html');
  await page.locator('#listReport--soldToParty-inner').fill('17100004');
  await page.locator('#listReport--status-inner').selectOption('A');
  const req = page.waitForRequest((r) => r.url().includes('$filter'));
  await page.locator('#listReport--btnGo').click();
  const url = new URL((await req).url());
  expect(url.searchParams.get('$filter')).toBe("SoldToParty eq '17100004' and OverallSDProcessStatus eq 'A'");
  expect(url.searchParams.get('$inlinecount')).toBe('allpages');
});

test('backend error surfaces in the message popover', async ({ page }) => {
  await page.route('**/A_SalesOrder', (route) => route.request().method() === 'POST'
    ? route.fulfill({ status: 400, json: { error: { code: 'V1/320', message: { lang: 'en', value: 'Credit limit exceeded' }, innererror: { errordetails: [{ code: 'V1/320', message: 'Credit limit exceeded', target: 'SoldToParty', severity: 'error' }] } } } })
    : route.continue());
  await page.goto('/sap/create.html');
  await page.locator('#createSO--soldToParty-inner').fill('17100001');
  await page.locator('#createSO--save').click();
  await expect(page.locator('#createSO--messageList li')).toHaveText(['Credit limit exceeded']);
});
