#!/bin/sh
set -e
mkdir -p /backend/out
mkdir -p /backend/out/lib
cp /app/build/magicpodscore /backend/out
cp /app/runtime-libs/* /backend/out/lib
