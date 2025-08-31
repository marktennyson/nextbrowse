#!/usr/bin/env bash

echo "This script is deprecated. Use ./install.sh and ./restart.sh instead."
if [ -x ./restart.sh ]; then
    exec ./restart.sh
fi
exit 1