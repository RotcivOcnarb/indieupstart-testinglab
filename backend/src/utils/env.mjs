/**
 * Retorna o nome do recurso (Tabela DynamoDB ou Bucket S3) formatado dinamicamente com o STAGE.
 *
 * @param {string} [envVarValue] - Valor da variável de ambiente (ex: process.env.USERS_TABLE).
 * @param {string} defaultBaseName - Nome base padrão caso a variável não esteja definida (ex: 'IndieFeedback-Users').
 * @returns {string} - Nome completo do recurso formatado com o sufixo do STAGE (ex: 'IndieFeedback-Users-dev').
 */
export const getResourceName = (envVarValue, defaultBaseName) => {
  const baseName = envVarValue || defaultBaseName;
  const stage = process.env.STAGE;

  if (stage) {
    // Se o nome base já contém o sufixo ou infixo do estágio (ex: -dev ou -dev-account-region), não duplica
    const stagePattern = new RegExp(`-${stage}($|-)`, 'i');
    if (!stagePattern.test(baseName)) {
      return `${baseName}-${stage}`;
    }
  }

  return baseName;
};

export const getTableName = getResourceName;
