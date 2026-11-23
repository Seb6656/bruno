import { test, expect, Page } from '../../../playwright';
import { openRequest } from '../../utils/page';

const COLLECTION_NAME = 'PlaceholderStacked';
const REQUEST_NAME = 'http';
const MIN_RESPONSE_PANE_HEIGHT = 150;

const placeholder = (page: Page) => page.getByTestId('response-pane-shortcut-placeholder');
const hint = (page: Page, part: 'label' | 'value', action: string) =>
  page.getByTestId(`response-placeholder-shortcut-${part}-${action}`);

// Drag the divider down until the response pane sits at its minimum height.
const dragResponsePaneToMinimum = async (page: Page) => {
  const bar = await page.getByTestId('request-response-dragbar').boundingBox();
  const request = await page.getByTestId('request-pane').boundingBox();
  const response = await page.getByTestId('response-pane').boundingBox();
  if (!bar || !request || !response) throw new Error('Panes or divider are not rendered');
  const x = bar.x + bar.width / 2;
  await page.mouse.move(x, bar.y + bar.height / 2);
  await page.mouse.down();
  // 100px above the bottom edge: past the collapse threshold, clamped to the minimum response pane height
  await page.mouse.move(x, response.y + response.height - 100, { steps: 15 });
  await page.mouse.up();
  await expect.poll(async () => (await page.getByTestId('response-pane').boundingBox())?.height).toBeLessThanOrEqual(MIN_RESPONSE_PANE_HEIGHT);
};

test.describe('Empty response placeholder', () => {
  test('Stacked: shows only a compact Send Request hint that fits the minimum response pane', async ({ pageWithUserData: page }) => {
    await test.step('Open a never-sent request and shrink the response pane to its minimum', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await dragResponsePaneToMinimum(page);
    });

    await test.step('Send Request hint is fully visible', async () => {
      await expect(hint(page, 'label', 'sendRequest')).toHaveText('Send Request');
      await expect(hint(page, 'label', 'sendRequest')).toBeInViewport({ ratio: 1 });
      await expect(hint(page, 'value', 'sendRequest')).toBeInViewport({ ratio: 1 });
    });

    await test.step('No icon and no other hints', async () => {
      await expect(placeholder(page).locator('svg')).toHaveCount(0);
      await expect(hint(page, 'label', 'newRequest')).toHaveCount(0);
      await expect(hint(page, 'label', 'editEnvironment')).toHaveCount(0);
    });
  });

  test('Side by side: keeps the icon and all three hints', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
    await page.getByTestId('response-layout-toggle-btn').click();

    for (const action of ['sendRequest', 'newRequest', 'editEnvironment']) {
      await expect(hint(page, 'label', action)).toBeVisible();
      await expect(hint(page, 'value', action)).toBeVisible();
    }
    await expect(placeholder(page).locator('svg')).toBeVisible();
  });
});
