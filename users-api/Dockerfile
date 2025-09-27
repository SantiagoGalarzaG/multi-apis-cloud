FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
# ejecuta la instalacion de las dependencias
RUN npm ci --omit=dev

COPY src ./src
# expone el puerto 4001
EXPOSE 4001
ENV PORT=4001 SERVICE_NAME=users-api
# ejecuta el comando para iniciar la aplicacion
CMD ["node", "src/app.js"]