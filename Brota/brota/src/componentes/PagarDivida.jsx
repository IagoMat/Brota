import { useEffect, useRef, useState } from "react";
import { Wallet, X } from "lucide-react";
import "../estilos/NovaDivida.css";

const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

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

// Registra um pagamento: o valor é abatido do saldo devedor.
// Renderize só quando precisar abrir.
export default function PagarDivida({
  divida,
  onFechar = () => {},
  onConfirmar = () => {},
}) {
  const saldoAtual = Math.max(0, Number(divida?.saldo) || 0);
  const parcelaAtual = Math.max(0, Number(divida?.parcela) || 0);
  const sugestao = Math.min(parcelaAtual, saldoAtual);

  const [valor, setValor] = useState(
    sugestao > 0 ? mascararValor(String(Math.round(sugestao * 100))) : ""
  );
  const campo = useRef(null);

  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
    const aoPressionar = (e) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoPressionar);
    return () => document.removeEventListener("keydown", aoPressionar);
  }, [onFechar]);

  const valorNum = valorParaNumero(valor);
  const passouDoSaldo = valorNum > saldoAtual;
  const podeConfirmar = valorNum > 0 && !passouDoSaldo;

  const enviar = (e) => {
    e.preventDefault();
    if (!podeConfirmar) return;
    onConfirmar(valorNum);
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
        aria-labelledby="pagar-divida-titulo"
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

        <h2 id="pagar-divida-titulo" className="dv-modal__titulo">
          Registrar pagamento
        </h2>
        <p className="dv-modal__subtitulo">
          {divida?.nome ?? "Dívida"} · saldo atual de {moeda(saldoAtual)}
        </p>

        <form className="dv-modal__form" onSubmit={enviar}>
          <div className="dv-modal__grupo">
            <label htmlFor="dv-pagamento">Valor pago</label>
            <div className="dv-modal__valor">
              <span className="dv-modal__moeda">R$</span>
              <input
                id="dv-pagamento"
                ref={campo}
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(mascararValor(e.target.value))}
                autoComplete="off"
              />
            </div>
          </div>

          {passouDoSaldo && (
            <p className="dv-modal__aviso">
              O valor é maior que o saldo devedor desta dívida.
            </p>
          )}

          {podeConfirmar && (
            <p className="dv-modal__dica">
              Saldo depois do pagamento:{" "}
              <strong>{moeda(saldoAtual - valorNum)}</strong>
            </p>
          )}

          <button
            type="submit"
            className="dv-modal__botao"
            disabled={!podeConfirmar}
          >
            Confirmar pagamento
          </button>
        </form>
      </div>
    </div>
  );
}