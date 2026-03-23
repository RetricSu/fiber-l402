import { test, expect } from '@playwright/test';

test.describe('Article List', () => {
  test('article list loads', async ({ page }) => {
    await page.goto('/articles');
    await expect(page.locator('h1')).toContainText('Articles');
  });

  test('articles are displayed', async ({ page }) => {
    await page.goto('/articles');
    
    // Wait for articles to load
    await page.waitForSelector('.article-card');
    
    // Check that at least one article is displayed
    const articles = page.locator('.article-card');
    await expect(articles).toHaveCountGreaterThan(0);
  });

  test('article card displays required elements', async ({ page }) => {
    await page.goto('/articles');
    await page.waitForSelector('.article-card');
    
    const firstArticle = page.locator('.article-card').first();
    
    // Check for title
    await expect(firstArticle.locator('h2')).toBeVisible();
    
    // Check for meta info (author, date)
    await expect(firstArticle.locator('.meta')).toBeVisible();
    
    // Check for preview
    await expect(firstArticle.locator('.preview')).toBeVisible();
    
    // Check for price
    await expect(firstArticle.locator('.price')).toBeVisible();
  });

  test('clicking article navigates to detail page', async ({ page }) => {
    await page.goto('/articles');
    await page.waitForSelector('.article-card');
    
    // Click the first article
    const firstArticle = page.locator('.article-card').first();
    const title = await firstArticle.locator('h2').textContent();
    await firstArticle.click();
    
    // Should navigate to article detail page
    await expect(page).toHaveURL(/\/articles\/[\w-]+/);
    
    // Should display the article title
    await expect(page.locator('h1')).toContainText(title || '');
  });
});

test.describe('Article Detail', () => {
  test('article detail page loads', async ({ page }) => {
    await page.goto('/articles');
    await page.waitForSelector('.article-card');
    
    // Click first article
    await page.locator('.article-card').first().click();
    
    // Check article structure
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.meta')).toBeVisible();
    await expect(page.locator('.preview-section')).toBeVisible();
  });

  test('payment gate is displayed for locked content', async ({ page }) => {
    await page.goto('/articles');
    await page.waitForSelector('.article-card');
    
    // Click first article
    await page.locator('.article-card').first().click();
    
    // Should show payment gate
    await expect(page.locator('.payment-gate')).toBeVisible();
    await expect(page.locator('.pay-btn')).toBeVisible();
  });

  test('payment flow initiates on click', async ({ page }) => {
    await page.goto('/articles');
    await page.waitForSelector('.article-card');
    
    // Click first article
    await page.locator('.article-card').first().click();
    
    // Click pay button
    await page.locator('.pay-btn').click();
    
    // Should show payment challenge
    await expect(page.locator('.payment-challenge')).toBeVisible();
    await expect(page.locator('.invoice-address')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('404 page for non-existent article', async ({ page }) => {
    await page.goto('/articles/nonexistent-article-id');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message p')).toContainText('not found');
  });

  test('back to articles link works', async ({ page }) => {
    await page.goto('/articles/nonexistent-article-id');
    
    // Click back link
    await page.locator('.back-link').click();
    
    // Should navigate back to articles list
    await expect(page).toHaveURL('/articles');
    await expect(page.locator('h1')).toContainText('Articles');
  });
});

test.describe('Navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Fiber L402/);
  });

  test('can navigate from home to articles', async ({ page }) => {
    await page.goto('/');
    
    // Find and click link to articles
    const articlesLink = page.locator('a[href="/articles"]');
    if (await articlesLink.isVisible().catch(() => false)) {
      await articlesLink.click();
      await expect(page).toHaveURL('/articles');
    }
  });
});
