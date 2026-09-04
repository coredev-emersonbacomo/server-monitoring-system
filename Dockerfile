# server-monitoring-system — single Dockerfile, two targets.
#
#   dev:  `docker compose up` → bind mount, Xdebug, artisan serve + vite dev
#   prod: `docker compose -f compose.yaml -f compose.prod.yaml up` (or Render)
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

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

# ---------------------------------------------------------------- prod ---
FROM base AS prod

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
# so Render dashboard / .env.docker values always win without image rebuilds)
COPY . .

# Entrypoint: migrate + conditional frontend build, then exec CMD
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Production PHP tuning
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.enable_cli=1" >> /usr/local/etc/php/conf.d/opcache.ini \
    && php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear

ENTRYPOINT ["entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
