import { test, expect, Page, Locator } from '../../../playwright';
import { buildCommonLocators, openRequest, selectRequestPaneTab } from '../../utils/page';

const COLLECTION_NAME = 'MenusStacked';
const REQUEST_NAME = 'http';
const MIN_REQUEST_PANE_HEIGHT = 150;

const requestPane = (page: Page) => page.getByTestId('request-pane');

// Drag the request/response divider up so the request pane sits at its minimum height.
// Re-run after every openRequest: the pane height is component state and resets on remount.
const dragRequestPaneToMinimum = async (page: Page) => {
  const pane = await requestPane(page).boundingBox();
  const bar = await page.getByTestId('response-panel-indicator').boundingBox();
  if (!pane || !bar) throw new Error('Request pane or divider is not rendered');
  const x = bar.x + bar.width / 2;
  await page.mouse.move(x, bar.y + bar.height / 2);
  await page.mouse.down();
  // 100px below the pane top: past the collapse threshold, clamped to the minimum height
  await page.mouse.move(x, pane.y + 100, { steps: 15 });
  await page.mouse.up();
  await expect.poll(async () => (await requestPane(page).boundingBox())?.height).toBeLessThan(MIN_REQUEST_PANE_HEIGHT + 10);
  expect((await requestPane(page).boundingBox())?.height).toBeGreaterThanOrEqual(MIN_REQUEST_PANE_HEIGHT - 1);
};

// True when the element is the topmost thing at its own centre, i.e. not painted over or clipped away.
const expectReachable = async (option: Locator) => {
  await expect(option).toBeInViewport();
  const reachable = await option.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (el === hit || el.contains(hit));
  });
  expect(reachable, 'last option is the topmost element at its centre').toBe(true);
};

const expectStacked = async (page: Page) => {
  const request = await requestPane(page).boundingBox();
  const response = await page.getByTestId('response-pane').boundingBox();
  expect(response!.y).toBeGreaterThanOrEqual(request!.y + request!.height - 1);
};

test.describe('Request-pane menus are not clipped by the response pane', () => {
  test('Stacked: body mode menu is fully reachable in a minimum-height request pane', async ({ pageWithUserData: page }) => {
    await test.step('Open the request and shrink the request pane to its minimum', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await expectStacked(page);
      await dragRequestPaneToMinimum(page);
      await selectRequestPaneTab(page, 'Body');
    });

    await test.step('Last option is on screen and not covered', async () => {
      await page.getByTestId('request-body-mode-selector').click();
      await expectReachable(page.getByTestId('request-body-mode-label-none'));
    });

    await test.step('Clicking the last option changes the body mode', async () => {
      await page.getByTestId('request-body-mode-label-none').click();
      await expect(page.getByTestId('request-body-mode-label')).toContainText('No Body');
    });
  });

  test('Stacked: OAuth1 signature method menu is fully reachable in a minimum-height request pane', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open the request, shrink the pane, pick OAuth1', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await dragRequestPaneToMinimum(page);
      await selectRequestPaneTab(page, 'Auth');
      await requestPane(page).getByTestId('auth-mode-selector').click();
      await page.getByTestId('auth-mode-dropdown-oauth1').click();
    });

    await test.step('Last option is on screen and not covered', async () => {
      const trigger = page.getByTestId('oauth1-signature-method-dropdown');
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      await expectReachable(page.getByTestId('oauth1-signature-method-dropdown-plaintext'));
    });

    await test.step('Clicking the last option changes the signature method', async () => {
      await page.getByTestId('oauth1-signature-method-dropdown-plaintext').click();
      await expect(locators.auth.oauth1.signatureMethodDropdown()).toContainText('PLAINTEXT');
    });
  });

  test('Side by side: body mode menu opens below its trigger and is clickable', async ({ pageWithUserData: page }) => {
    await test.step('Switch to side by side', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await page.getByTestId('response-layout-toggle-btn').click();
      await expect.poll(async () => {
        const request = await requestPane(page).boundingBox();
        const response = await page.getByTestId('response-pane').boundingBox();
        return response!.x >= request!.x + request!.width - 1;
      }).toBe(true);
      await selectRequestPaneTab(page, 'Body');
    });

    await test.step('Menu opens below the trigger and the last option is reachable', async () => {
      const trigger = page.getByTestId('request-body-mode-selector');
      await trigger.click();
      const menu = page.getByTestId('request-body-mode-label-dropdown');
      await expect(menu).toBeVisible();
      const triggerBox = await trigger.boundingBox();
      const menuBox = await menu.boundingBox();
      expect(menuBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height);
      await expectReachable(page.getByTestId('request-body-mode-label-none'));
      await page.getByTestId('request-body-mode-label-none').click();
      await expect(page.getByTestId('request-body-mode-label')).toContainText('No Body');
    });
  });
});
