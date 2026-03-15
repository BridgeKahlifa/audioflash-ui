FROM node:22-bookworm-slim AS base

WORKDIR /app/mobile
ENV EXPO_NO_TELEMETRY=1

COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci

FROM base AS dev

WORKDIR /app
COPY mobile ./mobile
COPY packages ./packages
WORKDIR /app/mobile
EXPOSE 8081 19000 19001 19002
CMD ["node", "scripts/dev-web-with-reload.mjs"]

FROM base AS build

ARG EXPO_PUBLIC_OPENROUTER_API_KEY=""
ARG EXPO_PUBLIC_AI_MODEL="anthropic/claude-haiku-4-5"
ARG EXPO_PUBLIC_SUPABASE_URL=""
ARG EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""

ENV EXPO_PUBLIC_OPENROUTER_API_KEY=$EXPO_PUBLIC_OPENROUTER_API_KEY
ENV EXPO_PUBLIC_AI_MODEL=$EXPO_PUBLIC_AI_MODEL
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

WORKDIR /app
COPY mobile ./mobile
COPY packages ./packages
WORKDIR /app/mobile
RUN npx expo export --platform web

FROM nginx:1.27-alpine AS production

COPY --from=build /app/mobile/dist /usr/share/nginx/html
EXPOSE 80
