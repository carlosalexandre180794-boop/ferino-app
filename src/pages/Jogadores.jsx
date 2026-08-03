import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { escudoTime } from "../escudos";
import AdminLogin from "../components/AdminLogin";
import {
  adminEstaAtivo,
  desativarModoAdmin,
} from "../auth/adminAuth";

function Jogadores() {
  const [jogadores, setJogadores] = useState([]);
  const [times, setTimes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoTroca, setSalvandoTroca] = useState(false);
  const [adminLiberado, setAdminLiberado] = useState(
    adminEstaAtivo()
  );
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [seletorAberto, setSeletorAberto] = useState(null);

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

  async function trocarJogadores(jogadorAtualId, jogadorEscolhidoId) {
    setSeletorAberto(null);
    if (!adminEstaAtivo()) {
      setAdminLiberado(false);
      setMostrarLogin(true);
      setMensagem(
        "Acesso restrito. Digite a senha de administrador para alterar jogadores."
      );
      return;
    }

    const atualId = Number(jogadorAtualId);
    const escolhidoId = Number(jogadorEscolhidoId);

    if (
      !Number.isFinite(atualId) ||
      !Number.isFinite(escolhidoId)
    ) {
      setMensagem("O jogador selecionado é inválido.");
      return;
    }

    if (atualId === escolhidoId) {
      return;
    }

    const jogadorAtual = jogadores.find(
      (jogador) => Number(jogador.id) === atualId
    );

    const jogadorEscolhido = jogadores.find(
      (jogador) => Number(jogador.id) === escolhidoId
    );

    if (!jogadorAtual || !jogadorEscolhido) {
      setMensagem("Não foi possível localizar os jogadores.");
      return;
    }

    const timeAtualId = Number(jogadorAtual.time_id);
    const timeEscolhidoId = Number(jogadorEscolhido.time_id);

    if (timeAtualId === timeEscolhidoId) {
      setMensagem(
        "Os dois jogadores já pertencem ao mesmo time."
      );
      return;
    }

    const timeAtual = times.find(
      (time) => Number(time.id) === timeAtualId
    );

    const timeEscolhido = times.find(
      (time) => Number(time.id) === timeEscolhidoId
    );

    setSalvandoTroca(true);
    setMensagem("");

    try {
      const { error: erroPrimeiraTroca } = await supabase
        .from("jogadores")
        .update({
          time_id: timeEscolhidoId,
          capitao: Boolean(jogadorEscolhido.capitao),
        })
        .eq("id", atualId);

      if (erroPrimeiraTroca) {
        throw new Error(erroPrimeiraTroca.message);
      }

      const { error: erroSegundaTroca } = await supabase
        .from("jogadores")
        .update({
          time_id: timeAtualId,
          capitao: Boolean(jogadorAtual.capitao),
        })
        .eq("id", escolhidoId);

      if (erroSegundaTroca) {
        await supabase
          .from("jogadores")
          .update({
            time_id: timeAtualId,
            capitao: Boolean(jogadorAtual.capitao),
          })
          .eq("id", atualId);

        throw new Error(erroSegundaTroca.message);
      }

      setJogadores((listaAtual) =>
        listaAtual.map((jogador) => {
          if (Number(jogador.id) === atualId) {
            return {
              ...jogador,
              time_id: timeEscolhidoId,
              capitao: Boolean(jogadorEscolhido.capitao),
              times: timeEscolhido || jogador.times,
            };
          }

          if (Number(jogador.id) === escolhidoId) {
            return {
              ...jogador,
              time_id: timeAtualId,
              capitao: Boolean(jogadorAtual.capitao),
              times: timeAtual || jogador.times,
            };
          }

          return jogador;
        })
      );

      setMensagem(
        `✅ ${jogadorAtual.nome} e ${jogadorEscolhido.nome} trocaram de time.`
      );
    } catch (erro) {
      console.error("Erro ao trocar jogadores:", erro);
      setMensagem(
        erro.message ||
          "Não foi possível realizar a troca dos jogadores."
      );
    } finally {
      setSalvandoTroca(false);
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
    jogadores: jogadores
      .filter(
        (jogador) =>
          Number(jogador.time_id) === Number(time.id)
      )
      .sort(
        (a, b) =>
          Number(Boolean(b.capitao)) -
            Number(Boolean(a.capitao)) ||
          a.nome.localeCompare(b.nome, "pt-BR")
      ),
  }));

  return (
    <main className="page jogadores-page">
      <style>{`
        .jogadores-page,
        .jogadores-page * {
          box-sizing: border-box;
        }

        .jogadores-page .players-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: start;
        }

        .jogadores-page .team-card {
          position: relative;
          min-width: 0;
          overflow: visible;
          border-radius: 18px;
          background: #0e1b31;
          border: 1px solid rgba(96, 165, 250, 0.24);
        }

        .jogadores-page .team-card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 116px;
          padding: 20px 24px;
        }

        .jogadores-page .team-card-header img {
          width: 56px;
          height: 56px;
          flex: 0 0 56px;
          object-fit: contain;
        }

        .jogadores-page .team-card-header h3 {
          margin: 3px 0 0;
          color: #ffffff;
          font-size: 1.35rem;
          line-height: 1.1;
        }

        .jogadores-page .players-table-header,
        .jogadores-page .player-row {
          display: grid;
          grid-template-columns:
            42px
            minmax(0, 0.92fr)
            minmax(0, 1.08fr);
          align-items: center;
          column-gap: 12px;
        }

        .jogadores-page .players-table-header {
          margin: 0 22px;
          padding: 12px 10px;
          color: #aab6ca;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          background: transparent;
        }

        .jogadores-page .players-list {
          display: grid;
          gap: 9px;
          padding: 9px 22px 22px;
        }

        .jogadores-page .player-row {
          position: relative;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: visible;
          min-height: 62px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(24, 42, 70, 0.72);
          border: 1px solid rgba(96, 165, 250, 0.06);
        }

        .jogadores-page .player-number {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #ffffff;
          background: rgba(59, 130, 246, 0.20);
          border: 1px solid rgba(96, 165, 250, 0.62);
          font-weight: 900;
          user-select: none;
        }

        .jogadores-page .fixed-team {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #ffffff;
          overflow: hidden;
        }

        .jogadores-page .fixed-team img {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          object-fit: contain;
        }

        .jogadores-page .fixed-team span {
          min-width: 0;
          color: #ffffff !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          font-size: 0.92rem;
          font-weight: 800;
          line-height: 1.15;
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
          user-select: none;
        }

        .jogadores-page .player-picker {
          position: relative;
          width: 100%;
          min-width: 0;
          max-width: 100%;
        }

        .jogadores-page .player-picker-button {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          min-height: 44px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 20px;
          align-items: center;
          gap: 8px;
          padding: 8px 10px 8px 13px;
          border: 1px solid rgba(96, 165, 250, 0.78);
          border-radius: 10px;
          color: #ffffff;
          background: #101f37;
          font-weight: 800;
          cursor: pointer;
          user-select: none;
        }

        .jogadores-page .player-picker-button:hover,
        .jogadores-page .player-picker-button[aria-expanded="true"] {
          background: rgba(59, 130, 246, 0.16);
          border-color: #60a5fa;
        }

        .jogadores-page .player-picker-button:disabled {
          cursor: not-allowed;
          opacity: 0.72;
        }

        .jogadores-page .player-picker-label {
          display: block;
          min-width: 0;
          color: #ffffff !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          font-size: 0.88rem;
          font-weight: 800;
          line-height: 1.15;
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
          text-align: left;
          user-select: none;
        }

        .jogadores-page .player-picker-arrow {
          display: grid;
          place-items: center;
          color: #ffffff;
          background: transparent !important;
          border: 0 !important;
          padding: 0 !important;
          font-size: 0.78rem;
          user-select: none;
        }

        .jogadores-page .player-picker-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 100;
          width: 100%;
          min-width: 100%;
          max-width: 100%;
          max-height: 320px;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 6px;
          border-radius: 10px;
          border: 1px solid rgba(96, 165, 250, 0.75);
          background: #101f37;
          box-shadow: 0 20px 44px rgba(0, 0, 0, 0.58);
        }

        .jogadores-page .player-picker-menu::-webkit-scrollbar {
          width: 7px;
        }

        .jogadores-page .player-picker-menu::-webkit-scrollbar-thumb {
          border-radius: 8px;
          background: rgba(148, 163, 184, 0.72);
        }

        .jogadores-page .player-picker-option {
          width: 100%;
          min-width: 0;
          min-height: 40px;
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          padding: 6px 9px;
          border: 0;
          border-radius: 8px;
          color: #ffffff;
          background: transparent;
          text-align: left;
          cursor: pointer;
          user-select: none;
        }

        .jogadores-page .player-picker-option:hover,
        .jogadores-page .player-picker-option.ativo {
          background: rgba(59, 130, 246, 0.20);
        }

        .jogadores-page .player-picker-option img {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }

        .jogadores-page .player-picker-option span {
          min-width: 0;
          color: #ffffff !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          font-size: 0.87rem;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
          user-select: none;
        }

        .jogadores-page .player-name-readonly {
          min-width: 0;
          min-height: 44px;
          display: flex;
          align-items: center;
          padding: 8px 13px;
          border-radius: 10px;
          color: #ffffff;
          background: #101f37;
          border: 1px solid rgba(96, 165, 250, 0.45);
          font-size: 0.88rem;
          font-weight: 800;
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
        }

        .jogadores-page ::selection {
          color: #ffffff;
          background: transparent;
        }

        @media (max-width: 1120px) {
          .jogadores-page .players-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .jogadores-page .team-card-header {
            min-height: 104px;
            padding: 16px 18px;
          }

          .jogadores-page .team-card-header img {
            width: 50px;
            height: 50px;
            flex-basis: 50px;
          }

          .jogadores-page .players-table-header,
          .jogadores-page .player-row {
            grid-template-columns:
              34px
              minmax(0, 0.92fr)
              minmax(0, 1.08fr);
            column-gap: 7px;
          }

          .jogadores-page .players-table-header {
            margin: 0 12px;
            padding: 10px 7px;
            font-size: 0.64rem;
          }

          .jogadores-page .players-list {
            gap: 7px;
            padding: 7px 12px 16px;
          }

          .jogadores-page .player-row {
            min-height: 56px;
            padding: 6px 7px;
          }

          .jogadores-page .player-number {
            width: 28px;
            height: 28px;
            font-size: 0.8rem;
          }

          .jogadores-page .fixed-team {
            gap: 6px;
          }

          .jogadores-page .fixed-team img {
            width: 26px;
            height: 26px;
            flex-basis: 26px;
          }

          .jogadores-page .fixed-team span {
            font-size: 0.74rem;
            white-space: nowrap;
          }

          .jogadores-page .player-picker-button,
          .jogadores-page .player-name-readonly {
            min-height: 39px;
            padding-left: 9px;
          }

          .jogadores-page .player-picker-label {
            font-size: 0.74rem;
            white-space: nowrap;
          }

          .jogadores-page .player-picker-menu {
            width: 100%;
            min-width: 100%;
            max-width: 100%;
            max-height: 300px;
          }

          .jogadores-page .player-picker-option span {
            font-size: 0.82rem;
          }
        }
      `}</style>

      <section className="page-header">
        <span className="panel-label">ELENCOS</span>
        <h2>Jogadores</h2>

        <p>
          Os times permanecem fixos. No modo administrador,
          selecione um jogador para trocar sua equipe.
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
          descricao="Digite a senha para liberar a troca dos jogadores entre os times."
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

              <div className="players-table-header">
                <span>Nº</span>
                <span>Time</span>
                <span>Nome</span>
              </div>

              <div className="players-list">
                {time.jogadores.map((jogador, index) => (
                  <div
                    className="player-row"
                    key={jogador.id}
                  >
                    <strong className="player-number">
                      {index + 1}
                    </strong>

                    <div className="fixed-team">
                      <img
                        src={escudoTime(time.nome)}
                        alt={`Escudo do ${time.nome}`}
                      />
                      <span title={time.nome}>
                        {time.nome}
                      </span>
                    </div>

                    {adminLiberado ? (
                      <div className="player-picker">
                        <button
                          type="button"
                          className="player-picker-button"
                          disabled={salvandoTroca}
                          onClick={() =>
                            setSeletorAberto((aberto) =>
                              aberto === jogador.id
                                ? null
                                : jogador.id
                            )
                          }
                          aria-expanded={
                            seletorAberto === jogador.id
                          }
                          aria-label={`Selecionar jogador para a posição ${index + 1} do ${time.nome}`}
                        >
                          <span className="player-picker-label">
                            {jogador.nome}
                            {jogador.capitao ? " (C)" : ""}
                          </span>

                          <span className="player-picker-arrow">
                            ▾
                          </span>
                        </button>

                        {seletorAberto === jogador.id && (
                          <div className="player-picker-menu">
                            {jogadores
                              .slice()
                              .sort((a, b) =>
                                a.nome.localeCompare(
                                  b.nome,
                                  "pt-BR"
                                )
                              )
                              .map((opcao) => {
                                const nomeTimeOpcao =
                                  opcao.times?.nome ||
                                  times.find(
                                    (item) =>
                                      Number(item.id) ===
                                      Number(opcao.time_id)
                                  )?.nome ||
                                  "Sem time";

                                return (
                                  <button
                                    type="button"
                                    key={opcao.id}
                                    className={`player-picker-option ${
                                      Number(opcao.id) ===
                                      Number(jogador.id)
                                        ? "ativo"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      trocarJogadores(
                                        jogador.id,
                                        opcao.id
                                      )
                                    }
                                  >
                                    <img
                                      src={escudoTime(
                                        nomeTimeOpcao
                                      )}
                                      alt=""
                                      aria-hidden="true"
                                    />

                                    <span>
                                      {opcao.nome}
                                      {opcao.capitao
                                        ? " (C)"
                                        : ""}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="player-name-readonly"
                        title={jogador.nome}
                      >
                        {jogador.nome}
                        {jogador.capitao ? " (C)" : ""}
                      </div>
                    )}
                  </div>
                ))}

                {time.jogadores.length === 0 && (
                  <p
                    style={{
                      color: "#9aa7bd",
                      padding: "14px",
                    }}
                  >
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