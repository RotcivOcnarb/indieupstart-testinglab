
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
[ API Gateway ]
    │
    ▼
[ AWS Lambda (Regras de Negócio) ] ◄───► [ DynamoDB (Banco de Dados) ]
    │
    ▼ (Requisições HTTP REST / Webhooks)
[ Discord API / Canal do Fórum ]
```
### Componentes de Infraestrutura

- **Front-end Hosting:** AWS S3 (bucket estático) + AWS CloudFront (CDN global provendo certificado HTTPS obrigatório para o Discord OAuth2).
- **Armazenamento de Mídia:** AWS S3 Bucket (público para leitura de banners, protegido contra gravações não autorizadas por Pre-signed URLs).
- **Camada de API:** AWS API Gateway para roteamento de endpoints HTTP.
- **Computação:** AWS Lambda (Node.js ou Python) executando a lógica de negócio sob demanda.
- **Banco de Dados:** AWS DynamoDB (NoSQL de baixa latência).
- **Integração Discord:** Chamadas HTTP REST para a API v10 do Discord e Webhooks de moderação.
## 3. Modelo de Dados (DynamoDB)

### Tabela: `Users`

Armazena o saldo e dados cadastrais dos membros.
- **Partition Key (PK):** `userId` (String - ID único do Discord)
- **Atributos:** `username` (String), `avatarUrl` (String), `balance` (Number), `createdAt` (Number/Epoch)
### Tabela: `Games`

Armazena as publicações dos jogos ativos no servidor.
- **Partition Key (PK):** `threadId` (String - ID da Thread/Tópico gerado pelo Discord)
- **Atributos:** `authorId` (String), `title` (String), `description` (String), `stage` (String), `tags` (List of Strings), `gameUrl` (String), `bannerUrl` (String), `isNsfw` (Boolean), `hasAiContent` (Boolean), `createdAt` (Number/Epoch)
### Tabela: `Reviews`

Armazena os feedbacks concedidos. A chave composta garante a **impossibilidade nativa de reviews duplicadas**.

- **Partition Key (PK):** `threadId` (String)
- **Sort Key (SK):** `userId` (String)
- **Atributos:** `rating` (Number), `pros` (String), `cons` (String), `improvements` (String), `createdAt` (Number/Epoch)
## 4. Estrutura da Aplicação Web (Front-end)

Desenvolvida em **React (Vite) + Tailwind CSS**, a aplicação web lida com os formulários detalhados e interações complexas.

| **Página / Tela**             | **Funcionalidades Principais**                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Auth / Callback**        | Processa o código do Discord OAuth2, valida o token e cria a sessão do usuário.                                                                                                                |
| **2. Dashboard (Home)**       | Exibe o saldo atual de moedas, estatísticas gerais, atalhos do sistema e o feed com as últimas avaliações recebidas nos jogos do usuário.                                                      |
| **3. Publicar Jogo**          | Form de cadastro. Solicita títulos, descrição, tags, estado, link, e toggles (NSFW/IA). Realiza upload do banner via Pre-signed URL e publica no Discord se o saldo for suficiente.            |
| **4. Submeter Review**        | Lista de jogos disponíveis pendentes de teste ordenados pelos mais recentes. Aceita acesso direto por URL (`/review/:threadId`) vindo do Discord. Contém o formulário estruturado de feedback. |
| **5. Meus Jogos (Criador)**   | Painel de controle do desenvolvedor. Exibe o feedback acumulado de cada jogo publicado e o botão para acionar **Denúncia de Review Superficial**.                                              |
| **6. Denúncia de Jogos**      | Modal/Tela acionada via lista de jogos para reportar malware, phishing/golpe, quebra de regras ou links corrompidos.                                                                           |
| **7. Histórico do Avaliador** | Lista contendo todas as avaliações que o usuário já enviou para consulta posterior.                                                                                                            |
| **8. Regras & FAQ**           | Diretrizes da comunidade, guia de qualidade para reviews, aviso legal sobre links externos (_disclaimer_) e explicação sobre o cálculo dinâmico de moedas.                                     |

## 5. Estrutura e Integração com o Discord

### Estrutura do Servidor

- **Canal do Fórum (`#jogos-indie`):** Canal restrito onde apenas a AWS Lambda possui permissão de postagem.
- **Canal de Moderação (`#mod-logs`):** Canal privado onde Webhooks notificam administradores sobre denúncias ativas.

### Visual da Postagem no Fórum

Quando um jogo é criado no site, a Lambda faz um `POST` no Fórum criando um tópico formatado da seguinte forma:

- **Título do Tópico:** `[Estágio] Nome do Jogo`
- **Tags Aplicadas:** Tags nativas do Discord (`RPG`, `Terror`, `NSFW`, `Uso de IA`, etc.).
- **Corpo do Embed:**
    - **Sinopse/Descrição:** Texto digitado pelo autor.
    - **Imagem:** Banner de capa hospedado no S3.
    - **Campos em Destaque:** Estágio de Desenvolvimento, Autor (`@usuario`).
    - **Botão Inline (Link Direct):** Redireciona diretamente para a página do jogo (`[https://meusite.com/game/:threadId](https://meusite.com/game/:threadId)`) e para o formulário de review (`[https://meusite.com/review/:threadId](https://meusite.com/review/:threadId)`).
## 6. Especificação das Rotas da API (API Gateway)

- **`POST /auth/discord`**
    - Recebe o `code` do OAuth2, troca pelo access token do Discord, obtém o ID do usuário, cadastra no DynamoDB (se for novo) e retorna uma sessão/JWT.
- **`GET /user/profile`**
    - Retorna os dados do usuário conectado e seu saldo atual de moedas.
- **`GET /games`**
    - Retorna a lista de jogos ativos no servidor, filtrando por jogos que o usuário logado ainda não avaliou.
- **`POST /games/upload-url`**
    - Solicita uma Pre-signed URL do S3 enviando o tipo MIME do arquivo (ex: `image/png`). Retorna a URL temporária de upload e a URL pública final.
- **`POST /games`**
    - Valida se `balance >= min(total_jogos_ativos, 10)`. Deduza as moedas do usuário, chama a API do Discord para criar o tópico no Fórum e salva o registro na tabela `Games`.
- **`POST /reviews`**
    - Executa um `PutItem` condicional no DynamoDB na tabela `Reviews`. Se o par `(threadId, userId)` for único, credita +1 moeda na tabela `Users`, salva a review e envia uma mensagem formatada via REST API para o tópico correspondente no Discord.
- **`POST /reports/review`** e **`POST /reports/game`**
    - Recebem a categoria e o motivo da denúncia e disparam um disparo HTTP para o Webhook do canal privado `#mod-logs` no Discord.
## 7. Regras de Negócio e Segurança

### Algoritmo do Custo Dinâmico

O custo $C$ para publicação de um jogo é definido pela fórmula:
$$C = \min(N, 10)$$
Onde $N$ é o número total de jogos registrados ativos no banco de dados.

- Se $N = 0$, o custo é **0 moedas**.
- Se $N = 3$, o custo é **3 moedas**.
- Se $N \ge 10$, o custo torna-se fixo em **10 moedas**.
### Prevenção de Abusos e Spam

1. **Unicidade de Avaliações:** A chave composta `(threadId, userId)` no DynamoDB bloqueia tentativas de submeter mais de uma avaliação para o mesmo jogo.
2. **Qualidade dos Texto:** O front-end e a Lambda aplicam limites mínimos de caracteres para os campos obrigatorios (_Pontos Positivos_, _Pontos Negativos_ e _Melhorias_).
3. **Controle de Upload de Mídias:** A API valida o tipo do arquivo (`image/png`, `image/jpeg`, `image/webp`) e o tamanho máximo de 5 MB no momento de gerar a Pre-signed URL.
4. **Moderação Assistida por Webhook:** O processo de remoção de conteúdo malicioso ou estorno de moedas por má-fé é notificado via Webhook no canal `#mod-logs`, permitindo aos administradores executarem intervenções manuais pontuais no DynamoDB.