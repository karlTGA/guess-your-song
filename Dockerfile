# Server build
FROM node:20-alpine AS server-build
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN yarn install --immutable
COPY packages/shared packages/shared
COPY packages/server packages/server
RUN yarn workspace @guess-your-song/shared build && \
    yarn workspace @guess-your-song/server build

# Web build
FROM node:20-alpine AS web-build
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN yarn install --immutable
COPY packages/shared packages/shared
COPY packages/web packages/web
RUN yarn workspace @guess-your-song/shared build && \
    yarn workspace @guess-your-song/web build

# Production
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN yarn workspaces focus @guess-your-song/server --production
COPY --from=server-build /app/packages/shared/dist packages/shared/dist
COPY --from=server-build /app/packages/shared/package.json packages/shared/
COPY --from=server-build /app/packages/server/dist packages/server/dist
COPY --from=web-build /app/packages/web/dist packages/web/dist

RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV WEB_DIST_DIR=/app/packages/web/dist

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
