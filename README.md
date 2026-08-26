# Status Page iônica

Página pública de status da iônica, com identidade visual própria e organização de serviços sincronizada com a Status Page do Datadog.

## Arquitetura

- Next.js
- Front-end consulta apenas `/api/status`
- `/api/status` atua como proxy server-side para o endpoint público de componentes do Datadog
- Os grupos, nomes, ordem e status vêm dinamicamente da fonte oficial
- Atualização automática a cada 60 segundos
- Sem histórico de incidentes ou disponibilidade passada

## Fonte de dados

Endpoint consultado pelo servidor:

`https://status-servicos.statuspage.datadoghq.com/api/v2/components.json`

O navegador não acessa o Datadog diretamente. Isso evita dependência de CORS no cliente e permite evoluir depois para a API autenticada oficial do Datadog sem alterar a UI.

## Executar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Deploy na Vercel

1. Importe o repositório `Mia-Educacao/statuspage` na Vercel.
2. Framework preset: Next.js.
3. Não são necessárias variáveis de ambiente nesta versão.
4. Publique o projeto.

## Evolução possível

Caso o endpoint público do Datadog deixe de responder ou seja restringido, altere apenas `app/api/status/route.js` para usar a API oficial autenticada do Datadog. A camada visual não precisa mudar.
