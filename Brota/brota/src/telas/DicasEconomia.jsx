// src/telas/DicasEconomia.jsx
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Flag,
  Info,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import NavBar from "../componentes/navBar";
import SeletorMes from "../componentes/SeletorMes";
import { carregar, salvar } from "../dados/storage";
import { CATEGORIAS } from "../dados/categorias";
import {
  CATEGORIAS_DICA,
  gerarDicasEconomia,
  resumirDicas,
} from "../logica/DicasEconomia";
import "../estilos/DicasEconomia.css";

const CHAVE_DISPENSADAS = "estagCash:dicas-dispensadas";

const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function IconeDica({ tipo }) {
  switch (tipo) {
    case "alerta":
      return <AlertTriangle size={18} />;
    case "conquista":
      return <ShieldCheck size={18} />;
    case "regra":
      return <Target size={18} />;
    case "assinaturas":
      return <Repeat size={18} />;
    case "metas":
      return <Flag size={18} />;
    default:
      return <PiggyBank size={18} />;
  }
}

export default function DicasEconomia({
  telaAtiva = "dicas",
  onNavegar = () => {},
  mes = "",
  onMudarMes = () => {},
  lancamentos = [],
  limites = {},
  regra502030 = null,
  metas = [],
  categorias = CATEGORIAS,
}) {
  const [filtroAtivo, setFiltroAtivo] = useState("todas");
  const [dispensadasPorMes, setDispensadasPorMes] = useState(
    () => carregar(CHAVE_DISPENSADAS) ?? {}
  );

  useEffect(() => {
    salvar(CHAVE_DISPENSADAS, dispensadasPorMes);
  }, [dispensadasPorMes]);

  const mesChave = mes || "padrao";
  const idsDispensados = useMemo(() => {
    const lista = dispensadasPorMes?.[mesChave];
    return new Set(Array.isArray(lista) ? lista : []);
  }, [dispensadasPorMes, mesChave]);

  const todasDicas = useMemo(
    () =>
      gerarDicasEconomia({
        lancamentos,
        limites,
        regra502030,
        metas,
        categorias,
        mes,
      }),
    [lancamentos, limites, regra502030, metas, categorias, mes]
  );

  const dicasAtivas = useMemo(
    () => todasDicas.filter((d) => !idsDispensados.has(d.id)),
    [todasDicas, idsDispensados]
  );

  const dicasVisiveis = useMemo(() => {
    if (filtroAtivo === "todas") return dicasAtivas;
    return dicasAtivas.filter((d) => d.categoriaFiltro === filtroAtivo);
  }, [dicasAtivas, filtroAtivo]);

  const resumo = useMemo(() => resumirDicas(dicasAtivas), [dicasAtivas]);

  const dispensarDica = (idDica) => {
    setDispensadasPorMes((atual) => {
      const base = atual && typeof atual === "object" ? atual : {};
      const listaAtual = Array.isArray(base[mesChave]) ? base[mesChave] : [];
      if (listaAtual.includes(idDica)) return base;
      return {
        ...base,
        [mesChave]: [...listaAtual, idDica],
      };
    });
  };

  return (
    <div className="dicas-pagina">
      <NavBar telaAtiva={telaAtiva} onNavegar={onNavegar} />

      <main className="dicas">
        <header className="dicas__cabecalho">
          <div>
            <h1 className="dicas__titulo">Dicas de economia</h1>
            <p className="dicas__subtitulo">
              Sugestões geradas a partir dos seus números deste mês.
            </p>
          </div>

          <div className="dicas__seletor-mes">
            <SeletorMes
              valor={mes}
              onChange={onMudarMes}
              aria-label="Mês das dicas de economia"
            />
          </div>
        </header>

        {/* Resumo de economia */}
        <section className="dicas__resumo" aria-label="Resumo de economia">
          <span className="dicas__resumo-icone" aria-hidden="true">
            <PiggyBank size={22} />
          </span>
          <div className="dicas__resumo-conteudo">
            <strong className="dicas__resumo-qtd">
              {resumo.quantidade} {resumo.quantidade === 1 ? "dica" : "dicas"} para você
            </strong>
            <p className="dicas__resumo-potencial">
              Economia potencial: <strong>{moeda(resumo.economiaPotencial)}</strong> por mês.
            </p>
          </div>
        </section>

        {/* Filtros por categoria */}
        <nav className="dicas__filtros" aria-label="Filtrar dicas por categoria">
          {CATEGORIAS_DICA.map((cat) => {
            const ativo = filtroAtivo === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`dicas__filtro ${ativo ? "dicas__filtro--ativo" : ""}`}
                aria-pressed={ativo}
                onClick={() => setFiltroAtivo(cat.id)}
              >
                {cat.label}
              </button>
            );
          })}
        </nav>

        {/* Cards de dicas */}
        <section className="dicas__lista" aria-label="Recomendações de economia">
          {dicasVisiveis.length === 0 ? (
            <div className="dicas__vazio">
              <strong>Nenhuma dica encontrada para este filtro</strong>
              <p>
                {idsDispensados.size > 0 && filtroAtivo === "todas"
                  ? "Você dispensou as dicas deste mês ou seus números já estão equilibrados."
                  : "Altere o filtro ou adicione lançamentos e limites para novas sugestões."}
              </p>
            </div>
          ) : (
            dicasVisiveis.map((dica) => (
              <article
                key={dica.id}
                className={`dicas__card dicas__card--${dica.prioridade}`}
              >
                <span
                  className={`dicas__card-icone dicas__card-icone--${dica.prioridade}`}
                  aria-hidden="true"
                >
                  <IconeDica tipo={dica.icone} />
                </span>

                <div className="dicas__card-corpo">
                  <div className="dicas__card-meta">
                    <span
                      className={`dicas__badge dicas__badge--${dica.prioridade}`}
                    >
                      {dica.prioridadeLabel}
                    </span>
                    <span className="dicas__card-categoria">
                      {dica.categoriaLabel}
                    </span>
                  </div>

                  <h2 className="dicas__card-titulo">{dica.titulo}</h2>
                  <p className="dicas__card-descricao">{dica.descricao}</p>
                </div>

                <div className="dicas__card-acoes">
                  <button
                    type="button"
                    className="dicas__acao-link"
                    onClick={() => onNavegar(dica.destino)}
                  >
                    <span>{dica.acaoLabel}</span>
                    <ArrowRight size={15} />
                  </button>

                  <button
                    type="button"
                    className="dicas__dispensar"
                    aria-label={`Dispensar dica: ${dica.titulo}`}
                    title="Dispensar dica"
                    onClick={() => dispensarDica(dica.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <footer className="dicas__rodape">
          <Info size={15} aria-hidden="true" />
          <span>As dicas são calculadas com base nos seus lançamentos e limites.</span>
        </footer>
      </main>
    </div>
  );
}