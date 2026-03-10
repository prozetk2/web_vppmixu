ARG DATABASE_URL="postgresql://app:app@localhost:5432/appdb?schema=public"
ARG DIRECT_URL="postgresql://app:app@localhost:5432/appdb?schema=public"

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ARG DATABASE_URL
ARG DIRECT_URL
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ARG DATABASE_URL
ARG DIRECT_URL
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
ARG DATABASE_URL
ARG DIRECT_URL
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}
COPY --from=build /app/package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
RUN npm run prisma:generate
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:migrate:deploy || echo 'WARNING: Migration failed, starting app anyway...' && node dist/src/main"]
