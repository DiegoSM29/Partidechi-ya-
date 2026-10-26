FROM node:22-alpine

WORKDIR /app/backend

RUN apk add --no-cache openssl

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/server.js ./server.js
COPY shared /app/shared

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=postgresql://partidechi:build-only@localhost:5432/partidechi_db?schema=public

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
