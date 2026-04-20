#!/bin/bash

set -e

cd "$(dirname "$0")"

echo "Building template_settings test..."
go build -o template_settings_test .

echo "Running template_settings test..."
./template_settings_test

echo "Cleaning up..."
rm -f template_settings_test
