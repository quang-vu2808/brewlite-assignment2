FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY next.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
ARG NEXT_PUBLIC_API_URL=http://localhost:3081
ARG BREWLITE_REVISION=local
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN node -e 'require("node:fs").writeFileSync("public/release.json", JSON.stringify({api: process.env.NEXT_PUBLIC_API_URL, revision: process.argv[1]}))' "$BREWLITE_REVISION"
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
