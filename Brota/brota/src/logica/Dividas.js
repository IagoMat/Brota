// Regras de negócio das dívidas (sem React, sem localStorage).
// Tudo aqui é função pura: recebe dados e devolve dados novos.
//
// Formato de uma dívida:
// {
//   id, nome, credor,
//   saldoInicial,   // saldo na hora do cadastro (base do "Progresso")
//   saldo,          // saldo devedor atual
//   juros,          // juros ao mês, em % (ex.: 12.5)
//   parcela,        // valor da parcela mensal
//   diaVencimento,  // 1 a 31
//   pagamentos: [{ id, valor, data }]
// }

const numeroSeguro = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? num : 0;
};

const arredondar = (n) => Math.round(numeroSeguro(n) * 100) / 100;
const emCentavos = (n) => Math.round(numeroSeguro(n) * 100);

export const ESTRATEGIAS = {
  BOLA_DE_NEVE: "bola-de-neve",
  AVALANCHE: "avalanche",
};

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// CRUD
export function criarDivida({ nome, credor, saldo, juros, parcela, diaVencimento }) {
  const saldoArredondado = Math.max(0, arredondar(saldo));
  const dia = Math.min(31, Math.max(1, Math.round(numeroSeguro(diaVencimento)) || 1));

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    nome: String(nome ?? "").trim(),
    credor: String(credor ?? "").trim(),
    saldoInicial: saldoArredondado,
    saldo: saldoArredondado,
    juros: Math.max(0, numeroSeguro(juros)),
    parcela: Math.max(0, arredondar(parcela)),
    diaVencimento: dia,
    pagamentos: [],
  };
}

export function atualizarDivida(dividas, id, dados) {
  const lista = Array.isArray(dividas) ? dividas : [];
  return lista.map((d) => {
    if (d.id !== id) return d;
    const saldo = Math.max(0, arredondar(dados?.saldo));
    const dia = Math.min(31, Math.max(1, Math.round(numeroSeguro(dados?.diaVencimento)) || d.diaVencimento || 1));
    return {
      ...d,
      nome: String(dados?.nome ?? d.nome).trim(),
      credor: String(dados?.credor ?? "").trim(),
      saldo,
      // se o saldo subiu acima do inicial (ex.: nova compra), o progresso não fica negativo
      saldoInicial: Math.max(numeroSeguro(d.saldoInicial), saldo),
      juros: Math.max(0, numeroSeguro(dados?.juros)),
      parcela: Math.max(0, arredondar(dados?.parcela)),
      diaVencimento: dia,
    };
  });
}

export function registrarPagamento(dividas, id, valor) {
  const lista = Array.isArray(dividas) ? dividas : [];
  return lista.map((d) => {
    if (d.id !== id) return d;
    const saldoAtual = Math.max(0, arredondar(d.saldo));
    const pago = Math.min(Math.max(0, arredondar(valor)), saldoAtual);
    if (pago <= 0) return d;

    const pagamento = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      valor: pago,
      data: new Date().toISOString().slice(0, 10),
    };
    return {
      ...d,
      saldo: arredondar(saldoAtual - pago),
      pagamentos: [...(Array.isArray(d.pagamentos) ? d.pagamentos : []), pagamento],
    };
  });
}

export function removerDivida(dividas, id) {
  const lista = Array.isArray(dividas) ? dividas : [];
  return lista.filter((d) => d.id !== id);
}

// CONSULTAS
export const dividasAtivas = (dividas) =>
  (Array.isArray(dividas) ? dividas : []).filter((d) => numeroSeguro(d.saldo) > 0);

export const totalDevido = (dividas) =>
  arredondar(
    (Array.isArray(dividas) ? dividas : []).reduce(
      (soma, d) => soma + Math.max(0, numeroSeguro(d.saldo)),
      0
    )
  );

// Parcelas que vencem no mês (a última parcela nunca passa do saldo restante)
export const parcelasDoMes = (dividas) =>
  arredondar(
    dividasAtivas(dividas).reduce(
      (soma, d) => soma + Math.min(Math.max(0, numeroSeguro(d.parcela)), numeroSeguro(d.saldo)),
      0
    )
  );

// 0 a 100
export function progressoDivida(d) {
  const saldo = Math.max(0, numeroSeguro(d?.saldo));
  const inicial = Math.max(0, numeroSeguro(d?.saldoInicial));
  if (inicial <= 0) return saldo <= 0 ? 100 : 0;
  const pct = ((inicial - saldo) / inicial) * 100;
  return Math.max(0, Math.min(100, pct));
}

// DATAS
function normalizarMes(mesStr) {
  if (typeof mesStr === "string" && /^\d{4}-\d{2}$/.test(mesStr)) {
    return mesStr;
  }
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

/** ("2026-11", 13) -> "2027-12" */
export function somarMeses(mesStr, qtd) {
  const base = normalizarMes(mesStr);
  const [ano, mes] = base.split("-").map(Number);
  const deslocamento = Math.round(numeroSeguro(qtd));
  const data = new Date(ano, mes - 1 + deslocamento, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

/** "2028-01" -> "jan 2028" */
export function formatarMesCurto(mesStr) {
  const normalizado = normalizarMes(mesStr);
  const [ano, mes] = normalizado.split("-");
  const idx = Number(mes) - 1;
  const rotuloMes = MESES_CURTOS[idx] ?? MESES_CURTOS[0];
  return `${rotuloMes} ${ano}`;
}


// SIMULAÇÃO DE QUITAÇÃO

// Como funciona, mês a mês:
//   1. os juros de cada dívida são somados ao saldo;
//   2. cada dívida recebe a sua parcela mínima;
//   3. tudo o que sobrou do valor mensal vai para a dívida PRIORITÁRIA;
//   4. quando uma dívida quita, a parcela dela "libera" e vira extra
//      para a próxima (esse é o efeito bola de neve).
//
// Estratégias (só mudam quem é a prioritária):
//   - bola de neve: menor saldo primeiro
//   - avalanche:    maior juros primeiro (paga menos juros no total)
//
// Retorno:
//   { estado: "sem-dividas" }
//   { estado: "insuficiente", minimo }       -> valor menor que a soma das parcelas
//   { estado: "nao-quita" }                  -> os juros vencem os pagamentos
//   { estado: "ok", meses, jurosTotais, totalPago, serie: [saldo mês 0..n] }
const LIMITE_MESES = 600; // 50 anos

export function simularQuitacao(dividas, valorMensal, estrategia = ESTRATEGIAS.BOLA_DE_NEVE) {
  const ativas = dividasAtivas(dividas).map((d) => ({
    id: d.id,
    saldo: Math.max(0, emCentavos(d.saldo)),
    taxa: Math.max(0, numeroSeguro(d.juros)) / 100,
    parcela: Math.max(0, emCentavos(d.parcela)),
  }));

  if (ativas.length === 0) return { estado: "sem-dividas" };

  const orcamento = Math.max(0, emCentavos(valorMensal));
  const minimo = ativas.reduce((s, d) => s + Math.min(d.parcela, d.saldo), 0);

  if (orcamento < minimo) {
    return { estado: "insuficiente", minimo: minimo / 100 };
  }

  const somaSaldos = () => ativas.reduce((s, d) => s + d.saldo, 0);
  const serie = [somaSaldos() / 100];
  let jurosTotais = 0;
  let totalPago = 0;
  let meses = 0;

  while (somaSaldos() > 0 && meses < LIMITE_MESES) {
    meses += 1;

    // 1) juros do mês
    for (const d of ativas) {
      if (d.saldo <= 0) continue;
      const juros = Math.round(d.saldo * d.taxa);
      d.saldo += juros;
      jurosTotais += juros;
    }

    // 2) parcelas mínimas
    let disponivel = orcamento;
    for (const d of ativas) {
      if (d.saldo <= 0) continue;
      const pago = Math.min(d.parcela, d.saldo);
      d.saldo -= pago;
      disponivel -= pago;
      totalPago += pago;
    }

    // 3) o que sobrou vai para a dívida prioritária
    const fila = ativas
      .filter((d) => d.saldo > 0)
      .sort((a, b) =>
        estrategia === ESTRATEGIAS.AVALANCHE
          ? b.taxa - a.taxa || a.saldo - b.saldo
          : a.saldo - b.saldo || b.taxa - a.taxa
      );

    for (const d of fila) {
      if (disponivel <= 0) break;
      const extra = Math.min(disponivel, d.saldo);
      d.saldo -= extra;
      disponivel -= extra;
      totalPago += extra;
    }

    serie.push(somaSaldos() / 100);
  }

  if (somaSaldos() > 0) return { estado: "nao-quita" };

  return {
    estado: "ok",
    meses,
    jurosTotais: jurosTotais / 100,
    totalPago: totalPago / 100,
    serie,
  };
}