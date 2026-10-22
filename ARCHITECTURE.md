# Arquitetura e decisões

## Camadas

`domain.ts`: contratos. `lib/api.ts`: transporte Axios e QueryClient. `mocks/`: fixtures e REST handlers MSW. `App.tsx`: rotas e primeira interface; extrair features conforme os fluxos forem adicionados. `components/ui`: componentes locais no padrão shadcn/ui.

## Contratos implementados

GET /api/nfts?q=&category=&sort=recent|price-asc|price-desc&page=1 → {items:Nft[],total:number,pages:number}. Página com 8 itens. GET /api/nfts/:id → Nft ou 404 {message:string}. Catálogo indisponível → 503. `Nft`: id, name, creator, category, price (decimal string ETH), stock (inteiro), version, image.

## Cache

Chaves incluem todos os parâmetros da consulta. staleTime de 30 segundos. Queries repetem no máximo duas vezes para falha de transporte ou HTTP 5xx; mutations não repetem. AbortSignal cancela respostas obsoletas. Detalhe não repete automaticamente. Dados privados e respectivas políticas serão implementados junto com autenticação.

## Dinheiro

`lib/money.ts` converte strings decimais ETH para bigint em wei sem ponto flutuante. Valores recebidos da API permanecem strings. Nenhuma lógica de compra implementada ainda.

## Desvios e limites atuais

Layout preliminar; não foi validado contra os frames do Figma. Seis SVGs abstratos locais são placeholders criados para desenvolvimento, sem dependência de imagens remotas. Tipografia usa fonte de sistema temporária. Não há autenticação, checkout ou eventos Socket.IO ainda. Não há credenciais fictícias porque a sessão ainda não foi implementada. Nenhuma pontuação Lighthouse ou equivalência visual é alegada.
