import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  Wallet,
  BarChart2,
  CreditCard,
  Flag,
  TrendingUp,
  Sparkles,
  ChevronDown,
  FileDown,
  Sprout,
} from "lucide-react";
import "../estilos/NavBar.css";
import AlterarSalario from "../componentes/AlterarSalario";
import { SalarioContext } from "./SalarioContext";

// "Iago Matheus" -> "IM" | "Clara" -> "C"
function iniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima   = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

const links = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "saldo", label: "Saldo do mês", icon: Wallet },
  { id: "comparativo", label: "Comparativo", icon: BarChart2 },
  { id: "dividas", label: "Dívidas", icon: CreditCard },
  { id: "metas", label: "Metas", icon: Flag },
  { id: "regra", label: "Regra 50/30/20", icon: TrendingUp },
  { id: "dicas", label: "Dicas", icon: Sparkles },
  { id: "exportar", label: "Exportar", icon: FileDown },
];

function NavBar({ telaAtiva = "inicio", onNavegar = () => {} }) {

  const { nomeUsuario, salarioAtual, diaAtual, onSalvarSalario } = useContext(SalarioContext);
  const [salarioAberto, setSalarioAberto] = useState(false);

  const secaoAtiva = ["limites", "meta-detalhe"].includes(telaAtiva) ? "metas" : telaAtiva;

  return (
    <aside className="navbar">
      <div className="navbar__logo">
        <span
          className="navbar__logo-icon"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: "#156b4c",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Sprout size={18} color="#ffffff" />
        </span>
        <span className="navbar__logo-text">brota</span>
      </div>

      <nav className="navbar__nav">
        {links.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`navbar__link ${secaoAtiva === id ? "navbar__link--ativo" : ""}`}
            onClick={() => onNavegar(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div
        className="navbar__user navbar__user--clicavel"
        role="button"
        tabIndex={0}
        onClick={() => setSalarioAberto(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSalarioAberto(true);
          }
        }}
      >
        <div className="navbar__avatar">{iniciais(nomeUsuario)}</div>
        <div className="navbar__user-info">
          <strong>{nomeUsuario || "Usuário"}</strong>
          <small>Meu primeiro estágio</small>
        </div>
        <ChevronDown size={14} />
      </div>

      {/* Modal desenhado no body, por cima de tudo */}
      {createPortal(
        <AlterarSalario
          aberto={salarioAberto}
          onFechar={() => setSalarioAberto(false)}
          onSalvar={onSalvarSalario}
          salarioAtual={salarioAtual}
          diaAtual={diaAtual}
        />,
        document.body
      )}
    </aside>
  );
}

export default NavBar;