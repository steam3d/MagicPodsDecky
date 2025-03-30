#!/bin/sh

set -e  # Stop the script if any command fails

apt update

# curl
if command -v curl >/dev/null 2>&1; then
  echo "curl is already installed"
else
  apt-get install -y curl
fi

# wget
if command -v wget >/dev/null 2>&1; then
  echo "wget is already installed"
else
  apt-get install -y wget
fi

# Node.js and npm
if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm are already installed"
else
  apt install -y nodejs npm
fi

# pnpm
if command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is already installed"
else
  npm install -g pnpm
fi

# Docker
if command -v docker >/dev/null 2>&1; then
  echo "Docker is already installed"
else
  apt-get install -y ca-certificates curl  
  install -m 0755 -d /etc/apt/keyrings  
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc  
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null  
  apt-get update  
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "All done!"