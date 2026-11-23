import { expect, test } from '@playwright/test';

const existingBot = { __typename: 'Bot', id: '1', name: 'Existing bot', description: 'Fixture', flow: '{}' };

async function mockGraphQL(page, { failList = false, failMutation = false } = {}) {
  const bots = [existingBot];
  const creations = [];
  await page.route('**/graphql', async route => {
    const request = route.request().postDataJSON();
    if (request.operationName === 'BotList') {
      await route.fulfill({ json: failList ? { errors: [{ message: 'Fixture unavailable' }] } : { data: { getBots: bots } } });
      return;
    }
    expect(request.operationName).toBe('CreateBot');
    creations.push(request.variables);
    if (failMutation) {
      await route.fulfill({ json: { errors: [{ message: 'Fixture unavailable' }] } });
      return;
    }
    const { token, ...bot } = request.variables;
    bots.push({ ...bot, __typename: 'Bot', id: '2' });
    await route.fulfill({ json: { data: { createBot: { ...bot, __typename: 'Bot', token } } } });
  });
  return creations;
}

test('validates empty fields and refreshes the list after creation', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', message => consoleMessages.push(message.text()));
  const creations = await mockGraphQL(page);
  await page.goto('/');
  await expect(page.getByText('Existing bot')).toBeVisible();
  await page.getByRole('button', { name: 'Create Bot' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Submit' }).click();
  await expect(dialog.getByText('Name is required')).toBeVisible();
  await expect(dialog.getByText('Token is required')).toBeVisible();
  expect(creations).toEqual([]);

  await dialog.getByLabel('Bot Name').fill('Created fixture');
  await dialog.getByLabel('Description').fill('Created description');
  await dialog.getByLabel('Telegram Bot Token').fill('synthetic-test-token');
  await dialog.getByRole('button', { name: 'Submit' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Created fixture')).toBeVisible();
  expect(creations).toEqual([{
    name: 'Created fixture', description: 'Created description', token: 'synthetic-test-token', flow: '{}',
  }]);
  expect(consoleMessages.join('\n')).not.toContain('synthetic-test-token');
});

test('reports a failed list request', async ({ page }) => {
  await mockGraphQL(page, { failList: true });
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('Could not load bots.');
});

test('keeps the form available when creation fails', async ({ page }) => {
  await mockGraphQL(page, { failMutation: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Bot' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Bot Name').fill('Retry fixture');
  await dialog.getByLabel('Telegram Bot Token').fill('synthetic-retry-token');
  await dialog.getByRole('button', { name: 'Submit' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Could not create the bot. Try again.');
  await expect(dialog.getByLabel('Bot Name')).toHaveValue('Retry fixture');
  await expect(dialog.getByRole('button', { name: 'Submit' })).toBeEnabled();
});
