FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

ENV SEC_K=$SEC_K

RUN npm install

COPY . .

CMD ["node", "bot.js"]
