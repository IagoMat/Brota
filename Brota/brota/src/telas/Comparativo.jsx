// Tela "Comparativo entre meses": escolhe dois meses e mostra o que mudou
// em entradas, saídas, guardado, saldo e gastos por categoria.

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Bus,
  Droplets,
  Ellipsis,
  GraduationCap,
  HeartPulse,
  House,
  PiggyBank,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  Ticket,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import NavBar from "../componentes/navBar";
import SeletorMes from "../componentes/SeletorMes";
import {
  abreviacaoDoMes,
  calcularVariacao,
  dadosGraficoCategorias,
  maioresVariacoes,
  mesesIniciais,
  nomeDoMes,
  resumoDoMes,
  rotuloComparacao,
} from "../logica/Comparativo";
import { formatarMes } from "../logica/Periodo";
import "../estilos/Comparativo.css";

// CONSTANTES E HELPERS
const COR_MES_A = "#9fd4b6"; // mês de comparação (mais claro)
const COR_MES_B = "#156b4c"; // mês principal

const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const inteiro = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const ICONES_CATEGORIA = {
  moradia: House,
  luz: Zap,
  agua: Droplets,
  internet_telefone: Wifi,
  mercado: ShoppingBasket,
  transporte: Bus,
  saude: HeartPulse,
  educacao: GraduationCap,
  restaurante: UtensilsCrossed,
  lazer: Ticket,
  compras: ShoppingBag,
  assinaturas: Repeat,
  outros: Ellipsis,
  investimento: PiggyBank,
  __demais: Ellipsis,
};

const CARDS = [
  {
    id: "entradas",
    titulo: "Entradas",
    chave: "entradas",
    icone: ArrowDownLeft,
    subeEhBom: true,
  },
  {
    id: "saidas",
    titulo: "Saídas",
    chave: "saidas",
    icone: ArrowUpRight,
    subeEhBom: false,
  },
  {
    id: "guardado",
    titulo: "Guardado",
    chave: "guardado",
    icone: PiggyBank,
    subeEhBom: true,
  },
  {
    id: "saldo",
    titulo: "Saldo",
    chave: "saldo",
    icone: Wallet,
    subeEhBom: true,
    destaque: true,
  },
];

/** "bom" | "ruim" | "neutro" — cor do selo de variação. */
function tomDaVariacao(variacao, subeEhBom) {
  if (!variacao || variacao.direcao === "igual") return "neutro";
  const subiu = variacao.direcao === "subiu" || variacao.direcao === "novo";
  return subiu === subeEhBom ? "bom" : "ruim";
}

// PEÇAS DO GRÁFICO

// Quebra nomes longos em até 2 linhas ("Restaurante e / delivery").
function quebrarNome(nome, max = 13) {
  const palavras = String(nome ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!palavras.length) return [""];

  const linhas = [];
  let atual = "";
  palavras.forEach((p) => {
    if (atual && `${atual} ${p}`.length > max) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = atual ? `${atual} ${p}` : p;
    }
  });
  if (atual) linhas.push(atual);
  return linhas.slice(0, 2);
}

function TickCategoria({ x = 0, y = 0, payload }) {
  const linhas = quebrarNome(String(payload?.value ?? ""));
  return (
    <text x={x} y={y + 14} textAnchor="middle" className="comparativo__tick">
      {linhas.map((linha, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 15}>
          {linha}
        </tspan>
      ))}
    </text>
  );
}

function TooltipGrafico({ active, payload, label, nomeA, nomeB }) {
  if (!active || !payload?.length) return null;
  const linha = payload[0]?.payload;
  if (!linha) return null;
  return (
    <div className="comparativo__tooltip">
      <strong>{label}</strong>
      <span>
        <i style={{ background: COR_MES_A }} />
        {nomeA}: {moeda(linha.a)}
      </span>
      <span>
        <i style={{ background: COR_MES_B }} />
        {nomeB}: {moeda(linha.b)}
      </span>
    </div>
  );
}

// COMPONENTE
export default function Comparativo({
  telaAtiva = "comparativo",
  onNavegar = () => {},
  lancamentos = [],
  metas = [],
}) {
  // Os dois meses são só desta tela: não mexem no mês global do app.
  const [{ mesA, mesB }, setMeses] = useState(() => mesesIniciais());

  const trocarMeses = () =>
    setMeses(({ mesA: a, mesB: b }) => ({ mesA: b, mesB: a }));
  const definirMesA = (mes) =>
    setMeses((atual) => ({ ...atual, mesA: mes }));
  const definirMesB = (mes) =>
    setMeses((atual) => ({ ...atual, mesB: mes }));

  const resumoA = useMemo(
    () => resumoDoMes(lancamentos, metas, mesA),
    [lancamentos, metas, mesA]
  );
  const resumoB = useMemo(
    () => resumoDoMes(lancamentos, metas, mesB),
    [lancamentos, metas, mesB]
  );

  const dadosGrafico = useMemo(
    () => dadosGraficoCategorias(resumoA.porCategoria, resumoB.porCategoria),
    [resumoA, resumoB]
  );

  const variacoes = useMemo(
    () => maioresVariacoes(resumoA.porCategoria, resumoB.porCategoria),
    [resumoA, resumoB]
  );

  const mesmoMes = mesA === mesB;
  const nomeA = formatarMes(mesA) || mesA;
  const nomeB = formatarMes(mesB) || mesB;
  const rotuloVs = rotuloComparacao(mesA, mesB);

  return (
    <div className="comparativo-pagina">
      <NavBar telaAtiva={telaAtiva} onNavegar={onNavegar} />

      <main className="comparativo">
        {/* ── Cabeçalho + seletores ── */}
        <header className="comparativo__cabecalho">
          <h1 className="comparativo__titulo">Comparativo entre meses</h1>
          <p className="comparativo__descricao">
            Veja o que mudou de um mês para o outro.
          </p>
        </header>

        <div className="comparativo__seletores">
          <SeletorMes
            valor={mesA}
            onChange={definirMesA}
            aria-label="Primeiro mês da comparação"
          />
          <button
            type="button"
            className="comparativo__trocar"
            onClick={trocarMeses}
            aria-label="Inverter os meses"
            title="Inverter os meses"
          >
            <ArrowLeftRight size={18} />
          </button>
          <SeletorMes
            valor={mesB}
            onChange={definirMesB}
            aria-label="Segundo mês da comparação"
          />
        </div>

        {mesmoMes && (
          <p className="comparativo__aviso" role="status">
            Você escolheu o mesmo mês nos dois lados. Escolha meses diferentes
            para ver o que mudou.
          </p>
        )}

        {/* ── Cards de resumo ── */}
        <section
          className="comparativo__cards"
          aria-label="Resumo dos dois meses"
        >
          {CARDS.map(
            ({ id, titulo, chave, icone: Icone, subeEhBom, destaque }) => {
              const valorA = resumoA[chave];
              const valorB = resumoB[chave];
              const variacao = calcularVariacao(valorA, valorB);
              const tom = tomDaVariacao(variacao, subeEhBom);

              return (
                <article
                  key={id}
                  className={`comparativo__card comparativo__card--${id}`}
                >
                  <div className="comparativo__card-topo">
                    <h2 className="comparativo__card-titulo">{titulo}</h2>
                    <span className="comparativo__card-icone">
                      <Icone size={16} />
                    </span>
                  </div>

                  <p className="comparativo__linha-a">
                    <span>{abreviacaoDoMes(mesA)}</span>
                    <strong>{moeda(valorA)}</strong>
                  </p>

                  <p
                    className={`comparativo__linha-b ${
                      destaque ? "comparativo__linha-b--destaque" : ""
                    }`}
                  >
                    <span>{abreviacaoDoMes(mesB)}</span>
                    <strong>{moeda(valorB)}</strong>
                  </p>

                  <div className="comparativo__card-rodape">
                    <span
                      className={`comparativo__selo comparativo__selo--${tom}`}
                    >
                      {variacao.texto}
                    </span>
                    <span className="comparativo__vs">vs. {rotuloVs}</span>
                  </div>
                </article>
              );
            }
          )}
        </section>

        {/* ── Gráfico: gastos por categoria ── */}
        <section className="comparativo__bloco">
          <div className="comparativo__bloco-topo">
            <div>
              <h2 className="comparativo__bloco-titulo">
                Gastos por categoria
              </h2>
              <p className="comparativo__bloco-sub">
                Compare suas saídas nos dois meses
              </p>
            </div>

            <div className="comparativo__legenda">
              <span>
                <i style={{ background: COR_MES_A }} />
                {nomeA}
              </span>
              <span>
                <i style={{ background: COR_MES_B }} />
                {nomeB}
              </span>
            </div>
          </div>

          {dadosGrafico.length === 0 ? (
            <p className="comparativo__vazio">
              Nenhum gasto registrado nesses dois meses.
            </p>
          ) : (
            <div
              className="comparativo__grafico"
              role="img"
              aria-label={`Gráfico de barras com os gastos por categoria em ${nomeA} e ${nomeB}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosGrafico}
                  margin={{ top: 22, right: 8, bottom: 0, left: 0 }}
                  barGap={4}
                  barCategoryGap="28%"
                >
                  <CartesianGrid vertical={false} stroke="#eceef6" />
                  <XAxis
                    dataKey="nome"
                    interval={0}
                    height={46}
                    axisLine={false}
                    tickLine={false}
                    tick={<TickCategoria />}
                  />
                  <YAxis
                    width={58}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${inteiro(v)}`}
                    tick={{ fontSize: 11, fill: "#8a87a0" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(80, 86, 217, 0.05)" }}
                    content={<TooltipGrafico nomeA={nomeA} nomeB={nomeB} />}
                  />
                  <Bar
                    dataKey="a"
                    fill={COR_MES_A}
                    maxBarSize={32}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="a"
                      position="top"
                      formatter={inteiro}
                      fill="#6b7090"
                      fontSize={11}
                    />
                  </Bar>
                  <Bar
                    dataKey="b"
                    fill={COR_MES_B}
                    maxBarSize={32}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="b"
                      position="top"
                      formatter={inteiro}
                      fill="#156b4c"
                      fontSize={11}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* ── O que mais mudou ── */}
        <section className="comparativo__bloco">
          <div className="comparativo__mudou-cabecalho">
            <div className="comparativo__mudou-titulo">
              <h2 className="comparativo__bloco-titulo">O que mais mudou</h2>
              <p className="comparativo__bloco-sub">
                As maiores variações percentuais nos seus gastos
              </p>
            </div>
            {variacoes.length > 0 && (
              <div className="comparativo__mudou-colunas">
                <span className="comparativo__coluna">{nomeDoMes(mesA)}</span>
                <span className="comparativo__coluna">{nomeDoMes(mesB)}</span>
                <span className="comparativo__coluna comparativo__coluna--centro">
                  Variação
                </span>
              </div>
            )}
          </div>

          {variacoes.length === 0 ? (
            <p className="comparativo__vazio">
              Nenhuma variação nos gastos entre esses dois meses.
            </p>
          ) : (
            <ul className="comparativo__lista">
              {variacoes.map((item) => {
                const Icone = ICONES_CATEGORIA[item.id] ?? Ellipsis;
                const tom = tomDaVariacao(item.variacao, false); // gasto subir é ruim
                return (
                  <li key={item.id} className="comparativo__item">
                    <div className="comparativo__item-nome">
                      <span
                        className={`comparativo__item-icone comparativo__item-icone--${tom}`}
                      >
                        <Icone size={16} />
                      </span>
                      {item.nome}
                    </div>
                    <span className="comparativo__item-valor comparativo__item-valor--a">
                      {moeda(item.a)}
                    </span>
                    <ArrowRight
                      size={15}
                      className="comparativo__item-seta"
                      aria-hidden="true"
                    />
                    <span className="comparativo__item-valor comparativo__item-valor--b">
                      {moeda(item.b)}
                    </span>
                    <span
                      className={`comparativo__selo comparativo__selo--${tom} comparativo__selo--largo`}
                    >
                      {item.variacao.texto}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}