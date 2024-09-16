FROM node:current-alpine AS builder

WORKDIR /dtdl-visulaisation-tool

# Install base dependencies
RUN npm install -g npm@10.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build
RUN npm i -g
CMD ["dtdl-visulaiser", "help"] 