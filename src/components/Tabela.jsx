import { useEffect, useMemo, useState } from "react";
import { escudoTime } from "../escudos";

const CHAVE_POSICOES = "ferino_posicoes_classificacao";

function numero(valor) {
  return Number(valor ?? 0);
}

function saldoFormatado(valor) {
  const saldo = numero(valor);
  return saldo > 0 ? `+${saldo}` : saldo;
}

function Tabela({ classificacao = [] }) {
  const [posicoesAnteriores, setPosicoesAnteriores] = useState({});

  const posicoesAtuais = useMemo(() => {
    const mapa = {};

    classificacao.forEach((item, index) => {
      mapa[String(item.id ?? item.nome)] = index + 1;
    });

    return mapa;
  }, [classificacao]);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_POSICOES);

      if (salvo) {
        setPosicoesAnteriores(JSON.parse(salvo));
      }

      localStorage.setItem(
        CHAVE_POSICOES,
        JSON.stringify(posicoesAtuais)
      );
    } catch (erro) {
      console.error(
        "Não foi possível guardar as posições anteriores:",
        erro
      );
    }
  }, [posicoesAtuais]);

  function movimento(item, posicaoAtual) {
    const chave = String(item.id ?? item.nome);
    const anterior = posicoesAnteriores[chave];

    if (!anterior || anterior === posicaoAtual) {
      return {
        simbolo: "–",
        cor: "#94a3b8",
        titulo: "Permaneceu na posição",
      };
    }

    if (posicaoAtual < anterior) {
      return {
        simbolo: "▲",
        cor: "#22c55e",
        titulo: "Subiu de posição",
      };
    }

    return {
      simbolo: "▼",
      cor: "#ef4444",
      titulo: "Desceu de posição",
    };
  }

  function classeDaLinha(posicaoAtual) {
    const ultimaPosicao = classificacao.length;

    if (posicaoAtual === 1) {
      return "classificacao-linha-lider";
    }

    if (posicaoAtual === 2) {
      return "classificacao-linha-segundo";
    }

    if (posicaoAtual === 3) {
      return "classificacao-linha-terceiro";
    }

    if (posicaoAtual === ultimaPosicao) {
      return "classificacao-linha-lanterna";
    }

    return "";
  }

  return (
    <article
      className="panel standings-panel"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <style>{`
        .classificacao-compacta {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
        }

        .classificacao-cabecalho,
        .classificacao-linha {
          display: grid;
          grid-template-columns:
            52px
            minmax(150px, 1fr)
            repeat(7, minmax(48px, 58px))
            58px;
          min-width: 760px;
          align-items: center;
          gap: 4px;
          width: 100%;
        }

        .classificacao-cabecalho {
          padding: 12px 8px;
          color: #7f8ba3;
          border-bottom: 1px solid #263147;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-align: center;
        }

        .classificacao-linha {
          position: relative;
          min-height: 70px;
          padding: 10px 8px;
          color: #ffffff;
          border-bottom: 1px solid #263147;
          border-left: 4px solid transparent;
          font-size: 0.95rem;
          text-align: center;
          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .classificacao-linha-lider {
          border-left-color: #22c55e;
          background:
            linear-gradient(
              90deg,
              rgba(34, 197, 94, 0.22),
              rgba(34, 197, 94, 0.08) 45%,
              transparent 100%
            );
        }

        .classificacao-linha-segundo {
          border-left-color: #2563eb;
          background:
            linear-gradient(
              90deg,
              rgba(37, 99, 235, 0.22),
              rgba(37, 99, 235, 0.08) 45%,
              transparent 100%
            );
        }

        .classificacao-linha-terceiro {
          border-left-color: #f59e0b;
          background:
            linear-gradient(
              90deg,
              rgba(245, 158, 11, 0.22),
              rgba(245, 158, 11, 0.08) 45%,
              transparent 100%
            );
        }

        .classificacao-linha-lanterna {
          border-left-color: #ef4444;
          background:
            linear-gradient(
              90deg,
              rgba(239, 68, 68, 0.22),
              rgba(239, 68, 68, 0.08) 45%,
              transparent 100%
            );
        }

        .classificacao-posicao {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .classificacao-movimento {
          min-width: 12px;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .classificacao-time {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
        }

        .classificacao-time img {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          object-fit: contain;
        }

        .classificacao-time-conteudo {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .classificacao-time-nome {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #ffffff;
          font-weight: 800;
        }

        .classificacao-pontos {
          font-weight: 900;
        }

        @media (max-width: 700px) {
          .standings-panel {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .classificacao-cabecalho,
          .classificacao-linha {
            grid-template-columns:
              44px
              126px
              repeat(7, 42px)
              46px;
            min-width: 510px;
            gap: 2px;
          }

          .classificacao-cabecalho {
            padding: 11px 4px;
            font-size: 0.62rem;
            letter-spacing: 0;
          }

          .classificacao-linha {
            min-height: 64px;
            padding: 9px 4px;
            font-size: 0.78rem;
          }

          .classificacao-posicao {
            gap: 3px;
          }

          .classificacao-movimento {
            min-width: 9px;
            font-size: 0.64rem;
          }

          .classificacao-time {
            gap: 6px;
          }

          .classificacao-time img {
            width: 28px;
            height: 28px;
            flex-basis: 28px;
          }

          .classificacao-time-nome {
            font-size: 0.78rem;
          }

          .position {
            min-width: 25px;
            width: 25px;
            height: 25px;
            padding: 0;
            display: grid;
            place-items: center;
            font-size: 0.72rem;
          }
        }

        @media (max-width: 390px) {
          .classificacao-cabecalho,
          .classificacao-linha {
            min-width: 500px;
          }
        }
      `}</style>

      <div className="panel-header">
        <div>
          <span className="panel-label">TABELA</span>
          <h3>Classificação</h3>
        </div>

        <button type="button" className="link-button">
          Ver completa
        </button>
      </div>

      <div className="classificacao-compacta">
        <div className="classificacao-cabecalho">
          <span>#</span>
          <span style={{ textAlign: "left" }}>TIME</span>
          <span>PTS</span>
          <span>PJ</span>
          <span>VIT</span>
          <span>E</span>
          <span>DER</span>
          <span>GM</span>
          <span>GC</span>
          <span>SG</span>
        </div>

        {classificacao.map((item, index) => {
          const posicaoAtual = index + 1;
          const indicador = movimento(item, posicaoAtual);

          const pontos = numero(item.pontos);
          const jogos = numero(
            item.jogos ??
              item.partidas_jogadas ??
              item.pj
          );
          const vitorias = numero(
            item.vitorias ?? item.vit
          );
          const empates = numero(
            item.empates ?? item.e
          );
          const derrotas = numero(
            item.derrotas ?? item.der
          );
          const golsMarcados = numero(
            item.gols_pro ??
              item.gols_marcados ??
              item.gm
          );
          const golsContra = numero(
            item.gols_contra ??
              item.gols_sofridos ??
              item.gc
          );
          const saldo = numero(
            item.saldo ??
              item.saldo_gols ??
              item.sg
          );

          return (
            <div
              key={item.id ?? item.nome}
              className={[
                "classificacao-linha",
                classeDaLinha(posicaoAtual),
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="classificacao-posicao">
                <span
                  className="classificacao-movimento"
                  style={{ color: indicador.cor }}
                  title={indicador.titulo}
                >
                  {indicador.simbolo}
                </span>

                <span
                  className={`position position-${posicaoAtual}`}
                >
                  {posicaoAtual}
                </span>
              </div>

              <div className="classificacao-time">
                <img
                  src={escudoTime(item.nome)}
                  alt={item.nome}
                />

                <div className="classificacao-time-conteudo">
                  <span
                    className="classificacao-time-nome"
                    title={item.nome}
                  >
                    {item.nome}
                  </span>

                </div>
              </div>

              <span className="classificacao-pontos">
                {pontos}
              </span>
              <span>{jogos}</span>
              <span>{vitorias}</span>
              <span>{empates}</span>
              <span>{derrotas}</span>
              <span>{golsMarcados}</span>
              <span>{golsContra}</span>
              <span>{saldoFormatado(saldo)}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default Tabela;