#!/usr/bin/env bash
#
# install-redis: Installs Redis on Linux via the system package manager
# (apt / dnf / pacman), falling back to building from source.
#
# Usage:  ./scripts/install-redis.sh            # system-wide (needs sudo)
#          ./scripts/install-redis.sh --user     # user-local (~/.local, no sudo)
#
# After installing, the script starts Redis as a daemon on 127.0.0.1:6379
# and verifies the binary responds to `redis-server --version` / `redis-cli ping`.

set -euo pipefail

USER_LOCAL=0
if [[ "${1:-}" == "--user" ]]; then
    USER_LOCAL=1
fi

run() {
    if (( USER_LOCAL == 1 )); then
        "$@"
    else
        sudo "$@"
    fi
}

have() { command -v "$1" >/dev/null 2>&1; }

echo "==> Detecting package manager"

if have apt-get; then
    PKG_OK=1
    echo "    apt-get detected"
    if (( USER_LOCAL == 1 )); then
        echo "    (apt install needs root; switching to source build for --user)"
        SRC=1
    else
        run apt-get update -y
        run apt-get install -y redis-server
        run systemctl enable --now redis-server 2>/dev/null || true
        SRC=0
    fi
elif have dnf; then
    echo "    dnf detected"
    if (( USER_LOCAL == 1 )); then
        echo "    (dnf install needs root; switching to source build for --user)"
        SRC=1
    else
        run dnf install -y redis
        run systemctl enable --now redis 2>/dev/null || true
        SRC=0
    fi
elif have pacman; then
    echo "    pacman detected"
    if (( USER_LOCAL == 1 )); then
        echo "    (pacman install needs root; switching to source build for --user)"
        SRC=1
    else
        run pacman -Sy --noconfirm redis
        run systemctl enable --now redis 2>/dev/null || true
        SRC=0
    fi
elif have yum; then
    echo "    yum detected"
    if (( USER_LOCAL == 1 )); then
        echo "    (yum install needs root; switching to source build for --user)"
        SRC=1
    else
        run yum install -y redis
        run systemctl enable --now redis 2>/dev/null || true
        SRC=0
    fi
else
    echo "    no supported package manager found; building from source"
    SRC=1
fi

if [[ "${SRC:-0}" == "1" ]]; then
    if ! have gcc || ! have make || ! have tcl; then
        if (( USER_LOCAL == 1 )); then
            echo "ERROR: building from source needs gcc, make, and tcl." \
                 "Install them via your package manager first." >&2
            exit 1
        fi
        echo "    installing build deps"
        if have apt-get; then
            run apt-get update -y
            run apt-get install -y build-essential tcl
        elif have dnf || have yum; then
            run dnf install -y gcc make tcl 2>/dev/null || run yum install -y gcc make tcl
        elif have pacman; then
            run pacman -S --noconfirm base-devel tcl
        else
            echo "ERROR: cannot install build deps on this distro." >&2
            exit 1
        fi
    fi

    SRC_URL="https://download.redis.io/redis-stable.tar.gz"
    echo "==> Building Redis from source (latest stable)"
    tmpdir="$(mktemp -d)"
    trap 'rm -rf "$tmpdir"' EXIT
    pushd "$tmpdir" >/dev/null
    curl -fsSL "$SRC_URL" -o redis.tar.gz
    tar xzf redis.tar.gz
    cd redis-stable
    make -j"$(nproc)"
    make test
    if (( USER_LOCAL == 1 )); then
        mkdir -p "$HOME/.local/bin"
        cp src/redis-server src/redis-cli "$HOME/.local/bin/"
        echo "    (add \$HOME/.local/bin to your PATH)"
    else
        run cp src/redis-server src/redis-cli /usr/local/bin/
    fi
    popd >/dev/null
fi

echo "==> Verifying Redis installation"
if ! redis-server --version >/dev/null 2>&1; then
    echo "ERROR: redis-server not found on PATH" >&2
    exit 1
fi

# Ensure redis-server is running on the default port.
if redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "    Redis is already running."
else
    echo "    Starting redis-server as daemon (127.0.0.1:6379) ..."
    redis-server --daemonize yes --bind 127.0.0.1 --port 6379
    # give it a moment to come up
    for _ in $(seq 1 25); do
        if redis-cli ping 2>/dev/null | grep -q PONG; then
            break
        fi
        sleep 0.2
    done
fi

if redis-cli ping | grep -q PONG; then
    echo "OK: Redis is running and responding to PING"
    redis-server --version
else
    echo "ERROR: redis-cli ping did not reply PONG" >&2
    exit 1
fi
