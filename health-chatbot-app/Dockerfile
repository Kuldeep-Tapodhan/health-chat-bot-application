# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables needed during build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID
ARG NEXT_PUBLIC_APPWRITE_DATABASE_ID

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APPWRITE_ENDPOINT=${NEXT_PUBLIC_APPWRITE_ENDPOINT}
ENV NEXT_PUBLIC_APPWRITE_PROJECT_ID=${NEXT_PUBLIC_APPWRITE_PROJECT_ID}
ENV NEXT_PUBLIC_APPWRITE_DATABASE_ID=${NEXT_PUBLIC_APPWRITE_DATABASE_ID}

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
