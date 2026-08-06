import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const MESES = [
  { valor: 1, nome: "Janeiro" },
  { valor: 2, nome: "Fevereiro" },
  { valor: 3, nome: "Março" },
  { valor: 4, nome: "Abril" },
  { valor: 5, nome: "Maio" },
  { valor: 6, nome: "Junho" },
  { valor: 7, nome: "Julho" },
  { valor: 8, nome: "Agosto" },
  { valor: 9, nome: "Setembro" },
  { valor: 10, nome: "Outubro" },
  { valor: 11, nome: "Novembro" },
  { valor: 12, nome: "Dezembro" },
];

const ANO_INICIAL = 2026;
const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from(
  { length: Math.max(1, ANO_ATUAL - ANO_INICIAL + 4) },
  (_, indice) => ANO_INICIAL + indice
);

function Substituicao() {
  const agora = new Date();

  const [isAdmin, setIsAdmin] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");

  const [anoSelecionado, setAnoSelecionado] = useState(
    Math.max(ANO_INICIAL, agora.getFullYear())
  );
  const [mesSelecionado, setMesSelecionado] = useState(
    agora.getFullYear() === ANO_INICIAL ? agora.getMonth() + 1 : 1
  );

  const [temporadaId, setTemporadaId] = useState(null);
  const [times, setTimes] = useState([]);
  const [elencos, setElencos] = useState([]);
  const [historico, setHistorico] = useState([]);

  const [timeSelecionado, setTimeSelecionado] = useState("");
  const [jogadorSaindo, setJogadorSaindo] = useState("");
  const [jogadorEntrando, setJogadorEntrando] = useState("");
  const [dataSubstituicao, setDataSubstituicao] = useState(
    agora.toISOString().slice(0, 10)
  );
  const [rodada, setRodada] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarTimes();
  }, []);

  useEffect(() => {
    if (times.length > 0) {
      carregarCompetencia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSelecionado, mesSelecionado, times.length]);

  async function carregarTimes() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("times")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar times:", error);
      setMensagem("Não foi possível carregar os times.");
      setCarregando(false);
      return;
    }

    setTimes(data || []);
  }

  async function carregarCompetencia() {
    setCarregando(true);
    setMensagem("");
    setTimeSelecionado("");
    setJogadorSaindo("");

    try {
      const { data: idCriado, error: erroCriar } = await supabase.rpc(
        "ferino_criar_elenco_mes",
        {
          p_ano: Number(anoSelecionado),
          p_mes: Number(mesSelecionado),
        }
      );
console.log("RETORNO INSERT:", { data, error });
      if (erroCriar) {
        throw new Error(erroCriar.message);
      }

      const idCompetencia = Number(idCriado);
      setTemporadaId(idCompetencia);

      const [resultadoElencos, resultadoHistorico] = await Promise.all([
        supabase
          .from("elencos")
          .select(`
            id,
            temporada_id,
            time_id,
            jogador_id,
            posicao,
            capitao,
            ativo,
            jogador_nome_snapshot,
            time_nome_snapshot
          `)
          .eq("temporada_id", idCompetencia)
          .eq("ativo", true)
          .order("time_id", { ascending: true })
          .order("posicao", { ascending: true }),

        supabase
          .from("substituicoes")
          .select(`
            id,
            temporada_id,
            time_id,
            rodada,
            data_substituicao,
            jogador_saida_id,
            jogador_saida_nome_snapshot,
            jogador_entrada_nome_snapshot,
            status,
            conta_artilharia_padrao,
            created_at
          `)
          .eq("temporada_id", idCompetencia)
          .neq("status", "cancelada")
          .order("data_substituicao", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (resultadoElencos.error) {
        throw new Error(resultadoElencos.error.message);
      }

      if (resultadoHistorico.error) {
        throw new Error(resultadoHistorico.error.message);
      }

      setElencos(resultadoElencos.data || []);
      setHistorico(resultadoHistorico.data || []);
    } catch (error) {
      console.error("Erro ao carregar competência:", error);
      setElencos([]);
      setHistorico([]);
      setMensagem(
        `Erro ao carregar o mês selecionado: ${error.message}`
      );
    } finally {
      setCarregando(false);
    }
  }

  const nomeMesSelecionado =
    MESES.find((mes) => mes.valor === Number(mesSelecionado))?.nome ||
    "Mês";

  const jogadoresDoTime = useMemo(
    () =>
      elencos
        .filter(
          (registro) =>
            Number(registro.time_id) === Number(timeSelecionado)
        )
        .sort(
          (a, b) =>
            Number(a.posicao) - Number(b.posicao) ||
            a.jogador_nome_snapshot.localeCompare(
              b.jogador_nome_snapshot,
              "pt-BR"
            )
        ),
    [elencos, timeSelecionado]
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
console.log("ENTROU NA FUNÇÃO");
    if (
      !temporadaId ||
      !timeSelecionado ||
      !jogadorSaindo ||
      !jogadorEntrando.trim() ||
      !dataSubstituicao
    ) {
      setMensagem(
        "Preencha mês, ano, equipe, jogador ausente, substituto e data."
      );
      return;
    }

    const jogadorOriginal = elencos.find(
      (registro) =>
        Number(registro.jogador_id) === Number(jogadorSaindo)
    );

    const equipeSelecionada = times.find(
      (time) => Number(time.id) === Number(timeSelecionado)
    );

    if (!jogadorOriginal || !equipeSelecionada) {
      setMensagem("O jogador ou a equipe não foram encontrados.");
      return;
    }

    setSalvando(true);

    try {
      const { data, error } = await supabase
        .from("substituicoes")
        .insert({
          temporada_id: Number(temporadaId),
          time_id: Number(timeSelecionado),
          partida_id: null,
          rodada: rodada ? Number(rodada) : null,
          data_substituicao: dataSubstituicao,
          jogador_saida_id: Number(jogadorOriginal.jogador_id),
          jogador_saida_nome_snapshot:
            jogadorOriginal.jogador_nome_snapshot,
          jogador_entrada_id: null,
          jogador_entrada_nome_snapshot: jogadorEntrando.trim(),
          motivo: "Substituição temporária",
          status: "ativa",
          conta_artilharia_padrao: false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setHistorico((listaAtual) => [data, ...listaAtual]);

      setMensagem(
        `✅ ${jogadorOriginal.jogador_nome_snapshot} foi substituído por ${jogadorEntrando.trim()} em ${nomeMesSelecionado} de ${anoSelecionado}. O jogador original não foi apagado.`
      );

      setJogadorSaindo("");
      setJogadorEntrando("");
      setRodada("");
    } catch (error) {
     console.error("ERRO COMPLETO:", error);
      setMensagem(`Erro ao salvar a substituição: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function cancelarSubstituicao(id) {
    if (!window.confirm("Deseja cancelar esta substituição?")) {
      return;
    }

    const { error } = await supabase
      .from("substituicoes")
      .update({ status: "cancelada" })
      .eq("id", id);

    if (error) {
      setMensagem(`Erro ao cancelar: ${error.message}`);
      return;
    }

    setHistorico((listaAtual) =>
      listaAtual.filter((item) => Number(item.id) !== Number(id))
    );
    setMensagem("✅ Substituição cancelada.");
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
          <h2 style={{ margin: 0, fontSize: "1.7rem" }}>
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
        .substituicao-page .periodo-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .substituicao-page .campo {
          margin-bottom: 10px;
        }

        .substituicao-page .campo label {
          display: block;
          color: #aaa;
          margin-bottom: 6px;
          font-size: 0.85rem;
        }

        .substituicao-page .campo select,
        .substituicao-page .campo input {
          width: 100%;
          min-height: 42px;
          padding: 10px;
          background: #2a2a32;
          border: 1px solid #444;
          color: #fff;
          border-radius: 4px;
          box-sizing: border-box;
        }

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
        <div>
          <h2 style={{ margin: 0, fontSize: "1.7rem" }}>
            Substituição
          </h2>
          <p style={{ color: "#aaa", margin: "6px 0 0" }}>
            Troca temporária sem apagar o jogador oficial.
          </p>
        </div>

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
          <h3 style={{ marginBottom: "14px", color: "#fff" }}>
            Registrar nova troca
          </h3>

          <div className="periodo-grid">
            <div className="campo">
              <label htmlFor="mes-substituicao">Mês</label>
              <select
                id="mes-substituicao"
                value={mesSelecionado}
                disabled={carregando || salvando}
                onChange={(evento) =>
                  setMesSelecionado(Number(evento.target.value))
                }
              >
                {MESES.map((mes) => (
                  <option key={mes.valor} value={mes.valor}>
                    {mes.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="ano-substituicao">Ano</label>
              <select
                id="ano-substituicao"
                value={anoSelecionado}
                disabled={carregando || salvando}
                onChange={(evento) =>
                  setAnoSelecionado(Number(evento.target.value))
                }
              >
                {ANOS.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mensagem && (
            <div
              style={{
                padding: "8px 10px",
                background: "#2a2a32",
                borderLeft: mensagem.startsWith("✅")
                  ? "4px solid #22c55e"
                  : "4px solid #ef4444",
                borderRadius: "4px",
                marginBottom: "10px",
                fontSize: "0.9rem",
              }}
            >
              {mensagem}
            </div>
          )}

          <div className="campo">
            <label htmlFor="data-substituicao">
              Data da substituição
            </label>
            <input
              id="data-substituicao"
              type="date"
              value={dataSubstituicao}
              onChange={(evento) =>
                setDataSubstituicao(evento.target.value)
              }
              disabled={salvando}
            />
          </div>

          <div className="campo">
            <label htmlFor="rodada-substituicao">
              Rodada (opcional)
            </label>
            <input
              id="rodada-substituicao"
              type="number"
              min="1"
              placeholder="Ex.: 2"
              value={rodada}
              onChange={(evento) => setRodada(evento.target.value)}
              disabled={salvando}
            />
          </div>

          <div className="campo">
            <label htmlFor="time-substituicao">
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
              disabled={carregando || salvando}
            >
              <option value="">Escolha um time...</option>
              {times.map((time) => (
                <option key={time.id} value={time.id}>
                  {time.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="jogador-saindo">
              Jogador ausente
            </label>
            <select
              id="jogador-saindo"
              value={jogadorSaindo}
              onChange={(evento) =>
                setJogadorSaindo(evento.target.value)
              }
              disabled={!timeSelecionado || salvando}
            >
              <option value="">
                {timeSelecionado
                  ? "Escolha o jogador..."
                  : "Selecione o time primeiro"}
              </option>

              {jogadoresDoTime.map((jogador) => (
                <option
                  key={jogador.jogador_id}
                  value={jogador.jogador_id}
                >
                  {jogador.jogador_nome_snapshot}
                </option>
              ))}
            </select>
          </div>

          <div className="campo" style={{ marginBottom: "14px" }}>
            <label htmlFor="jogador-entrando">
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
            />
          </div>

          <button
            type="submit"
            disabled={
              carregando ||
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
              cursor: salvando ? "not-allowed" : "pointer",
              opacity: salvando ? 0.7 : 1,
            }}
          >
            {salvando
              ? "Salvando substituição..."
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
          <h3 style={{ marginBottom: "14px", color: "#fff" }}>
            🔁 Alterações de {nomeMesSelecionado} de {anoSelecionado}
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {historico.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "0.95rem" }}>
                Nenhuma substituição registrada neste mês.
              </p>
            ) : (
              historico.map((troca) => {
                const time = times.find(
                  (item) => Number(item.id) === Number(troca.time_id)
                );

                return (
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
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <strong style={{ color: "#fff" }}>
                        {time?.nome || "Equipe"}
                      </strong>

                      <span
                        style={{
                          color: "#aaa",
                          fontSize: "0.8rem",
                        }}
                      >
                        {new Date(
                          `${troca.data_substituicao}T12:00:00`
                        ).toLocaleDateString("pt-BR")}
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
                        {troca.jogador_saida_nome_snapshot}
                      </span>{" "}
                      → Entrou:{" "}
                      <span style={{ color: "#22c55e" }}>
                        {troca.jogador_entrada_nome_snapshot}
                      </span>
                    </p>

                    {troca.rodada && (
                      <small style={{ color: "#aaa" }}>
                        Rodada {troca.rodada}
                      </small>
                    )}

                    <button
                      type="button"
                      onClick={() => cancelarSubstituicao(troca.id)}
                      style={{
                        display: "block",
                        marginTop: "8px",
                        padding: "5px 8px",
                        borderRadius: "5px",
                        border: "1px solid #7f1d1d",
                        background: "transparent",
                        color: "#fca5a5",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar substituição
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default Substituicao;