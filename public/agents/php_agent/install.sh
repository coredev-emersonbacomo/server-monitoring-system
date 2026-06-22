#!/bin/bash

# Check if argument exist
if [ "$#" -ne 2 ]; then
    echo "Error: Invalid arguments"
    echo "Usage: $0 <server_id> <api_key>"
    exit 1
fi

APP_DIR="/opt/monitor-agent"

mkdir -p $APP_DIR

cd $APP_DIR

wget https://monitor.example.com/agent/agent.php

cat > config.json << EOF
{
  "server_id": "$1",
  "token": "$2",
  "api_url": "https://monitor.example.com/api/metrics"
}
EOF

cat > /etc/systemd/system/monitor-agent.service << EOF
[Unit]
Description=PHP Monitoring Agent
After=network.target

[Service]
ExecStart=/usr/bin/php $APP_DIR/agent.php
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable monitor-agent
systemctl start monitor-agent

echo "Installed successfully."
