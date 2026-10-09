FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS checks
COPY . .
CMD ["npm", "run", "check"]

FROM checks AS build
# base-path для SPA (CI передаёт /<env>/platform-xops/; локально '/')
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN npm run build

FROM checks AS browser-tests
RUN npx playwright install --with-deps chromium
CMD ["npm", "run", "test:e2e"]

FROM nginx:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/api/health || exit 1
