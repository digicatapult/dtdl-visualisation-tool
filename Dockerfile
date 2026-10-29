# syntax=docker/dockerfile:1.28@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b
FROM node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS builder

WORKDIR /dtdl-visualisation-tool

RUN npm install -g npm@12.0.1

COPY package*.json ./
COPY tsconfig.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci 
COPY . .
RUN npm run build

# Service
FROM node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS service

RUN npm install -g npm@12.0.1

ENV PPTRUSER_UID=10042
ENV NODE_OPTIONS="--no-warnings"
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PUPPETEER_PATH=/usr/bin/chromium

COPY sample ./sample
COPY scripts ./scripts

RUN apt-get update && apt-get upgrade -y && apt-get install -y chromium --no-install-recommends && rm -rf /var/lib/apt/lists/*

RUN groupadd -r pptruser && useradd -u $PPTRUSER_UID -rm -g pptruser -G audio,video pptruser

WORKDIR /dtdl-visualisation-tool

COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY knexfile.js ./
COPY --from=builder /dtdl-visualisation-tool/build ./build

RUN npm i -g

USER $PPTRUSER_UID

EXPOSE 3000
CMD ["dtdl-visualiser", "parse", "-p", "/sample/energygrid"]
