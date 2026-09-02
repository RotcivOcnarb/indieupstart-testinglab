#!/usr/bin/env bash
set -e

echo "🚀 Iniciando deployment do Backend (Stage: PROD)..."
cd "$(dirname "$0")/.."

echo "📦 1. Compilando o template SAM..."
sam build

echo "☁️ 2. Fazendo upload e deploy para AWS CloudFormation (indie-feedback-backend-prod)..."
sam deploy --config-env prod

echo "🎉 Deploy de PROD concluído com sucesso!"
