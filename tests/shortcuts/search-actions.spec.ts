import { expect, test } from '../../playwright';
import { buildCommonLocators, closeAllCollections, createFolder, createRequest } from '../utils/page';
import {
  closePreferencesTab,
  collectionName,
  modifier,
  openKeybindingsTab,
  pressShortcut,
  resetKeybindings,
  setupBoundActionsData
} from './helpers';

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor(); ;
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetKeybindings(page);
    await closeAllCollections(page);
  });

  test.describe('SEARCH', () => {
    test.describe('SHORTCUT: Global Search (Cmd/Ctrl+K)', () => {
      test('default Cmd/Ctrl+K Global Search Modal', async ({ pageWithUserData: page }) => {
        await pressShortcut(page, modifier, 'KeyK');

        await expect(page.getByTestId('global-search-input')).toBeVisible();
        await page.getByTestId('global-search-input').click();

        await pressShortcut(page, 'Escape');
      });

      test('customized Shift+K Global Search Modal', async ({ pageWithUserData: page }) => {
        // Remap globalSearch to Shift+K
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-globalSearch');
        await row.hover();
        await page.getByTestId('keybinding-edit-globalSearch').click();
        await expect(page.getByTestId('keybinding-input-globalSearch')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'KeyK');

        await closePreferencesTab(page);

        await pressShortcut(page, 'Shift', 'KeyK');

        await expect(page.getByTestId('global-search-input')).toBeVisible();
        await page.getByTestId('global-search-input').click();

        await pressShortcut(page, 'Escape');
      });
    });

    test.describe('Global Search results', () => {
      test('selecting a request result opens it, and selecting it again focuses the existing tab', async ({
        pageWithUserData: page
      }) => {
        const locators = buildCommonLocators(page);
        const requestName = 'kb-search-target';
        await createRequest(page, requestName, collectionName, { url: 'https://echo.usebruno.com', method: 'GET' });
        const searchAndSelect = async () => {
          await pressShortcut(page, modifier, 'KeyK');
          const input = page.getByTestId('global-search-input');
          await expect(input).toBeVisible();
          await input.fill(requestName);
          const result = page.getByRole('option', { name: new RegExp(`^${requestName},`) });
          await expect(result).toBeVisible();
          await result.click();
          await expect(input).toBeHidden();
        };

        await test.step('With the request tab closed, selecting the result opens it', async () => {
          if (await locators.tabs.closeTab(requestName).count()) {
            await locators.tabs.closeTab(requestName).click({ force: true });
          }
          await expect(locators.tabs.requestTab(requestName)).toHaveCount(0);
          await searchAndSelect();
          await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
        });

        await test.step('Selecting the same result again focuses the existing tab', async () => {
          await searchAndSelect();
          await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
          await expect(locators.tabs.requestTab(requestName)).toHaveCount(1);
        });
      });
    });

    test.describe('Global Search result location', () => {
      const searchFor = async (page, text: string) => {
        await pressShortcut(page, modifier, 'KeyK');
        const input = page.getByTestId('global-search-input');
        await expect(input).toBeVisible();
        await input.fill(text);
      };

      test('request at the collection root shows the collection name as its location', async ({
        pageWithUserData: page
      }) => {
        const requestName = 'kb-loc-root-request';
        await createRequest(page, requestName, collectionName, { url: 'https://echo.usebruno.com', method: 'GET' });

        await searchFor(page, requestName);
        const result = page.getByRole('option', { name: new RegExp(`^${requestName},`) });
        await expect(result).toBeVisible();
        await expect(result.getByTestId('result-location')).toHaveText(collectionName);
        await expect(result).toHaveAccessibleName(new RegExp(`, in ${collectionName}$`));

        await pressShortcut(page, 'Escape');
      });

      test('request and folder results show their location with the › separator', async ({
        pageWithUserData: page
      }) => {
        const folderName = 'kb-loc-folder';
        const requestName = 'kb-loc-nested-request';
        await createFolder(page, folderName, collectionName);
        await createRequest(page, requestName, folderName, {
          url: 'https://echo.usebruno.com',
          method: 'GET',
          inFolder: true
        });

        await test.step('Request result shows collection › folder', async () => {
          await searchFor(page, requestName);
          const result = page.getByRole('option', { name: new RegExp(`^${requestName},`) });
          await expect(result).toBeVisible();
          await expect(result.getByTestId('result-location')).toHaveText(`${collectionName} › ${folderName}`);
          await expect(result).toHaveAccessibleName(new RegExp(`, in ${collectionName} › ${folderName}$`));
        });

        await test.step('Folder result shows its path with the › separator', async () => {
          await page.getByTestId('global-search-input').fill(folderName);
          const result = page.getByRole('option', { name: new RegExp(`^${folderName},`) });
          await expect(result).toBeVisible();
          await expect(result).toContainText(`${collectionName} › ${folderName}`);
          await expect(result.getByTestId('result-location')).toHaveCount(0);
        });

        await pressShortcut(page, 'Escape');
      });
    });
  });
});
