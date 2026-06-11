#!/bin/bash

systemctl stop monitor-agent
systemctl disable monitor-agent

rm -f /etc/systemd/system/monitor-agent.service

rm -rf /opt/monitor-agent

systemctl daemon-reload

echo "Agent removed."
