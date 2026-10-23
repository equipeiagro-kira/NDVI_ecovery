# Verificação local

- Build de produção Vite 6.4.5: aprovado.
- Dez testes: aprovados, incluindo exclusão das áreas internas do denominador de visibilidade e renderização contínua.
- Auditoria após atualização do Vite: zero vulnerabilidades conhecidas.
- Playwright com Edge: configuração de conexão abre e fecha; importação de KML com Polygon chega ao estado de área pronta.
- Celular 390 × 844: sem overflow horizontal.
- Conceito inspecionado em `conceito.png`; renderizações em `preview-desktop.png` e `preview-mobile.png`.
- Comparação visual: painel lateral, hierarquia de títulos, cores violeta/escuro, mapa central, inspetor e linha do tempo preservados. Diferenças intencionais: logo oficial no espaço reservado, importação KML adicionada, coordenadas na ordem oeste/sul/leste/norte, texto do período móvel e explicação da metodologia. Ícones simplificados como caracteres; mapa real OpenStreetMap no lugar da ilustração de referência. Não se declara reprodução visual exata do conceito.
- O mapa CARTO retornou tiles solicitando chave; foi substituído por OpenStreetMap e a versão foi reconstruída e capturada novamente.
- Sessão real da versão 0.3.0: `/api/status` confirmou autenticação; `/api/progress` confirmou consulta concluída com 61 de 61 aquisições avaliadas e 24 meses com imagens. Nenhuma credencial foi lida ou registrada na verificação.
- Comparação visual com a mesma cena do Lovable e exportação de uma cena real específica ainda não verificadas.
- Código no repositório público `equipeiagro-kira/NDVI_ecovery`, sem credenciais.

## Correção de conexão e importação · versão 0.2.0

Conexão agora tem estado de validação, confirmação explícita e erro visível. `configured` não é usado como prova de autenticação. O backend informa `connected` somente depois de receber um token do provedor. O segredo continua somente na memória e é apagado do formulário depois do sucesso.

O leitor de KML aceita até 10 MB, fecha contornos abertos, lê áreas internas excluídas e mostra nome do arquivo, quantidade de talhões e faixa de confirmação no mapa. GeoJSON MultiPolygon é separado em partes. Arquivos sem polígono e limites inválidos recebem mensagem visível junto ao campo e no topo da tela.

Verificação isolada com Playwright e provedor simulado: autenticação inválida não conecta; estado de espera aparece; autenticação válida mostra confirmação; importação de KML de mais de 200 KB com área interna funciona; busca apresenta cena e exporta PNG; arquivo de pontos mostra erro; reimportação do mesmo arquivo funciona; sem overflow em 390 pixels. Nenhuma credencial real foi usada nesses testes. Captura de QA com dados simulados guardada apenas em `work/`, fora da entrega.

Na implantação da versão 0.2.0, o reinício descartou as credenciais anteriores. A sessão 0.3.0 posteriormente recebeu nova conexão, conforme a verificação real acima.

## Qualidade de NDVI · versão 0.3.0

A implementação anterior quantizava NDVI em seis cores e solicitava um PNG quadrado fixo. A nova rota visual utiliza rampa contínua fixa, envelope projetado em EPSG:3857 e dimensões proporcionais, com alvo de exibição de 5 m/px e teto de 2.500 pixels por dimensão. Fonte B04/B08 continua sendo de 10 m. Imagens e máscara são processadas separadamente: BILINEAR para bandas espectrais, NEAREST para SCL. A máscara binária conserva transparência dos pixels descartados. A avaliação de qualidade de 128 × 128 continua separada da renderização visual.

Dez testes unitários passaram, cobrindo variações dentro da antiga classe, proporcionalidade, teto de dimensões, projeção, interpolação independente, execução do evalscript e alpha da máscara. Build passou. Fluxo de navegador com provedor isolado passou novamente, incluindo resposta PNG com metadados de resolução, controle de opacidade, exportação e celular. Captura de renderização simulada foi inspecionada em `work/preview-render-qa-simulado.png`; não representa observação real de satélite.

As capturas enviadas pelo usuário mostram diferença visual, mas não fornecem data nem configuração do Lovable. Não foi localizado registro que confirme o ajuste histórico citado. A igualdade com o Lovable não foi verificada e não é declarada. A comparação visual depende de identificar a mesma aquisição nos dois sistemas.

## Publicação na internet · versão 0.4.0

Adicionado modo de build Pages com autenticação e processamento diretamente no navegador. Credenciais são fornecidas em tempo de execução, enviadas apenas ao endpoint de autenticação do Copernicus e mantidas na memória da aba. Tokens são reutilizados até expirar. Cada cliente tem conexão, progresso, cenas e cache independentes. Não há segredo no build, em cookies ou no armazenamento do navegador. A versão Node permanece local.

Treze testes unitários passaram. Os novos testes cobrem isolamento entre clientes e após recarregar, rejeição de autenticação inválida, orientação para SPA/CORS, ranking, exportação PNG, cache e interpolação independente da máscara. A rampa foi extraída para um módulo comum que funciona após a minificação do build de navegador.

O fluxo real em navegador usa provedor simulado isolado para verificar a versão Pages compilada: não depende de `/api`, mantém o caminho `/NDVI_ecovery/`, lê KML, gera PNG com mais de cem cores e máscara transparente, exporta e não grava credenciais. Testes simulados não comprovam a aceitação das credenciais reais do usuário no domínio público; o OAuth Client deve estar habilitado para SPA e autorizar `https://equipeiagro-kira.github.io`.
