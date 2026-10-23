# Arquitetura e decisões

## Camadas

- `domain.ts`: contratos entre transporte e UI.
- `lib/api.ts`: Axios, identificação do visitante, token simulado, tratamento de 401 e QueryClient.
- `lib/money.ts`: conversão exata entre ETH decimal e bigint em wei.
- `mocks/store.ts`: estado persistente da simulação e regras de cotação, reserva e liquidação.
- `mocks/handlers.ts`: API REST MSW. Componentes e hooks não fornecem respostas fictícias.
- `features/hooks.ts`: sessão, carrinho e carteiras via Query.
- `features/commerce.tsx`: fluxo de conta e compra.
- `features/collector.tsx`: favoritos, perfil, avatar e senha.
- `features/realtime.tsx`: cliente Socket.IO e reconciliação do cache.
- `mocks/socket.ts` e `mocks/events.ts`: transporte MSW e emissão de eventos da simulação.
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

Após refresh, o banco simulado retoma os temporizadores persistidos dos pedidos pendentes. Os handlers também conciliam liquidações já vencidas. Eventos Socket.IO atualizam o pedido; uma consulta a cada 15s serve de recuperação adicional. Reconexão invalida os recursos ativos e consulta seu estado por REST.

## Cache e retries

Catálogo: chave inclui todos os parâmetros, staleTime 30s; detalhe inclui id. Queries repetem no máximo duas vezes para falha de transporte/5xx; mutations não repetem automaticamente. Sessão, cotação e pedido não repetem automaticamente. Carrinho/cotação possuem versão nas chaves e mutations atualizam o cache; confirmação invalida carrinho, catálogo, detalhe e lista de pedidos.

## Desvios atuais

O catálogo segue a composição KURIO observada no Figma e usa quatro artes originais, convertidas para WebP em 240/480/960 pixels. `Artwork` fornece srcSet e sizes; a imagem principal tem prioridade alta, as do catálogo usam lazy loading. A tipografia usa Roboto Mono local, ainda uma aproximação a confirmar. Os SVGs antigos permanecem para recibos históricos que já guardaram esses caminhos. A migração do inventário troca apenas as fixtures antigas e incrementa as versões de carrinho, preservando contas e snapshots de pedidos. Baselines Playwright de catálogo, detalhe, carrinho e checkout cobrem 390/768/1440; elas detectam regressões da implementação e não provam igualdade de pixels com o Figma. Telas internas e alguns blocos editoriais ainda precisam de revisão visual. Link de explorador não existe porque as referências são simuladas.

Filtros de preço são strings ETH validadas na rota, combinadas com categoria/busca/ordenação e enviadas pela chave completa de query. O servidor compara wei sem ponto flutuante. O formulário é reinicializado quando os limites da URL mudam, incluindo Voltar/Limpar. O cenário REST `variable` responde a `q=Emerald` em 1800ms e às outras consultas em 100ms; o teste observa o cancelamento da requisição obsoleta e os resultados da consulta nova.

## Perfil e favoritos

GET /api/favorites → string[] de ids; PUT/DELETE /api/favorites/:id → lista atualizada. Inclusão/remoção são idempotentes. A UI cancela queries concorrentes, guarda um snapshot, aplica atualização otimista e restaura o snapshot em falha. Mutations que terminam após troca de token não repovoam o cache privado anterior. GET/PATCH /api/profile → {id,name,email,bio,avatar}; PATCH /api/profile/avatar recebe {avatar:dataURL|string-vazia}. A interface limita arquivos a 256 KB (PNG/JPEG/WebP), valida decodificação e só exibe como salvo após resposta. O servidor valida formato e assinatura. POST /api/password recebe {currentPassword,newPassword}, verifica o hash atual e invalida as outras sessões dessa conta após confirmar a alteração. E-mail em conflito retorna 409. O token atual permanece válido.

## Transporte e contratos Socket.IO

`socket.io-client` usa WebSocket no mesmo origin, path `/socket.io`. MSW intercepta a conexão e `@mswjs/socket.io-binding` codifica/decodifica Engine.IO e Socket.IO. O aplicativo é importado depois de `worker.start()`: Engine.IO captura o construtor WebSocket ao importar. Na versão MSW 2.10.2, o matcher normaliza `/socket.io/` para `/`; o handler aponta para a raiz do origin e verifica o path físico para preservar o WebSocket de HMR do Vite. Não há servidor WebSocket externo no deploy de demonstração.

- `subscribe` cliente → {token:string|null}; o mock autentica a sessão atual.
- `session.ready` servidor → {connectionId:string}; indica que a subscription foi autenticada (ou visitante).
- `nft.updated` servidor → {id,resourceId,version,data:Nft}.
- `order.updated` servidor → {id,resourceId,version,data:Order}, somente para o dono autenticado.
- `session.expired` servidor → revalidação do cliente por GET /api/session; 401 encerra a sessão.

Identidade de evento é UUID, recurso tem id estável e versão inteira crescente. O cliente compara versões recebidas com catálogo, detalhe e carrinho em cache, descarta ids repetidos e versões antigas e cancela consultas anteriores antes de sincronizar. Pedidos terminais nunca voltam a pendente. Mudanças de preço/estoque incrementam versões dos carrinhos afetados; as cotações também incluem a versão de inventário por item. A revisão antiga é desabilitada e o servidor revalida ao criar o pedido.

O mock mantém heartbeat Engine.IO a cada 20s. Ao reconectar, o cliente reautentica e invalida queries ativas de inventário/carrinho/cotações e pedidos do usuário atual. Listeners, socket, heartbeat e subscriptions são liberados no cleanup. Cada callback verifica o token capturado antes de escrever no cache; logout/401 também encerram o socket imediatamente. Eventos privados validam a sessão novamente antes de serem enviados.

Limitações: a simulação roda no contexto de cada página, com localStorage para refresh; não representa um backend compartilhado entre dispositivos. O binding é usado somente no namespace padrão, transporte WebSocket e eventos JSON; rooms, polling HTTP e mensagens binárias não são exercitados. `/api/demo/*` é uma API local de controle de fixtures, disponível somente com os mocks: ela não deve ser exposta por um backend real. Os testes acionam esses handlers e observam a UI, incluindo um pedido confirmado por evento sem uma nova consulta de polling.
