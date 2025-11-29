import { test, expect } from '@playwright/test';

test('collaboration syncs text between two windows', async ({ browser }) => {
    // Create two isolated browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Connect to the same room
    const roomID = 'e2e-test-room';
    await page1.goto(`http://localhost:3000/room/${roomID}`);
    await page2.goto(`http://localhost:3000/room/${roomID}`);

    // Wait for editor to load
    await page1.waitForSelector('.ProseMirror');
    await page2.waitForSelector('.ProseMirror');

    // Type in Page 1
    await page1.locator('.ProseMirror').fill('Hello World');

    // Verify in Page 2
    // Note: There might be a slight delay due to batching (50ms) + network
    await expect(page2.locator('.ProseMirror')).toHaveText('Hello World', { timeout: 5000 });

    // Type in Page 2
    await page2.locator('.ProseMirror').press('End'); // Go to end
    await page2.locator('.ProseMirror').type(' from Page 2');

    // Verify in Page 1
    await expect(page1.locator('.ProseMirror')).toHaveText('Hello World from Page 2');
});
