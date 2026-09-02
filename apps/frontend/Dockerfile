FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm 
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --filter @insightful-phish/frontend...

COPY apps/frontend/index.html apps/frontend/vite.config.ts apps/frontend/tsconfig.json apps/frontend/tsconfig.app.json apps/frontend/tsconfig.node.json apps/frontend/
COPY apps/frontend/.flowbite-react apps/frontend/.flowbite-react
COPY apps/frontend/public apps/frontend/public
COPY apps/frontend/src apps/frontend/src

COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src

ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm --filter @insightful-phish/frontend build

FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf && \
	sed -i 's|pid .*nginx.pid;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf && \
	printf '%s\n' \
	'server {' \
	'	listen 8080;' \
	'	server_name _;' \
	'	root /usr/share/nginx/html;' \
	'	index index.html;' \
	'' \
	'	location / {' \
	'	try_files $uri $uri/ /index.html;' \
	'	}' \
	'}' \
	> /etc/nginx/conf.d/default.conf && \
	chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx

COPY --from=builder /workspace/apps/frontend/dist/ /usr/share/nginx/html/

RUN chmod -R a-w /usr/share/nginx/html && \
	chmod -R a+rX /usr/share/nginx/html

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
