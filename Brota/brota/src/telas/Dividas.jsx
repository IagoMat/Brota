import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Flag,
  Heart,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";
import NavBar from "../componentes/navBar";
import NovaDivida from "../componentes/NovaDivida";
import PagarDivida from "../componentes/PagarDivida";
import { carregar, salvar } from "../dados/storage";
import {
  ESTRATEGIAS,
  formatarMesCurto,
  parcelasDoMes,
  progressoDivida,
  simularQuitacao,
  somarMeses,
  totalDevido,
} from "../logica/Dividas";
import "../estilos/Dividas.css";

// Guarda o valor mensal e a estratégia escolhidos na simulação
const CHAVE_SIMULACAO = "estagCash:dividas-simulacao";
// HELPERS
const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const percentual = (n) =>
  `${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

// Mesma máscara de moeda usada nos modais: 70000 -> "700,00"
const mascararValor = (texto) => {
  const digitos = String(texto ?? "").replace(/\D/g, "").slice(0, 12);
  if (!digitos) return "";
  return (parseInt(digitos, 10) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const valorParaNumero = (texto) =>
  texto ? parseFloat(String(texto).replace(/\./g, "").replace(",", ".")) || 0 : 0;

// Dívida com família/amigos ganha um coração; as demais, a carteira
const ehPessoal = (d) =>
  /fam[ií]lia|amig|irm[aã]o|irm[aã]|pai\b|m[aã]e\b|primo|tio|tia|av[oó]/i.test(
    `${d?.nome ?? ""} ${d?.credor ?? ""}`
  );

const TEXTO_ESTRATEGIA = {
  [ESTRATEGIAS.BOLA_DE_NEVE]:
    "Uma dívida de cada vez, mais perto de ficar livre.",
  [ESTRATEGIAS.AVALANCHE]:
    "Os juros mais altos primeiro, para pagar menos no total.",
};

function obterMesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

// GRÁFICO — saldo devedor ao longo dos meses (SVG simples)
function GraficoSaldo({ serie = [] }) {
  const lista = Array.isArray(serie) && serie.length > 0 ? serie : [0];
  const maximo = lista[0] || 1;
  const ultimo = lista.length - 1;

  const pontos = lista.map((saldo, i) => {
    const x = ultimo === 0 ? 100 : (i / ultimo) * 100;
    const y = 100 - (Math.max(0, Number(saldo) || 0) / maximo) * 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linha = pontos.join(" ");
  const area =
    ultimo === 0 ? "0,100 100,100 100,100 0,100" : `${linha} 100,100 0,100`;

  return (
    <div className="dv-grafico">
      <div className="dv-grafico__eixo-y">
        <span>{moeda(maximo).replace(",00", "")}</span>
        <span>R$ 0</span>
      </div>

      <div className="dv-grafico__area">
        <span className="dv-grafico__grade dv-grafico__grade--topo" />
        <span className="dv-grafico__grade dv-grafico__grade--meio" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={area} className="dv-grafico__preenchimento" />
          <polyline
            points={linha}
            className="dv-grafico__linha"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="dv-grafico__ponto" />
      </div>

      <div className="dv-grafico__eixo-x">
        <span>Hoje</span>
        <span>
          {ultimo} {ultimo === 1 ? "mês" : "meses"}
        </span>
      </div>
    </div>
  );
}

// COMPONENTE PRINCIPAL
export default function Dividas({
  telaAtiva = "dividas",
  onNavegar = () => {},
  dividas = [],
  onAdicionar = () => {},
  onEditar = () => {},
  onPagar = () => {},
  onExcluir = () => {},
}) {
  const listaDividas = Array.isArray(dividas) ? dividas : [];

  // modal = null | { tipo: "nova" } | { tipo: "editar" | "pagar" | "excluir", divida }
  const [modal, setModal] = useState(null);

  // ── Simulação (valor e estratégia ficam salvos) ──
  const [salvo] = useState(() => carregar(CHAVE_SIMULACAO));
  const [valorTexto, setValorTexto] = useState(salvo?.valor ?? null);
  const [estrategia, setEstrategia] = useState(
    salvo?.estrategia ?? ESTRATEGIAS.BOLA_DE_NEVE
  );

  const somaParcelas = parcelasDoMes(listaDividas);

  // Enquanto a pessoa não digitar nada, sugere a soma das parcelas
  const valorMensal =
    valorTexto !== null ? valorParaNumero(valorTexto) : Math.ceil(somaParcelas);
  const valorExibido =
    valorTexto !== null
      ? valorTexto
      : somaParcelas > 0
        ? mascararValor(String(Math.ceil(somaParcelas) * 100))
        : "";

  useEffect(() => {
    if (valorTexto === null && estrategia === ESTRATEGIAS.BOLA_DE_NEVE) return;
    salvar(CHAVE_SIMULACAO, { valor: valorTexto, estrategia });
  }, [valorTexto, estrategia]);

  const simulacao = useMemo(
    () => simularQuitacao(listaDividas, valorMensal, estrategia),
    [listaDividas, valorMensal, estrategia]
  );

  const quitou = simulacao.estado === "ok";
  const mesAtual = obterMesAtual();
  const livreEm = quitou
    ? formatarMesCurto(somarMeses(mesAtual, simulacao.meses))
    : "—";

  const fecharModal = () => setModal(null);

  // ── Conteúdo do card de resultado ──
  const resultado = (() => {
    switch (simulacao.estado) {
      case "ok":
        return {
          titulo: `Quita em ${simulacao.meses} ${simulacao.meses === 1 ? "mês" : "meses"}`,
          sub: `Juros totais ${moeda(simulacao.jurosTotais)}`,
          texto: TEXTO_ESTRATEGIA[estrategia],
        };
      case "insuficiente":
        return {
          titulo: "Valor abaixo das parcelas",
          sub: `Mínimo: ${moeda(simulacao.minimo)}`,
          texto: "Some as parcelas do mês para conseguir simular.",
          alerta: true,
        };
      case "nao-quita":
        return {
          titulo: "Ainda não quita",
          sub: "Os juros crescem mais que o valor pago",
          texto: "Aumente o valor mensal ou teste a estratégia Avalanche.",
          alerta: true,
        };
      default:
        return {
          titulo: "Sem dívidas ativas",
          sub: "Cadastre uma dívida para simular",
          texto: "Assim você vê em quantos meses fica livre.",
        };
    }
  })();

  // RENDER
  return (
    <div className="dividas-pagina">
      <NavBar telaAtiva={telaAtiva} onNavegar={onNavegar} />

      <main className="dividas">
        {/* Cabeçalho */}
        <header className="dividas__cabecalho">
          <div>
            <h1 className="dividas__titulo">Dívidas</h1>
            <p className="dividas__descricao">
              Saiba quanto deve e trace o caminho para quitar.
            </p>
          </div>
        </header>

        {/* Cards de resumo */}
        <section className="dividas__resumo">
          <div className="dividas__card-resumo">
            <div>
              <span className="dividas__rotulo">Total devido</span>
              <strong className="dividas__numero">
                {moeda(totalDevido(listaDividas))}
              </strong>
            </div>
            <span className="dividas__icone-resumo">
              <Wallet size={20} />
            </span>
          </div>

          <div className="dividas__card-resumo">
            <div>
              <span className="dividas__rotulo">Parcelas do mês</span>
              <strong className="dividas__numero">{moeda(somaParcelas)}</strong>
            </div>
            <span className="dividas__icone-resumo">
              <CalendarDays size={20} />
            </span>
          </div>

          <div className="dividas__card-resumo">
            <div>
              <span className="dividas__rotulo">Livre das dívidas em</span>
              <strong className="dividas__numero dividas__numero--destaque">
                {livreEm}
              </strong>
            </div>
            <span className="dividas__icone-resumo">
              <Flag size={20} />
            </span>
          </div>
        </section>

        {/* Lista de dívidas */}
        <section className="dividas__painel">
          <div className="dividas__painel-topo">
            <h2>Suas dívidas</h2>
            <button
              type="button"
              className="dividas__botao"
              onClick={() => setModal({ tipo: "nova" })}
            >
              Nova dívida
            </button>
          </div>

          {listaDividas.length === 0 ? (
            <div className="dividas__vazio">
              <span className="dividas__icone-linha">
                <Wallet size={20} />
              </span>
              <strong>Nenhuma dívida cadastrada</strong>
              <p>Cadastre as suas dívidas para ver o caminho até quitar tudo.</p>
            </div>
          ) : (
            <div className="dividas__tabela-scroll">
              <div className="dividas__tabela" role="table" aria-label="Suas dívidas">
                <div
                  className="dividas__linha dividas__linha--cabecalho"
                  role="row"
                >
                  <span role="columnheader">Dívida</span>
                  <span role="columnheader">Saldo devedor</span>
                  <span role="columnheader">Juros ao mês</span>
                  <span role="columnheader">Parcela</span>
                  <span role="columnheader">Vencimento</span>
                  <span role="columnheader">Progresso</span>
                  <span role="columnheader" className="dividas__col-acoes" />
                </div>

                {listaDividas.map((d) => {
                  const quitada = Number(d.saldo) <= 0;
                  const pct = progressoDivida(d);
                  const Icone = ehPessoal(d) ? Heart : Wallet;

                  return (
                    <div
                      key={d.id}
                      role="row"
                      className={`dividas__linha dividas__linha--item ${
                        quitada ? "dividas__linha--quitada" : ""
                      }`}
                    >
                      <div className="dividas__nome" role="cell">
                        <span className="dividas__icone-linha">
                          <Icone size={18} />
                        </span>
                        <div>
                          <strong>{d.nome}</strong>
                          <small>{d.credor || "Credor não informado"}</small>
                        </div>
                      </div>

                      <span role="cell" className="dividas__celula">
                        {moeda(d.saldo)}
                      </span>
                      <span role="cell" className="dividas__celula">
                        {percentual(d.juros)}
                      </span>
                      <span role="cell" className="dividas__celula">
                        {moeda(d.parcela)}
                      </span>
                      <span role="cell" className="dividas__celula">
                        dia {d.diaVencimento}
                      </span>

                      <div role="cell" className="dividas__progresso">
                        <span>{quitada ? "Quitada" : `${Math.round(pct)}%`}</span>
                        <div
                          className="dividas__barra"
                          role="progressbar"
                          aria-valuenow={Math.round(pct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="dividas__barra-cheia"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div role="cell" className="dividas__acoes">
                        {!quitada && (
                          <button
                            type="button"
                            className="dividas__pagar"
                            onClick={() => setModal({ tipo: "pagar", divida: d })}
                          >
                            Pagar
                          </button>
                        )}
                        <button
                          type="button"
                          className="dividas__icone-botao"
                          aria-label={`Editar ${d.nome}`}
                          onClick={() => setModal({ tipo: "editar", divida: d })}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="dividas__icone-botao dividas__icone-botao--perigo"
                          aria-label={`Excluir ${d.nome}`}
                          onClick={() => setModal({ tipo: "excluir", divida: d })}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Simulador de quitação */}
        <section className="dividas__painel dividas__simulador">
          <h2>Simular quitação</h2>

          <div className="dividas__simulador-grade">
            <div className="dividas__simulador-form">
              <label htmlFor="dv-valor-mensal" className="dividas__label">
                Quanto posso pagar por mês
              </label>
              <div className="dividas__valor">
                <span>R$</span>
                <input
                  id="dv-valor-mensal"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valorExibido}
                  onChange={(e) => setValorTexto(mascararValor(e.target.value))}
                  autoComplete="off"
                  disabled={listaDividas.length === 0}
                />
              </div>

              <span className="dividas__label dividas__label--pequeno">
                Estratégia de quitação
              </span>
              <div
                className="dividas__segmentos"
                role="tablist"
                aria-label="Estratégia de quitação"
              >
                {[
                  { id: ESTRATEGIAS.BOLA_DE_NEVE, nome: "Bola de neve" },
                  { id: ESTRATEGIAS.AVALANCHE, nome: "Avalanche" },
                ].map(({ id, nome }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={estrategia === id}
                    className={`dividas__segmento ${
                      estrategia === id ? "dividas__segmento--ativo" : ""
                    }`}
                    onClick={() => setEstrategia(id)}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`dividas__resultado ${
                resultado.alerta ? "dividas__resultado--alerta" : ""
              }`}
            >
              <strong>{resultado.titulo}</strong>
              <span>{resultado.sub}</span>
              <p>{resultado.texto}</p>
            </div>

            <div className="dividas__grafico-bloco">
              <span className="dividas__label dividas__label--pequeno">
                Saldo devedor
              </span>
              {quitou ? (
                <GraficoSaldo serie={simulacao.serie} />
              ) : (
                <div className="dividas__grafico-vazio">
                  O gráfico aparece quando a simulação consegue quitar.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Modais */}
      {modal?.tipo === "nova" && (
        <NovaDivida onFechar={fecharModal} onSalvar={onAdicionar} />
      )}

      {modal?.tipo === "editar" && (
        <NovaDivida
          divida={modal.divida}
          onFechar={fecharModal}
          onSalvar={(dados) => onEditar(modal.divida.id, dados)}
        />
      )}

      {modal?.tipo === "pagar" && (
        <PagarDivida
          divida={modal.divida}
          onFechar={fecharModal}
          onConfirmar={(valor) => onPagar(modal.divida.id, valor)}
        />
      )}

      {modal?.tipo === "excluir" && (
        <ConfirmarExclusaoDivida
          divida={modal.divida}
          onFechar={fecharModal}
          onConfirmar={() => {
            onExcluir(modal.divida.id);
            fecharModal();
          }}
        />
      )}
    </div>
  );
}

// CONFIRMAR EXCLUSÃO (usa os estilos de NovaDivida.css)
function ConfirmarExclusaoDivida({ divida, onFechar, onConfirmar }) {
  const cancelar = useRef(null);

  useEffect(() => {
    cancelar.current?.focus();
    const aoPressionar = (e) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoPressionar);
    return () => document.removeEventListener("keydown", aoPressionar);
  }, [onFechar]);

  return (
    <div
      className="dv-modal__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        className="dv-modal dv-modal--confirmar"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="excluir-divida-titulo"
      >
        <h2
          id="excluir-divida-titulo"
          className="dv-modal__titulo"
          style={{ marginTop: 0 }}
        >
          Excluir esta dívida?
        </h2>
        <p className="dv-modal__texto">
          <strong>{divida?.nome}</strong> será removida da sua lista e da
          simulação. Essa ação não pode ser desfeita.
        </p>

        <div className="dv-modal__acoes">
          <button
            type="button"
            ref={cancelar}
            className="dv-modal__acao dv-modal__acao--cancelar"
            onClick={onFechar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="dv-modal__acao dv-modal__acao--excluir"
            onClick={onConfirmar}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}