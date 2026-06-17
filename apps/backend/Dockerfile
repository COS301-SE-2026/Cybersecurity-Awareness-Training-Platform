FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm 
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --filter @insightful-phish/backend...

COPY apps/backend/tsconfig.json apps/backend/tsconfig.eslint.json apps/backend/
COPY apps/backend/prisma apps/backend/prisma
COPY apps/backend/scripts apps/backend/scripts
COPY apps/backend/src apps/backend/src

COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src

# Generate Prisma Client (uses dummy DATABASE_URL to bypass validation during prisma generate)
ENV DATABASE_URL=postgresql://localhost:5432/db
RUN pnpm --filter @insightful-phish/backend exec prisma generate

RUN pnpm --filter @insightful-phish/backend build

FROM node:22-alpine AS runtime

ENV PNPM_HOME=/pnpm 
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# Copy files with node ownership
COPY --chown=node:node package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/backend/package.json apps/backend/package.json
COPY --chown=node:node packages/shared/package.json packages/shared/package.json

COPY --chown=node:node --from=builder /workspace/node_modules ./node_modules
COPY --chown=node:node --from=builder /workspace/apps/backend/node_modules ./apps/backend/node_modules
COPY --chown=node:node --from=builder /workspace/packages/shared/node_modules ./packages/shared/node_modules
COPY --chown=node:node --from=builder /workspace/apps/backend/dist ./apps/backend/dist
COPY --chown=node:node --from=builder /workspace/packages/shared/src ./packages/shared/src
COPY --chown=node:node --from=builder /workspace/apps/backend/prisma ./apps/backend/prisma

USER node

EXPOSE 4000

ENV PORT=4000

CMD ["node", "--import", "tsx", "apps/backend/dist/src/server.js"]
