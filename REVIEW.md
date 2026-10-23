# Revisão de aderência ao desafio

Revisão em 23/10/2026 do [README original](https://github.com/junglegaming/frontend-challenge/blob/main/README.md), conteúdo GitHub SHA `7e0beff272078e43d70a4fe009033d41a99bf1d5`. Este documento distingue implementação, evidência automatizada e pendências; não atribui uma nota presumida.

## Parecer

Os fluxos principais e a stack exigida estão implementados. Aplicação e repositório estão públicos. A entrega tem limitações: Performance mobile abaixo da meta, fonte aproximada e verificações complementares pendentes. Não atribuímos uma nota presumida.

## Pendências priorizadas

1. **Entrega pública:** aplicação publicada em https://kurio-jungle-marketplace.vercel.app e repositório público conforme solicitação do proprietário. Catálogo e socket conferidos no navegador sem login; o percurso completo das rotas hospedadas permanece pendente.
2. **Recuperação após timeout (seções 3, 6 e 9):** uma execução direcionada apresentou falha no desktop: a tela permaneceu em “Consultando…” em vez de liberar “Recuperar meu pedido”. Mobile passou. Não considerar esse cenário estável com base em uma execução posterior bem-sucedida; é necessário investigar a relação entre timeout nativo do XHR/Axios, atraso MSW e execução headless. O teste conserva o caminho real pela API, sem substituir a resposta por setters da UI.
3. **Erros associados aos campos — corrigidos (seção 8):** login/cadastro/carteiras e os campos de usuário/ENS/confirmação de senha associam as mensagens aos controles. O stepper de quantidade agora tem label explícito para o input, sem vincular o rótulo ao botão de diminuir. Testes conferem a associação em autenticação e carteira.
4. **Fidelidade visual — revisão aplicada (seções 3 e 8; 20 pontos):** cabeçalho, hero, grade, galeria, promoções, rodapé, perfil, carteiras e autenticação foram comparados e ajustados. Mobile usa busca no topo, banner compacto, navegação inferior e acesso em tela completa. Veja VISUAL.md. Roboto Mono continua sendo aproximação, quatro artes são reutilizadas nas fixtures e os campos comerciais auxiliares não foram simulados. Baselines não comprovam igualdade de pixels com o Figma.
5. **Cobertura E2E (seção 9):** a suíte agora cobre ordenação por preço, limites da edição limited, aumento/redução de quantidade, remoção e expiração de cupom, edição da carteira secundária e persistência após confirmação da API. Permanecem sem asserção dedicada o recibo imutável após alteração posterior do catálogo e a mesma chave de idempotência com corpo diferente; as regras existem nos mocks.
6. **Acessibilidade e atualização em segundo plano (seções 4 e 8):** há testes de foco/Escape no login e galeria e ausência de overflow nas capturas 390/768/1440. Falta verificar zoom do navegador e percurso completo por teclado em compra/perfil/carteiras. No catálogo, `isPending` cobre carregamento inicial, mas não há feedback explícito de `isFetching` durante revalidação com dados existentes.
7. **Reprodutibilidade:** clone limpo instalou com lockfile congelado e passou no build no checkpoint anterior. O arquivo reports/build-verification.json registra esse checkpoint e não o último build. Tipos, lint e formatação foram verificados durante esta revisão.

## Execução desta revisão

Última execução completa: 60 aprovados / 1 falha na navegação perfil → carteiras (6,2 min). Âncoras do perfil passaram a rolar instantaneamente; o cenário corrigido passou três vezes seguidas. A nova execução completa foi interrompida a pedido do proprietário para priorizar o deploy. O relatório versionado reports/playwright/index.html registra 61 aprovações de um checkpoint visual anterior à separação de módulos; não comprova o último build. Timeout passou em desktop e mobile na última execução completa, mas a intermitência observada anteriormente permanece registrada.

## Matriz de requisitos

| Seção do enunciado          | Situação                              | Evidência e limites                                                                                                                                                                                      |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2. Escopo e stack         | Implementado                          | React/TS, Router, Query, Axios, Tailwind, componentes locais no padrão shadcn com Radix, MSW, Socket.IO, Playwright e Lighthouse participam do código. Sem blockchain/pagamentos reais.                  |
| 3. Catálogo e detalhe       | Implementado; cobertura parcial       | URL e histórico, busca/filtros combinados, paginação, cancelamento, detalhe direto/inexistente, galeria, favoritos e compra. Ordenação por preço e limites de quantidade/edição são exercitados nos E2E. |
| 3. Carrinho                 | Implementado; cobertura parcial       | Persistência, merge, quantidades/remoção, cupom, cotação da API e eventos. Precisão em wei e transporte ETH em strings. Faltam algumas asserções listadas acima.                                         |
| 3. Pagamento e recibo       | Implementado; estabilidade pendente   | Revisão e revalidação, carteira/rede, reserva, snapshots, três estados e idempotência. Falha intermitente de timeout exige investigação.                                                                 |
| 3. Conta e sessão           | Implementado                          | Cadastro/login/logout, sessão de 1h, isolamento, expiração/retomada, perfil/avatar/senha, até duas carteiras. Senhas PBKDF2 com salt.                                                                    |
| 4–5. Integração e contratos | Implementado; refetch parcial         | Contratos TS, Axios/Query, beforeLoad, cancelamento, retries, rollback otimista de favoritos e endpoints REST. Feedback de refetch ainda parcial.                                                        |
| 6. MSW e cenários           | Implementado                          | Rede interceptada, 24 NFTs/duas contas, latências/falhas/timeout, reset e fixtures persistidas. Mocks ativos por configuração inclusive no build.                                                        |
| 7. Socket.IO                | Implementado e exercitado             | Cliente real com binding MSW, `nft.updated`/`order.updated`, versões, duplicatas, eventos antigos, reconciliação REST, expiração e cleanup. Backend simulado é local à página.                           |
| 8. UI e acessibilidade      | Parcial                               | 27 baselines em 390/768/1440, shimmer com movimento reduzido, foco em diálogos e labels. Limitações de fidelidade estão documentadas; resta verificar zoom/percurso completo.                            |
| 9. Playwright               | 60/61 na última execução completa     | Chromium desktop/mobile e visuais tablet. Contextos isolados, relógio controlado no pedido pendente e disparo de eventos pela rede. Não declarar cobertura integral com as lacunas acima.                |
| 10. Lighthouse              | Performance mobile abaixo da meta     | 12 auditorias, três por página/perfil, HTML/JSON/configuração/ambiente/medianas. Performance 87/88 mobile e 100/100 desktop; demais categorias 100.                                                      |
| 11. Eliminatórios           | Sem ausência identificada na inspeção | Stack, compra simulada, isolamento, socket real e E2E existem. O problema de timeout impede afirmar robustez completa de todos os fluxos.                                                                |
| 12. Entrega                 | Pendente                              | Código e relatórios compõem este checkpoint; publicação pública e smoke test de produção aguardam liberação.                                                                                             |

## Lighthouse verificado

Código-fonte f33e9ad, entrada SHA-256 984ea5577d799c2f3187064feaa64fbefdbdbe2af2c52d937a92f1c3aad4935f. Três execuções por linha:

| Página / perfil   | Performance | Acessibilidade | Boas práticas | SEO |     LCP |      CLS |      TBT |
| ----------------- | ----------: | -------------: | ------------: | --: | ------: | -------: | -------: |
| Início / Mobile   |          87 |            100 |           100 | 100 | 3.289 s | 0.000000 | 100.5 ms |
| Início / Desktop  |         100 |            100 |           100 | 100 | 0.693 s | 0.000175 |   0.0 ms |
| Detalhe / Mobile  |          88 |            100 |           100 | 100 | 3.061 s | 0.000000 | 152.0 ms |
| Detalhe / Desktop |         100 |            100 |           100 | 100 | 0.698 s | 0.000000 |   4.5 ms |

A meta de Performance mobile permanece pendente. Todas as demais metas locais foram atendidas. Análise, relatórios completos e condições: [reports/lighthouse/README.md](reports/lighthouse/README.md). Estes resultados substituem os números do build anterior e não são medições da hospedagem.
