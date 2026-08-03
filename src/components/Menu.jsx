import { useEffect, useState } from "react";
import {
  NavLink,
  useLocation,
} from "react-router-dom";

const itensPrincipais = [
  {
    to: "/",
    label: "Painel",
    icon: "⌂",
    end: true,
    cor: "#6ee7b7",
  },
  {
    to: "/classificacao",
    label: "Tabela",
    icon: "🏆",
    cor: "#f5b800",
  },
  {
    to: "/jogos",
    label: "Jogos",
    icon: "⚔",
    cor: "#38bdf8",
  },
  {
    to: "/estatisticas",
    label: "Artilheiros",
    icon: "⚽",
    cor: "#22c55e",
  },
  {
    to: "/campeoes",
    label: "Campeões",
    icon: "★",
    cor: "#f59e0b",
  },
];

const itensMais = [
  {
    to: "/perfil",
    label: "Minha Conta",
    icon: "👤",
  },
  {
    to: "/jogadores",
    label: "Jogadores",
    icon: "♙",
  },
  {
    to: "/substituicao",
    label: "Substituição",
    icon: "🔄",
  },
  {
    to: "/campeonato",
    label: "Campeonato",
    icon: "⚙",
  },
];

function Menu() {
  const location = useLocation();

  const [menuMaisAberto, setMenuMaisAberto] =
    useState(false);

  const [saindo, setSaindo] = useState(false);

  const rotaAtual = location.pathname;

  const paginaDoMenuMais = itensMais.some(
    (item) => item.to === rotaAtual
  );

  useEffect(() => {
    setMenuMaisAberto(false);
  }, [rotaAtual]);

  function alternarMenuMais() {
    setMenuMaisAberto((aberto) => !aberto);
  }

  function fecharMenuMais() {
    setMenuMaisAberto(false);
  }

  function sairDaConta() {
    if (saindo) return;

    const confirmou = window.confirm(
      "Deseja realmente sair da sua conta?"
    );

    if (!confirmou) return;

    setSaindo(true);
    setMenuMaisAberto(false);

    window.dispatchEvent(
      new CustomEvent("ferino-encerrar-acesso")
    );
  }

  return (
    <>
      {menuMaisAberto && (
        <button
          type="button"
          className="menu-more-overlay"
          aria-label="Fechar menu"
          onClick={fecharMenuMais}
        />
      )}

      <nav
        className="menu"
        aria-label="Navegação principal"
      >
        {itensPrincipais.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={{
              "--menu-active-color": item.cor,
            }}
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span className="menu-icon">
              {item.icon}
            </span>

            <span className="menu-label">
              {item.label}
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          className={`menu-more-button ${
            paginaDoMenuMais || menuMaisAberto
              ? "active"
              : ""
          }`}
          onClick={alternarMenuMais}
        >
          <span className="menu-icon">
            ☰
          </span>

          <span className="menu-label">
            Mais
          </span>
        </button>

        {menuMaisAberto && (
          <div className="menu-more-panel">
            <div className="menu-more-header">
              <strong>Mais opções</strong>

              <button
                type="button"
                onClick={fecharMenuMais}
              >
                ×
              </button>
            </div>

            <div className="menu-more-list">
              {itensMais.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={fecharMenuMais}
                  className={({ isActive }) =>
                    isActive
                      ? "menu-more-item active"
                      : "menu-more-item"
                  }
                >
                  <span>{item.icon}</span>

                  <strong>{item.label}</strong>
                </NavLink>
              ))}

              <button
                type="button"
                className="menu-more-item"
                onClick={sairDaConta}
                disabled={saindo}
                style={{
                  width: "100%",
                  cursor: saindo
                    ? "not-allowed"
                    : "pointer",
                  opacity: saindo ? 0.6 : 1,
                }}
              >
                <span>🚪</span>

                <strong>
                  {saindo
                    ? "Saindo..."
                    : "Sair da conta"}
                </strong>
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

export default Menu;