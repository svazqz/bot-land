const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');
const { createClient } = require('@libsql/client');

async function listen(server, context) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

test('GraphQL persists a bot only when a deployment succeeds', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'bot-land-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  process.env.TURSO_DATABASE_URL = 'file:' + join(directory, 'bot-fixtures.db');
  process.env.RAILWAY_ENV = 'fixture';
  process.env.RAILWAY_PROJECT = 'fixture';
  process.env.GITHUB_REPOSITORY = 'example/fixture';
  const db = createClient({ url: process.env.TURSO_DATABASE_URL });
  context.after(() => db.close());
  const schema = await readFile(join(__dirname, '../migrations/0000_pale_genesis.sql'), 'utf8');
  for (const statement of schema.split('--> statement-breakpoint')) await db.execute(statement);

  let deploymentAccepted = false;
  const requests = [];
  const railway = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const { query } = JSON.parse(Buffer.concat(chunks));
    const operation = query.includes('mutation CreateService') ? 'create' : 'deploy';
    requests.push(operation);
    const data = operation === 'create'
      ? { serviceCreate: { id: 'fixture-bot-id' } }
      : { serviceInstanceDeploy: deploymentAccepted };
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data }));
  });

  process.env.RAILWAY_API_URL = await listen(railway, context);
  require('graphql-import-node');
  const app = await listen(createServer(require('../dist/server').default), context);
  const execute = async (query) => {
    const response = await fetch(app + '/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return response.json();
  };

  const mutation = 'mutation { createBot(name: "Fixture", description: "Test", flow: "{}", token: "fixture-token") { id name } }';
  const query = '{ getBots { id name } }';
  assert.ok((await execute(mutation)).errors?.length);
  assert.deepEqual((await execute(query)).data.getBots, []);

  deploymentAccepted = true;
  assert.deepEqual((await execute(mutation)).data.createBot, { id: 'fixture-bot-id', name: 'Fixture' });
  assert.deepEqual((await execute(query)).data.getBots, [{ id: 'fixture-bot-id', name: 'Fixture' }]);
  assert.deepEqual(requests, ['create', 'deploy', 'create', 'deploy']);
});
