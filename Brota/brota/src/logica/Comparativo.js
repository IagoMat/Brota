import { listarDoMes } from "./Lancamentos.js";
import {
  calcularSaldo,
  totalEntradas,
  totalSaidas,
  totalGuardado,
  totalPorCategoria,
} from "./saldo.js";
import { CATEGORIAS } from "../dados/categorias.js";
import { formatarMes, mesParaIndice, indiceParaMes, mesDeData } from "./Periodo.js";

const numeroSeguro = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const arredondar = (n) => Math.round(numeroSeguro(n) * 100) / 100;


// NÚMEROS DE UM MÊS


/**
 * Resumo completo de um mês.
 * @returns {{ entradas, saidas, guardado, saldo, porCategoria }}
 */
export function resumoDoMes(lancamentos, metas, mes) {
  const doMes = listarDoMes(Array.isArray(lancamentos) ? lancamentos : [], mes);
  const listaMetas = Array.isArray(metas) ? metas : [];

  const porCategoria = {};
  const mapaCategorias = totalPorCategoria(doMes) ?? {};
  Object.entries(mapaCategorias).forEach(([id, valor]) => {
    porCategoria[id] = arredondar(valor);
  });

  return {
    entradas: arredondar(totalEntradas(doMes)),
    saidas: arredondar(totalSaidas(doMes, mes)),
    guardado: arredondar(totalGuardado(listaMetas, mes)),
    saldo: arredondar(calcularSaldo(doMes, listaMetas, mes)),
    porCategoria,
  };
}


// VARIAÇÃO


/**
 * Compara dois valores.
 * @param {number} antes
 * @param {number} depois
 * @returns {{ direcao: "subiu"|"desceu"|"igual"|"novo", percentual: number|null, texto: string }}
 *   "novo" = não existia no mês de comparação (antes = 0), então não há % possível.
 */
export function calcularVariacao(antes, depois) {
  const a = arredondar(antes);
  const b = arredondar(depois);

  if (a === b) return { direcao: "igual", percentual: 0, texto: "0%" };
  if (a === 0) return { direcao: "novo", percentual: null, texto: "Novo" };

  // Math.abs no divisor: saldo pode ser negativo e o sinal da variação precisa continuar certo.
  const percentual = Math.round(((b - a) / Math.abs(a)) * 100);
  if (percentual === 0) return { direcao: "igual", percentual: 0, texto: "0%" };

  const direcao = b > a ? "subiu" : "desceu";
  const sinal = percentual > 0 ? "+" : "−"; // "−" é o sinal de menos tipográfico
  return { direcao, percentual, texto: `${sinal}${Math.abs(percentual)}%` };
}

// CATEGORIAS


const MAX_BARRAS = 6;

/** Nome legível de uma categoria (cai em "Outros" se o id não existir mais). */
export function nomeDaCategoria(id) {
  if (id === "__demais") return "Demais";
  const lista = Array.isArray(CATEGORIAS) ? CATEGORIAS : [];
  return lista.find((c) => c.id === id)?.nome ?? "Outros";
}

/**
 * Dados do gráfico "Gastos por categoria".
 * Mostra as 6 categorias com mais gasto (somando os dois meses), na ordem padrão
 * do app. Se houver mais que isso, o restante vira uma barra "Demais".
 *
 * @returns {Array<{ id, nome, a, b }>}  a = mês A, b = mês B
 */
export function dadosGraficoCategorias(porCategoriaA = {}, porCategoriaB = {}) {
  const catA = porCategoriaA ?? {};
  const catB = porCategoriaB ?? {};

  const ids = Array.from(new Set([...Object.keys(catA), ...Object.keys(catB)]));

  const linhas = ids
    .map((id) => ({
      id,
      nome: nomeDaCategoria(id),
      a: arredondar(catA[id]),
      b: arredondar(catB[id]),
    }))
    .filter((l) => l.a > 0 || l.b > 0);

  const lista = Array.isArray(CATEGORIAS) ? CATEGORIAS : [];
  const ordemApp = (id) => {
    const i = lista.findIndex((c) => c.id === id);
    return i === -1 ? lista.length : i;
  };

  // 1) escolhe as que mais pesam; 2) exibe na ordem padrão do app
  const maiores = [...linhas].sort((x, y) => y.a + y.b - (x.a + x.b));
  const escolhidas = maiores
    .slice(0, MAX_BARRAS)
    .sort((x, y) => ordemApp(x.id) - ordemApp(y.id));
  const restantes = maiores.slice(MAX_BARRAS);

  if (restantes.length > 0) {
    escolhidas.push({
      id: "__demais",
      nome: "Demais",
      a: arredondar(restantes.reduce((s, l) => s + l.a, 0)),
      b: arredondar(restantes.reduce((s, l) => s + l.b, 0)),
    });
  }
  return escolhidas;
}

/**
 * Lista "O que mais mudou": categorias de gasto com maior variação percentual.
 * Categorias novas (sem gasto no mês A) entram no topo com o selo "Novo".
 *
 * @param {number} limite quantas linhas devolver (padrão 3, como no design)
 */
export function maioresVariacoes(porCategoriaA = {}, porCategoriaB = {}, limite = 3) {
  const catA = porCategoriaA ?? {};
  const catB = porCategoriaB ?? {};

  const ids = Array.from(new Set([...Object.keys(catA), ...Object.keys(catB)]));

  return ids
    .map((id) => {
      const a = arredondar(catA[id]);
      const b = arredondar(catB[id]);
      return { id, nome: nomeDaCategoria(id), a, b, variacao: calcularVariacao(a, b) };
    })
    .filter((l) => l.variacao.direcao !== "igual")
    .sort(
      (x, y) =>
        peso(y.variacao) - peso(x.variacao) ||
        Math.abs(y.b - y.a) - Math.abs(x.b - x.a)
    )
    .slice(0, limite);
}

function peso(variacao) {
  return variacao.direcao === "novo" ? Infinity : Math.abs(variacao.percentual ?? 0);
}


// RÓTULOS DE MÊS

/** "2026-10" → "Outubro" */
export function nomeDoMes(mes) {
  if (!mes) return "";
  const formatado = formatarMes(mes) ?? "";
  return formatado.split(" de ")[0] || mes;
}

/** "2026-10" → "Out" */
export function abreviacaoDoMes(mes) {
  const nome = nomeDoMes(mes);
  return nome ? nome.slice(0, 3) : "";
}

/**
 * Rótulo curto para "vs. ...": só o nome do mês, ou com o ano se for de outro ano.
 * @example rotuloComparacao("2026-10", "2026-11") // "outubro"
 * @example rotuloComparacao("2025-10", "2026-11") // "outubro de 2025"
 */
export function rotuloComparacao(mes, mesBase) {
  if (!mes) return "";
  const formatado = formatarMes(mes) ?? mes;
  if (!mesBase) return formatado.toLowerCase();

  const mesmoAno = String(mes).slice(0, 4) === String(mesBase).slice(0, 4);
  return mesmoAno ? nomeDoMes(mes).toLowerCase() : formatado.toLowerCase();
}

// PADRÃO DOS SELETORES

/** Par inicial: mês anterior → mês atual (ex.: Outubro → Novembro). */
export function mesesIniciais(hoje = new Date()) {
  const atual = mesDeData(hoje) || "2026-11";
  const indiceAtual = mesParaIndice(atual);
  const anterior =
    typeof indiceAtual === "number" && Number.isFinite(indiceAtual)
      ? indiceParaMes(indiceAtual - 1) || atual
      : atual;

  return { mesA: anterior, mesB: atual };
}