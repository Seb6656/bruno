import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import {
  buildCommonLocators,
  expandFolder,
  waitForReadyPage,
  openPreferences,
  selectPreferencesTab,
  closePreferences
} from '../../utils/page';
import { buildPreferencesLocators } from '../../utils/page/preferences';
import { initBruCollection, writeBruRequest, writeBruFolder } from '../../utils/fixtures/bru-collection';

const ORDERS = 'Orders';
const INVENTORY = 'Inventory';

// Ctrl on Windows/Linux, Cmd on macOS (matches the app's navigator.userAgent check).
const SELECT_MODIFIER: 'Meta' | 'Control' = process.platform === 'darwin' ? 'Meta' : 'Control';

// Orders: 3 requests, 2 of them inside a folder, so "3 requests" proves folders are not counted.
const buildFixtures = async (createTmpDir: (tag?: string) => Promise<string>) => {
  const root = await createTmpDir('large-collection-rows');
  const ordersDir = path.join(root, ORDERS);
  initBruCollection(ordersDir, ORDERS);
  writeBruRequest(ordersDir, 'health', { seq: 1 });
  const billing = writeBruFolder(ordersDir, 'billing', 1);
  writeBruRequest(billing, 'invoice-create', { seq: 1 });
  writeBruRequest(billing, 'invoice-list', { seq: 2 });

  const inventoryDir = path.join(root, INVENTORY);
  initBruCollection(inventoryDir, INVENTORY);
  writeBruRequest(inventoryDir, 'stock-list', { seq: 1 });

  return {
    templateVars: {
      collectionPath: ordersDir.split(path.sep).join('/'),
      secondCollectionPath: inventoryDir.split(path.sep).join('/')
    }
  };
};

test.describe('Large collection rows', () => {
  test('toggling in Preferences shows and hides the subtitle, persists across a restart', async ({ launchElectronApp, createTmpDir }) => {
    const { templateVars } = await buildFixtures(createTmpDir);
    const userDataPath = await createTmpDir('large-collection-rows-userdata');
    const initUserDataPath = path.join(__dirname, 'init-user-data');

    const app = await launchElectronApp({ initUserDataPath, userDataPath, templateVars });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const preferences = buildPreferencesLocators(page);

    await test.step('Off by default: no subtitle and no large class', async () => {
      await expect(locators.sidebar.collectionRow(ORDERS)).toBeVisible();
      await expect(locators.sidebar.collectionSubtitle(ORDERS)).toHaveCount(0);
      await expect(locators.sidebar.collectionRow(ORDERS)).not.toHaveClass(/\blarge\b/);
    });

    await test.step('Turn it on in Preferences > Display', async () => {
      await openPreferences(page);
      await selectPreferencesTab(page, 'Display');
      await expect(preferences.display.largeCollectionRows()).not.toBeChecked();
      await preferences.display.largeCollectionRows().check();
      await expect(preferences.display.largeCollectionRows()).toBeChecked();
      await closePreferences(page);
    });

    await test.step('Unloaded collections read "Not loaded"; clicking loads it and shows the request count', async () => {
      await expect(locators.sidebar.collectionRow(ORDERS)).toHaveClass(/\blarge\b/);
      await expect(locators.sidebar.collectionSubtitle(ORDERS)).toHaveText('Not loaded');
      await expect(locators.sidebar.collectionSubtitle(INVENTORY)).toHaveText('Not loaded');

      await locators.sidebar.collection(ORDERS).click();
      // 1 root request + 2 in the folder; the folder itself is not counted.
      await expect(locators.sidebar.collectionSubtitle(ORDERS)).toHaveText('3 requests', { timeout: 15000 });
      await expect(locators.sidebar.collectionSubtitle(INVENTORY)).toHaveText('Not loaded');

      await locators.sidebar.collection(INVENTORY).click();
      await expect(locators.sidebar.collectionSubtitle(INVENTORY)).toHaveText('1 request', { timeout: 15000 });
    });

    await test.step('The setting survives a restart', async () => {
      await closeElectronApp(app);
      const restarted = await launchElectronApp({ userDataPath, templateVars });
      const restartedPage = await waitForReadyPage(restarted);
      const restartedLocators = buildCommonLocators(restartedPage);
      await expect(restartedLocators.sidebar.collectionRow(ORDERS)).toHaveClass(/\blarge\b/);
      await expect(restartedLocators.sidebar.collectionSubtitle(ORDERS)).toHaveText('Not loaded');

      await test.step('Turning it off removes the subtitle and the large class', async () => {
        const restartedPrefs = buildPreferencesLocators(restartedPage);
        await openPreferences(restartedPage);
        await selectPreferencesTab(restartedPage, 'Display');
        await expect(restartedPrefs.display.largeCollectionRows()).toBeChecked();
        await restartedPrefs.display.largeCollectionRows().uncheck();
        await closePreferences(restartedPage);

        await expect(restartedLocators.sidebar.collectionSubtitle(ORDERS)).toHaveCount(0);
        await expect(restartedLocators.sidebar.collectionRow(ORDERS)).not.toHaveClass(/\blarge\b/);
        await expect(restartedLocators.sidebar.collectionRowWrapper(INVENTORY)).not.toHaveClass(/large-collection-divider/);
      });

      await closeElectronApp(restarted);
    });
  });

  test('divider sits above every collection except the first', async ({ launchElectronApp, createTmpDir }) => {
    const { templateVars } = await buildFixtures(createTmpDir);
    const userDataPath = await createTmpDir('large-collection-rows-divider');
    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      userDataPath,
      templateVars
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    try {
      await enableLargeRows(page);
      await test.step('First collection has no divider, the second does', async () => {
        const rows = locators.sidebar.collectionRows();
        await expect(rows).toHaveCount(2);
        const firstName = (await locators.sidebar.collection().first().textContent()) || '';
        const secondName = (await locators.sidebar.collection().nth(1).textContent()) || '';
        await expect(locators.sidebar.collectionRowWrapper(firstName)).not.toHaveClass(/large-collection-divider/);
        await expect(locators.sidebar.collectionRowWrapper(secondName)).toHaveClass(/large-collection-divider/);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('search keeps the total count and shift-click range selection still works', async ({ launchElectronApp, createTmpDir }) => {
    const { templateVars } = await buildFixtures(createTmpDir);
    const userDataPath = await createTmpDir('large-collection-rows-search');
    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      userDataPath,
      templateVars
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const row = locators.sidebar.item;

    try {
      await enableLargeRows(page);

      await test.step('Load Orders', async () => {
        await locators.sidebar.collection(ORDERS).click();
        await expect(locators.sidebar.collectionSubtitle(ORDERS)).toHaveText('3 requests', { timeout: 15000 });
      });

      await test.step('Searching filters rows but the subtitle still shows the total', async () => {
        await page.getByTitle('Search requests').click();
        await page.getByTestId('sidebar-search-input').fill('invoice-l');
        await expect(row('invoice-list')).toBeVisible();
        await expect(row('invoice-create')).toHaveCount(0);
        await expect(row('health')).toHaveCount(0);
        await expect(locators.sidebar.collectionSubtitle(ORDERS)).toHaveText('3 requests');
        await page.getByTestId('sidebar-search-input').fill('');
        await expect(row('health')).toBeVisible();
      });

      await test.step('Shift-click selects the range from a folder through its requests to the next request', async () => {
        await expandFolder(page, 'billing');
        await expect(row('invoice-list')).toBeVisible();
        await locators.sidebar.folder('billing').click({ modifiers: [SELECT_MODIFIER] });
        await locators.sidebar.request('health').click({ modifiers: ['Shift'] });

        for (const name of ['billing', 'invoice-create', 'invoice-list', 'health']) {
          await expect(locators.sidebar.itemRow(name)).toHaveAttribute('data-selected', 'true');
        }
        await expect(locators.sidebar.collectionRow(ORDERS)).not.toHaveAttribute('data-selected', 'true');
        await expect(locators.sidebar.collectionRow(INVENTORY)).not.toHaveAttribute('data-selected', 'true');
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});

async function enableLargeRows(page) {
  const preferences = buildPreferencesLocators(page);
  await openPreferences(page);
  await selectPreferencesTab(page, 'Display');
  await preferences.display.largeCollectionRows().check();
  await expect(preferences.display.largeCollectionRows()).toBeChecked();
  await closePreferences(page);
}
