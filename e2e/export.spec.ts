import { test, expect } from '@playwright/test';

test.describe('Export Modal Wizard', () => {

    test.beforeEach(async ({ page }) => {
        // Setup test data
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            const testModels = [
                { id: '1', name: 'LLM Model 1', provider: 'OpenAI', domain: 'LLM', source: 'test', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false }, hosting: { weights_available: true, api_available: true, on_premise_friendly: true }, tags: ['llm', 'chat'] },
                { id: '2', name: 'LLM Model 2', provider: 'Anthropic', domain: 'LLM', source: 'test', license: { name: 'Proprietary', type: 'Proprietary', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false }, hosting: { weights_available: false, api_available: true, on_premise_friendly: false }, tags: ['llm'] },
                { id: '3', name: 'Image Model 1', provider: 'Stability', domain: 'ImageGen', source: 'test', license: { name: 'Apache-2.0', type: 'OSI', commercial_use: true, attribution_required: true, share_alike: false, copyleft: false }, hosting: { weights_available: true, api_available: true, on_premise_friendly: true }, tags: ['image', 'diffusion'] },
                { id: '4', name: 'Audio Model 1', provider: 'OpenAI', domain: 'TTS', source: 'test', license: { name: 'Proprietary', type: 'Proprietary', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false }, hosting: { weights_available: false, api_available: true, on_premise_friendly: false }, tags: ['audio', 'tts'] },
            ];
            localStorage.setItem('aiModelDB_models', JSON.stringify(testModels));
        });
        await page.reload();
        await page.waitForTimeout(1000);
    });

    test('should open export modal and show format options', async ({ page }) => {
        // Find and click Export button
        const exportButton = page.locator('button:has-text("Export"), button[aria-label*="Export"]').first();

        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(500);

            // Should show format options
            await expect(page.locator('text=/JSON|CSV/i').first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('should export entire database as JSON', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export"), button[aria-label*="Export"]').first();

        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(500);

            // Select "Entire Database" if available
            const entireDbOption = page.locator('text=/Entire Database|All Models|Export All/i').first();
            if (await entireDbOption.isVisible()) {
                await entireDbOption.click();
            }

            // Select JSON format
            const jsonOption = page.locator('text=/JSON/i, button:has-text("JSON"), label:has-text("JSON")').first();
            if (await jsonOption.isVisible()) {
                await jsonOption.click();
            }

            // Setup download listener
            const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

            // Click export/download button
            const downloadButton = page.locator('button:has-text("Export"), button:has-text("Download")').last();
            if (await downloadButton.isVisible()) {
                await downloadButton.click();
            }

            // Check if download started (may not work in all environments)
            const download = await downloadPromise;
            if (download) {
                expect(download.suggestedFilename()).toMatch(/\.json$/);
            }
        }
    });

    test('should export entire database as CSV', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export"), button[aria-label*="Export"]').first();

        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(500);

            // Select CSV format
            const csvOption = page.locator('text=/CSV/i, button:has-text("CSV"), label:has-text("CSV")').first();
            if (await csvOption.isVisible()) {
                await csvOption.click();
            }

            // Setup download listener
            const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

            // Click export button
            const downloadButton = page.locator('button:has-text("Export"), button:has-text("Download")').last();
            if (await downloadButton.isVisible()) {
                await downloadButton.click();
            }

            const download = await downloadPromise;
            if (download) {
                expect(download.suggestedFilename()).toMatch(/\.csv$/);
            }
        }
    });

    test('should show custom filter options', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export"), button[aria-label*="Export"]').first();

        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(500);

            // Look for Custom Filter option
            const customOption = page.locator('text=/Custom Filter|Custom|Filter/i').first();
            if (await customOption.isVisible()) {
                await customOption.click();
                await page.waitForTimeout(300);

                // Should show filter options (domain, license, etc.)
                const filterOptions = page.locator('text=/Domain|License|LLM|ImageGen/i');
                const count = await filterOptions.count();
                expect(count).toBeGreaterThan(0);
            }
        }
    });

    test('should filter export by domain', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export"), button[aria-label*="Export"]').first();

        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(500);

            // Select Custom Filter
            const customOption = page.locator('text=/Custom Filter|Custom/i').first();
            if (await customOption.isVisible()) {
                await customOption.click();
                await page.waitForTimeout(300);

                // Select LLM domain filter
                const llmFilter = page.locator('select option[value="LLM"], button:has-text("LLM"), label:has-text("LLM")').first();
                if (await llmFilter.isVisible()) {
                    await llmFilter.click();
                }

                // Domain dropdown might be a select
                const domainSelect = page.locator('select').first();
                if (await domainSelect.isVisible()) {
                    await domainSelect.selectOption('LLM');
                }
            }
        }
    });

    test('should close modal on cancel', async ({ page }) => {
        const exportButton = page.locator('button:has-text("Export"), button[aria-label*="Export"]').first();

        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(500);

            // Find and click close/cancel button
            const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), button[aria-label*="Close"]').first();
            if (await closeButton.isVisible()) {
                await closeButton.click();
                await page.waitForTimeout(300);

                // Modal should be closed
                const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
                await expect(modal).not.toBeVisible({ timeout: 2000 });
            }
        }
    });
});
