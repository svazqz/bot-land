#!/bin/sh
set -eu
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

cp -R /src/service/src /src/service/tests /src/service/migrations "$workdir"
cp /src/service/package.json /src/service/pnpm-lock.yaml /src/service/tsconfig.json "$workdir"
cd "$workdir"

npm install --global pnpm@8.15.9 --no-audit --no-fund
pnpm install --frozen-lockfile
pnpm exec tsc
cp src/graphql/schema.graphql dist/graphql/schema.graphql
node --experimental-test-coverage --test-coverage-lines=95 \
  --test-coverage-include='dist/services/railway/createAndDeployService.js' \
  --test tests/railway.test.cjs
node --test tests/graphql.integration.cjs
