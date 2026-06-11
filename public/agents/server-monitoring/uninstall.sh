#!/bin/bash

SERVICE_NAME="monitor-agent"
APP_DIR="/opt/monitor-agent"

echo "Stopping service..."
sudo systemctl stop $SERVICE_NAME || true
sudo systemctl disable $SERVICE_NAME || true

echo "Removing service file..."
sudo rm -f /etc/systemd/system/$SERVICE_NAME.service

echo "Removing agent files..."
sudo rm -rf $APP_DIR

echo "Reloading systemd..."
sudo systemctl daemon-reload

echo "Uninstall complete."