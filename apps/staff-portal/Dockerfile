# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Copy root workspace config and workspace manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/staff-portal/package*.json ./apps/staff-portal/
COPY apps/student-app/package*.json ./apps/student-app/

# Install dependencies across all workspaces
RUN npm ci

# Copy sources
COPY packages/shared ./packages/shared
COPY apps/staff-portal ./apps/staff-portal

WORKDIR /app/apps/staff-portal

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "dev"]
