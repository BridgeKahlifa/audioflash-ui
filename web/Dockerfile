FROM node:20-alpine AS deps
WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web ./web
COPY packages ./packages

WORKDIR /app/web
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/web

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/web/package.json ./package.json
COPY --from=builder /app/web/package-lock.json ./package-lock.json
COPY --from=builder /app/web/node_modules ./node_modules
COPY --from=builder /app/web/.next ./.next
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/web/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
