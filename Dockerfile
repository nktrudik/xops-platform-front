FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS checks
COPY . .
CMD ["npm", "run", "check"]

FROM checks AS build
RUN npm run check && npm run build

FROM dependencies AS browser-dependencies
RUN npx playwright install --with-deps --only-shell chromium

FROM browser-dependencies AS browser-tests
COPY . .
CMD ["npm", "run", "test:e2e"]

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server/config.mjs server/embedding.mjs server/http.mjs server/index.mjs ./server/
COPY --chown=node:node config ./config
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
