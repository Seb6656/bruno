import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, openRequest, openPreferences, selectPreferencesTab, closePreferences } from '../../utils/page';
import { buildPreferencesLocators } from '../../utils/page/preferences';
import { LAYOUT_TOGGLE_TITLE_WHEN_SIDE_BY_SIDE, LAYOUT_TOGGLE_TITLE_WHEN_STACKED } from '../../utils/page/title-bar';
import { modifier, pressShortcut } from '../../shortcuts/helpers';

const COLLECTION_NAME = 'DisplayLayout';
const REQUEST_NAME = 'Echo';

const paneBoxes = async (page: Page) => {
  const request = await page.getByTestId('request-pane').boundingBox();
  const response = await page.getByTestId('response-pane').boundingBox();
  if (!request || !response) throw new Error('Request or response pane is not rendered');
  return { request, response };
};

const expectSideBySide = async (page: Page) => {
  await expect.poll(async () => {
    const { request, response } = await paneBoxes(page);
    return response.x >= request.x + request.width - 1;
  }).toBe(true);
};

const expectStacked = async (page: Page) => {
  await expect.poll(async () => {
    const { request, response } = await paneBoxes(page);
    return response.y >= request.y + request.height - 1;
  }).toBe(true);
};

// pageWithUserData runs on a fresh userData dir seeded from init-user-data/, so the
// stored layout never leaks into other specs; the test also ends back on side by side.
test.describe('Preferences > Display > Request / response layout', () => {
  test('setting and Cmd/Ctrl+J stay in sync and swap the panes', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const preferences = buildPreferencesLocators(page);
    const toggle = locators.titleBar.responseLayoutToggle();

    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);

    await test.step('Panes start side by side', async () => {
      await expect(toggle).toHaveAttribute('title', LAYOUT_TOGGLE_TITLE_WHEN_SIDE_BY_SIDE);
      await expectSideBySide(page);
    });

    await test.step('Side by side is selected by default', async () => {
      await openPreferences(page);
      await selectPreferencesTab(page, 'Display');
      await expect(preferences.display.layoutOrientation()).toBeVisible();
      await expect(preferences.display.layoutOption('horizontal')).toBeChecked();
      await expect(preferences.display.layoutOption('vertical')).not.toBeChecked();
    });

    await test.step('Choosing Stacked stacks the panes', async () => {
      await preferences.display.layoutOption('vertical').click();
      await expect(preferences.display.layoutOption('vertical')).toBeChecked();
      await closePreferences(page);
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);

      await expect(toggle).toHaveAttribute('title', LAYOUT_TOGGLE_TITLE_WHEN_STACKED);
      await expectStacked(page);
    });

    await test.step('Cmd/Ctrl+J flips back and the setting reflects it', async () => {
      await pressShortcut(page, modifier, 'KeyJ');
      await expect(toggle).toHaveAttribute('title', LAYOUT_TOGGLE_TITLE_WHEN_SIDE_BY_SIDE);
      await expectSideBySide(page);

      await openPreferences(page);
      await selectPreferencesTab(page, 'Display');
      await expect(preferences.display.layoutOption('horizontal')).toBeChecked();
      await expect(preferences.display.layoutOption('vertical')).not.toBeChecked();
    });
  });
});
