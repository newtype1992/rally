import { expect, test, type Locator, type Page } from '@playwright/test';

const seededUser = {
  email: 'avery.local@example.test',
  password: 'password123',
};

test.use({ viewport: { width: 393, height: 852 } });

test('runs the personal V1 habit flow', async ({ page }, testInfo) => {
  const habitName = `E2E Reading ${testInfo.workerIndex}-${Date.now().toString(36)}`;

  await logIn(page);
  await expect(page).toHaveURL(/\/habits$/);
  await expect(page.getByText('Habits', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Loading habits...', { exact: true })).toBeHidden();

  await page.getByLabel('Add habit').click();
  await expect(page).toHaveURL(/\/habits\/new$/);
  await expect(page.getByText('What do you want to track?', { exact: true })).toBeVisible();

  await replaceText(page.getByTestId('habit-name-input'), habitName);
  await replaceText(page.getByTestId('weekly-target-input'), '3');
  await page.getByRole('button', { name: 'Close Create Habit' }).click();

  await expect(page).toHaveURL(/\/habits$/);
  await page.getByLabel('Add habit').click();
  await expect(page.getByTestId('habit-name-input')).toHaveValue(habitName);
  await expect(page.getByTestId('weekly-target-input')).toHaveValue('3');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page).toHaveURL(/\/habits$/);
  await page.getByLabel('Add habit').click();
  await expect(page.getByTestId('habit-name-input')).toHaveValue(habitName);
  await expect(page.getByTestId('weekly-target-input')).toHaveValue('3');
  await page.getByRole('button', { name: 'Create habit', exact: true }).click();

  await expect(page).toHaveURL(/\/habits$/);
  const habitCard = page.getByRole('button', { name: new RegExp(habitName) }).first();
  await expect(habitCard).toBeVisible();

  await habitCard.click();
  await expect(page).toHaveURL(/\/habits\//);
  const detailUrl = page.url();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/habits$/);

  await page.goto(detailUrl);
  await expect(page).toHaveURL(/\/habits\//);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/habits$/);

  await page.goto(detailUrl);
  await expect(page.getByText('This week', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('All-time progress', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Last 12 weeks', { exact: true }).last()).toBeVisible();

  await page.getByRole('button', { name: 'Mark done' }).click();
  await expect(page.getByText('Done today', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Total completions', { exact: true }).last()).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Mark done' })).toBeVisible();

  await page.getByText('Archive habit', { exact: true }).click();
  await expect(page.getByText('Archive this habit?', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(/\/habits\//);

  await page.getByText('Archive habit', { exact: true }).click();
  await expect(page.getByText('Archive this habit?', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByText('Delete habit', { exact: true }).click();
  await expect(page.getByText('Delete this habit?', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(/\/habits\//);

  await page.getByText('Delete habit', { exact: true }).click();
  await expect(page.getByText('Delete this habit?', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByLabel('Back').click();
  await page.getByLabel('Add habit').click();
  await expect(page.getByTestId('habit-name-input')).toHaveValue('');
  await expect(page.getByTestId('weekly-target-input')).toHaveValue('3');
  await page.getByRole('button', { name: 'Cancel' }).click();
});

async function logIn(page: Page) {
  await page.goto('/log-in');
  await expect(page.getByText('Track your weekly habits privately.', { exact: true })).toBeVisible();

  await replaceText(page.getByPlaceholder(seededUser.email), seededUser.email);
  await replaceText(page.getByPlaceholder(seededUser.password), seededUser.password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

async function replaceText(locator: Locator, value: string) {
  await locator.click();
  await locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await locator.press('Backspace');
  await locator.pressSequentially(value);
}
