FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /app
RUN npm install --global pnpm@8.15.9
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tests/browser/package*.json tests/browser/
RUN npm ci --prefix tests/browser --no-audit --no-fund
COPY . .
RUN VITE_BACKEND_SERVICE_URL=/graphql pnpm build
CMD ["tests/browser/node_modules/.bin/playwright", "test", "--config", "tests/browser/playwright.config.mjs"]
