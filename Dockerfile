FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm start"]
