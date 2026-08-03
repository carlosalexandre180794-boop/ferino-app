import { useEffect, useState } from "react";
import logoFerino from "../assets/logo-ferino.png";

const CHAVE_ANO = "ferino_ano_ativo";
const CHAVE_MES = "ferino_mes_ativo";

function lerTemporadaAtiva() {
  return {
    ano: Number(localStorage.getItem(CHAVE_ANO) || 2026),
    mes: Number(localStorage.getItem(CHAVE_MES) || 8),
  };
}

function Header() {
  const [temporada, setTemporada] = useState(
    lerTemporadaAtiva
  );

  useEffect(() => {
    function atualizarTemporada() {
      setTemporada(lerTemporadaAtiva());
    }

    window.addEventListener(
      "ferino-mes-alterado",
      atualizarTemporada
    );
    window.addEventListener("storage", atualizarTemporada);

    return () => {
      window.removeEventListener(
        "ferino-mes-alterado",
        atualizarTemporada
      );
      window.removeEventListener(
        "storage",
        atualizarTemporada
      );
    };
  }, []);

  const nomeMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(
    new Date(temporada.ano, temporada.mes - 1, 1)
  );

  const mesFormatado =
    nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  return (
    <header className="topbar">
      <div className="topbar-content">
        <div className="topbar-text">
          <h1>Ferino Pé de Pano</h1>

          <p>
            Temporada {temporada.ano} • {mesFormatado}
          </p>
        </div>

        <img
          className="topbar-logo"
          src={logoFerino}
          alt="Logo do Ferino Pé de Pano"
        />
      </div>
    </header>
  );
}

export default Header;