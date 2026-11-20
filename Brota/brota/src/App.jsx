import { useState } from "react";

import { carregar, salvar, CHAVES } from "./dados/storage";

import BoaVinda         from "./telas/BoasVindas/BoaVinda";
import Nome             from "./telas/BoasVindas/Nome";
import Renda            from "./telas/BoasVindas/Renda";
import Inicio           from "./telas/Inicio";
import SaldoMes         from "./telas/SaldoMes";
import Comparativo      from "./telas/Comparativo";
import Dividas          from "./telas/Dividas";
import Metas            from "./telas/Metas";
import MetaDetalhe      from "./telas/MetaDetalhe";
import LimitesCategoria from "./telas/LimitesCategoria";
import Regra            from "./telas/Regra";
import DicasEconomia    from "./telas/DicasEconomia";
import Exportar         from "./telas/Exportar";
import { obterMesEntrada } from "./logica/Periodo";

import {
  criarEntrada,
  criarDespesaFixa,
  criarSaida,
  listarDoMes,
  marcarDespesaFixaPaga,
  encerrarDespesaFixa,
  removerLancamento,
  definirSalario,
} from "./logica/Lancamentos";

import {
  calcularSaldo,
  totalEntradas,
  totalSaidas,
  totalPendentes,
  totalGuardado,
  totalPorCategoria,
  calcularRegra502030,
} from "./logica/saldo";

import {
  criarDivida,
  atualizarDivida,
  registrarPagamento,
  removerDivida,
} from "./logica/Dividas";

import { CATEGORIAS } from "./dados/categorias";
import { SalarioContext } from "./componentes/SalarioContext";
import { PeriodoContext } from "./componentes/PeriodoContext";

const CHAVE_DIVIDAS = CHAVES.dividas ?? "estagCash:dividas";

function mesAtual() {
  const hoje = new Date();
  const ano  = hoje.getFullYear();
  const mes  = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

const arredondar = (n) => Math.round(n * 100) / 100;

function App() {
  const [tela, setTela] = useState(() => {
    const nome = carregar(CHAVES.nomeUsuario);
    return nome ? "inicio" : "boasvindas-1";
  });

  const [metaSelecionadaId, setMetaSelecionadaId] = useState(null);

  const [nomeUsuario, setNomeUsuario] = useState(
    () => carregar(CHAVES.nomeUsuario) ?? ""
  );
  const [salario, setSalario] = useState(
    () => carregar(CHAVES.salario) ?? { valor: 0, diaRecebimento: 1 }
  );

  const [lancamentos, setLancamentos] = useState(
    () => carregar(CHAVES.lancamentos) ?? []
  );

  const [metas, setMetas] = useState(
    () => carregar(CHAVES.metas) ?? []
  );

  const [dividas, setDividas] = useState(
    () => carregar(CHAVE_DIVIDAS) ?? []
  );

  const [limites, setLimites] = useState(
    () => carregar(CHAVES.limites) ?? {}
  );

  const [mes, setMes] = useState(mesAtual);
  const [mesEntrada] = useState(() => obterMesEntrada());

  const navegar = (destino, dados = null) => {
    if (destino === "meta-detalhe") {
      setMetaSelecionadaId(typeof dados === "object" ? dados?.id ?? null : dados);
    }
    setTela(destino);
  };

  const atualizarLancamentos = (novaLista) => {
    setLancamentos(novaLista);
    salvar(CHAVES.lancamentos, novaLista);
  };

  const atualizarMetas = (novaLista) => {
    setMetas(novaLista);
    salvar(CHAVES.metas, novaLista);
  };

  const atualizarDividas = (transformadorOuLista) => {
    setDividas((atual) => {
      const base = Array.isArray(atual) ? atual : [];
      const novaLista =
        typeof transformadorOuLista === "function"
          ? transformadorOuLista(base)
          : transformadorOuLista;
      salvar(CHAVE_DIVIDAS, novaLista);
      return novaLista;
    });
  };

  const atualizarLimites = (novosLimites) => {
    setLimites(novosLimites);
    salvar(CHAVES.limites, novosLimites);
  };

  const adicionarEntrada = (subtipo, nome, valor, diaRecebimento, data) => {
    const nova = criarEntrada(subtipo, nome, valor, diaRecebimento, data);
    atualizarLancamentos([...lancamentos, nova]);
  };

  const adicionarDespesaFixa = (nome, valor, categoria, diaVencimento) => {
    const nova = criarDespesaFixa(nome, valor, categoria, diaVencimento);
    atualizarLancamentos([...lancamentos, nova]);
  };

  const adicionarSaida = (nome, valor, categoria, data, parcelas, parcelaAtual) => {
    const nova = criarSaida(nome, valor, categoria, data, parcelas, parcelaAtual);
    atualizarLancamentos([...lancamentos, nova]);
  };

  const pagarDespesaFixa = (id) => {
    atualizarLancamentos(marcarDespesaFixaPaga(lancamentos, id, mes));
  };

  const encerrar = (id) => {
    atualizarLancamentos(encerrarDespesaFixa(lancamentos, id));
  };

  const excluir = (id) => {
    atualizarLancamentos(removerLancamento(lancamentos, id));
  };

  const alterarSalario = ({ salario: valor, dia }) => {
    const novoSalario = { valor, diaRecebimento: dia };
    setSalario(novoSalario);
    salvar(CHAVES.salario, novoSalario);
    atualizarLancamentos(definirSalario(lancamentos, valor, dia));
  };

  const criarMeta = (nome, alvo) => {
    const nova = { id: Date.now(), nome, alvo, movimentos: [] };
    atualizarMetas([...metas, nova]);
  };

  const guardarNaMeta = (idMeta, valor, descricao) => {
    const novaLista = metas.map((m) => {
      if (m.id !== idMeta) return m;
      const movimento = { id: Date.now(), tipo: "deposito", valor, descricao, data: new Date().toISOString().slice(0, 10) };
      return { ...m, movimentos: [...(m.movimentos ?? []), movimento] };
    });
    atualizarMetas(novaLista);
  };

  const retirarDaMeta = (idMeta, valor, descricao) => {
    const novaLista = metas.map((m) => {
      if (m.id !== idMeta) return m;
      const movimento = { id: Date.now(), tipo: "retirada", valor, descricao, data: new Date().toISOString().slice(0, 10) };
      return { ...m, movimentos: [...(m.movimentos ?? []), movimento] };
    });
    atualizarMetas(novaLista);
  };

  const excluirMeta = (idMeta) => {
    atualizarMetas(metas.filter((m) => m.id !== idMeta));
  };

  const adicionarDivida = (dados) => {
    const nova = criarDivida(dados);
    atualizarDividas((atual) => [...atual, nova]);
  };

  const editarDivida = (id, dados) => {
    atualizarDividas((atual) => atualizarDivida(atual, id, dados));
  };

  const pagarDivida = (id, valor) => {
    atualizarDividas((atual) => registrarPagamento(atual, id, valor));
  };

  const excluirDivida = (id) => {
    atualizarDividas((atual) => removerDivida(atual, id));
  };

  const definirLimite = (categoriaId, valor) => {
    atualizarLimites({ ...limites, [categoriaId]: valor });
  };

  const removerLimite = (categoriaId) => {
    const copia = { ...limites };
    delete copia[categoriaId];
    atualizarLimites(copia);
  };

  const lancamentosDoMes = listarDoMes(lancamentos, mes);

  const resumo = {
    entradas:  totalEntradas(lancamentosDoMes),
    saidas:    totalSaidas(lancamentosDoMes, mes),
    pendentes: totalPendentes(lancamentosDoMes, mes),
    guardado:  arredondar(totalGuardado(metas, mes)),
    saldo:     arredondar(calcularSaldo(lancamentosDoMes, metas, mes)),
  };

  const gastosPorCategoria = totalPorCategoria(lancamentosDoMes);
  const regra502030        = calcularRegra502030(lancamentosDoMes, metas, mes, resumo.entradas, CATEGORIAS);

  const metaSelecionada = metas.find((m) => m.id === metaSelecionadaId);

  const renderTela = () => {
    switch (tela) {
      case "boasvindas-1":
        return <BoaVinda onComecar={() => navegar("boasvindas-2")} />;

      case "boasvindas-2":
        return (
          <Nome
            onContinuar={(nomeDigitado) => {
              setNomeUsuario(nomeDigitado);
              salvar(CHAVES.nomeUsuario, nomeDigitado);
              navegar("boasvindas-3");
            }}
          />
        );

      case "boasvindas-3":
        return (
          <Renda
            onEntrar={(dados) => {
              const novoSalario = { valor: dados.valor, diaRecebimento: dados.dia };
              setSalario(novoSalario);
              salvar(CHAVES.salario, novoSalario);
              atualizarLancamentos(definirSalario(lancamentos, dados.valor, dados.dia));
              navegar("inicio");
            }}
            onPular={() => navegar("inicio")}
          />
        );

      case "inicio":
        return (
          <Inicio
            telaAtiva="inicio"
            onNavegar={navegar}
            nomeUsuario={nomeUsuario}
            mes={mes}
            onMudarMes={setMes}
            resumo={resumo}
            lancamentosDoMes={lancamentosDoMes}
            gastosPorCategoria={gastosPorCategoria}
            regra502030={regra502030}
            limites={limites}
            categorias={CATEGORIAS}
            onAdicionarEntrada={adicionarEntrada}
            onAdicionarDespesaFixa={adicionarDespesaFixa}
            onAdicionarSaida={adicionarSaida}
          />
        );

      case "saldo":
        return (
          <SaldoMes
            telaAtiva="saldo"
            onNavegar={navegar}
            mes={mes}
            onMudarMes={setMes}
            resumo={resumo}
            lancamentosDoMes={lancamentosDoMes}
            onPagarDespesaFixa={pagarDespesaFixa}
            onEncerrarDespesaFixa={encerrar}
            onExcluir={excluir}
            onAdicionarEntrada={adicionarEntrada}
            onAdicionarDespesaFixa={adicionarDespesaFixa}
            onAdicionarSaida={adicionarSaida}
          />
        );

      case "comparativo":
        return (
          <Comparativo
            telaAtiva="comparativo"
            onNavegar={navegar}
            lancamentos={lancamentos}
            metas={metas}
          />
        );

      case "dividas":
        return (
          <Dividas
            telaAtiva="dividas"
            onNavegar={navegar}
            mes={mes}
            onMudarMes={setMes}
            dividas={dividas}
            onAdicionar={adicionarDivida}
            onEditar={editarDivida}
            onPagar={pagarDivida}
            onExcluir={excluirDivida}
          />
        );

      case "metas":
        return (
          <Metas
            telaAtiva="metas"
            onNavegar={navegar}
            metas={metas}
            onCriarMeta={criarMeta}
          />
        );

      case "meta-detalhe":
        return (
          <MetaDetalhe
            telaAtiva="meta-detalhe"
            onNavegar={navegar}
            meta={metaSelecionada}
            saldo={resumo.saldo}
            onVoltar={() => navegar("metas")}
            onGuardar={guardarNaMeta}
            onRetirar={retirarDaMeta}
            onExcluir={excluirMeta}
            onIrParaLimites={() => navegar("limites")}
          />
        );

      case "limites":
        return (
          <LimitesCategoria
            telaAtiva="limites"
            onNavegar={navegar}
            mes={mes}
            onMudarMes={setMes}
            onIrParaEconomia={() => navegar("metas")}
            limites={limites}
            gastosPorCategoria={gastosPorCategoria}
            categorias={CATEGORIAS}
            onDefinirLimite={definirLimite}
            onRemoverLimite={removerLimite}
          />
        );

      case "regra":
        return (
          <Regra
            telaAtiva="regra"
            onNavegar={navegar}
            regra502030={regra502030}
            renda={resumo.entradas}
          />
        );

      case "dicas":
        return (
          <DicasEconomia
            telaAtiva="dicas"
            onNavegar={navegar}
            mes={mes}
            onMudarMes={setMes}
            lancamentos={lancamentos}
            limites={limites}
            regra502030={regra502030}
            metas={metas}
            categorias={CATEGORIAS}
          />
        );

      case "exportar":
        return (
          <Exportar
            telaAtiva="exportar"
            onNavegar={navegar}
            lancamentos={lancamentos}
          />
        );

      default:
        return (
          <Inicio
            telaAtiva="inicio"
            onNavegar={navegar}
            nomeUsuario={nomeUsuario}
            mes={mes}
            resumo={resumo}
            lancamentosDoMes={lancamentosDoMes}
            gastosPorCategoria={gastosPorCategoria}
            regra502030={regra502030}
            limites={limites}
            categorias={CATEGORIAS}
            onAdicionarEntrada={adicionarEntrada}
            onAdicionarDespesaFixa={adicionarDespesaFixa}
            onAdicionarSaida={adicionarSaida}
          />
        );
    }
  };

  return (
    <PeriodoContext.Provider value={{ mesEntrada }}>
      <SalarioContext.Provider
        value={{
          nomeUsuario,
          salarioAtual:    salario.valor,
          diaAtual:        salario.diaRecebimento,
          onSalvarSalario: alterarSalario,
        }}
      >
        {renderTela()}
      </SalarioContext.Provider>
    </PeriodoContext.Provider>
  );
}

export default App;