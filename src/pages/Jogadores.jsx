import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { escudoTime } from "../escudos";
import AdminLogin from "../components/AdminLogin";
import {
  adminEstaAtivo,
  desativarModoAdmin,
} from "../auth/adminAuth";

function corDoTime(nomeTime) {
  const nome = String(nomeTime || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const cores = {
    gremio: {
      fundo: "#cfe8ff",
      texto: "#102a43",
      borda: "#7db7e8",
    },
    sport: {
      fundo: "#ffe7a3",
      texto: "#3a2a00",
      borda: "#e4bd4f",
    },
    "sao paulo": {
      fundo: "#e5e7eb",
      texto: "#1f2937",
      borda: "#b8bec7",
    },
    ceara: {
      fundo: "#cfd4da",
      texto: "#111827",
      borda: "#9ca3af",
    },
    palmeiras: {
      fundo: "#d9f0d4",
      texto: "#16351f",
      borda: "#8bc382",
    },
    vasco: {
      fundo: "#ececec",
      texto: "#202020",
      borda: "#c4c4c4",
    },
    flamengo: {
      fundo: "#f7d6dc",
      texto: "#5f111c",
      borda: "#d99ba7",
    },
  };

  return (
    cores[nome] || {
      fundo: "#dbeafe",
      texto: "#172554",
      borda: "#93c5fd",
    }
  );
}

function Jogadores() {
  const [jogadores, setJogadores] = useState([]);
  const [times, setTimes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState(null);
  const [adminLiberado, setAdminLiberado] = useState(
    adminEstaAtivo()
  );
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregarDados() {
      try {
        const [resJogadores, resTimes] = await Promise.all([
          supabase
            .from("jogadores")
            .select(`
              id,
              nome,
              capitao,
              jogos,
              gols,
              time_id,
              times (
                id,
                nome,
                escudo
              )
            `)
            .eq("ativo", true)
            .order("nome", { ascending: true }),

          supabase
            .from("times")
            .select("id, nome, escudo")
            .order("nome", { ascending: true }),
        ]);

        if (resJogadores.error) {
          throw new Error(
            `Erro ao buscar jogadores: ${resJogadores.error.message}`
          );
        }

        if (resTimes.error) {
          throw new Error(
            `Erro ao buscar times: ${resTimes.error.message}`
          );
        }

        setJogadores(resJogadores.data || []);
        setTimes(resTimes.data || []);
      } catch (erro) {
        console.error("Erro ao carregar jogadores:", erro);
        setMensagem(
          erro.message ||
            "Não foi possível carregar os jogadores."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  async function alterarTime(jogadorId, novoTimeId) {
    if (!adminEstaAtivo()) {
      setAdminLiberado(false);
      setMostrarLogin(true);
      setMensagem(
        "Acesso restrito. Digite a senha de administrador para alterar jogadores."
      );
      return;
    }

    const timeIdConvertido = Number(novoTimeId);

    if (!Number.isFinite(timeIdConvertido)) {
      setMensagem("O time selecionado é inválido.");
      return;
    }

    setSalvandoId(jogadorId);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("jogadores")
        .update({ time_id: timeIdConvertido })
        .eq("id", jogadorId);

      if (error) {
        throw new Error(error.message);
      }

      const novoTime = times.find(
        (time) => Number(time.id) === timeIdConvertido
      );

      setJogadores((listaAtual) =>
        listaAtual.map((jogador) =>
          Number(jogador.id) === Number(jogadorId)
            ? {
                ...jogador,
                time_id: timeIdConvertido,
                times: novoTime || jogador.times,
              }
            : jogador
        )
      );

      setMensagem("✅ Time do jogador alterado com sucesso.");
    } catch (erro) {
      console.error("Erro ao trocar jogador de time:", erro);
      setMensagem(
        erro.message ||
          "Não foi possível alterar o time do jogador."
      );
    } finally {
      setSalvandoId(null);
    }
  }

  function sairDoModoAdmin() {
    desativarModoAdmin();
    setAdminLiberado(false);
    setMostrarLogin(false);
    setMensagem("Modo administrador encerrado.");
  }

  const jogadoresPorTime = times.map((time) => ({
    ...time,
    jogadores: jogadores.filter(
      (jogador) =>
        Number(jogador.time_id) === Number(time.id)
    ),
  }));

  return (
    <main className="page jogadores-page">
      <style>{`
        .jogadores-page .players-list {
          display: grid;
          gap: 10px;
        }

        .jogadores-page .player-row {
          display: grid;
          gap: 9px;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.035);
        }

        .jogadores-page .player-name-bar {
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 12px;
          border: 1px solid;
          border-radius: 10px;
          overflow: hidden;
        }

        .jogadores-page .player-number {
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.72);
          color: #111827;
          font-weight: 900;
          font-size: 0.88rem;
        }

        .jogadores-page .player-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 1rem;
          font-weight: 900;
        }

        .jogadores-page .player-row select {
          width: 100%;
          min-height: 44px;
          padding: 8px 12px;
          border-radius: 9px;
        }

        .jogadores-page .team-card {
          overflow: hidden;
        }

        @media (max-width: 700px) {
          .jogadores-page .player-row {
            padding: 8px;
            gap: 7px;
          }

          .jogadores-page .player-name-bar {
            min-height: 39px;
            padding: 6px 10px;
          }

          .jogadores-page .player-number {
            width: 25px;
            height: 25px;
            flex-basis: 25px;
            font-size: 0.8rem;
          }

          .jogadores-page .player-name {
            font-size: 0.94rem;
          }
        }
      `}</style>

      <section className="page-header">
        <span className="panel-label">ELENCOS</span>
        <h2>Jogadores</h2>

        <p>
          Consulte os elencos. Somente administradores
          podem alterar o time dos jogadores.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "14px",
          }}
        >
          {!adminLiberado ? (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMensagem("");
                setMostrarLogin(true);
              }}
            >
              🔒 Ativar edição administrativa
            </button>
          ) : (
            <>
              <span
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  color: "#86efac",
                  background: "#153b2a",
                  border: "1px solid #22c55e",
                  fontWeight: "bold",
                }}
              >
                ✅ Modo administrador ativo
              </span>

              <button
                type="button"
                onClick={sairDoModoAdmin}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  color: "#ffffff",
                  background: "transparent",
                  border: "1px solid #64748b",
                  cursor: "pointer",
                }}
              >
                Sair do modo administrador
              </button>
            </>
          )}
        </div>
      </section>

      {mensagem && (
        <div
          style={{
            padding: "14px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
            color: "#ffffff",
            background: mensagem.startsWith("✅")
              ? "#153b2a"
              : "#3b1c24",
            borderLeft: mensagem.startsWith("✅")
              ? "4px solid #22c55e"
              : "4px solid #ef4444",
          }}
        >
          {mensagem}
        </div>
      )}

      {mostrarLogin && !adminLiberado && (
        <AdminLogin
          titulo="Área administrativa"
          descricao="Digite a senha para liberar a alteração dos times dos jogadores."
          onLiberado={() => {
            setAdminLiberado(true);
            setMostrarLogin(false);
            setMensagem(
              "✅ Edição administrativa liberada."
            );
          }}
          onCancelar={() => {
            setMostrarLogin(false);
            setMensagem(
              "Acesso restrito. Apenas administradores podem alterar jogadores."
            );
          }}
        />
      )}

      {carregando ? (
        <p style={{ color: "#fff", textAlign: "center" }}>
          Carregando jogadores...
        </p>
      ) : (
        <section className="players-grid">
          {jogadoresPorTime.map((time) => (
            <article className="team-card" key={time.id}>
              <div className="team-card-header">
                <img
                  src={escudoTime(time.nome)}
                  alt={`Escudo do ${time.nome}`}
                />

                <div>
                  <span className="panel-label">EQUIPE</span>
                  <h3>{time.nome}</h3>
                </div>
              </div>

              <div className="players-list">
                {time.jogadores.map((jogador, index) => {
                  const cor = corDoTime(time.nome);

                  return (
                    <div
                      className="player-row"
                      key={jogador.id}
                    >
                      <div
                        className="player-name-bar"
                        style={{
                          background: cor.fundo,
                          color: cor.texto,
                          borderColor: cor.borda,
                        }}
                      >
                        <span className="player-number">
                          {index + 1}
                        </span>

                        <strong
                          className="player-name"
                          title={jogador.nome}
                        >
                          {jogador.nome}
                          {jogador.capitao ? " (C)" : ""}
                        </strong>
                      </div>

                      {adminLiberado ? (
                        <select
                          value={jogador.time_id}
                          disabled={
                            salvandoId === jogador.id
                          }
                          onChange={(evento) =>
                            alterarTime(
                              jogador.id,
                              evento.target.value
                            )
                          }
                        >
                          {times.map((opcao) => (
                            <option
                              key={opcao.id}
                              value={opcao.id}
                            >
                              {opcao.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          title="Acesso restrito"
                          style={{
                            color: "#94a3b8",
                            fontSize: "13px",
                            textAlign: "right",
                          }}
                        >
                          🔒 Somente consulta
                        </span>
                      )}
                    </div>
                  );
                })}

                {time.jogadores.length === 0 && (
                  <p style={{ color: "#9aa7bd" }}>
                    Nenhum jogador neste time.
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default Jogadores;