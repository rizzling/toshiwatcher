FROM node:18

WORKDIR /usr/toshiwatcher

COPY package*.json ./

ENV SEC_K=$SEC_K

RUN npm install

COPY . .

CMD ["node", "bot.js"]
