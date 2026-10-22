
## 1. Visão Geral do Sistema

O **Indie Feedback** é um ecossistema projetado para solucionar a escassez de _playtesters_ para desenvolvedores independentes. A plataforma utiliza uma economia baseada em **Moedas de Teste**, onde o desenvolvedor precisa testar e avaliar os jogos de outros membros para acumular saldo e liberar espaço para publicar o seu próprio projeto.

O ecossistema é composto por um servidor no Discord (interface de engajamento e exibição) e uma aplicação Web Serverless (interface de formulários, autenticação e regras de negócio).

## 2. Arquitetura de Software (AWS Serverless)

A arquitetura elimina a necessidade de manter servidores dedicados ou bots com conexões WebSocket ativas 24/7. Toda a comunicação ocorre via APIs REST e processamento por eventos.

```
[ Usuário ]
    │
    ▼
[ CloudFront (CDN + SSL) ]
    │
    ▼
[ S3 Bucket (Front-end Static Hosting) ] ──(Upload Direct via Pre-signed URL)──► [ S3 Bucket (Banners) ]
    │
    ▼ (Requisições REST)
[ API Gateway (HTTP API) ]
    │
    ▼
[ AWS Lambda (Regras de Negócio) ] ◄───► [ DynamoDB (Banco de Dados) ]
    │                                              ▲
    ▼ (Requisições HTTP REST / Webhooks)           │
[ Discord API / Canal do Fórum ]        [ EventBridge Scheduler ]
                                         (Agendamento de Gincanas e Jogo da Semana)
```

### Componentes de Infraestrutura

- **Front-end Hosting:** AWS S3 (bucket estático) + AWS CloudFront (CDN global provendo certificado HTTPS obrigatório para o Discord OAuth2).
- **Armazenamento de Mídia:** AWS S3 Bucket (público para leitura de banners, protegido contra gravações não autorizadas por Pre-signed URLs).
- **Camada de API:** AWS API Gateway (HTTP API) para roteamento de endpoints REST.
- **Computação:** AWS Lambda (Node.js 20.x) executando a lógica de negócio sob demanda.
- **Banco de Dados:** AWS DynamoDB (NoSQL de baixa latência) — múltiplas tabelas por domínio.
- **Agendamento:** AWS EventBridge Scheduler para execução de tarefas pontuais (Gincanas) e recorrentes (Jogo da Semana — toda segunda-feira às 17h UTC).
- **Segredos:** AWS Secrets Manager para armazenar credenciais Discord e o `INTERNAL_SECRET` de autenticação entre serviços internos.
- **Integração Discord:** Chamadas HTTP REST para a API v10 do Discord, Webhooks de moderação e mensagens via Bot Token.

## 3. Modelo de Dados (DynamoDB)

### Tabela: `IndieFeedback-Users-{Stage}`

Armazena o saldo e dados cadastrais dos membros.

- **Partition Key:** `userId` (String — ID único do Discord)
- **Atributos:** `username`, `avatarUrl`, `balance` (Number), `role` (`'user'` | `'admin'`), `createdAt` (Number/Epoch)

### Tabela: `IndieFeedback-Games-{Stage}`

Armazena as publicações dos jogos ativos no servidor.

- **Partition Key:** `threadId` (String — ID da Thread/Tópico gerado pelo Discord)
- **Atributos:** `authorId`, `authorName`, `title`, `description`, `stage`, `tags` (List), `gameUrl`, `bannerUrl`, `isNsfw` (Boolean), `hasAiContent` (Boolean), `createdAt` (Number/Epoch)

### Tabela: `IndieFeedback-Reviews-{Stage}`

Armazena os feedbacks concedidos. A chave composta garante **impossibilidade nativa de reviews duplicadas**.

- **Partition Key:** `threadId` (String)
- **Sort Key:** `userId` (String)
- **Atributos:** `username`, `rating` (Number 1–5), `pros`, `cons`, `improvements`, `createdAt` (Number/Epoch)

### Tabela: `IndieFeedback-WeeklyGame-{Stage}`

Histórico de seleções do Jogo da Semana para o algoritmo anti-repetição.

- **Partition Key:** `weekId` (String — ex: `"2026-W43"`)
- **Atributos:** `threadId`, `gameTitle`, `gameDescription`, `gameBannerUrl`, `authorName`, `authorId`, `selectedAt` (Number/ms), `expiresAt` (Number/ms — próxima segunda às 17h UTC)

### Tabela: `IndieFeedback-Gincanas-{Stage}`

Armazena as gincanas agendadas via EventBridge Scheduler.

- **Partition Key:** `gincanasId` (String — UUID)
- **Atributos:** `message` (texto cru da gincana), `embedJson` (embed Discord pré-construído em JSON), `scheduledDate` (ISO 8601), `status` (`'scheduled'`), `eventBridgeScheduleArn`, `createdAt`

## 4. Estrutura da Aplicação Web (Front-end)

Desenvolvida em **React (Vite) + CSS Vanilla**, a aplicação web lida com os formulários detalhados e interações complexas.

| **Página / Tela**             | **Funcionalidades Principais**                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Auth / Callback**        | Processa o código do Discord OAuth2, valida o token e cria a sessão do usuário.                                                                                                                |
| **2. Dashboard (Home)**       | Exibe o saldo atual de moedas, estatísticas gerais, atalhos do sistema, o Jogo da Semana em destaque e o feed com as últimas avaliações recebidas nos jogos do usuário.                        |
| **3. Publicar Jogo**          | Form de cadastro. Solicita títulos, descrição, tags, estado, link, e toggles (NSFW/IA). Realiza upload do banner via Pre-signed URL e publica no Discord se o saldo for suficiente.            |
| **4. Submeter Review**        | Lista de jogos disponíveis pendentes de teste ordenados pelos mais recentes. Aceita acesso direto por URL (`/review/:threadId`) vindo do Discord. Contém o formulário estruturado de feedback. |
| **5. Meus Jogos (Criador)**   | Painel de controle do desenvolvedor. Exibe o feedback acumulado de cada jogo publicado e o botão para acionar **Denúncia de Review Superficial**.                                              |
| **6. Denúncia de Jogos**      | Modal/Tela acionada via lista de jogos para reportar malware, phishing/golpe, quebra de regras ou links corrompidos.                                                                           |
| **7. Histórico do Avaliador** | Lista contendo todas as avaliações que o usuário já enviou para consulta posterior.                                                                                                            |
| **8. Regras & FAQ**           | Diretrizes da comunidade, guia de qualidade para reviews, aviso legal sobre links externos e explicação sobre o cálculo dinâmico de moedas.                                                    |
| **9. Painel Admin**           | Área restrita a usuários com `role: 'admin'`. Abas: **Usuários**, **Jogos**, **Anúncios** e **🎮 Gincanas**.                                                                                   |

## 5. Painel de Administração

Acessível apenas por usuários com `role: 'admin'` no DynamoDB. Todas as rotas verificam o campo via header `x-user-id`.

| **Aba**         | **Operações**                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Usuários**    | Busca por nome/ID, visualização de saldo e role, ajuste manual de moedas (positivo ou negativo, saldo nunca vai abaixo de zero).       |
| **Jogos**       | Lista todos os jogos cadastrados com opções de moderação.                                                                              |
| **Anúncios**    | Envia mensagens com embed Discord customizado diretamente para o canal de anúncios via Bot Token.                                      |
| **🎮 Gincanas** | Calendário de gincanas. Cria, edita e exclui gincanas agendadas. Distingue "📅 Próximas" (data futura) de "✅ Realizadas" (data passada). |

## 6. Sistema de Gincanas

Permite agendar eventos ("gincanas") que são anunciados automaticamente no Discord na data e hora escolhidas.

**Fluxo completo:**
1. Admin cria uma gincana via painel web, informando a **mensagem** (texto cru) e a **data/hora** de disparo.
2. O backend (`admin/gincanas.mjs`) constrói automaticamente o **embed Discord** a partir do texto e armazena tanto o texto quanto o embed no DynamoDB.
3. Um **EventBridge Scheduler** de disparo único (`at(YYYY-MM-DDTHH:MM:SS)`) é criado, configurado para invocar a Lambda `AdminAnnouncementsFunction` na data agendada.
4. O payload do schedule inclui o `internalSecret` lido do AWS Secrets Manager para autenticação.
5. Na hora programada, a Lambda verifica o `internalSecret` com comparação `timingSafeEqual` (prevenção de timing attacks) e posta o embed no canal de anúncios do Discord.
6. O schedule é automaticamente excluído pelo EventBridge após o disparo (`ActionAfterCompletion: DELETE`).

**Segurança anti-spoofing:** O `INTERNAL_SECRET` é armazenado no AWS Secrets Manager (`IndieFeedbackDiscord-{Stage}`) e comparado com `crypto.timingSafeEqual` para evitar que invasores se passem pelo EventBridge e disparem anúncios não autorizados.

**Menção de canais no texto:** Use o formato `<#CHANNEL_ID>` com o **ID numérico** do canal (não o nome). Para obter o ID: Discord → Configurações → Avançado → Modo Desenvolvedor → botão direito no canal → "Copiar ID".

## 7. Jogo da Semana

Toda segunda-feira às 17h UTC (14h BRT), um **EventBridge Scheduler recorrente** (`cron(0 17 ? * MON *)`) dispara a Lambda `WeeklyGameSelectorFunction`.

**Algoritmo de seleção justa:**
1. Busca todos os jogos cadastrados.
2. Exclui o jogo da semana anterior (evita repetição consecutiva).
3. Conta quantas vezes cada jogo já foi selecionado no histórico.
4. Seleciona aleatoriamente entre os jogos com **menor contagem de seleções** (distribuição equitativa).
5. Salva o resultado em `IndieFeedback-WeeklyGame-{Stage}` com `expiresAt` apontando para a próxima segunda às 17h UTC.
6. Posta anúncio `@everyone` no canal de anúncios do Discord com embed dourado, botão de acesso direto ao formulário de review e destaque do bônus de moedas.

**Bônus:** Reviews no Jogo da Semana durante o período de validade concedem **+2 Moedas de Teste** (dobro do normal).

## 8. Especificação das Rotas da API (API Gateway)

### Rotas Públicas / Autenticadas por Usuário

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/discord` | Troca o código OAuth2 pelo token do Discord, cadastra o usuário (se novo) e retorna sessão. |
| `GET` | `/user/profile` | Retorna dados do usuário logado e saldo atual. |
| `GET` | `/games` | Lista jogos que o usuário ainda não avaliou. |
| `POST` | `/games/upload-url` | Gera Pre-signed URL do S3 para upload de banner (valida tipo MIME e tamanho). |
| `POST` | `/games` | Publica jogo no Discord e salva no DynamoDB (requer saldo suficiente). |
| `POST` | `/reviews` | Submete avaliação (PutItem condicional), credita moedas e posta no tópico do Discord. |
| `GET` | `/reviews/history` | Retorna todas as avaliações já enviadas pelo usuário. |
| `GET` | `/weekly-game` | Retorna o Jogo da Semana atual com dados do jogo e período de validade. |
| `POST` | `/reports/review` | Denuncia uma review superficial via Webhook no `#mod-logs`. |
| `POST` | `/reports/game` | Denuncia um jogo (malware, golpe, etc.) via Webhook no `#mod-logs`. |

### Rotas Admin (requerem `role: 'admin'` via header `x-user-id`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/admin/users` | Lista usuários (suporta busca por nome/ID, limite 50). |
| `POST` | `/admin/users/:id/coins` | Ajusta o saldo de moedas de um usuário (positivo = adicionar, negativo = remover, mínimo 0). |
| `GET` | `/admin/games` | Lista todos os jogos para moderação. |
| `POST` | `/admin/announcements` | Posta embed customizado no canal de anúncios do Discord. |
| `GET` | `/admin/gincanas` | Lista todas as gincanas cadastradas. |
| `POST` | `/admin/gincanas` | Cria gincana e agenda no EventBridge Scheduler. |
| `PUT` | `/admin/gincanas/:id` | Edita mensagem/data de gincana ainda não disparada. |
| `DELETE` | `/admin/gincanas/:id` | Cancela gincana e exclui o schedule do EventBridge. |

## 9. Regras de Negócio e Segurança

### Algoritmo do Custo Dinâmico de Publicação

O custo $C$ para publicação de um jogo é definido pela fórmula:
$$C = \min(N, 10)$$
Onde $N$ é o número total de jogos registrados ativos no banco de dados.

- Se $N = 0$ → custo **0 moedas** (primeiro jogo é gratuito)
- Se $N = 3$ → custo **3 moedas**
- Se $N \ge 10$ → custo fixo em **10 moedas**

### Algoritmo de Moedas por Review

| Situação | Moedas Creditadas |
|----------|-------------------|
| Review normal | **+1 Moeda de Teste** |
| Review no Jogo da Semana (dentro do período de validade) | **+2 Moedas de Teste** |

### Prevenção de Abusos e Spam

1. **Unicidade de Avaliações:** `ConditionExpression` no DynamoDB com chave composta `(threadId, userId)` bloqueia reviews duplicadas.
2. **Qualidade dos Textos:** Front-end e Lambda aplicam mínimo de **20 caracteres** para _Prós_, _Contras_ e _Melhorias_.
3. **Controle de Upload de Mídias:** A API valida tipo do arquivo (`image/png`, `image/jpeg`, `image/webp`) e tamanho máximo de **5 MB** na geração da Pre-signed URL.
4. **Moderação via Webhook:** Remoção de conteúdo malicioso e estorno de moedas por má-fé são notificados no `#mod-logs`, permitindo intervenções manuais no DynamoDB.
5. **Autenticação de Serviços Internos:** O EventBridge Scheduler inclui `INTERNAL_SECRET` (Secrets Manager) no payload; a Lambda verifica com `crypto.timingSafeEqual` antes de processar ações agendadas (prevenção de timing attacks e spoofing).
6. **Controle de Acesso Admin:** Todas as rotas `/admin/*` verificam `role === 'admin'` no DynamoDB antes de qualquer operação.

## 10. Deploy e Infraestrutura como Código

O backend é gerenciado via **AWS SAM** (`backend/template.yaml`). O frontend é buildado com **Vite** e sincronizado para o S3.

### Scripts disponíveis

```bash
# Backend (pasta /backend)
npm run deploy:dev    # sam build && sam deploy --config-env dev

# Frontend (pasta /frontend)
npm run deploy:dev    # vite build --mode development && aws s3 sync dist/ s3://...dev...
npm run deploy:prod   # vite build --mode production && aws s3 sync dist/ s3://...prod...
```

> ⚠️ **Deploy em produção do backend deve ser feito MANUALMENTE pelo desenvolvedor** por motivos de segurança. Nunca automatize `sam deploy --config-env prod`.

### Pré-requisitos para novo ambiente

1. Criar o secret no AWS Secrets Manager: `IndieFeedbackDiscord-{Stage}` com os campos `CLIENT_ID`, `CLIENT_SECRET`, `BOT_TOKEN`, `GUILD_ID`, `FORUM_CHANNEL_ID`, `MOD_WEBHOOK_URL`, `ANNOUNCEMENTS_CHANNEL_ID` e `INTERNAL_SECRET`.
2. Rodar `sam deploy --config-env dev` (ou `--guided` na primeira vez).
