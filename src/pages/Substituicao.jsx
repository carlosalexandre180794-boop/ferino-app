import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Substituicao() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");

  const [times, setTimes] = useState([]);
  const [jogadores, setJogadores] = useState([]);
  const [historico, setHistorico] = useState([]);

  const [timeSelecionado, setTimeSelecionado] = useState("");
  const [jogadorSaindo, setJogadorSaindo] = useState("");
  const [jogadorEntrando, setJogadorEntrando] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregarDados() {
      const [resultadoTimes, resultadoJogadores] = await Promise.all([
        supabase
          .from("times")
          .select("id, nome")
          .order("nome", { ascending: true }),

        supabase
          .from("jogadores")
          .select("id, nome, time_id")
          .eq("ativo", true)
          .order("nome", { ascending: true }),
      ]);

      if (resultadoTimes.error) {
        console.error(
          "Erro ao carregar times:",
          resultadoTimes.error
        );
        setMensagem("Não foi possível carregar os times.");
      } else {
        setTimes(resultadoTimes.data || []);
      }

      if (resultadoJogadores.error) {
        console.error(
          "Erro ao carregar jogadores:",
          resultadoJogadores.error
        );
        setMensagem("Não foi possível carregar os jogadores.");
      } else {
        setJogadores(resultadoJogadores.data || []);
      }
    }

    carregarDados();
  }, []);

  const jogadoresDoTime = jogadores.filter(
    (jogador) =>
      jogador.time_id === Number(timeSelecionado)
  );

  function verificarSenhaAdmin(evento) {
    evento.preventDefault();

    if (senhaDigitada === "ferino2026") {
      setIsAdmin(true);
      setSenhaDigitada("");
      setMensagem("");
      return;
    }

    alert(
      "Acesso negado! Apenas administradores podem fazer substituições."
    );
  }

  async function realizarSubstituicao(evento) {
    evento.preventDefault();
    setMensagem("");

    if (
      !timeSelecionado ||
      !jogadorSaindo ||
      !jogadorEntrando.trim()
    ) {
      setMensagem(
        "Preencha todos os campos para realizar a substituição."
      );
      return;
    }

    const jogadorOriginal = jogadores.find(
      (jogador) =>
        jogador.id === Number(jogadorSaindo)
    );

    const equipeSelecionada = times.find(
      (time) =>
        time.id === Number(timeSelecionado)
    );

    if (!jogadorOriginal) {
      setMensagem("O jogador selecionado não foi encontrado.");
      return;
    }

    setSalvando(true);

    try {
      const novoNome = jogadorEntrando.trim();

      const { error: erroAtualizacao } = await supabase
        .from("jogadores")
        .update({ nome: novoNome })
        .eq("id", Number(jogadorSaindo));

      if (erroAtualizacao) {
        throw erroAtualizacao;
      }

      const novaTroca = {
        id: Date.now(),
        time: equipeSelecionada?.nome || "Equipe",
        saiu: jogadorOriginal.nome,
        entrou: novoNome,
        data: new Date().toLocaleDateString("pt-BR"),
      };

      setHistorico((historicoAtual) => [
        novaTroca,
        ...historicoAtual,
      ]);

      setMensagem(
        `Substituição realizada! ${jogadorOriginal.nome} foi substituído por ${novoNome}.`
      );

      setJogadorSaindo("");
      setJogadorEntrando("");

      const { data, error } = await supabase
        .from("jogadores")
        .select("id, nome, time_id")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) {
        throw error;
      }

      setJogadores(data || []);
    } catch (error) {
      console.error("Erro na substituição:", error);
      setMensagem(
        `Erro ao salvar a alteração: ${error.message}`
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!isAdmin) {
    return (
      <main
        className="page"
        style={{
          padding: "20px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <section
          className="page-header"
          style={{ marginBottom: "16px" }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.7rem",
            }}
          >
            Substituição
          </h2>
        </section>

        <form
          onSubmit={verificarSenhaAdmin}
          style={{
            background: "#1e1e24",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "400px",
            margin: "0 auto",
            border: "1px solid #333",
          }}
        >
          <label
            htmlFor="senha-admin"
            style={{
              display: "block",
              color: "#aaa",
              marginBottom: "10px",
            }}
          >
            Digite a senha de administrador
          </label>

          <input
            id="senha-admin"
            type="password"
            placeholder="Senha..."
            value={senhaDigitada}
            onChange={(evento) =>
              setSenhaDigitada(evento.target.value)
            }
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#2a2a32",
              border: "1px solid #444",
              color: "#fff",
              borderRadius: "4px",
              marginBottom: "14px",
              boxSizing: "border-box",
              textAlign: "center",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main
      className="page substituicao-page"
      style={{ padding: "12px", color: "#fff" }}
    >
      <style>{`
        @media (max-width: 700px) {
          .substituicao-page {
            padding-top: 8px !important;
          }

          .substituicao-page h2 {
            font-size: 1.55rem !important;
          }

          .substituicao-page h3 {
            font-size: 1.05rem;
          }

          .substituicao-page select,
          .substituicao-page input,
          .substituicao-page button {
            min-height: 38px;
          }
        }
      `}</style>
      <section
        className="page-header"
        style={{
          marginBottom: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.7rem",
          }}
        >
          Substituição
        </h2>

        <button
          type="button"
          onClick={() => setIsAdmin(false)}
          style={{
            padding: "6px 10px",
            background: "transparent",
            color: "#aaa",
            border: "1px solid #444",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Sair
        </button>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "18px",
        }}
      >
        <form
          onSubmit={realizarSubstituicao}
          style={{
            background: "#1e1e24",
            padding: "18px",
            borderRadius: "8px",
            height: "fit-content",
          }}
        >
          <h3
            style={{
              marginBottom: "14px",
              color: "#fff",
            }}
          >
            Registrar nova troca
          </h3>

          {mensagem && (
            <div
              style={{
                padding: "8px 10px",
                background: "#2a2a32",
                borderLeft: "4px solid #4f46e5",
                borderRadius: "4px",
                marginBottom: "10px",
                fontSize: "0.9rem",
              }}
            >
              {mensagem}
            </div>
          )}

          <div style={{ marginBottom: "10px" }}>
            <label
              htmlFor="time-substituicao"
              style={{
                display: "block",
                color: "#aaa",
                marginBottom: "6px",
                fontSize: "0.85rem",
              }}
            >
              Selecione a equipe
            </label>

            <select
              id="time-substituicao"
              value={timeSelecionado}
              onChange={(evento) => {
                setTimeSelecionado(evento.target.value);
                setJogadorSaindo("");
                setJogadorEntrando("");
              }}
              disabled={salvando}
              style={{
                width: "100%",
                padding: "10px",
                background: "#2a2a32",
                border: "1px solid #444",
                color: "#fff",
                borderRadius: "4px",
              }}
            >
              <option value="">
                Escolha um time...
              </option>

              {times.map((time) => (
                <option
                  key={time.id}
                  value={time.id}
                >
                  {time.nome}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label
              htmlFor="jogador-saindo"
              style={{
                display: "block",
                color: "#aaa",
                marginBottom: "6px",
                fontSize: "0.85rem",
              }}
            >
              Jogador ausente
            </label>

            <select
              id="jogador-saindo"
              value={jogadorSaindo}
              onChange={(evento) =>
                setJogadorSaindo(evento.target.value)
              }
              disabled={!timeSelecionado || salvando}
              style={{
                width: "100%",
                padding: "10px",
                background: "#2a2a32",
                border: "1px solid #444",
                color: "#fff",
                borderRadius: "4px",
              }}
            >
              <option value="">
                {timeSelecionado
                  ? "Escolha o jogador..."
                  : "Selecione o time primeiro"}
              </option>

              {jogadoresDoTime.map((jogador) => (
                <option
                  key={jogador.id}
                  value={jogador.id}
                >
                  {jogador.nome}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label
              htmlFor="jogador-entrando"
              style={{
                display: "block",
                color: "#aaa",
                marginBottom: "6px",
                fontSize: "0.85rem",
              }}
            >
              Novo jogador
            </label>

            <input
              id="jogador-entrando"
              type="text"
              placeholder="Digite o nome do substituto"
              value={jogadorEntrando}
              onChange={(evento) =>
                setJogadorEntrando(evento.target.value)
              }
              disabled={!jogadorSaindo || salvando}
              style={{
                width: "100%",
                padding: "10px",
                background: "#2a2a32",
                border: "1px solid #444",
                color: "#fff",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={
              salvando ||
              !jogadorSaindo ||
              !jogadorEntrando.trim()
            }
            className="link-button"
            style={{
              width: "100%",
              padding: "10px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: salvando
                ? "not-allowed"
                : "pointer",
              opacity: salvando ? 0.7 : 1,
            }}
          >
            {salvando
              ? "Salvando alteração..."
              : "Confirmar substituição"}
          </button>
        </form>

        <div
          style={{
            background: "#1e1e24",
            padding: "18px",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{
              marginBottom: "14px",
              color: "#fff",
            }}
          >
            🔁 Alterações recentes
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {historico.length === 0 ? (
              <p
                style={{
                  color: "#aaa",
                  fontSize: "0.95rem",
                }}
              >
                Nenhuma substituição realizada nesta
                sessão.
              </p>
            ) : (
              historico.map((troca) => (
                <div
                  key={troca.id}
                  style={{
                    background: "#2a2a32",
                    padding: "11px",
                    borderRadius: "6px",
                    borderLeft: "4px solid #eab308",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <strong style={{ color: "#fff" }}>
                      {troca.time}
                    </strong>

                    <span
                      style={{
                        color: "#aaa",
                        fontSize: "0.8rem",
                      }}
                    >
                      {troca.data}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      color: "#ddd",
                    }}
                  >
                    Saiu:{" "}
                    <span style={{ color: "#ef4444" }}>
                      {troca.saiu}
                    </span>{" "}
                    → Entrou:{" "}
                    <span style={{ color: "#22c55e" }}>
                      {troca.entrou}
                    </span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default Substituicao;