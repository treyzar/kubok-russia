#!/bin/bash
set -e

echo "Running Admin Handler Integration Tests..."
cd "$(dirname "$0")"
go run main.go
