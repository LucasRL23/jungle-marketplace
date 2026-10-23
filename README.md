# Kurio · Jungle Frontend Challenge

Solução em desenvolvimento para o [frontend challenge da Jungle](https://github.com/junglegaming/frontend-challenge). Código salvo em repositório privado: https://github.com/LucasRL23/jungle-marketplace.

## Executar

Node 22.19+ e pnpm 11.25. `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`. Antes da primeira execução dos testes: `pnpm exec playwright install chromium`. Relatório: `pnpm test:report`. Traces são preservados em caso de falha.

Os mocks MSW estão habilitados por padrão inclusive no build de demonstração. `VITE_MOCKS=false` desativa a simulação; não há backend real configurado. Nenhuma carteira, cobrança ou transação é real.

## Credenciais fictícias

| E-mail            | Senha      |
| ----------------- | ---------- |
| alex@example.test | Jungle123! |
| luna@example.test | Jungle123! |

Cada conta inicial possui uma carteira Ethereum simulada. Novas contas precisam cadastrar uma carteira em `/wallets`. Use um endereço fictício com `0x` e 40 caracteres hexadecimais. Não use dados ou senhas reais.

## Implementado nesta etapa

- Catálogo de 24 NFTs, filtros combinados, busca, ordenação e paginação na URL.
- Composição KURIO baseada no Figma: hero, filtros laterais, grade com 9 itens por página e adaptação responsiva. Quatro artes originais em WebP com srcSet 240/480/960. Origem documentada em `public/artwork/kurio/SOURCES.md`.
- Faixa de preço combinável com busca e categoria, incluindo refresh, histórico e limpeza dos campos. Decimais são strings na URL (TanStack preserva strings numéricas usando JSON) e wei nos cálculos.
- Detalhe direto, edição standard/limited e controle de quantidade/estoque.
- Cadastro/login/logout, recuperação e expiração da sessão, rotas privadas e isolamento entre usuários.
- Carrinho persistente, merge dos itens do visitante no login e cupons (`JUNGLE10` dá 10%; `EXPIRED` é inválido).
- Cotação pelo servidor simulado, dinheiro em wei/strings ETH, revisão e revalidação no checkout.
- Carteiras principal/secundária, edição, rede e conexão/recusa/desconexão simuladas.
- Pedido idempotente, estados pendente/confirmado/recusado e recibo por snapshot.
- Recuperação da mesma tentativa após timeout ou refresh; itens preservados na recusa e abatidos apenas após confirmação.
- Skeletons, falhas, resultado vazio e layout responsivo.
- Favoritos otimistas com rollback, persistência e isolamento por usuário.
- Perfil com nome de exibição, usuário único, e-mail, ENS opcional, apelido de carteira e biografia. Upload/remoção de avatar, alteração de senha e controle de visibilidade dos campos.
- Menu do colecionador compartilhado com carteiras, âncoras para atividade/favoritos e logout com limpeza imediata da sessão.
- Socket.IO via WebSocket interceptado pelo MSW e `@mswjs/socket.io-binding`, com preços/estoque e pedidos versionados, deduplicação, reconexão e limpeza de subscriptions.

## Cenários reproduzíveis

No console do navegador: `localStorage.setItem('jungle-scenario', 'slow')`. Alternativas: `success`, `variable` (busca `Emerald` demora 1.8s, demais buscas 100ms; buscar `Sage` em seguida cancela a consulta antiga), `empty` (catálogo vazio), `error` (catálogo 503), `server-error` (API 503), `offline` (erro de transporte), `expired` (sessão inválida), `declined` (pagamento recusado), `pending` (pedido pendente por 30s), `favorite-error` (mutation de favorito falha, com rollback), `timeout` (resposta de criação do pedido demora 11s, além do timeout do Axios de 10s).

Para `declined`, `pending` e `timeout`, selecione o cenário antes de confirmar a compra. Em timeout, aguarde o erro e use **Recuperar meu pedido**; atualizar a página também mantém a tentativa. Ela recupera a mesma chave de idempotência.

Reset do cenário: `localStorage.removeItem('jungle-scenario')`. Reset integral: no console, `localStorage.clear(); sessionStorage.clear(); location.reload()`. Isso apaga somente dados locais desta origem e recria as fixtures. Cada teste Playwright inicia num contexto isolado.

## Pendências do desafio

- [x] Artes originais do Figma e primeira composição do catálogo.
- [ ] Fidelidade final de todos os frames, especialmente formulários internos. A família exata da fonte ainda precisa ser confirmada; Roboto Mono é uma aproximação local.
- [x] Favoritos otimistas com rollback.
- [x] Perfil, avatar e alteração de senha.
- [x] Eventos pelo socket.io-client + binding MSW, versionamento, reconexão e alterações de preço/estoque durante o checkout.
- [x] Cenários determinísticos de eventos duplicados/antigos e perda de conexão.
- [x] Cenário REST de latência variável e cancelamento de buscas antigas.
- [x] Baselines visuais de catálogo/detalhe/carrinho/checkout/perfil/carteiras em 390, 768 e 1440 pixels.
- [ ] Revisar cobertura restante do enunciado e navegação completa por teclado.
- [x] Auditar Lighthouse (3 medições por página/perfil e medianas).
- [ ] Deploy público e verificação de rotas diretas em produção.

Socket.IO, regressão visual e auditoria Lighthouse local estão integrados. Esta etapa ainda não é a entrega final.

## Validação do checkpoint

Em 22/10/2026: build de produção e lint passaram; **41 testes Playwright passaram** (38 execuções funcionais em Chromium nas larguras desktop 1440 e mobile 390; 3 cenários visuais com 4 capturas cada, em 390/768/1440). A suíte cobre catálogo, compra confirmada e recibo após refresh, cupom, recusa, timeout idempotente, cadastro, carteiras, logout/troca de usuário, isolamento de recibos, expiração no checkout e recuperação de falha de rede em rota privada. Também foram verificados rollback de favoritos, perfil/avatar/senha, eventos Socket.IO duplicados/antigos, alteração de preço/estoque, confirmação sem polling, reconexão e liberação da subscription anterior na troca de usuário. Filtros de preço combinados, refresh/histórico e cancelamento de busca obsoleta também passaram. As 12 baselines visuais passaram sem atualização após os ajustes de acessibilidade. Lint e formatação passaram. Isso não representa cobertura completa do enunciado; pendências estão listadas acima.

## Exercitar os eventos em tempo real

Abra o console da própria aplicação. Os comandos abaixo são controles da simulação; eles passam pelos handlers MSW, persistem as mudanças e emitem os eventos pelo protocolo Socket.IO.

```js
const demo = (path, body = {}) =>
  fetch(`/api/demo/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem("jungle-token")
        ? {
            Authorization: `Bearer ${localStorage.getItem("jungle-token")}`,
          }
        : {}),
    },
    body: JSON.stringify(body),
  }).then((response) => response.json());

// Com nft-1 no carrinho, altera o catálogo e envia duas cópias do mesmo evento.
await demo("nft", {
  id: "nft-1",
  price: "2.5",
  stock: 8,
  delivery: "duplicate",
});
// Entrega um evento antigo, sem modificar o catálogo atual.
await demo("nft", { id: "nft-1", delivery: "stale" });
// Interrompe o socket; o cliente reconecta e concilia os recursos ativos via REST.
await demo("disconnect");
// Em /orders/:id, antecipa a liquidação simulada do próprio pedido.
const id = location.pathname.split("/").pop();
await demo("order", { id, delivery: "settle" });
await demo("order", { id, delivery: "stale" });
// Controle global de fixtures para testar eventos de outra sessão/usuário.
await demo("advance-orders");
```

Para esgotamento, use `{id:'nft-1',stock:0}` antes de criar o pedido. A simulação recusa reduzir o estoque abaixo de quantidades já reservadas. No checkout, mudanças invalidam a revisão e bloqueiam confirmar até consultar uma nova cotação. Para expiração pelo socket, selecione `expired` e dispare um evento: a sessão é revalidada por REST antes da retomada no login.

A suíte E2E usa o build otimizado via `vite preview` na porta 4173; `pnpm test:e2e` gera esse build antes dos testes. Assim, o HMR do servidor de desenvolvimento (porta 5173) não pode reiniciar a aplicação no meio de um cenário. Para executar apenas uma seleção depois do build: `pnpm exec playwright test --grep 'termo'`.

## Regressão visual

`tests/visual.spec.ts` captura catálogo, detalhe, carrinho com um item, checkout autenticado, perfil e carteiras, em 390, 768 e 1440 pixels. As 18 imagens aprovadas ficam em `tests/visual.spec.ts-snapshots`. O teste espera fontes e imagens visíveis, desativa animações durante a captura e verifica ausência de overflow horizontal. Os filtros mobile podem ser recolhidos pelo controle nativo `details`.

As baselines atuais foram geradas em Windows com o Chromium instalado pela versão de Playwright fixada no lockfile. Execute `pnpm exec playwright test tests/visual.spec.ts` para comparar. Para aprovar uma alteração visual intencional: `pnpm exec playwright test tests/visual.spec.ts --update-snapshots`, inspecione cada mudança e versione as imagens. Outros sistemas operacionais usam arquivos próprios para acomodar diferenças de renderização de fontes. As imagens comparam a implementação com a sua baseline; a revisão de fidelidade ao Figma é uma atividade separada.

## Reproduzir Lighthouse

1. `pnpm build`
2. Em outro terminal: `pnpm preview --host 127.0.0.1 --port 4175 --strictPort`
3. `pnpm audit:lighthouse`

O script mede `/` e `/nft/nft-1`, nos perfis mobile e desktop, três vezes cada. Ele inicia um Chromium headless novo por execução, com o mesmo binário da suíte Playwright; o Lighthouse controla emulação, throttling e auditoria pela porta local 9223. Feche qualquer processo de auditoria anterior nessa porta antes de repetir. Usa Lighthouse 13.5.0, configuração mobile padrão e preset desktop, sem simplificar a página nem desativar os mocks. Mantenha o build estável e evite executar a suíte E2E ao mesmo tempo para reduzir disputa de CPU.

Os 12 relatórios HTML, 12 JSON e `summary.json` ficam em `reports/lighthouse`. O resumo inclui medianas de pontuações/LCP/CLS/TBT, versões de navegador/Lighthouse, máquina, configurações e hash SHA-256 do HTML de entrada do build. `AUDIT_URL`, `AUDIT_RUNS` e `CHROME_PATH` permitem configurar origem, quantidade e binário; mudar esses valores cria uma medição diferente da padrão documentada. Estas medições locais não substituem uma auditoria do deploy.

## Resultado Lighthouse local

No checkpoint `76abf6c` (antes dos ajustes seguintes na área do colecionador), as medianas de três execuções por página/perfil foram 96 de desempenho no mobile e 100 no desktop, tanto no catálogo quanto no detalhe. Acessibilidade, boas práticas e SEO: 100 nos quatro grupos. LCP mobile: 2.50s no catálogo e 2.58s no detalhe; TBT: 57ms/58ms. Resultados completos e condições em `reports/lighthouse/summary.json`; não são medições do deploy.

Em 23/10/2026, a suíte expandida passou em **44 execuções**: 38 funcionais e 6 cenários visuais (18 capturas). A validação de perfil cobre usuário duplicado, ENS inválido, persistência dos novos campos e mostrar/ocultar senha. Depois do ajuste de seleção no menu, as três verificações de perfil/carteiras passaram novamente, incluindo navegação por hash e seleção única.
