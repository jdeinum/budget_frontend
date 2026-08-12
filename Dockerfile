# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-budget-frontend,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Reinstall with --prod into a clean stage rather than pruning devDependencies
# out of the builder's node_modules — keeps the runtime image from inheriting
# any build-time-only native modules pulled in transitively.
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm-budget-frontend,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile && \
    addgroup -g 1001 -S nodejs && adduser -S sveltekit -u 1001 && \
    chown -R sveltekit:nodejs /app

USER sveltekit

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["node", "build"]
