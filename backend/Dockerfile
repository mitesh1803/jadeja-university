# Stage 1: Install dependencies
FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Stage 2: Generate Prisma client and build application
FROM deps AS build

WORKDIR /app

COPY src ./src
COPY prisma ./prisma
COPY package*.json ./

RUN npx prisma generate && npm run build

# Stage 3: Production image
FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

USER node

EXPOSE 4000

CMD ["node", "dist/index.js"]
