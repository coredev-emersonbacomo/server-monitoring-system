#!/bin/bash

set -e

APP_DIR="/opt/monitor-agent"
SERVICE_NAME="monitor-agent"

API_URL="http://your-monitoring-server.com/api/metrics"
TOKEN="CHANGE_THIS_TO_REAL_TOKEN"
SERVER_ID=$(hostname)-$(date +%s)

echo "Installing monitoring agent..."

# Install Node.js if missing
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Create directory
sudo mkdir -p $APP_DIR

# Copy agent (we assume agent.js is downloaded separately or embedded)
sudo cp ./agent.js $APP_DIR/agent.js

# Install dependencies
cd $APP_DIR
sudo npm init -y
sudo npm install axios systeminformation

# Create config file
cat <<EOF | sudo tee $APP_DIR/config.json
{
  "apiUrl": "$API_URL",
  "token": "$TOKEN",
  "serverId": "$SERVER_ID"
}
EOF

# Create systemd service
cat <<EOF | sudo tee /etc/systemd/system/$SERVICE_NAME.service
[Unit]
Description=Monitoring Agent
After=network.target

[Service]
ExecStart=/usr/bin/node $APP_DIR/agent.js
Restart=always
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl daemon-reexec
sudo systemctl enable $SERVICE_NAME
sudo systemctl start $SERVICE_NAME

echo "Installation complete!"
echo "Server ID: $SERVER_ID"