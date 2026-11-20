import { Sprout } from "lucide-react";
import "../estilos/Cabecalho.css";

export default function Cabecalho({ passoAtual = 0, total = 3 }) {
  return (
    <header className="marca-progresso">
      <div className="marca-progresso__marca">
        <span className="marca-progresso__simbolo">
          <Sprout size={23} />
        </span>
        <span className="marca-progresso__nome">brota</span>
      </div>

      <div className="marca-progresso__etapas">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`marca-progresso__etapa ${
              i === passoAtual ? "marca-progresso__etapa--atual" : ""
            }`}
          />
        ))}
      </div>
    </header>
  );
}