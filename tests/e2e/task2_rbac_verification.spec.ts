import { test, expect } from '@playwright/test';

test.describe('Task 2: Xác thực Phân quyền RBAC & Quản trị Cấu hình Hệ thống (SYSTEM_ADMIN)', () => {
  test('2.1 Admin login, check 4 exclusive menus on Sidebar', async ({ page }) => {
    // 1. Visit login page
    await page.goto('http://localhost:3000/login');
    await expect(page).toHaveTitle(/OralAI/);

    // 2. Login as admin
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');

    // 3. Should redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('main h1')).toContainText('Xin chào');

    // 4. Check Sidebar links
    const sidebarNav = page.locator('aside nav');
    const links = sidebarNav.locator('a');
    await expect(links).toHaveCount(4);

    const hrefs = await links.evaluateAll((elements) =>
      elements.map((el) => el.getAttribute('href'))
    );
    expect(hrefs).toEqual(['/dashboard', '/users', '/settings', '/audit']);

    // Ensure non-admin menus are completely absent
    const excludedHrefs = ['/courses', '/exams', '/grading', '/results', '/semester', '/schedule', '/students', '/proctor'];
    for (const href of excludedHrefs) {
      expect(hrefs).not.toContain(href);
    }
  });

  test('2.2 Admin accesses /settings, verifies AI, OAuth and Network tabs', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to /settings
    await page.goto('http://localhost:3000/settings');
    await expect(page.locator('main h1')).toContainText('Cấu hình hệ thống');

    // Check tabs
    await expect(page.getByRole('button', { name: /AI & Mô hình/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Google OAuth/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cấu hình Mạng/i })).toBeVisible();

    // Verify AI settings content is loaded
    await expect(page.locator('text=Nhà cung cấp AI')).toBeVisible({ timeout: 10000 });
  });

  test('2.3 Admin accesses /audit, verifies audit page loads', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to /audit
    await page.goto('http://localhost:3000/audit');
    await expect(page.locator('main h1')).toContainText('Nhật ký kiểm toán');
  });


  test('2.4 Teacher login: Verify Teacher sidebar & RBAC block redirect to /unauthorized on /settings', async ({ page }) => {
    // Login as teacher1
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"]', 'teacher1');
    await page.fill('input[type="password"]', 'Teacher@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Check Teacher Sidebar
    const sidebarNav = page.locator('aside nav');
    const links = sidebarNav.locator('a');
    await expect(links).toHaveCount(4);

    const hrefs = await links.evaluateAll((elements) =>
      elements.map((el) => el.getAttribute('href'))
    );
    expect(hrefs).toEqual(['/dashboard', '/courses', '/proctor', '/grading']);

    // Admin menus must not be in sidebar
    expect(hrefs).not.toContain('/settings');
    expect(hrefs).not.toContain('/users');
    expect(hrefs).not.toContain('/audit');

    // Intentionally attempt to access admin /settings directly
    await page.goto('http://localhost:3000/settings');

    // RBAC middleware MUST intercept and redirect to /unauthorized
    await page.waitForURL('**/unauthorized', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Quyền truy cập bị từ chối' })).toBeVisible();
  });
});

