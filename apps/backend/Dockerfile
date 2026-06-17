# Stage 1: Build stage
FROM node:22-alpine AS builder

# Install pnpm matching the project manager version
RUN npm install -g pnpm@10.33.2

WORKDIR /app

# Copy lockfile, workspace configurations, and package JSONs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/backend/package.json apps/backend/package.json

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source code for shared and backend packages
COPY packages/shared packages/shared
COPY apps/backend apps/backend

# Generate Prisma client locally inside the container (no DB connection required)
RUN DATABASE_URL="placeholder" pnpm --filter @insightful-phish/backend prisma:generate

# Build the shared and backend packages (compiles TS and runs training content copy script)
RUN pnpm build:shared && pnpm build:backend

# Stage 2: Runtime stage
FROM node:22-alpine AS runner

RUN npm install -g pnpm@10.33.2

WORKDIR /app

# Copy the build outputs and node_modules from builder
COPY --from=builder /app /app

# Change context to the backend app
WORKDIR /app/apps/backend

# Expose default port
EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=development

# Switch to non-root user for security
USER node

# Runtime command
CMD ["pnpm", "start"]
