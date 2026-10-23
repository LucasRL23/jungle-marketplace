# Auditoria Lighthouse — 23/10/2026

Código-fonte: f33e9ad. HTML de entrada SHA-256: 984ea5577d799c2f3187064feaa64fbefdbdbe2af2c52d937a92f1c3aad4935f. Medianas independentes por categoria e métrica, com **três execuções para cada página/perfil**. Nenhuma execução desta série foi descartada.

| Página / perfil   | Performance | Acessibilidade | Boas práticas | SEO |     LCP |      CLS |      TBT |
| ----------------- | ----------: | -------------: | ------------: | --: | ------: | -------: | -------: |
| Início / Mobile   |          87 |            100 |           100 | 100 | 3.289 s | 0.000000 | 100.5 ms |
| Início / Desktop  |         100 |            100 |           100 | 100 | 0.693 s | 0.000175 |   0.0 ms |
| Detalhe / Mobile  |          88 |            100 |           100 | 100 | 3.061 s | 0.000000 | 152.0 ms |
| Detalhe / Desktop |         100 |            100 |           100 | 100 | 0.698 s | 0.000000 |   4.5 ms |

## Ambiente e reprodução

- Windows 10.0.26200, 13th Gen Intel(R) Core(TM) i5-1335U, 16 GiB RAM; Node 24.19.0 e pnpm 11.25.0.
- Vite 8.3.5, TypeScript 6.0.3, Playwright 1.64.1, Lighthouse 13.5.0 e Chromium 156.0.8078.4. Dependências fixadas pelo pnpm-lock.yaml.
- Build otimizado via pnpm build; Vite preview em http://127.0.0.1:4175. Ambiente local, sem CDN e sem autenticação da hospedagem.
- Cenário padrão success, visitante sem sessão e armazenamento limpo por navegador, cache frio. Novo processo/perfil Chromium por execução. Mocks habilitados pela configuração padrão; REST e socket da entrega.
- Mobile padrão Lighthouse: 412×823, DPR 1,75, throttling simulado, RTT 150 ms, throughput 1638,4 Kbps, CPU ×4. Desktop usa o preset desktop; parâmetros completos em summary.json e em cada JSON.
- Execuções sequenciais, sem builds ou E2E em paralelo. Codex e processos de preview/desenvolvimento permaneceram abertos; não é laboratório dedicado nem telefone físico.
- Configuração versionada: [scripts/lighthouse.mjs](../../scripts/lighthouse.mjs). Executar pnpm build, iniciar pnpm preview --host 127.0.0.1 --port 4175 --strictPort em outro terminal e executar pnpm audit:lighthouse (padrão: 3 medições).

## Análise das metas

A meta de Performance ≥90 **não foi atendida no mobile**: início 87 e detalhe 88. As outras metas foram atendidas em ambos os perfis. Os relatórios mostram 3,289 s de LCP no início e 3,061 s no detalhe. A imagem final é descoberta depois da inicialização JavaScript, do registro do MSW e da resposta REST; no detalhe há também o chunk da galeria. Avaliação de scripts, estilo/layout e tarefas longas contribuem para TBT de 100,5/152,0 ms no mobile simulado. O chunk MSW possui cerca de 271 KB minificados (91,7 KB gzip), além de React, Router, Query e Axios. Esses são gargalos observados nos diagnósticos; as medições não isolam causalmente o custo individual de cada biblioteca.

Foram aplicados carregamento por rota, separação do Socket.IO após prontidão dos mocks, shell visual paralelo ao início do MSW, remoção de declarações CSS sobrescritas, imagens WebP responsivas, reserva de espaço e skeleton do detalhe. Os hashes conhecidos das contas de demonstração são pré-calculados; os formulários preservam PBKDF2. A meta mobile permanece pendente. Próximo trabalho: reduzir módulos necessários à primeira renderização e a cadeia até o conteúdo da API, preservando o transporte e repetindo as 12 medições após qualquer alteração. Pré-renderização exige tratar o estado persistido do mock sem substituir o fluxo REST.

Imagens, fonte local, 24 fixtures, MSW e funcionalidades da entrega permanecem ativos. Não há ramificação por Lighthouse, user-agent ou parâmetro de auditoria. Ensaios com preload de fonte/imagem e worker HTTP exclusivo da API não trouxeram ganho suficiente e não integram esta versão. O arquivo anterior performance-before-optimization.json registra um checkpoint; não é comparação controlada nem substitui estas 12 execuções.

## Relatórios completos

[Resumo e configurações JSON](summary.json). LCP/TBT em milissegundos no JSON; CLS sem unidade. Pontuações individuais e versões/configurações efetivas estão em rows.

- Início / Mobile: [HTML 1](catalog-mobile-1.report.html) / [JSON 1](catalog-mobile-1.report.json); [HTML 2](catalog-mobile-2.report.html) / [JSON 2](catalog-mobile-2.report.json); [HTML 3](catalog-mobile-3.report.html) / [JSON 3](catalog-mobile-3.report.json)
- Início / Desktop: [HTML 1](catalog-desktop-1.report.html) / [JSON 1](catalog-desktop-1.report.json); [HTML 2](catalog-desktop-2.report.html) / [JSON 2](catalog-desktop-2.report.json); [HTML 3](catalog-desktop-3.report.html) / [JSON 3](catalog-desktop-3.report.json)
- Detalhe / Mobile: [HTML 1](detail-mobile-1.report.html) / [JSON 1](detail-mobile-1.report.json); [HTML 2](detail-mobile-2.report.html) / [JSON 2](detail-mobile-2.report.json); [HTML 3](detail-mobile-3.report.html) / [JSON 3](detail-mobile-3.report.json)
- Detalhe / Desktop: [HTML 1](detail-desktop-1.report.html) / [JSON 1](detail-desktop-1.report.json); [HTML 2](detail-desktop-2.report.html) / [JSON 2](detail-desktop-2.report.json); [HTML 3](detail-desktop-3.report.html) / [JSON 3](detail-desktop-3.report.json)
