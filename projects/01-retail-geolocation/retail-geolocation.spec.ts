import { test, expect } from '@playwright/test';

test.describe('Store finder', () => {
  test.use({ geolocation: { latitude: 48.1351, longitude: 11.582 }, permissions: ['geolocation'] });

  test('nearest stores are sorted by distance from Munich', async ({ page }) => {
    await page.goto('/retail/stores.html');
    await page.getByRole('button', { name: 'Use my location' }).click();
    const first = page.getByTestId('store-item').first();
    await expect(first.getByTestId('store-name')).toHaveText('München Marienplatz');
    const km = await page.getByTestId('store-distance').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.km)));
    expect(km).toEqual([...km].sort((a, b) => a - b));
  });

  test('moving the user re-ranks the stores', async ({ page, context }) => {
    await context.setGeolocation({ latitude: 53.55, longitude: 9.99 });
    await page.goto('/retail/stores.html');
    await page.getByRole('button', { name: 'Use my location' }).click();
    await expect(page.getByTestId('store-name').first()).toHaveText('Hamburg Mönckebergstraße');
  });
});

test.describe('without permission', () => {
  test.use({ permissions: [] });
  test('denied geolocation shows a fallback message', async ({ page }) => {
    await page.goto('/retail/stores.html');
    await page.getByRole('button', { name: 'Use my location' }).click();
    await expect(page.getByRole('alert')).toHaveText('Location access was denied. Please choose a city instead.');
  });
});
