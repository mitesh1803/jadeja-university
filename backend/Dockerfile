# Stage 1: Install all dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Generate Prisma client + bundle app code
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production image
FROM node:24-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER node
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]