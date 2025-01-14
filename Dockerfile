# syntax=docker/dockerfile:1.12
FROM node:lts-bookworm-slim AS builder

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
ENV CHROME_PUPPETEER_PATH=/usr/bin/chromium

COPY sample ./sample

RUN apt-get update && apt-get install -y chromium chromium-sandbox --no-install-recommends

RUN groupadd -r pptruser && useradd -u $PPTRUSER_UID -rm -g pptruser -G audio,video pptruser

WORKDIR /dtdl-visualisation-tool

RUN npm -g install npm@10.x.x
COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY knexfile.js ./
COPY --from=builder /dtdl-visualisation-tool/build ./build

RUN npm i -g

USER $PPTRUSER_UID

EXPOSE 3000
CMD ["dtdl-visualiser", "parse", "-p", "/sample/energygrid"]
