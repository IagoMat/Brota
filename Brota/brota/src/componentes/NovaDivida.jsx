import { useEffect, useRef, useState } from "react";
import { Wallet, X } from "lucide-react";
import "../estilos/NovaDivida.css";

/* ---------- Funções auxiliares ---------- */
// Máscara de moeda: digitou 320000 -> "3.200,00"
const mascararValor = (texto) => {
  const digitos = String(texto ?? "").replace(/\D/g, "").slice(0, 12);
  if (!digitos) return "";
  return (parseInt(digitos, 10) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// "3.200,00" -> 3200
const valorParaNumero = (texto) =>
  texto ? parseFloat(String(texto).replace(/\./g, "").replace(",", ".")) || 0 : 0;

// número -> texto mascarado (usado ao editar)
const numeroParaValor = (n) =>
  Number(n) > 0 ? mascararValor(String(Math.round(Number(n) * 100))) : "";

// Juros: só dígitos e uma vírgula, até 2 casas ("12,5")
const mascararJuros = (texto) => {
  const limpo = String(texto ?? "").replace(/[^\d,]/g, "");
  const [inteiro, ...resto] = limpo.split(",");
  if (resto.length) {
    return `${inteiro.slice(0, 3)},${resto.join("").slice(0, 2)}`;
  }
  return inteiro.slice(0, 3);
};

const jurosParaNumero = (texto) =>
  texto ? parseFloat(String(texto).replace(",", ".")) || 0 : 0;

const numeroParaJuros = (n) =>
  Number(n) > 0 ? String(Number(n)).replace(".", ",") : "";

/* ---------- Componente ---------- */
export default function NovaDivida({
  divida = null,
  onFechar = () => {},
  onSalvar = () => {},
}) {
  const editando = Boolean(divida);

  const [nome, setNome] = useState(divida?.nome ?? "");
  const [credor, setCredor] = useState(divida?.credor ?? "");
  const [saldo, setSaldo] = useState(numeroParaValor(divida?.saldo));
  const [juros, setJuros] = useState(numeroParaJuros(divida?.juros));
  const [parcela, setParcela] = useState(numeroParaValor(divida?.parcela));
  const [dia, setDia] = useState(
    divida?.diaVencimento ? String(divida.diaVencimento) : ""
  );
  const campoNome = useRef(null);

  useEffect(() => {
    campoNome.current?.focus();
    const aoPressionar = (e) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoPressionar);
    return () => document.removeEventListener("keydown", aoPressionar);
  }, [onFechar]);

  const saldoNum = valorParaNumero(saldo);
  const parcelaNum = valorParaNumero(parcela);
  const jurosNum = jurosParaNumero(juros);
  const diaNum = Number(dia);

  const podeSalvar =
    nome.trim().length > 0 &&
    saldoNum > 0 &&
    parcelaNum > 0 &&
    diaNum >= 1 &&
    diaNum <= 31;

  // Aviso (não bloqueia): parcela menor ou igual aos juros do mês
  const jurosDoMes = saldoNum * (jurosNum / 100);
  const parcelaNaoCobreJuros =
    saldoNum > 0 && parcelaNum > 0 && jurosNum > 0 && parcelaNum <= jurosDoMes;

  const enviar = (e) => {
    e.preventDefault();
    if (!podeSalvar) return;

    onSalvar({
      nome: nome.trim(),
      credor: credor.trim(),
      saldo: saldoNum,
      juros: jurosNum,
      parcela: parcelaNum,
      diaVencimento: diaNum,
    });
    onFechar();
  };

  return (
    <div
      className="dv-modal__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        className="dv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nova-divida-titulo"
      >
        <header className="dv-modal__topo">
          <span className="dv-modal__icone">
            <Wallet size={20} />
          </span>
          <button
            type="button"
            className="dv-modal__fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        <h2 id="nova-divida-titulo" className="dv-modal__titulo">
          {editando ? "Editar dívida" : "Nova dívida"}
        </h2>
        <p className="dv-modal__subtitulo">
          {editando
            ? "Atualize os dados da sua dívida."
            : "Organize hoje para quitar no seu ritmo."}
        </p>

        <form className="dv-modal__form" onSubmit={enviar}>
          <div className="dv-modal__grupo">
            <label htmlFor="dv-nome">Nome</label>
            <input
              id="dv-nome"
              ref={campoNome}
              className="dv-modal__input"
              type="text"
              placeholder="Ex.: Cartão de crédito"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={40}
              autoComplete="off"
            />
          </div>

          <div className="dv-modal__grupo">
            <label htmlFor="dv-credor">Credor</label>
            <input
              id="dv-credor"
              className="dv-modal__input"
              type="text"
              placeholder="Ex.: Nubank"
              value={credor}
              onChange={(e) => setCredor(e.target.value)}
              maxLength={40}
              autoComplete="off"
            />
          </div>

          <div className="dv-modal__linha">
            <div className="dv-modal__grupo">
              <label htmlFor="dv-saldo">Saldo devedor</label>
              <div className="dv-modal__campo">
                <span className="dv-modal__prefixo">R$</span>
                <input
                  id="dv-saldo"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={saldo}
                  onChange={(e) => setSaldo(mascararValor(e.target.value))}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="dv-modal__grupo">
              <label htmlFor="dv-juros">Juros ao mês (%)</label>
              <div className="dv-modal__campo">
                <input
                  id="dv-juros"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,0"
                  value={juros}
                  onChange={(e) => setJuros(mascararJuros(e.target.value))}
                  autoComplete="off"
                />
                <span className="dv-modal__sufixo">%</span>
              </div>
            </div>
          </div>

          <div className="dv-modal__linha">
            <div className="dv-modal__grupo">
              <label htmlFor="dv-parcela">Valor da parcela</label>
              <div className="dv-modal__campo">
                <span className="dv-modal__prefixo">R$</span>
                <input
                  id="dv-parcela"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={parcela}
                  onChange={(e) => setParcela(mascararValor(e.target.value))}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="dv-modal__grupo">
              <label htmlFor="dv-dia">Dia do vencimento</label>
              <div className="dv-modal__campo">
                <input
                  id="dv-dia"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex.: 10"
                  value={dia}
                  onChange={(e) =>
                    setDia(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {parcelaNaoCobreJuros && (
            <p className="dv-modal__aviso">
              Essa parcela é menor que os juros do mês, então o saldo não vai
              diminuir só com ela.
            </p>
          )}

          <button type="submit" className="dv-modal__botao" disabled={!podeSalvar}>
            {editando ? "Salvar alterações" : "Confirmar"}
          </button>
        </form>
      </div>
    </div>
  );
}