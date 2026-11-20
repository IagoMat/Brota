// Regras puras para geração dinâmica de "Dicas de economia" a partir dos dados do app.

import { listarDoMes } from "./Lancamentos.js";
import { totalPorCategoria, totalGuardado } from "./saldo.js";
import { mesParaIndice, indiceParaMes } from "./Periodo.js";
import { CATEGORIAS } from "../dados/categorias.js";

const arredondar = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
};

export const CATEGORIAS_DICA = [
  { id: "todas", label: "Todas" },
  { id: "limites", label: "Limites" },
  { id: "regra", label: "Regra 50/30/20" },
  { id: "assinaturas", label: "Assinaturas" },
  { id: "metas", label: "Metas" },
];

export function nomeCategoriaPorId(id, categorias = CATEGORIAS) {
  if (!id) return "Categoria";
  const lista = Array.isArray(categorias) ? categorias : CATEGORIAS;
  return lista.find((c) => c.id === id)?.nome ?? String(id);
}

function obterMesAnterior(mes) {
  if (!mes || typeof mes !== "string") return null;
  const idx = mesParaIndice(mes);
  if (typeof idx !== "number" || !Number.isFinite(idx)) return null;
  return indiceParaMes(idx - 1);
}

function calcularTotalAssinaturasDoMes(lancamentosDoMes = [], categorias = CATEGORIAS) {
  const lista = Array.isArray(lancamentosDoMes) ? lancamentosDoMes : [];
  const cats = Array.isArray(categorias) ? categorias : CATEGORIAS;

  const idsAssinatura = new Set(
    cats
      .filter((c) => /assinatura|stream|recorren/i.test(`${c.id ?? ""} ${c.nome ?? ""}`))
      .map((c) => c.id)
  );
  idsAssinatura.add("assinaturas");

  return arredondar(
    lista.reduce((soma, item) => {
      if (!item || item.tipo === "entrada") return soma;
      const catId = item.categoriaId ?? item.categoria ?? "";
      const texto = `${item.nome ?? ""} ${item.descricao ?? ""} ${catId}`.toLowerCase();
      const ehAssinatura =
        idsAssinatura.has(catId) ||
        /assinatura|netflix|spotify|disney|hbo|prime|youtube|icloud|google one|academ/i.test(
          texto
        );
      if (!ehAssinatura) return soma;
      const valor = Number(item.valor ?? 0);
      return Number.isFinite(valor) && valor > 0 ? soma + valor : soma;
    }, 0)
  );
}

/**
 * Gera lista dinâmica de dicas para o mês selecionado.
 */
export function gerarDicasEconomia({
  lancamentos = [],
  limites = {},
  regra502030 = null,
  metas = [],
  categorias = CATEGORIAS,
  mes = "",
} = {}) {
  const dicas = [];
  const listaLancamentos = Array.isArray(lancamentos) ? lancamentos : [];
  const lancamentosDoMes = listarDoMes(listaLancamentos, mes);
  const gastosMes = totalPorCategoria(lancamentosDoMes) ?? {};

  const mesAnterior = obterMesAnterior(mes);
  const gastosMesAnterior = mesAnterior
    ? totalPorCategoria(listarDoMes(listaLancamentos, mesAnterior)) ?? {}
    : {};

  const mapaLimites = limites && typeof limites === "object" ? limites : {};

  // 1. Limites excedidos no mês atual
  Object.entries(mapaLimites).forEach(([catId, limiteRaw]) => {
    const limite = arredondar(limiteRaw);
    const gasto = arredondar(gastosMes[catId] ?? 0);
    if (limite > 0 && gasto > limite) {
      const excedente = arredondar(gasto - limite);
      const nomeCat = nomeCategoriaPorId(catId, categorias);
      dicas.push({
        id: `limite-excedido-${catId}`,
        categoriaFiltro: "limites",
        categoriaLabel: "Limites",
        prioridade: "alta",
        prioridadeLabel: "Alta prioridade",
        icone: "alerta",
        titulo: `${nomeCat} passou do limite`,
        descricao: `${nomeCat} passou do limite: ${formatarMoedaSimples(gasto)} de ${formatarMoedaSimples(limite)}.`,
        acaoLabel: "Ver categoria",
        destino: "limites",
        economiaPotencial: excedente,
      });
    }
  });

  // 2. Conquistas: redução de gasto em relação ao mês anterior
  const idsComparacao = Array.from(
    new Set([...Object.keys(gastosMes), ...Object.keys(gastosMesAnterior)])
  );
  idsComparacao.forEach((catId) => {
    const atual = arredondar(gastosMes[catId] ?? 0);
    const anterior = arredondar(gastosMesAnterior[catId] ?? 0);
    if (anterior > 0 && atual < anterior) {
      const reducaoPct = Math.round(((anterior - atual) / anterior) * 100);
      if (reducaoPct >= 5) {
        const nomeCat = nomeCategoriaPorId(catId, categorias);
        dicas.push({
          id: `conquista-reducao-${catId}`,
          categoriaFiltro: "limites",
          categoriaLabel: "Limites",
          prioridade: "conquista",
          prioridadeLabel: "Conquista",
          icone: "conquista",
          titulo: `${nomeCat} ficou ${reducaoPct}% abaixo do mês passado. Bom ritmo!`,
          descricao: `Você gastou ${reducaoPct}% menos em ${nomeCat.toLowerCase()} em relação ao mês passado.`,
          acaoLabel: "Ver categoria",
          destino: "limites",
          economiaPotencial: 0,
        });
      }
    }
  });

  // 3. Regra 50/30/20 (desejos acima do teto sugerido de 30%)
  const desejos = regra502030?.desejos ?? regra502030?.porcentagens?.desejos ?? null;
  const pctDesejos =
    typeof desejos === "number"
      ? desejos
      : typeof desejos?.percentual === "number"
        ? desejos.percentual
        : null;
  const valorDesejos =
    typeof desejos === "object" && desejos !== null && typeof desejos.valor === "number"
      ? arredondar(desejos.valor)
      : 0;
  const limiteDesejosPct =
    typeof regra502030?.metaDesejos === "number" ? regra502030.metaDesejos : 30;

  if (typeof pctDesejos === "number" && Number.isFinite(pctDesejos) && pctDesejos > limiteDesejosPct) {
    const pctArred = Math.round(pctDesejos);
    const economiaDesejos =
      valorDesejos > 0 && pctDesejos > 0
        ? arredondar(valorDesejos * ((pctDesejos - limiteDesejosPct) / pctDesejos))
        : 0;

    dicas.push({
      id: "regra-desejos-acima",
      categoriaFiltro: "regra",
      categoriaLabel: "Regra 50/30/20",
      prioridade: "alta",
      prioridadeLabel: "Alta prioridade",
      icone: "regra",
      titulo: "Ajuste os gastos com desejos",
      descricao: `Desejos estão em ${pctArred}%, acima dos ${limiteDesejosPct}% sugeridos pela regra.`,
      acaoLabel: "Ver regra",
      destino: "regra",
      economiaPotencial: economiaDesejos,
    });
  }

  // 4. Assinaturas mensais
  const totalAssinaturas = calcularTotalAssinaturasDoMes(lancamentosDoMes, categorias);
  if (totalAssinaturas > 0) {
    dicas.push({
      id: "assinaturas-revisar",
      categoriaFiltro: "assinaturas",
      categoriaLabel: "Assinaturas",
      prioridade: "media",
      prioridadeLabel: "Média",
      icone: "assinaturas",
      titulo: "Vale revisar suas assinaturas",
      descricao: `Suas assinaturas somam ${formatarMoedaSimples(totalAssinaturas)} por mês.`,
      acaoLabel: "Ver categoria",
      destino: "saldo",
      economiaPotencial: arredondar(totalAssinaturas * 0.25),
    });
  }

  // 5. Metas sem aporte no mês
  const listaMetas = Array.isArray(metas) ? metas : [];
  const guardadoNoMes = arredondar(totalGuardado(listaMetas, mes));
  if (listaMetas.length > 0 && guardadoNoMes <= 0) {
    dicas.push({
      id: "metas-primeiro-passo",
      categoriaFiltro: "metas",
      categoriaLabel: "Metas",
      prioridade: "media",
      prioridadeLabel: "Média",
      icone: "metas",
      titulo: "Dê o primeiro passo nas suas metas",
      descricao: "Você ainda não guardou nada em metas este mês.",
      acaoLabel: "Ver metas",
      destino: "metas",
      economiaPotencial: 0,
    });
  }

  return dicas;
}

export function resumirDicas(dicas = []) {
  const lista = Array.isArray(dicas) ? dicas : [];
  const economiaPotencial = arredondar(
    lista.reduce((acc, d) => acc + arredondar(d?.economiaPotencial ?? 0), 0)
  );
  return {
    quantidade: lista.length,
    economiaPotencial,
  };
}

function formatarMoedaSimples(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}