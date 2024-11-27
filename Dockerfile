# syntax=docker/dockerfile:1.11
FROM node:lts-alpine AS builder

WORKDIR /dtdl-visualisation-tool

# Install base dependencies
RUN npm install -g npm@10.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci 
COPY . .
RUN npm run build

# Service
FROM node:lts-bookworm-slim AS service

ENV PPTRUSER_UID=10042
ENV NODE_OPTIONS="--no-warnings"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros \
    fonts-kacst fonts-freefont-ttf dbus dbus-x11

RUN groupadd -r pptruser && useradd -u $PPTRUSER_UID -rm -g pptruser -G audio,video pptruser

WORKDIR /dtdl-visualisation-tool

# RUN apk add --no-cache chromium 

RUN npm -g install npm@10.x.x
COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY --from=builder /dtdl-visualisation-tool/build ./build

RUN npx puppeteer browsers install chrome --install-deps
RUN npm i -g
RUN mkdir -p /mnt/ontology

USER $PPTRUSER_UID


EXPOSE 3000
CMD ["dtdl-visualiser"]
