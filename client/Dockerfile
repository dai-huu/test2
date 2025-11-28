FROM node:14-alpine

WORKDIR /app
#COPY package.json .
COPY package.json package-lock.json ./
RUN npm install
COPY . .

CMD ["npm", "run", "dev"]