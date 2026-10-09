# syntax=docker/dockerfile:1
# Multi-stage build optimized for Next.js monorepo

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace config FIRST (cached)
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/

# Install ALL workspace dependencies (needed for shared package)
RUN --mount=type=cache,target=/app/node_modules,id=staff-portal-npm \
    npm ci --workspaces=false --prefer-offline --no-audit

# Copy packages source
COPY packages/shared ./packages/shared

# Copy staff-portal
COPY apps/staff-portal/package*.json ./apps/staff-portal/
COPY apps/staff-portal ./apps/staff-portal

WORKDIR /app/apps/staff-portal

# Build Next.js
RUN --mount=type=cache,target=/app/apps/staff-portal/node_modules \
    npm run build

# Final stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts from builder
COPY --from=builder /app/apps/staff-portal/.next ./.next
COPY --from=builder /app/apps/staff-portal/public ./public
COPY --from=builder /app/apps/staff-portal/package*.json ./
COPY --from=builder /app/packages/shared ./packages/shared

# Reinstall only production deps
RUN --mount=type=cache,target=/app/node_modules,id=staff-portal-prod \
    npm ci --omit=dev --prefer-offline --no-audit \
    && rm -rf .npm

EXPOSE 3000

CMD ["npm", "start"]
