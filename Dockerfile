# syntax=docker/dockerfile:1.19
FROM node:24-bookworm-slim AS builder

WORKDIR /dtdl-visualisation-tool

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci 
COPY patches ./patches
COPY . .
RUN npm run build

# Service
FROM node:24-bookworm-slim AS service

ENV PPTRUSER_UID=10042
ENV NODE_OPTIONS="--no-warnings"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PUPPETEER_PATH=/usr/bin/chromium

COPY sample ./sample
COPY scripts ./scripts

RUN apt-get update && apt-get install -y chromium --no-install-recommends

RUN groupadd -r pptruser && useradd -u $PPTRUSER_UID -rm -g pptruser -G audio,video pptruser

WORKDIR /dtdl-visualisation-tool

COPY package*.json ./
COPY patches ./patches
RUN npm ci --include=dev
RUN npx patch-package || true


COPY public ./public
COPY knexfile.js ./
COPY --from=builder /dtdl-visualisation-tool/build ./build

RUN npm i -g
RUN npm prune --omit=dev


USER $PPTRUSER_UID

EXPOSE 3000
CMD ["dtdl-visualiser", "parse", "-p", "/sample/energygrid"]
