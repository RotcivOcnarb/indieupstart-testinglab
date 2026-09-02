#!/usr/bin/env bash
set -e

echo "🚀 Iniciando deployment do Backend (Stage: DEV)..."
cd "$(dirname "$0")/.."

echo "📦 1. Compilando o template SAM..."
sam build

echo "☁️ 2. Fazendo upload e deploy para AWS CloudFormation (indie-feedback-backend-dev)..."
sam deploy --config-env dev

echo "✅ Deploy de DEV concluído com sucesso!"
