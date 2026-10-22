# Jungle Marketplace

Solução em desenvolvimento para o [frontend challenge da Jungle](https://github.com/junglegaming/frontend-challenge). Código salvo em repositório privado: https://github.com/LucasRL23/jungle-marketplace.

## Executar

Node 22.12+ e pnpm 11.25. `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`. Antes da primeira execução dos testes: `pnpm exec playwright install chromium`. Relatório: `pnpm test:report`. Traces são preservados em caso de falha.

Os mocks MSW estão habilitados por padrão inclusive no build de demonstração. `VITE_MOCKS=false` desativa a simulação; não há backend real configurado. Nenhuma carteira, cobrança ou transação é real.

## Credenciais fictícias

| E-mail            | Senha      |
| ----------------- | ---------- |
| alex@example.test | Jungle123! |
| luna@example.test | Jungle123! |

Cada conta inicial possui uma carteira Ethereum simulada. Novas contas precisam cadastrar uma carteira em `/wallets`. Use um endereço fictício com `0x` e 40 caracteres hexadecimais. Não use dados ou senhas reais.

## Implementado nesta etapa

- Catálogo de 24 NFTs, filtros combinados, busca, ordenação e paginação na URL.
- Detalhe direto, edição standard/limited e controle de quantidade/estoque.
- Cadastro/login/logout, recuperação e expiração da sessão, rotas privadas e isolamento entre usuários.
- Carrinho persistente, merge dos itens do visitante no login e cupons (`JUNGLE10` dá 10%; `EXPIRED` é inválido).
- Cotação pelo servidor simulado, dinheiro em wei/strings ETH, revisão e revalidação no checkout.
- Carteiras principal/secundária, edição, rede e conexão/recusa/desconexão simuladas.
- Pedido idempotente, estados pendente/confirmado/recusado e recibo por snapshot.
- Recuperação da mesma tentativa após timeout ou refresh; itens preservados na recusa e abatidos apenas após confirmação.
- Skeletons, falhas, resultado vazio e layout responsivo.
- Favoritos otimistas com rollback, persistência e isolamento por usuário.
- Edição de nome, e-mail e biografia, upload/remoção de avatar e alteração de senha.
- Socket.IO via WebSocket interceptado pelo MSW e `@mswjs/socket.io-binding`, com preços/estoque e pedidos versionados, deduplicação, reconexão e limpeza de subscriptions.

## Cenários reproduzíveis

No console do navegador: `localStorage.setItem('jungle-scenario', 'slow')`. Alternativas: `success`, `empty` (catálogo vazio), `error` (catálogo 503), `server-error` (API 503), `offline` (erro de transporte), `expired` (sessão inválida), `declined` (pagamento recusado), `pending` (pedido pendente por 30s), `favorite-error` (mutation de favorito falha, com rollback), `timeout` (resposta de criação do pedido demora 11s, além do timeout do Axios de 10s).

Para `declined`, `pending` e `timeout`, selecione o cenário antes de confirmar a compra. Em timeout, aguarde o erro e use **Recuperar meu pedido**; atualizar a página também mantém a tentativa. Ela recupera a mesma chave de idempotência.

Reset do cenário: `localStorage.removeItem('jungle-scenario')`. Reset integral: no console, `localStorage.clear(); sessionStorage.clear(); location.reload()`. Isso apaga somente dados locais desta origem e recria as fixtures. Cada teste Playwright inicia num contexto isolado.

## Pendências do desafio

- [ ] Fidelidade aos frames, tipografia e assets reais do Figma.
- [x] Favoritos otimistas com rollback.
- [x] Perfil, avatar e alteração de senha.
- [x] Eventos pelo socket.io-client + binding MSW, versionamento, reconexão e alterações de preço/estoque durante o checkout.
- [x] Cenários determinísticos de eventos duplicados/antigos e perda de conexão.
- [ ] Cenário REST de latência variável e respostas fora de ordem.
- [ ] Completar os testes E2E exigidos e baselines visuais versionadas.
- [ ] Auditar Lighthouse (3 medições por página/perfil e medianas).
- [ ] Deploy público e verificação de rotas diretas em produção.

Socket.IO está integrado; a auditoria Lighthouse ainda está pendente. Esta etapa ainda não é a entrega final.

## Validação do checkpoint

Em 22/10/2026: build de produção e lint passaram; **34 testes Playwright passaram** (17 cenários em Chromium, nas larguras desktop 1440 e mobile 390). A suíte cobre catálogo, compra confirmada e recibo após refresh, cupom, recusa, timeout idempotente, cadastro, carteiras, logout/troca de usuário, isolamento de recibos, expiração no checkout e recuperação de falha de rede em rota privada. Também foram verificados rollback de favoritos, perfil/avatar/senha, eventos Socket.IO duplicados/antigos, alteração de preço/estoque, confirmação sem polling, reconexão e liberação da subscription anterior na troca de usuário. Lint e formatação passaram. Isso não representa cobertura completa do enunciado; pendências estão listadas acima.

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
