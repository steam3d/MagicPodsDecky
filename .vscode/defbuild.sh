#!/usr/bin/env bash
CLI_LOCATION="$(pwd)/cli"
PLUGIN_NAME="$1"
PLUGIN_ZIP_NAME="$2"
printf "Building plugin in $(pwd)"

# default build
echo "rootpass" | sudo -S $CLI_LOCATION/decky plugin build $(pwd)

# use repo folder as name
#echo "rootpass" | sudo -S "$CLI_LOCATION/decky" plugin build -s directory "$(pwd)"
#echo "rootpass" | sudo -S mv "$(pwd)/out/${PLUGIN_NAME}.zip" "$(pwd)/out/${PLUGIN_ZIP_NAME}.zip"