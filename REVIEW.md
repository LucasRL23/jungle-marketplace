# Revisão de aderência ao desafio

Revisão em 23/10/2026 do [README original](https://github.com/junglegaming/frontend-challenge/blob/main/README.md), conteúdo GitHub SHA `7e0beff272078e43d70a4fe009033d41a99bf1d5`. Este documento distingue implementação, evidência automatizada e pendências; não atribui uma nota presumida.

## Parecer

Os fluxos principais e a stack exigida estão implementados. A entrega ainda não deve ser considerada concluída: o acesso público obrigatório está adiado por decisão do proprietário, há desvios visuais conhecidos e faltam verificações específicas. Acessibilidade 100 no Lighthouse e baselines aprovadas não comprovam, isoladamente, aderência integral ao Figma ou acessibilidade de todos os estados.

## Pendências priorizadas

1. **Entrega pública (seção 12):** a prévia está publicada com acesso privado, conforme solicitado. Antes do envio, será necessária uma URL pública acessível aos avaliadores e a validação de acesso direto/refresh de `/nft/nft-1`, `/cart`, `/checkout`, `/account`, `/wallets` e `/orders/:id` no ambiente publicado. O fallback SPA está configurado, mas configuração não substitui essa verificação. O enunciado não exige repositório público; deve-se garantir acesso ao código para os avaliadores.
2. **Recuperação após timeout (seções 3, 6 e 9):** uma execução direcionada apresentou falha no desktop: a tela permaneceu em “Consultando…” em vez de liberar “Recuperar meu pedido”. Mobile passou. Não considerar esse cenário estável com base em uma execução posterior bem-sucedida; é necessário investigar a relação entre timeout nativo do XHR/Axios, atraso MSW e execução headless. O teste conserva o caminho real pela API, sem substituir a resposta por setters da UI.
3. **Erros associados aos campos (seção 8):** `ErrorNotice` anuncia mensagens com `role="alert"`, mas o componente `Field` não vincula erros da API aos inputs. Login/cadastro/carteiras precisam de associação por `aria-describedby` e identificação consistente dos campos inválidos. No perfil, nome/e-mail têm associação, mas usuário/ENS não; confirmação de senha também precisa apontar para o erro correspondente. Evidências: `src/features/commerce.tsx` (`ErrorNotice`, `Field`, `LoginDialog`, `WalletsPage`) e `src/features/collector.tsx` (`ProfileEditor`).
4. **Fidelidade visual (seções 3 e 8; 20 pontos):** Roboto Mono é uma aproximação, quatro artes do arquivo são reutilizadas nas 24 fixtures e as três vistas da galeria usam enquadramentos da mesma arte. Formulário de carteiras está simplificado para nome/endereço/rede; recibo é uma página própria. É necessário comparar os frames finais com o Figma, inclusive tipografia, espaçamentos e composição dos formulários. Baselines da própria aplicação detectam regressões, não diferenças contra o Figma.
5. **Cobertura E2E (seção 9):** existem controles na implementação, mas faltam asserções dedicadas para ordenação efetiva por preço, aumento/redução de quantidade e limite por edição, remoção e expiração de cupom, edição da carteira secundária, recibo imutável após alteração posterior do catálogo e mesma chave de idempotência com conteúdo diferente. O teste de estoque já cobre remoção de item; o teste de compra já cobre cupom inválido, aplicação, merge e recibo após refresh. Não confundir código implementado com comportamento comprovado por teste.
6. **Acessibilidade e atualização em segundo plano (seções 4 e 8):** há testes de foco/Escape no login e galeria e ausência de overflow nas capturas 390/768/1440. Falta verificar zoom do navegador e percurso completo por teclado em compra/perfil/carteiras. No catálogo, `isPending` cobre carregamento inicial, mas não há feedback explícito de `isFetching` durante revalidação com dados existentes.
7. **Reprodutibilidade e documentação (seções 5, 9 e 12):** README e ARCHITECTURE foram atualizados nesta revisão; relatório HTML completo salvo em `reports/playwright/index.html`. Falta validar instalação/build a partir de checkout limpo. Tipos, lint e formatação passaram nesta revisão. O build auditado existe e seu hash coincide com o resumo Lighthouse; isso não equivale a um novo build em checkout limpo.

## Execução desta revisão

A suíte completa terminou com **57 testes aprovados em 3,5 minutos**, sem retries: 48 execuções funcionais em Chromium desktop/mobile e nove cenários visuais com 27 capturas. O timeout passou nos dois perfis nesta execução; a falha anterior permanece registrada como risco de intermitência. Relatório HTML: `reports/playwright/index.html` (abrir com `pnpm exec playwright show-report reports/playwright`). Traces são retidos quando há falhas; a execução completa aprovada não gerou traces de falha. A revisão não alterou o código da aplicação para contornar o problema.

## Matriz de requisitos

| Seção do enunciado          | Situação                              | Evidência e limites                                                                                                                                                                       |
| --------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2. Escopo e stack         | Implementado                          | React/TS, Router, Query, Axios, Tailwind, componentes locais no padrão shadcn com Radix, MSW, Socket.IO, Playwright e Lighthouse participam do código. Sem blockchain/pagamentos reais.   |
| 3. Catálogo e detalhe       | Implementado; cobertura parcial       | URL e histórico, busca/filtros combinados, paginação, cancelamento, detalhe direto/inexistente, galeria, favoritos e compra. Faltam testes específicos de ordenação/limites.              |
| 3. Carrinho                 | Implementado; cobertura parcial       | Persistência, merge, quantidades/remoção, cupom, cotação da API e eventos. Precisão em wei e transporte ETH em strings. Faltam algumas asserções listadas acima.                          |
| 3. Pagamento e recibo       | Implementado; estabilidade pendente   | Revisão e revalidação, carteira/rede, reserva, snapshots, três estados e idempotência. Falha intermitente de timeout exige investigação.                                                  |
| 3. Conta e sessão           | Implementado                          | Cadastro/login/logout, sessão de 1h, isolamento, expiração/retomada, perfil/avatar/senha, até duas carteiras. Senhas PBKDF2 com salt.                                                     |
| 4–5. Integração e contratos | Implementado; refetch parcial         | Contratos TS, Axios/Query, beforeLoad, cancelamento, retries, rollback otimista de favoritos e endpoints REST. Feedback de refetch ainda parcial.                                         |
| 6. MSW e cenários           | Implementado                          | Rede interceptada, 24 NFTs/duas contas, latências/falhas/timeout, reset e fixtures persistidas. Mocks ativos por configuração inclusive no build.                                         |
| 7. Socket.IO                | Implementado e exercitado             | Cliente real com binding MSW, `nft.updated`/`order.updated`, versões, duplicatas, eventos antigos, reconciliação REST, expiração e cleanup. Backend simulado é local à página.            |
| 8. UI e acessibilidade      | Parcial                               | 27 baselines em 390/768/1440, shimmer com movimento reduzido, foco em diálogos e labels. Restam fidelidade, erros associados e zoom/percurso completo.                                    |
| 9. Playwright               | 57 aprovados; cobertura parcial       | Chromium desktop/mobile e visuais tablet. Contextos isolados, relógio controlado no pedido pendente e disparo de eventos pela rede. Não declarar cobertura integral com as lacunas acima. |
| 10. Lighthouse              | Metas locais atendidas                | 12 auditorias, três por página/perfil, HTML/JSON/configuração/ambiente/medianas. Não são auditorias da hospedagem.                                                                        |
| 11. Eliminatórios           | Sem ausência identificada na inspeção | Stack, compra simulada, isolamento, socket real e E2E existem. O problema de timeout impede afirmar robustez completa de todos os fluxos.                                                 |
| 12. Entrega                 | Pendente                              | Código e relatórios compõem este checkpoint; publicação pública e smoke test de produção aguardam liberação.                                                                              |

## Lighthouse verificado

Build de entrada SHA-256 `6c93949616b3e1729bc553016e4d11967b7d51862d9a08fd4a97031645364be8`, correspondente a `dist/index.html` nesta revisão. Medianas locais de três execuções por linha:

| Página / perfil   | Performance | Acessibilidade | Boas práticas | SEO |     LCP |      CLS |     TBT |
| ----------------- | ----------: | -------------: | ------------: | --: | ------: | -------: | ------: |
| Início / mobile   |          96 |            100 |           100 | 100 | 2,492 s | 0,000298 | 65,5 ms |
| Início / desktop  |         100 |            100 |           100 | 100 | 0,592 s | 0,000175 |    0 ms |
| Detalhe / mobile  |          95 |            100 |           100 | 100 | 2,708 s |        0 |   63 ms |
| Detalhe / desktop |         100 |            100 |           100 | 100 | 0,649 s |        0 |    0 ms |

Fonte: `reports/lighthouse/summary.json`; Lighthouse 13.5.0, Chromium 156.0.8078.4, Node 24.19.0, Windows, Vite preview com mocks e assets da entrega.
