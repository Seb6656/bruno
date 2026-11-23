import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, openRequest } from '../../utils/page';

const COLLECTION_NAME = 'CollapseBar';
const REQUEST_NAME = 'http';
const MIN_REQUEST_PANE_HEIGHT = 150;

const requestPane = (page: Page) => page.getByTestId('request-pane');
const responsePane = (page: Page) => page.getByTestId('response-pane');
const bar = (page: Page) => page.getByTestId('response-panel-indicator');

const requestPaneHeight = async (page: Page) => (await requestPane(page).boundingBox())!.height;
const requestPaneWidth = async (page: Page) => (await requestPane(page).boundingBox())!.width;

const dragBarTo = async (page: Page, y: number) => {
  const box = await bar(page).boundingBox();
  if (!box) throw new Error('Response bar is not rendered');
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 15 });
  await page.mouse.up();
};

// Resizes so the response pane takes as much of the section as possible while the request pane stays
// clearly above its minimum height, and returns the resulting request pane height.
const dragToLargeResponse = async (page: Page) => {
  const main = (await page.locator('section.main').boundingBox())!;
  const target = Math.max(MIN_REQUEST_PANE_HEIGHT + 60, main.height * 0.25);
  await dragBarTo(page, main.y + target);
  await expect.poll(() => requestPaneHeight(page)).toBeGreaterThan(MIN_REQUEST_PANE_HEIGHT + 20);
  return requestPaneHeight(page);
};

test.describe('Stacked: Response bar collapses and restores the response pane', () => {
  test('click collapses, click restores the previous size', async ({ pageWithUserData: page }) => {
    let recordedHeight = 0;

    await test.step('Open a request and size the response pane large', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await expect(bar(page)).toHaveAttribute('aria-expanded', 'true');
      recordedHeight = await dragToLargeResponse(page);
    });

    await test.step('Clicking the bar collapses the response pane', async () => {
      await bar(page).click();
      await expect(responsePane(page)).toHaveCount(0);
      await expect(bar(page)).toHaveAttribute('aria-expanded', 'false');
      await expect.poll(() => requestPaneHeight(page)).toBeGreaterThan(recordedHeight);

      const main = (await page.locator('section.main').boundingBox())!;
      const barBox = (await bar(page).boundingBox())!;
      expect(barBox.y + barBox.height).toBeGreaterThan(main.y + main.height - 4);
    });

    await test.step('Clicking the collapsed bar restores the recorded size', async () => {
      await bar(page).click();
      await expect(responsePane(page)).toBeVisible();
      await expect(bar(page)).toHaveAttribute('aria-expanded', 'true');
      await expect.poll(async () => Math.abs((await requestPaneHeight(page)) - recordedHeight)).toBeLessThanOrEqual(2);
    });
  });

  test('dragging resizes from the open bar and from the collapsed bar', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
    const main = (await page.locator('section.main').boundingBox())!;

    await test.step('Dragging the open bar changes the request pane height', async () => {
      const initial = await requestPaneHeight(page);
      await dragBarTo(page, main.y + initial - 60);
      await expect.poll(() => requestPaneHeight(page)).toBeLessThan(initial - 30);
    });

    await test.step('Dragging the collapsed bar reopens the response pane at the pointer', async () => {
      await bar(page).click();
      await expect(responsePane(page)).toHaveCount(0);
      await dragBarTo(page, main.y + main.height - 250);
      await expect(responsePane(page)).toBeVisible();
      await expect(bar(page)).toHaveAttribute('aria-expanded', 'true');
      await expect.poll(() => requestPaneHeight(page)).toBeLessThan(main.height - 150);
    });
  });

  test('Enter on the focused bar collapses the response pane', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
    await bar(page).focus();
    await page.keyboard.press('Enter');
    await expect(responsePane(page)).toHaveCount(0);
    await expect(bar(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('side by side keeps the thin divider and its double-click reset', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const divider = page.getByTestId('request-response-dragbar');

    await test.step('Switch to side by side', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await locators.titleBar.responseLayoutToggle().click();
      await expect(divider).toBeVisible();
      await expect(bar(page)).toHaveCount(0);
    });

    const defaultWidth = await requestPaneWidth(page);

    await test.step('Dragging the divider changes the request pane width', async () => {
      const box = (await divider.boundingBox())!;
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 120, y, { steps: 10 });
      await page.mouse.up();
      await expect.poll(() => requestPaneWidth(page)).toBeGreaterThan(defaultWidth + 60);
    });

    await test.step('Double-clicking the divider resets the default split', async () => {
      await divider.dblclick();
      await expect.poll(async () => Math.abs((await requestPaneWidth(page)) - defaultWidth)).toBeLessThanOrEqual(2);
      await expect(bar(page)).toHaveCount(0);
    });
  });
});
