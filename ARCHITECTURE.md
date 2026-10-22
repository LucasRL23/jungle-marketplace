# Arquitetura e decisões

## Camadas

- `domain.ts`: contratos entre transporte e UI.
- `lib/api.ts`: Axios, identificação do visitante, token simulado, tratamento de 401 e QueryClient.
- `lib/money.ts`: conversão exata entre ETH decimal e bigint em wei.
- `mocks/store.ts`: estado persistente da simulação e regras de cotação, reserva e liquidação.
- `mocks/handlers.ts`: API REST MSW. Componentes e hooks não fornecem respostas fictícias.
- `features/hooks.ts`: sessão, carrinho e carteiras via Query.
- `features/commerce.tsx`: primeiro fluxo de conta e compra.
- `App.tsx`: catálogo, detalhe e TanStack Router; rotas privadas usam beforeLoad.
- `components/ui`: componente Button local no padrão shadcn/ui (Radix Slot/cva).

## Contratos REST implementados

Respostas de erro: `{message:string}` e HTTP 400/401/403/404/409/422/503. Credenciais inválidas e sessão expirada retornam 401; pedido de outro usuário retorna 403; estoque e idempotência conflitantes retornam 409. Axios cancela queries obsoletas via AbortSignal.

| Método   | Caminho         | Corpo/parâmetros → resposta                                                             |
| -------- | --------------- | --------------------------------------------------------------------------------------- |
| GET      | /api/nfts       | q, category, sort=recent/price-asc/price-desc, page → {items,total,pages}, 8 por página |
| GET      | /api/nfts/:id   | → Nft, 404 se inexistente                                                               |
| POST     | /api/register   | {name,email,password} → {token,user,expiresAt}                                          |
| POST     | /api/login      | {email,password} → {token,user,expiresAt}                                               |
| GET      | /api/session    | → {user,expiresAt} ou null sem autenticação                                             |
| POST     | /api/logout     | {} → {ok:true}                                                                          |
| GET      | /api/cart       | → {items,coupon,version}; itens incluem NFT, estoque e preço unitário atuais            |
| PATCH    | /api/cart       | {nftId,edition,quantity} ou {coupon} → Cart; quantity=0 remove                          |
| POST     | /api/quote      | {} → Quote com itens, subtotal, desconto, taxa, total e validade                        |
| GET      | /api/wallets    | → Wallet[] do usuário                                                                   |
| POST/PUT | /api/wallets    | {id?,label,address,network} → Wallet                                                    |
| POST     | /api/orders     | {quoteId,walletId,network,connected,name,email}; header Idempotency-Key → Order         |
| GET      | /api/orders     | → Order[] do usuário                                                                    |
| GET      | /api/orders/:id | → Order autorizado e snapshot imutável                                                  |

Edição `limited`: preço em dobro e máximo de 3 unidades, compartilhando o estoque total com `standard`. A API valida a soma das edições. Valores ETH trafegam exclusivamente como strings decimais. Quantidades são inteiras. Cupom JUNGLE10 desconta 10% sobre o subtotal; taxa de rede simulada fixa de 0.0025 ETH.

## Sessão e isolamento

Token fictício aleatório em localStorage, sessões com validade de 1h no banco simulado. Senhas armazenadas na simulação somente como PBKDF2/SHA-256, salt por conta e 100000 iterações. Esta simulação não fornece segurança de produção: o banco e os tokens são locais e editáveis, conforme o escopo sem backend real.

Queries privadas usam prefixo `private` e identificador do usuário. Logout/401/troca de sessão cancelam e removem queries privadas; login limpa o cache anterior. Respostas 401 antigas só encerram a sessão se o token da requisição ainda for o token atual. Rotas privadas consultam a sessão via beforeLoad e preservam o destino para retomada após login. O timer de expiração também remove os dados privados. Pedidos consultados pela API sempre validam o dono.

## Carrinho, cotação e pedidos

Carrinho do visitante é separado por X-Visitor. Login mescla e limita quantidades ao estoque, migra cupom quando aplicável e limpa o carrinho visitante. Carrinhos do usuário persistem entre sessões. A cotação dura 2 minutos; o cliente revalida antes da criação e exige nova confirmação se itens/valores mudarem. O servidor revalida novamente para cobrir a janela entre revisão e envio.

Chave de idempotência e corpo são preservados no sessionStorage, por usuário, antes do envio. A API registra a tentativa atomicamente antes de simular timeout: mesma chave e conteúdo recuperam o mesmo pedido, conteúdo diferente gera 409. Um bloqueio síncrono na UI cobre cliques durante a revalidação assíncrona. Pedidos pendentes reservam estoque; a liquidação ocorre uma única vez, por versão/status terminal. Recusa libera a reserva sem remover itens. Confirmação abate apenas quantidades compradas e mantém o recibo por snapshot.

Após refresh, os handlers conciliam pedidos cujo prazo de liquidação já passou. Nesta etapa, a consulta periódica de 1.5s recupera pedidos pendentes; a integração Socket.IO ainda será implementada.

## Cache e retries

Catálogo: chave inclui todos os parâmetros, staleTime 30s; detalhe inclui id. Queries repetem no máximo duas vezes para falha de transporte/5xx; mutations não repetem automaticamente. Sessão, cotação e pedido não repetem automaticamente. Carrinho/cotação possuem versão nas chaves e mutations atualizam o cache; confirmação invalida carrinho, catálogo, detalhe e lista de pedidos.

## Desvios atuais

Layout preliminar ainda não validado contra os frames do Figma. Seis SVGs abstratos locais são placeholders de desenvolvimento; tipografia usa fonte de sistema. Perfil, favoritos, tempo real, regressão visual e Lighthouse permanecem pendentes. Nenhuma pontuação ou equivalência visual é alegada. Link de explorador não existe porque as referências são simuladas.
