import { expect, test, type Page } from '@playwright/test';
import type { HabitDetail } from '../src/types/rally';

test.use({ viewport: { width: 393, height: 852 }, actionTimeout: 15_000 });

async function fixture(page: Page, count = 3, onboarded = true) {
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'redesign@example.test', app_metadata: {}, user_metadata: onboarded ? { rally_onboarding_version: 1 } : {}, created_at: new Date().toISOString() };
  const jwt = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = jwt({ alg: 'HS256', typ: 'JWT' }) + '.' + jwt({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' }) + '.test';
  const names = ['Read a few pages', 'Move your body', 'Make time to unwind'];
  const habits: HabitDetail[] = Array.from({ length: count }, (_, i) => ({
    habit_id: '00000000-0000-4000-8000-' + String(i + 100).padStart(12, '0'),
    name: names[i] ?? 'A small daily habit ' + (i + 1), weekly_target: i === 1 ? 4 : 3, completed_this_week: i === 1 ? 2 : 1,
    progress_percentage: i === 1 ? 50 : 33, done_today: i === 1, today_completion_id: null,
    status: 'active', recent_completion_dates: ['2026-09-07', '2026-09-06'], all_completion_dates: ['2026-09-07', '2026-09-06'],
    all_time_progress: { total_completions: 24, current_streak: 2, best_streak: 7, active_days: 42 },
    created_at: '2026-08-01T00:00:00Z', updated_at: '2026-09-08T00:00:00Z',
  }));
  let failWrite = false;
  let failSetup = false;
  const oauthRequests: URL[] = [];
  await page.route('**/auth/v1/**', async (route) => {
    if (route.request().url().includes('logout')) return route.fulfill({ status: 204 });
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/authorize')) {
      oauthRequests.push(url);
      return route.fulfill({ status: 302, headers: { location: `${url.searchParams.get('redirect_to')}?code=test-verified-code` } });
    }
    if (url.pathname.endsWith('/user')) {
      if (route.request().method() === 'PUT') {
        if (failSetup) return route.fulfill({ status: 500, json: { message: 'Test setup failure' } });
        user.user_metadata = { ...user.user_metadata, ...route.request().postDataJSON().data };
      }
      return route.fulfill({ json: user });
    }
    return route.fulfill({ json: { access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh', user } });
  });
  await page.route('**/rest/v1/rpc/**', async (route) => {
    const method = route.request().url().split('/').pop();
    const input = route.request().postDataJSON()?.input ?? {};
    if (failWrite && ['create_habit', 'mark_habit_done_today', 'delete_habit', 'archive_habit'].includes(method!)) {
      return route.fulfill({ json: { ok: false, error: { code: 'server_error', message: 'Test failure', retryable: true } } });
    }
    const habit = habits.find((h) => h.habit_id === input.habit_id);
    let data: unknown;
    if (method === 'list_active_habits' || method === 'get_weekly_progress') data = { habits: habits.filter((h) => h.status === 'active') };
    if (method === 'get_habit_detail') data = { habit };
    if (method === 'create_habit') {
      const newHabit = { ...habits[0], habit_id: '00000000-0000-4000-8000-999999999999', name: input.name, weekly_target: input.weekly_target,
        completed_this_week: 0, progress_percentage: 0, done_today: false, status: 'active' } as HabitDetail;
      habits.push(newHabit); data = { habit: newHabit };
    }
    if ((method === 'mark_habit_done_today' || method === 'undo_today_completion') && habit) {
      // Delay only this write so the unrelated-card enabled state is observable.
      await new Promise((resolve) => setTimeout(resolve, 600));
      habit.done_today = method === 'mark_habit_done_today';
      habit.completed_this_week += habit.done_today ? 1 : -1;
      habit.progress_percentage = Math.round(habit.completed_this_week / habit.weekly_target * 100);
      data = { habit, outcome: habit.done_today ? 'completed' : 'removed' };
    }
    if ((method === 'archive_habit' || method === 'delete_habit') && habit) {
      habit.status = method === 'archive_habit' ? 'archived' : 'deleted';
      data = { habit_id: habit.habit_id, status: habit.status };
    }
    await route.fulfill({ json: { ok: true, data, request_id: 'test', server_time: new Date().toISOString() } });
  });
  return { failWrites: (fail: boolean) => { failWrite = fail; }, failSetup: (fail: boolean) => { failSetup = fail; }, user, oauthRequests };
}
async function login(page: Page) {
  await page.goto('/log-in');
  await page.getByLabel('Email', { exact: true }).fill('redesign@example.test');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('Your habits.', { exact: true })).toBeVisible();
}
test('redesigned core flow, accessibility targets, isolated mutations and screenshots', async ({ page }, info) => {
  // Match the mobile runtime that reported the dashboard crash.
  await page.addInitScript(() => {
    Object.defineProperty(Intl.DateTimeFormat.prototype, 'formatRange', { configurable: true, value: undefined });
  });
  await fixture(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveURL(/log-in$/);
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Made by Newtype', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('01-login.png') });
  await page.getByRole('tab', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/sign-up$/);
  await page.screenshot({ path: info.outputPath('02-signup.png') });
  await page.getByRole('tab', { name: 'Log in' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await login(page);
  await page.screenshot({ path: info.outputPath('03-dashboard.png') });
  await expect(page.getByText('Your habits.', { exact: true })).toHaveCSS('color', 'rgb(242, 245, 250)');
  const addBounds = await page.getByRole('link', { name: 'Add habit' }).boundingBox();
  expect(addBounds?.width).toBeGreaterThanOrEqual(44);
  expect(addBounds?.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Mark done', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Mark done', exact: true }).last()).toBeEnabled();
  await expect(page).toHaveURL(/habits$/);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(2);
  await page.getByRole('link', { name: 'Add habit' }).click();
  await expect(page.getByRole('button', { name: 'Create habit', exact: true })).toBeDisabled();
  await page.getByLabel('Habit name', { exact: true }).fill('A mindful morning');
  await page.getByLabel('Weekly target', { exact: true }).fill('0');
  await expect(page.getByRole('button', { name: 'Create habit', exact: true })).toBeDisabled();
  await page.getByLabel('Weekly target', { exact: true }).fill('3');
  await page.screenshot({ path: info.outputPath('04-create.png') });
  const footer = await page.getByTestId('sheet-action-footer').boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(852);
  expect(footer!.y).toBeGreaterThan(600);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('link', { name: 'Add habit' }).click();
  await expect(page.getByLabel('Habit name', { exact: true })).toHaveValue('A mindful morning');
  await page.getByRole('button', { name: 'Create habit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open A mindful morning' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Read a few pages' }).click();
  await expect(page.getByText('All-time progress', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('05-detail.png') });
  await page.getByRole('button', { name: 'Show completion dates' }).click();
  await expect(page.getByRole('button', { name: 'Hide completion dates' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('05-history.png') });
  await page.getByRole('button', { name: 'Delete habit', exact: true }).click();
  await expect(page.getByText('Delete this habit?', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('06-delete.png') });
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/habits\//);
  await page.getByRole('button', { name: 'Archive habit', exact: true }).click();
  await expect(page.getByText('Archive this habit?', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('07-archive.png') });
  await page.getByRole('button', { name: 'Archive habit', exact: true }).click();
  await expect(page).toHaveURL(/habits$/);
  await expect(page.getByRole('button', { name: 'Open Read a few pages' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/log-in$/);
  expect(errors).toEqual([]);
});
test('failed create retains its draft and can retry without an unhandled rejection', async ({ page }) => {
  const api = await fixture(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.getByRole('link', { name: 'Add habit' }).click();
  await page.getByLabel('Habit name', { exact: true }).fill('Keep my draft');
  api.failWrites(true);
  await page.getByRole('button', { name: 'Create habit', exact: true }).click();
  await expect(page.getByText('We could not create this habit.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Habit name', { exact: true })).toHaveValue('Keep my draft');
  api.failWrites(false);
  await page.getByRole('button', { name: 'Create habit', exact: true }).click();
  await expect(page).toHaveURL(/habits$/);
  expect(errors).toEqual([]);
});
test('narrow screen and empty account', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await fixture(page, 0);
  await login(page);
  await expect(page.getByRole('link', { name: 'Create your first habit' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('08-empty-small.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('50 habits use a bounded initial render and offline actions are explained', async ({ page, context }) => {
  await fixture(page, 50);
  await login(page);
  expect(await page.getByRole('button', { name: /^Open / }).count()).toBeLessThan(50);
  await context.setOffline(true);
  await expect(page.getByText('You’re offline. Reconnect to save changes.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark done', exact: true }).first()).toBeDisabled();
  await context.setOffline(false);
  await expect(page.getByRole('button', { name: 'Mark done', exact: true }).first()).toBeEnabled();
});

test('new account onboarding persists, creates a habit, and does not repeat after login', async ({ page }, info) => {
  const api = await fixture(page, 0, false);
  await page.goto('/log-in');
  await page.getByRole('tab', { name: 'Sign up', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('new@example.test');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page).toHaveURL(/onboarding$/);
  await page.screenshot({ path: info.outputPath('onboarding-welcome.png') });
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await page.screenshot({ path: info.outputPath('onboarding-first-habit.png') });
  api.failSetup(true);
  await page.getByRole('button', { name: 'Create my first habit' }).click();
  await expect(page.getByText('We couldn’t save your setup.', { exact: true })).toBeVisible();
  api.failSetup(false);
  await page.getByRole('button', { name: 'Create my first habit' }).click();
  await expect(page).toHaveURL(/habits\/new$/);
  expect(api.user.user_metadata.rally_onboarding_version).toBe(1);
  await page.getByLabel('Habit name', { exact: true }).fill('My first small step');
  await page.getByRole('button', { name: 'Create habit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open My first small step', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await login(page);
  await expect(page).toHaveURL(/habits$/);
});

test('onboarding can be skipped on a narrow screen', async ({ page }) => {
  const api = await fixture(page, 0, false);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/log-in');
  await page.getByLabel('Email', { exact: true }).fill('new@example.test');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/onboarding$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('link', { name: 'Create your first habit' })).toBeVisible();
  expect(api.user.user_metadata.rally_onboarding_version).toBe(1);
});

for (const provider of ['Google', 'Apple']) {
  test(`${provider} OAuth sends S256 and completes the callback into onboarding`, async ({ page }) => {
    const api = await fixture(page, 0, false);
    const exchanges: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/token?grant_type=pkce')) exchanges.push(request.postData() ?? '');
    });
    await page.goto('/log-in');
    await page.getByRole('button', { name: `Continue with ${provider}`, exact: true }).click();
    await expect(page).toHaveURL(/onboarding$/);
    expect(api.oauthRequests).toHaveLength(1);
    expect(api.oauthRequests[0].searchParams.get('provider')).toBe(provider.toLowerCase());
    expect(api.oauthRequests[0].searchParams.get('code_challenge_method')).toBe('s256');
    expect(api.oauthRequests[0].searchParams.get('code_challenge')).toBeTruthy();
    expect(exchanges).toHaveLength(1);
    expect(JSON.parse(exchanges[0]).auth_code).toBe('test-verified-code');
    expect(JSON.parse(exchanges[0]).code_verifier).toBeTruthy();
  });
}

test('OAuth cancellation callback recovers to email login without accepting a session', async ({ page }) => {
  await fixture(page);
  await page.goto('/auth/callback?error=access_denied');
  await expect(page.getByText('We couldn’t finish sign-in.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/auth\/error$/);
  await page.getByRole('button', { name: 'Back to log in' }).click();
  await expect(page).toHaveURL(/log-in$/);
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

test('Midnight layout keeps long names and form actions reachable across mobile widths', async ({ page }, info) => {
  await fixture(page);
  await login(page);
  const longName = 'Read one chapter of the book I have been meaning to finish';
  for (const width of [320, 393, 430]) {
    await page.setViewportSize({ width, height: 640 });
    await page.getByRole('link', { name: 'Add habit' }).click();
    await page.getByLabel('Habit name', { exact: true }).fill(longName);
    await page.getByLabel('Weekly target', { exact: true }).fill('1.5');
    await expect(page.getByRole('button', { name: 'Create habit', exact: true })).toBeDisabled();
    await page.getByLabel('Weekly target', { exact: true }).fill('8');
    // Design work must not silently introduce a maximum target of seven.
    await expect(page.getByRole('button', { name: 'Create habit', exact: true })).toBeEnabled();
    await page.setViewportSize({ width, height: 460 });
    const footer = await page.getByTestId('sheet-action-footer').boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(460);
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    await expect(cancel).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await cancel.click();
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('link', { name: 'Add habit' }).click();
  await expect(page.getByLabel('Habit name', { exact: true })).toHaveValue(longName);
  await page.getByRole('button', { name: 'Create habit', exact: true }).click();
  await page.getByRole('button', { name: 'Open ' + longName, exact: true }).click();
  await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('09-long-name-small.png') });
});
