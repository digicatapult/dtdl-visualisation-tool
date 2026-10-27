# syntax=docker/dockerfile:1.28@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b
FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS builder

WORKDIR /dtdl-visualisation-tool

RUN npm install -g npm@12.2.1

COPY package*.json ./
COPY tsconfig.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci
COPY . .
RUN npm run build
RUN npm ci --omit=dev && npm cache clean --force

# Service
FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS service

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v1.22.22 \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

ENV PPTRUSER_UID=10042
ENV NODE_OPTIONS="--no-warnings"
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PUPPETEER_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PATH="/dtdl-visualisation-tool/node_modules/.bin:${PATH}"

COPY sample ./sample
COPY scripts ./scripts

# Refresh the snapshot and Chromium pin together after reviewing Debian security updates.
RUN sed -i \
      -e 's|http://deb.debian.org/debian-security|http://snapshot.debian.org/archive/debian-security/20261027T000000Z|' \
      -e 's|http://deb.debian.org/debian|http://snapshot.debian.org/archive/debian/20261027T000000Z|' \
      /etc/apt/sources.list.d/debian.sources \
    && apt-get -o Acquire::Check-Valid-Until=false -o APT::Update::Error-Mode=any update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends chromium=156.0.8078.47-1~deb12u1 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r pptruser && useradd -u $PPTRUSER_UID -rm -g pptruser -G audio,video pptruser

WORKDIR /dtdl-visualisation-tool

COPY package*.json ./
COPY --from=builder /dtdl-visualisation-tool/node_modules ./node_modules

COPY public ./public
COPY knexfile.js ./
COPY --from=builder /dtdl-visualisation-tool/build ./build

RUN chmod 755 build/index.js && ln -s /dtdl-visualisation-tool/build/index.js /usr/local/bin/dtdl-visualiser

USER $PPTRUSER_UID

EXPOSE 3000
CMD ["dtdl-visualiser", "parse", "-p", "/sample/energygrid"]
