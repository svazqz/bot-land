const assert = require('node:assert/strict');
const { afterEach, before, mock, test } = require('node:test');

let deploy;
before(() => {
  process.env.RAILWAY_API_URL = 'https://railway.invalid/graphql';
  process.env.RAILWAY_ENV = 'fixture-environment';
  deploy = require('../dist/services/railway/createAndDeployService').createAndDeployService;
});

afterEach(() => mock.restoreAll());

function fixtureFetch(results) {
  const requests = [];
  mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, process.env.RAILWAY_API_URL);
    const request = JSON.parse(options.body);
    requests.push(request);
    const result = results[requests.length - 1];
    if (result instanceof Error) throw result;
    return Response.json(result[1], { status: result[0] });
  });
  return requests;
}

test('deploys the created service before returning an ID', async () => {
  const requests = fixtureFetch([
    [200, { data: { serviceCreate: { id: 'fixture-service' } } }],
    [200, { data: { serviceInstanceDeploy: true } }],
  ]);
  assert.equal(await deploy('fixture-project', 'example/bot', 'fixture-token'), 'fixture-service');
  assert.match(requests[0].query, /mutation CreateService/);
  assert.equal(requests[0].variables.input.source.repo, 'example/bot');
  assert.equal(requests[0].variables.input.variables.TELEGRAM_BOT_TOKEN, 'fixture-token');
  assert.deepEqual(requests[1].variables, { serviceId: 'fixture-service', environmentId: 'fixture-environment' });
});

test('does not deploy when Railway rejects creation', async () => {
  const requests = fixtureFetch([[400, { errors: ['fixture create failure'] }]]);
  assert.equal(await deploy('project', 'example/bot', 'fixture-token'), undefined);
  assert.equal(requests.length, 1);
});

test('does not return an ID when Railway reports a failed deployment', async () => {
  const requests = fixtureFetch([
    [200, { data: { serviceCreate: { id: 'fixture-service' } } }],
    [200, { data: { serviceInstanceDeploy: false } }],
  ]);
  assert.equal(await deploy('project', 'example/bot', 'fixture-token'), undefined);
  assert.equal(requests.length, 2);
});

test('handles a transport error', async () => {
  fixtureFetch([new Error('fixture transport error')]);
  assert.equal(await deploy('project', 'example/bot', 'fixture-token'), undefined);
});
