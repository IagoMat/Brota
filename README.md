# 🌱 Brota

**Site de gestão financeira para jovens.**

O Brota ajuda quem está começando a lidar com dinheiro, como no primeiro estágio, a entender para onde a renda vai, planejar o mês, guardar para objetivos e sair das dívidas. Tudo roda no navegador, sem cadastro e sem servidor.

## Índice

- [Contexto do projeto](#contexto-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Como executar o projeto](#como-executar-o-projeto)
- [Dependências](#dependências)
- [Relatório no terminal (Python)](#relatório-no-terminal-python)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como os dados são guardados](#como-os-dados-são-guardados)
- [Autor](#autor)

## Contexto do projeto

Quando a primeira renda chega, aparecem perguntas que ninguém ensinou a responder: quanto posso gastar este mês? Estou gastando demais com lazer? Vale a pena guardar? Como pago essa dívida?

O Brota organiza essas respostas em um só lugar. A pessoa informa quanto recebe, registra entradas, despesas fixas e gastos do dia a dia, e o site calcula o saldo disponível, compara meses, avisa quando um limite foi ultrapassado e sugere onde economizar. Para quem tem dívidas, há um simulador que mostra em quantos meses dá para quitá-las.

O projeto foi desenvolvido como aplicação web de página única (SPA) em React, com a lógica de negócio separada das telas e dos componentes.

## Funcionalidades

### Primeiros passos
- **Boas-vindas em 3 etapas:** apresentação, nome e renda mensal (valor e dia de recebimento). A renda pode ser pulada e informada depois.
- **Alterar salário** a qualquer momento pelo menu do usuário na barra lateral.

### Lançamentos
- **Entradas:** salário (recorrente, todo mês) e renda extra (avulsa, com data).
- **Despesas fixas:** aparecem todos os meses com dia de vencimento. Podem ser marcadas como pagas em cada mês e encerradas quando deixarem de existir.
- **Saídas do dia a dia:** com categoria e data. Em compras parceladas, só a parcela do mês entra no extrato.
- **Categorias fixas:** 14 categorias em três grupos (necessidades, desejos e poupança), como Moradia, Mercado, Transporte, Lazer e Assinaturas.
- **Detalhes e exclusão** de cada lançamento, com confirmação.

### Visão do mês
- **Início:** saldo do mês, maior gasto, resumo da regra 50/30/20 e últimas movimentações.
- **Saldo do mês:** extrato completo e saldo disponível, calculado como entradas − saídas − despesas pendentes − dinheiro guardado em metas.
- **Seletor de mês:** navega do mês em que a pessoa começou a usar o app até 12 meses à frente.

### Planejamento
- **Regra 50/30/20:** acompanha quanto da renda foi para necessidades (50%), desejos (30%) e poupança (20%), com uma tela que explica a regra e dá um exemplo prático.
- **Limites por categoria:** define quanto gastar em cada categoria no mês e acompanha o consumo.
- **Metas:** cria objetivos com valor-alvo, guarda e retira dinheiro, e mantém o histórico de aportes e retiradas.

### Análise
- **Comparativo entre meses:** compara entradas, saídas, valor guardado e saldo de dois meses, com gráfico por categoria e a lista "O que mais mudou".
- **Dicas de economia** geradas a partir dos seus dados, com filtros por tipo e possibilidade de dispensar:
  - limite de categoria ultrapassado;
  - redução de gastos em relação ao mês anterior (conquista);
  - desejos acima de 30% da renda;
  - total gasto com assinaturas;
  - metas sem nenhum aporte no mês.

### Dívidas
- Cadastro com credor, saldo devedor, juros ao mês, parcela e dia de vencimento.
- Registro de pagamentos e barra de progresso de cada dívida.
- **Simulador de quitação** com duas estratégias:
  - **Bola de neve:** paga primeiro a dívida de menor saldo;
  - **Avalanche:** paga primeiro a de maior juros, o que reduz o total de juros pagos.
- O resultado informa em quantos meses as dívidas acabam, o total de juros e o total pago, ou avisa quando o valor mensal é menor que as parcelas ou não é suficiente para quitar.

### Exportação
- **Exportar extrato** em **CSV** ou **JSON**, com filtro por período e categoria e pré-visualização antes de baixar.
- **Relatório no terminal** com o script `Relatorio.py` (veja [abaixo](#relatório-no-terminal-python)).

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| [React 19](https://react.dev/) | Interface e componentes |
| [Vite 8](https://vite.dev/) | Servidor de desenvolvimento e build |
| [Recharts](https://recharts.org/) | Gráficos |
| [Lucide React](https://lucide.dev/) | Ícones |
| CSS puro | Estilos, um arquivo por tela ou componente |
| `localStorage` | Persistência dos dados no navegador |
| ESLint | Análise estática do código |
| Python 3 (opcional) | Relatório financeiro no terminal |

## Como executar o projeto

### Pré-requisitos

- **[Node.js](https://nodejs.org/)** `20.19+` ou `22.12+` (exigência do Vite 8). O npm já vem junto.
- **[Git](https://git-scm.com/)** para clonar o repositório.
- **Python 3.7+** somente se for usar o `Relatorio.py` (opcional).

Para conferir as versões instaladas:

```bash
node -v
npm -v
```

### Passo a passo

1. **Clone o repositório**

   ```bash
   git clone https://github.com/IagoMat/Brota.git
   ```

2. **Entre na pasta do projeto.** O código fica em uma subpasta:

   ```bash
   cd Brota/Brota/brota
   ```

3. **Instale as dependências**

   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento**

   ```bash
   npm run dev
   ```

5. **Abra no navegador** o endereço exibido no terminal, normalmente <http://localhost:5173>.

Na primeira visita, o site mostra as telas de boas-vindas para você informar nome e renda.

### Scripts disponíveis

Execute dentro de `Brota/brota`:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento com recarregamento automático |
| `npm run build` | Gera a versão de produção na pasta `dist/` |
| `npm run preview` | Serve localmente a versão gerada pelo build |
| `npm run lint` | Verifica o código com o ESLint |

## Dependências

Todas são instaladas automaticamente pelo `npm install`. Não é preciso baixar nada manualmente.

### Dependências de execução

| Pacote | Versão | Para que serve |
| --- | --- | --- |
| `react` | ^19.3.1 | Biblioteca de interface |
| `react-dom` | ^19.3.1 | Renderização do React no navegador |
| `recharts` | ^3.11.0 | Gráficos do comparativo entre meses |
| `lucide-react` | ^1.76.0 | Ícones da interface |

### Dependências de desenvolvimento

| Pacote | Versão | Para que serve |
| --- | --- | --- |
| `vite` | ^8.3.6 | Ferramenta de build e servidor de desenvolvimento |
| `@vitejs/plugin-react` | ^6.1.2 | Suporte a React no Vite |
| `eslint` | ^10.14.0 | Análise estática do código |
| `@eslint/js` | ^10.0.1 | Regras recomendadas do ESLint |
| `eslint-plugin-react-hooks` | ^7.1.1 | Regras para Hooks do React |
| `eslint-plugin-react-refresh` | ^0.5.7 | Regras para o Fast Refresh |
| `globals` | ^17.13.0 | Variáveis globais do navegador para o ESLint |
| `@types/react` | ^19.3.0 | Tipos do React (apoio do editor) |
| `@types/react-dom` | ^19.3.0 | Tipos do React DOM (apoio do editor) |

### Python (opcional)

O `Relatorio.py` **não usa nenhuma biblioteca externa**, só a biblioteca padrão do Python 3.7+. Não há `pip install`.

## Relatório no terminal (Python)

O script `Relatorio.py` lê o JSON exportado pelo site e imprime um resumo mensal no terminal: entradas, saídas, saldo, gastos por categoria com barras, lista de lançamentos e um resumo geral do período.

1. No site, abra **Exportar**, escolha o período e a categoria e clique em **Exportar JSON**. O arquivo `dados.json` é baixado.
2. No terminal, dentro de `Brota/brota`, execute:

   ```bash
   python Relatorio.py
   ```

   Ou informe o arquivo:

   ```bash
   python Relatorio.py dados.json
   ```

Sem argumentos, o script procura sozinho o `dados*.json` mais recente na pasta atual, na pasta do script e na pasta Downloads (inclusive no OneDrive, no Windows), então não é preciso mover o arquivo. Em alguns sistemas o comando é `python3`.

## Estrutura do projeto

```text
Brota/
├── README.md
└── Brota/
    └── brota/
        ├── index.html
        ├── package.json
        ├── vite.config.js
        ├── eslint.config.js
        ├── Relatorio.py              # Relatório financeiro no terminal
        ├── public/                   # Favicon e ícones
        └── src/
            ├── main.jsx              # Ponto de entrada
            ├── App.jsx               # Estado global e navegação entre telas
            ├── telas/                # Páginas (Início, Saldo, Metas, Dívidas...)
            │   └── BoasVindas/       # Fluxo de primeiro acesso
            ├── componentes/          # Menu, modais, seletores e contextos
            ├── logica/               # Regras de negócio puras, sem React
            ├── dados/                # Categorias e acesso ao localStorage
            └── estilos/              # CSS de cada tela e componente
```

A pasta `logica/` concentra as regras de negócio como funções puras (saldo, parcelas, dívidas, comparativo, dicas, exportação), o que facilita testá-las e reaproveitá-las.

## Como os dados são guardados

O Brota **não tem back-end nem banco de dados**. Tudo fica no `localStorage` do seu navegador:

- os dados ficam apenas no seu computador e não são enviados a nenhum servidor;
- cada navegador (e cada perfil) tem seus próprios dados;
- limpar os dados do site no navegador apaga tudo, então use **Exportar** para manter uma cópia.

## Autor

Desenvolvido por **Iago, Clara, Giovana**.
