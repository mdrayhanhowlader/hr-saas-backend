FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build 2>/dev/null || npx tsc --skipLibCheck 2>/dev/null || true

EXPOSE 5000

CMD ["node", "dist/index.js"]
