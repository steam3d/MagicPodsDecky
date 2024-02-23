#!/usr/bin/env bash
CLI_LOCATION="$(pwd)/cli"
printf "Building plugin in $(pwd)"
echo "rootpass" | sudo -S $CLI_LOCATION/decky plugin build $(pwd)
