# Jungle Marketplace — desenvolvimento

Implementação iniciada em 22/10/2026. Esta é uma base funcional, ainda não a entrega completa do desafio.

## Executar

Node 22+ e pnpm 11+. `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm lint`, `pnpm exec playwright test`.

Os mocks MSW estão habilitados por padrão inclusive em produção. `VITE_MOCKS=false` desativa os mocks para uma futura API real. Não há API real configurada.

## Implementado

- React/TypeScript/Vite, Tailwind e Button no padrão shadcn/ui.
- TanStack Router: catálogo, detalhe, fallback 404 e parâmetros de busca tipados.
- TanStack Query e Axios com cancelamento via AbortSignal.
- MSW: catálogo de 24 itens, detalhe, filtros combinados, ordenação exata em wei e paginação.
- Skeletons, resultado vazio, erro com nova tentativa e layout adaptável.
- Playwright: testes do catálogo em Chromium desktop/mobile.

## Cenários atuais

No console do navegador: `localStorage.setItem('jungle-scenario', 'slow')`, `'error'` ou `'empty'`. Recarregue a página. Reset: `localStorage.removeItem('jungle-scenario')`.

## Antes de entregar

- [ ] Conferir e reproduzir os frames/assets do Figma: https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1
- [ ] Sessão, dois usuários, cadastro/login/logout, expiração e proteção de rotas.
- [ ] Favoritos otimistas com rollback e isolamento de cache.
- [ ] Carrinho persistente e merge do visitante; quantidades, edições e cupons.
- [ ] Cotação, checkout, pedidos idempotentes e recibo imutável.
- [ ] Perfil, avatar, senha e carteiras.
- [ ] Eventos reais no socket.io-client via binding MSW; versões e reconexão.
- [ ] Completar cenários de falha e testes E2E do enunciado.
- [ ] Baselines de regressão visual e auditorias Lighthouse.
- [ ] Repositório remoto e deploy público com fallback SPA.

A instalação das dependências de Socket.IO e Lighthouse não significa que esses requisitos já estão implementados.

## Validação desta etapa

Build de produção e lint executados com sucesso. Seis testes Playwright passaram em Chromium (desktop e mobile), cobrindo apenas o catálogo e detalhe descritos acima. O restante do desafio permanece pendente.

