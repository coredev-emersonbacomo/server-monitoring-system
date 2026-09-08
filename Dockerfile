# server-monitoring-system — single Dockerfile, two targets.
#
#   dev:  `docker compose up` → bind mount, Xdebug, artisan serve + vite dev
#   prod: `docker compose -f compose.yaml -f compose.prod.yaml up` on a server
#         → baked deps + built assets, opcache, no dev packages
#
# Same base layers for both — no dev/prod drift.

# ---------------------------------------------------------------- base ---
FROM php:8.5-cli-bookworm AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    postgresql-client \
    ca-certificates \
    curl \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# pdo_pgsql/pgsql (TimescaleDB), mbstring/xml/bcmath/zip (Laravel),
# sockets (Reverb), pcntl (queue/scheduler signals)
RUN docker-php-ext-install -j$(nproc) \
    pdo_pgsql \
    pgsql \
    mbstring \
    xml \
    bcmath \
    zip \
    sockets \
    pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000 8081

# ---------------------------------------------------------------- dev ----
FROM base AS dev

# Xdebug for local debugging (VS Code / PhpStorm)
RUN pecl install xdebug \
    && docker-php-ext-enable xdebug

# Deps installed at build for cache; source comes from bind mount at runtime.
COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-scripts --prefer-dist

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY docs/package.json ./docs/
# Single ci at root covers all workspaces. Docs deps install (workspace
# manifest required) but docs are never built/hosted here — local-only
# via `npm run docs` in repo root.
RUN npm ci --no-audit --no-fund

# Same boot logic as prod: migrate + conditional seed + VITE build check.
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8000} -t public"]

# ---------------------------------------------------------------- prod ---
# FrankenPHP (Caddy + PHP worker-capable server). Multithreaded + opcache —
# the prod answer to php -S (single-threaded dev only). Non-worker mode for
# now (drop-in behavior); worker mode later after a state-leak audit.
FROM dunglas/frankenphp:1-php8.5 AS prod

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    postgresql-client \
    ca-certificates \
    curl \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Node 22 via official binary tarball (pinned to local version).
# (Apt/nodejs splits npm into a separate package on trixie and NodeSource
# has no trixie repo — tarball is deterministic everywhere.)
RUN curl -fsSL https://nodejs.org/dist/v22.22.2/node-v22.22.2-linux-x64.tar.xz -o /tmp/node.tar.xz \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && rm /tmp/node.tar.xz \
    && node -v && npm -v

RUN docker-php-ext-install -j$(nproc) \
    pdo_pgsql \
    pgsql \
    mbstring \
    xml \
    bcmath \
    zip \
    sockets \
    pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# PHP deps (no dev packages)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist --optimize-autoloader

# JS deps (single ci at root covers all workspaces; docs deps install but
# docs are never built/hosted here — local-only via `npm run docs`)
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY docs/package.json ./docs/
RUN npm ci --no-audit --no-fund

# App source (no build here — entrypoint builds at boot from RUNTIME env,
# so .env.docker values always win without image rebuilds)
COPY . .

# Entrypoint: migrate + conditional frontend build, then exec CMD
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# FrankenPHP serves :8000 via the bundled Caddyfile (plain HTTP;
# TLS terminates at the edge Caddy in compose.prod.yaml).
COPY docker/frankenphp-Caddyfile /etc/caddy/Caddyfile

RUN php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear

EXPOSE 8000 8081

ENTRYPOINT ["entrypoint.sh"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
