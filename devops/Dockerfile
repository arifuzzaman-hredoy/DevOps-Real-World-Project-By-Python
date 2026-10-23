FROM node:22-alpine AS build
ARG APP_DIR=frontend
ARG BACKEND_URL=http://127.0.0.1:3001
WORKDIR /app
COPY ${APP_DIR}/package.json ${APP_DIR}/package-lock.json ./
RUN npm ci
COPY ${APP_DIR}/ ./
ENV BACKEND_URL=${BACKEND_URL}
RUN npm run build

FROM node:22-alpine AS runtime
ARG SERVICE_PORT=3000
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=${SERVICE_PORT}
RUN addgroup -S app && adduser -S app -G app
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER app
EXPOSE ${SERVICE_PORT}
CMD ["node", "server.js"]
