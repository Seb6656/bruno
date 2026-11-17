import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, openPreferences, selectPreferencesTab, closePreferences, waitForReadyPage } from '../../utils/page';
import { buildPreferencesLocators } from '../../utils/page/preferences';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

const FIRST_COLLECTION = 'LoadAllFirst';
const SECOND_COLLECTION = 'LoadAllSecond';
const REQUEST_IN_SECOND_ONLY = 'zeta-unique-lookup';

test.describe('Load all collections automatically (beta)', () => {
  test.setTimeout(60000);

  test('makes sidebar search cover collections that were never clicked, after a restart', async ({ launchElectronApp, createTmpDir }) => {
    const root = await createTmpDir('load-all-collections');
    const firstDir = path.join(root, FIRST_COLLECTION);
    const secondDir = path.join(root, SECOND_COLLECTION);
    initBruCollection(firstDir, FIRST_COLLECTION);
    writeBruRequest(firstDir, 'alpha-ping', { seq: 1 });
    initBruCollection(secondDir, SECOND_COLLECTION);
    writeBruRequest(secondDir, REQUEST_IN_SECOND_ONLY, { seq: 1 });

    const userDataPath = await createTmpDir('load-all-collections-userdata');
    const toPosix = (p: string) => p.split(path.sep).join('/');
    const launchOptions = {
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      userDataPath,
      templateVars: { firstCollectionPath: toPosix(firstDir), secondCollectionPath: toPosix(secondDir) }
    };

    const firstApp = await launchElectronApp(launchOptions);
    const firstPage = await waitForReadyPage(firstApp);

    try {
      const { sidebar } = buildCommonLocators(firstPage);
      const preferences = buildPreferencesLocators(firstPage);

      await test.step('With the preference off, search does not reach an unopened collection', async () => {
        await expect(sidebar.collection(SECOND_COLLECTION)).toBeVisible({ timeout: 15000 });
        await sidebar.searchToggle().click();
        await sidebar.searchInput().fill(REQUEST_IN_SECOND_ONLY);
        await expect(sidebar.collection(SECOND_COLLECTION)).toHaveCount(0);
        await sidebar.searchInput().fill('');
      });

      await test.step('Turn the preference on', async () => {
        await openPreferences(firstPage);
        await selectPreferencesTab(firstPage, 'Beta');
        await preferences.beta.loadAllCollectionsSwitch().click();
        await expect(preferences.beta.loadAllCollectionsCheckbox()).toBeChecked();
        // The Beta tab auto-saves on a debounce; wait for it to take effect by observing the load.
        await closePreferences(firstPage);
      });

      await test.step('Turning it on loads the collections right away', async () => {
        await sidebar.searchInput().fill(REQUEST_IN_SECOND_ONLY);
        await expect(sidebar.item(REQUEST_IN_SECOND_ONLY)).toBeVisible({ timeout: 15000 });
      });
    } finally {
      await closeElectronApp(firstApp);
    }

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    try {
      const { sidebar } = buildCommonLocators(page);

      await test.step('After a restart both collections are listed and the second is collapsed', async () => {
        await expect(sidebar.collection(FIRST_COLLECTION)).toBeVisible({ timeout: 15000 });
        await expect(sidebar.collection(SECOND_COLLECTION)).toBeVisible();
        await expect(sidebar.collectionChevron(SECOND_COLLECTION)).not.toHaveClass(/rotate-90/);
      });

      await test.step('Searching finds a request in a collection that was never clicked', async () => {
        await sidebar.searchToggle().click();
        await sidebar.searchInput().fill(REQUEST_IN_SECOND_ONLY);
        await expect(sidebar.item(REQUEST_IN_SECOND_ONLY)).toBeVisible({ timeout: 30000 });
      });

      await test.step('The collection it lives in is still collapsed once the search is cleared', async () => {
        await sidebar.searchInput().fill('');
        await expect(sidebar.item(REQUEST_IN_SECOND_ONLY)).toHaveCount(0);
        await expect(sidebar.collectionChevron(SECOND_COLLECTION)).not.toHaveClass(/rotate-90/);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
