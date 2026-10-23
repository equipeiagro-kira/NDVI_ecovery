# NDVI_ecovery · RUBISCK

Aplicação local para consultar Sentinel-2 L2A no Copernicus Data Space, visualizar NDVI e cor natural e exportar imagens. Identidade oficial RUBISCK Ciclo Vivo v2.

## Aplicativo na internet

Endereço do aplicativo: https://equipeiagro-kira.github.io/NDVI_ecovery/

A versão GitHub Pages executa as consultas diretamente no navegador de cada visitante. Não depende do servidor local nem de um computador ligado. Client ID, Client Secret e token ficam somente na memória da aba; não são enviados ao GitHub nem armazenados em localStorage/sessionStorage. Recarregar ou fechar a página exige uma nova conexão. Cada aba tem sua própria conexão, área e imagens.

Para conectar a versão pública:

1. No painel https://shapps.dataspace.copernicus.eu/dashboard/#/account/settings, crie um OAuth Client com a opção **SPA** habilitada.
2. Autorize a origem exata **https://equipeiagro-kira.github.io** (sem `/NDVI_ecovery/`).
3. No aplicativo, clique em **Configurar conexão** e preencha o Client ID e o Client Secret desse cliente.
4. Importe o KML, selecione o talhão, clique em **Buscar imagens** e exporte o PNG da data desejada.

O aplicativo pede credenciais OAuth da aplicação, não a senha pessoal da conta Copernicus. Compartilhar a mesma credencial entre colegas consome a mesma cota de uso. O botão **Desconectar e limpar credenciais** remove a conexão da aba.

A publicação automática em `.github/workflows/pages.yml` roda os testes, gera a versão estática e publica no GitHub Pages a cada envio para `main`. Não usa segredos de Copernicus no build ou no repositório.

Para testar a versão Pages localmente: `npm run build:pages` e `npm run preview:pages`; abra http://127.0.0.1:5176/NDVI_ecovery/. Para autenticação real nesse teste, a origem local também precisa estar autorizada no cliente SPA.

## Executar

Requer Node.js 22 ou superior. Na pasta do projeto:

```powershell
npm install
npm run dev
```

Abra http://localhost:5173. O servidor aceita conexões somente deste computador. O atalho `Abrir NDVI.url` abre essa página depois que o servidor estiver iniciado.

Para gerar a versão de produção: `npm run build`; depois `npm start`.

## Conectar e consultar

1. Crie um OAuth Client no painel Sentinel Hub do Copernicus Data Space: https://shapps.dataspace.copernicus.eu/dashboard/#/account/settings
2. Em **Configurar conexão**, informe Client ID e Client Secret. Eles ficam na memória do servidor durante a execução; não são gravados no navegador ou no Git. Como alternativa, copie `.env.example` para `.env` e preencha localmente.
3. Importe um KML com Polygon ou GeoJSON Polygon/Feature/FeatureCollection em WGS84. Se houver vários polígonos, selecione o talhão. Polígonos com áreas internas excluídas são aceitos. MultiPolygon GeoJSON é separado em partes selecionáveis. KMZ, linhas e links de rede não são aceitos.
4. Ajuste o filtro máximo de nuvens na cena e clique em **Buscar imagens**. A janela é de três anos móveis até o instante da consulta.
5. Selecione a data, alterne NDVI/cor natural e use **Exportar PNG** ou **Exportar metadados**.

## Seleção e limites

O catálogo é paginado e todas as aquisições elegíveis retornadas são avaliadas sequencialmente. O filtro de nuvens refere-se à cena do catálogo, não ao talhão. A aplicação calcula uma estimativa da fração visível sobre o polígono usando SCL 4, 5 e 6 (vegetação, solo e água) e dataMask em uma amostra de 128 × 128. Pixels sem cobertura entram no denominador, impedindo que uma cena incompleta pareça totalmente visível. Retém a maior visibilidade em cada mês; empates favorecem menor cobertura de nuvens. Um mês sem aquisição elegível fica sem imagem. A janela móvel pode abranger partes de 37 meses de calendário.

Reduzir o limite de nuvens pode excluir uma cena com talhão limpo. Use 100% para comparar todas as cenas disponíveis. Não há garantia de observação sem nuvens em todos os meses. A máscara SCL é uma classificação automática e tem incertezas. A imagem representa a aquisição no instante selecionado, podendo combinar tiles da mesma passagem; não é um mosaico de várias datas.

NDVI = (B08 − B04) / (B08 + B04). Pixels descartados são transparentes. A paleta contínua é fixa de −1 a 1 e aparece no mapa. O PNG agora tem dimensões proporcionais ao envelope da área, em EPSG:3857, alinhado à projeção do mapa. A grade de exibição tem alvo de 5 m/px em solo, limitada a 2.500 pixels por dimensão; a resolução de origem das bandas B04 e B08 continua sendo 10 m. Áreas maiores usam uma grade de exibição mais grossa para respeitar esse limite. Dimensões e espaçamento efetivos aparecem no inspetor.

As bandas espectrais são processadas com interpolação bilinear. A máscara SCL é obtida separadamente com vizinho mais próximo e aplicada como transparência binária no servidor. Isso suaviza a apresentação sem interpolar classes de nuvens. Não aplica desfoque ao PNG nem muda os valores para imitar outra imagem. O controle de opacidade afeta somente o mapa; o PNG exportado preserva a opacidade original dos pixels válidos. Os resultados visuais são armazenados em cache na memória, com limite aproximado de 64 MB, para evitar repetir chamadas durante a alternância de camadas.

O PNG não é GeoTIFF nem um raster numérico a resolução nativa. O GeoJSON exportado contém área, metadados e informações da renderização. Não calcula diagnóstico agronômico. Comparações com outra aplicação exigem a mesma data, área, produto e escala de cores. Interpolação não aumenta o detalhe medido pelo satélite.

Por custo e segurança local, o envelope geográfico é limitado a 0,25 grau quadrado e o catálogo a 3.000 resultados. Arquivos têm limite de 10 MB; cada contorno aceita até 20.000 pontos. Consultas extensas podem levar muitos minutos e consumir a cota Copernicus; 429 indica limite de uso. Não existem imagens ou métricas demonstrativas apresentadas como dados reais. Mapa-base utiliza OpenStreetMap e exige internet.

## Git e publicação

Nome solicitado: `NDVI_ecovery`. `.env`, dependências e builds são ignorados. Segredos devem permanecer fora do repositório. O servidor Node continua sendo uma opção local, com acesso apenas a este computador. A publicação pública usa o modo Pages, com acesso direto ao Copernicus em cada navegador. O servidor Node não é publicado no GitHub Pages.

Repositório público do código: https://github.com/equipeiagro-kira/NDVI_ecovery

## Validação

`npm test` executa treze testes de limites de área, denominador da qualidade, ordenação, período, renderização contínua e isolamento dos clientes de navegador. A sessão local real confirmou autenticação e uma consulta concluída com 61 aquisições avaliadas e 24 meses selecionados. Isso valida a busca e o ranking locais, mas não confirma a comparação visual com o Lovable nem a autenticação real do cliente SPA no domínio público. A última depende de credenciais autorizadas para essa origem.

## Referências

- Autenticação: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html
- Catálogo: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Catalog/Examples.html
- Processamento: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process/Examples/S2L2A.html
- Crédito: Modified Copernicus Sentinel data [ano da aquisição] / Sentinel Hub.

O conceito visual foi gerado pela ferramenta integrada Image Gen, com interface escura, painel de área, mapa, inspetor e histórico mensal. `conceito.png` é referência visual, sem dados científicos.


