# Diretrizes e Regras do Projeto (AGENTS.md)

Este arquivo contém as instruções e restrições permanentes para assistentes de IA trabalhando neste repositório.

## 🚨 Regras Críticas de Deploy e Infraestrutura

1. **PROIBIDO DEPLOY EM PRODUÇÃO (`prod`)**:
   - **NUNCA** execute comandos de deploy direcionados para o ambiente de produção (ex: `sam deploy --config-env prod`, `npm run deploy:prod`, etc.).
   - O deploy em produção deve ser feito **estritamente de forma manual** pelo desenvolvedor por motivos de segurança.

2. **PERMITIDO APENAS DEPLOY EM DESENVOLVIMENTO (`dev`)**:
   - Deploys automatizados devem ser feitos **EXCLUSIVAMENTE** no ambiente de desenvolvimento (`dev`) (ex: `sam deploy --config-env dev`, `npm run deploy:dev`).

3. **CONFIRMAÇÃO E SEGURANÇA**:
   - Sempre confirme com o usuário antes de aplicar alterações destrutivas em bancos de dados ou serviços AWS.
