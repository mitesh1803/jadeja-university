# Stage 1: Install all dependencies

FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

 # Stage 2: Generate Prisma client + bundle app code

FROM deps AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

# # Stage 3: Production image

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
