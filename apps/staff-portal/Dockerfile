# apps/staff-portal/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/shared ./packages/shared
COPY apps/staff-portal/package*.json ./apps/staff-portal/

RUN npm install

COPY . .

WORKDIR /app/apps/staff-portal

EXPOSE 3000

CMD ["npm", "run", "dev"]
