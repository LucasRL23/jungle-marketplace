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

## Cenários reproduzíveis

No console do navegador: `localStorage.setItem('jungle-scenario', 'slow')`. Alternativas: `success`, `empty` (catálogo vazio), `error` (catálogo 503), `server-error` (API 503), `offline` (erro de transporte), `expired` (sessão inválida), `declined` (pagamento recusado), `pending` (pedido pendente por 30s), `timeout` (resposta de criação do pedido demora 11s, além do timeout do Axios de 10s).

Para `declined`, `pending` e `timeout`, selecione o cenário antes de confirmar a compra. Em timeout, aguarde o erro e use **Recuperar meu pedido**; atualizar a página também mantém a tentativa. Ela recupera a mesma chave de idempotência.

Reset do cenário: `localStorage.removeItem('jungle-scenario')`. Reset integral: no console, `localStorage.clear(); sessionStorage.clear(); location.reload()`. Isso apaga somente dados locais desta origem e recria as fixtures. Cada teste Playwright inicia num contexto isolado.

## Pendências do desafio

- [ ] Fidelidade aos frames, tipografia e assets reais do Figma.
- [ ] Favoritos otimistas com rollback.
- [ ] Perfil, avatar e alteração de senha.
- [ ] Eventos pelo socket.io-client + binding MSW, versionamento, reconexão e alterações de preço/estoque durante o checkout.
- [ ] Cenários determinísticos de respostas fora de ordem, eventos duplicados/antigos e perda de conexão.
- [ ] Completar os testes E2E exigidos e baselines visuais versionadas.
- [ ] Auditar Lighthouse (3 medições por página/perfil e medianas).
- [ ] Deploy público e verificação de rotas diretas em produção.

A instalação das dependências Socket.IO e Lighthouse não significa que essas integrações estejam concluídas. Esta etapa ainda não é a entrega final.

## Validação do checkpoint

Em 22/10/2026: build de produção e lint passaram; **18 testes Playwright passaram** (9 cenários em Chromium desktop e mobile). A suíte cobre catálogo, compra confirmada e recibo após refresh, cupom, recusa, timeout idempotente, cadastro, carteiras, logout/troca de usuário, isolamento de recibos, expiração no checkout e recuperação de falha de rede em rota privada. Isso não representa cobertura completa do enunciado; pendências estão listadas acima.
