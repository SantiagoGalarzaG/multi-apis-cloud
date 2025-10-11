# syntax=docker/dockerfile:1
FROM node:20-alpine

ENV TZ=America/Bogota
ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

RUN chown -R node:node /app
USER node

ENV SERVICE_NAME=users-api
CMD ["node", "src/app.js"]
