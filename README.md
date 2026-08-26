# Status Page iônica

Página pública de status da iônica, com identidade visual própria e organização de serviços sincronizada com a Status Page do Datadog.

## Arquitetura

- Next.js
- Front-end consulta apenas `/api/status`
- `/api/status` acessa a página pública do Datadog no backend
- O HTML retornado é interpretado server-side para reconstruir grupos, serviços, ordem e status
- Atualização automática a cada 60 segundos
- Sem histórico de incidentes ou disponibilidade passada

## Fonte de dados atual

Página consultada pelo servidor:

`https://status-servicos.statuspage.datadoghq.com/`

Nesta versão não usamos o endpoint `/api/v2/components.json`, pois ele está respondendo com HTTP 403.

O navegador não acessa o Datadog diretamente. A leitura ocorre no backend e a interface consome apenas o JSON normalizado de `/api/status`.

A estrutura HTML padrão do Statuspage expõe os grupos como componentes `is-group`, os serviços filhos em `child-components-container` e os estados atuais em `data-component-status`. O backend converte essa estrutura para o mesmo modelo de componentes esperado pela interface.

## Importante

Esta integração por leitura do HTML é uma solução temporária até termos acesso à API oficial. Como depende da estrutura da página pública, uma mudança futura no HTML do Statuspage pode exigir ajuste no parser.

Quando a API oficial estiver liberada, será necessário alterar apenas `app/api/status/route.js`. A interface e a atualização automática não precisam mudar.

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

## Fluxo

```text
Browser
  ↓
GET /api/status
  ↓
Next.js server-side
  ↓
GET https://status-servicos.statuspage.datadoghq.com/
  ↓
Parser HTML
  ↓
JSON normalizado com grupos + serviços + status
  ↓
Renderização da página iônica
```
