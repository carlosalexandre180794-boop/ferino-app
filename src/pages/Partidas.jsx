import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useLocation } from "react-router-dom";
function Partidas() {
  const location = useLocation();
const jogo = location.state?.jogo;
  const [times, setTimes] = useState([]);
  const [jogadores, setJogadores] = useState([]);

  const [timeA, setTimeA] = useState("");
  const [timeB, setTimeB] = useState("");
  const [golsA, setGolsA] = useState("");
  const [golsB, setGolsB] = useState("");

  const [partidaId, setPartidaId] = useState(null);

  const [autoresA, setAutoresA] = useState([]);
  const [autoresB, setAutoresB] = useState([]);

  const [goleiroA, setGoleiroA] = useState("");
  const [goleiroB, setGoleiroB] = useState("");

  const [golsSofridosA, setGolsSofridosA] = useState("");
  const [golsSofridosB, setGolsSofridosB] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregarDados() {
      setMensagem("");

      const [resTimes, resJogadores] = await Promise.all([
        supabase
          .from("times")
          .select("id, nome, escudo")
          .order("nome", { ascending: true }),

        supabase
          .from("jogadores")
          .select("id, nome, time_id, goleiro")
          .eq("ativo", true)
          .order("nome", { ascending: true }),
      ]);

      if (resTimes.error) {
        console.error("Erro ao carregar times:", resTimes.error);
        setMensagem("Não foi possível carregar os times.");
        return;
      }

      if (resJogadores.error) {
        console.error("Erro ao carregar jogadores:", resJogadores.error);
        setMensagem("Não foi possível carregar os jogadores.");
        return;
      }

      setTimes(resTimes.data || []);
      setJogadores(resJogadores.data || []);
    }

    carregarDados();
  }, []);

  const equipeA = times.find((time) => time.id === Number(timeA));
  const equipeB = times.find((time) => time.id === Number(timeB));

  const jogadoresTimeA = useMemo(() => {
    return jogadores.filter(
      (jogador) =>
        jogador.time_id === Number(timeA) &&
        jogador.goleiro !== true
    );
  }, [jogadores, timeA]);

  const jogadoresTimeB = useMemo(() => {
    return jogadores.filter(
      (jogador) =>
        jogador.time_id === Number(timeB) &&
        jogador.goleiro !== true
    );
  }, [jogadores, timeB]);

  const goleiros = useMemo(() => {
    return jogadores.filter((jogador) => jogador.goleiro === true);
  }, [jogadores]);

  function criarCamposDeAutores(quantidade) {
    return Array.from({ length: quantidade }, () => "");
  }

  function limparFormulario() {
    setTimeA("");
    setTimeB("");
    setGolsA("");
    setGolsB("");
    setPartidaId(null);
    setAutoresA([]);
    setAutoresB([]);
    setGoleiroA("");
    setGoleiroB("");
    setGolsSofridosA("");
    setGolsSofridosB("");
  }

  async function salvarPartida(evento) {
    evento.preventDefault();
    setMensagem("");

    if (!timeA || !timeB) {
      setMensagem("Selecione os dois times.");
      return;
    }

    if (timeA === timeB) {
      setMensagem("Os times precisam ser diferentes.");
      return;
    }

    if (golsA === "" || golsB === "") {
      setMensagem("Informe o placar completo.");
      return;
    }

    const placarA = Number(golsA);
    const placarB = Number(golsB);

    const placarInvalido =
      !Number.isInteger(placarA) ||
      !Number.isInteger(placarB) ||
      placarA < 0 ||
      placarB < 0;

    if (placarInvalido) {
      setMensagem("Digite um placar válido.");
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase.rpc("registrar_partida", {
      p_time_a: Number(timeA),
      p_time_b: Number(timeB),
      p_gols_a: placarA,
      p_gols_b: placarB,
    });

    if (error) {
      console.error("Erro ao registrar partida:", error);
      setMensagem(`Erro ao salvar: ${error.message}`);
      setSalvando(false);
      return;
    }

    setPartidaId(data);
    setAutoresA(criarCamposDeAutores(placarA));
    setAutoresB(criarCamposDeAutores(placarB));

    setMensagem(
      "Placar salvo. Agora informe os autores dos gols e os goleiros."
    );

    setSalvando(false);
  }

  function alterarAutorTimeA(index, jogadorId) {
    setAutoresA((listaAtual) =>
      listaAtual.map((autor, posicao) =>
        posicao === index ? jogadorId : autor
      )
    );
  }

  function alterarAutorTimeB(index, jogadorId) {
    setAutoresB((listaAtual) =>
      listaAtual.map((autor, posicao) =>
        posicao === index ? jogadorId : autor
      )
    );
  }

  function agruparAutores(lista) {
    const contagem = {};

    lista.forEach((jogadorId) => {
      contagem[jogadorId] = (contagem[jogadorId] || 0) + 1;
    });

    return Object.entries(contagem).map(
      ([jogadorId, quantidade]) => ({
        jogador_id: Number(jogadorId),
        quantidade,
      })
    );
  }

  async function salvarAutoresDosGols() {
    setMensagem("");

    if (!partidaId) {
      setMensagem("Nenhuma partida foi selecionada.");
      return;
    }

    const autoresIncompletos =
      autoresA.some((autor) => !autor) ||
      autoresB.some((autor) => !autor);

    if (autoresIncompletos) {
      setMensagem("Selecione o autor de todos os gols marcados.");
      return;
    }

    if (!goleiroA || !goleiroB) {
      setMensagem("Selecione os dois goleiros que jogaram.");
      return;
    }

    if (goleiroA === goleiroB) {
      setMensagem("Selecione goleiros diferentes para cada equipe.");
      return;
    }

    if (!golsSofridosA || !golsSofridosB) {
      setMensagem(
        "Informe se os gols sofridos contam para o ranking dos goleiros."
      );
      return;
    }

    const sofridosA =
      golsSofridosA === "sim" ? Number(golsB) : 0;

    const sofridosB =
      golsSofridosB === "sim" ? Number(golsA) : 0;

    setSalvando(true);

    const golsRegistrados = [
      ...agruparAutores(autoresA),
      ...agruparAutores(autoresB),
    ];

    if (golsRegistrados.length > 0) {
      const { error: erroGols } = await supabase.rpc(
        "registrar_gols_da_partida",
        {
          p_partida_id: Number(partidaId),
          p_gols: golsRegistrados,
        }
      );

      if (erroGols) {
        console.error("Erro ao registrar autores:", erroGols);
        setMensagem(
          `Erro ao salvar os autores: ${erroGols.message}`
        );
        setSalvando(false);
        return;
      }
    }

    const { error: erroGoleiros } = await supabase.rpc(
      "registrar_goleiros_da_partida",
      {
        p_partida_id: Number(partidaId),
        p_goleiro_a: Number(goleiroA),
        p_goleiro_b: Number(goleiroB),
        p_gols_sofridos_a: sofridosA,
        p_gols_sofridos_b: sofridosB,
      }
    );

    if (erroGoleiros) {
      console.error("Erro ao registrar goleiros:", erroGoleiros);
      setMensagem(
        `Erro ao salvar os goleiros: ${erroGoleiros.message}`
      );
      setSalvando(false);
      return;
    }

    limparFormulario();
    setMensagem(
      "Partida registrada com sucesso. As tabelas foram atualizadas."
    );
    setSalvando(false);
  }

  return (
    <main className="page">
      <section className="page-header">
        <span className="panel-label">RESULTADOS</span>
        <h2>Registrar partida</h2>
        <p>
          Salve o placar, defina os eventos do jogo e atualize o
          campeonato.
        </p>
      </section>

      {mensagem && (
        <div
          style={{
            padding: "12px",
            background: "#2a2a32",
            borderLeft: "4px solid #4f46e5",
            color: "#ffffff",
            borderRadius: "4px",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          {mensagem}
        </div>
      )}

      <section className="matches-page">
        <article className="match-card">
          {!partidaId ? (
            <form onSubmit={salvarPartida}>
              <div className="match-card-content">
                <div className="match-club">
                  {equipeA?.escudo && (
                    <img
                      src={equipeA.escudo}
                      alt={`Escudo do ${equipeA.nome}`}
                    />
                  )}

                  <select
                    value={timeA}
                    onChange={(evento) =>
                      setTimeA(evento.target.value)
                    }
                    disabled={salvando}
                  >
                    <option value="">Time A</option>

                    {times.map((time) => (
                      <option
                        key={time.id}
                        value={time.id}
                        disabled={String(time.id) === timeB}
                      >
                        {time.nome}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={golsA}
                    onChange={(evento) =>
                      setGolsA(evento.target.value)
                    }
                    placeholder="0"
                    disabled={salvando}
                    style={{
                      width: "80px",
                      textAlign: "center",
                    }}
                  />
                </div>

                <div className="match-center">
                  <strong>X</strong>
                  <span>placar final</span>
                </div>

                <div className="match-club">
                  {equipeB?.escudo && (
                    <img
                      src={equipeB.escudo}
                      alt={`Escudo do ${equipeB.nome}`}
                    />
                  )}

                  <select
                    value={timeB}
                    onChange={(evento) =>
                      setTimeB(evento.target.value)
                    }
                    disabled={salvando}
                  >
                    <option value="">Time B</option>

                    {times.map((time) => (
                      <option
                        key={time.id}
                        value={time.id}
                        disabled={String(time.id) === timeA}
                      >
                        {time.nome}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={golsB}
                    onChange={(evento) =>
                      setGolsB(evento.target.value)
                    }
                    placeholder="0"
                    disabled={salvando}
                    style={{
                      width: "80px",
                      textAlign: "center",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  marginTop: "24px",
                }}
              >
                <button
                  type="submit"
                  className="link-button"
                  disabled={salvando}
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar placar"}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div
                className="page-header"
                style={{ marginTop: "10px" }}
              >
                <span className="panel-label">
                  EVENTOS DA PARTIDA
                </span>

                <h3>
                  {equipeA?.nome} {golsA} x {golsB}{" "}
                  {equipeB?.nome}
                </h3>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "24px",
                  marginTop: "24px",
                }}
              >
                <div className="match-club">
                  {equipeA?.escudo && (
                    <img
                      src={equipeA.escudo}
                      alt={`Escudo do ${equipeA.nome}`}
                    />
                  )}

                  <h3>{equipeA?.nome}</h3>

                  {autoresA.length === 0 ? (
                    <p>Nenhum gol marcado.</p>
                  ) : (
                    autoresA.map((autor, index) => (
                      <select
                        key={`autor-a-${index}`}
                        value={autor}
                        onChange={(evento) =>
                          alterarAutorTimeA(
                            index,
                            evento.target.value
                          )
                        }
                        disabled={salvando}
                      >
                        <option value="">
                          Autor do gol {index + 1}
                        </option>

                        {jogadoresTimeA.map((jogador) => (
                          <option
                            key={jogador.id}
                            value={jogador.id}
                          >
                            {jogador.nome}
                          </option>
                        ))}
                      </select>
                    ))
                  )}
                </div>

                <div className="match-club">
                  {equipeB?.escudo && (
                    <img
                      src={equipeB.escudo}
                      alt={`Escudo do ${equipeB.nome}`}
                    />
                  )}

                  <h3>{equipeB?.nome}</h3>

                  {autoresB.length === 0 ? (
                    <p>Nenhum gol marcado.</p>
                  ) : (
                    autoresB.map((autor, index) => (
                      <select
                        key={`autor-b-${index}`}
                        value={autor}
                        onChange={(evento) =>
                          alterarAutorTimeB(
                            index,
                            evento.target.value
                          )
                        }
                        disabled={salvando}
                      >
                        <option value="">
                          Autor do gol {index + 1}
                        </option>

                        {jogadoresTimeB.map((jogador) => (
                          <option
                            key={jogador.id}
                            value={jogador.id}
                          >
                            {jogador.nome}
                          </option>
                        ))}
                      </select>
                    ))
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "24px",
                  marginTop: "30px",
                }}
              >
                <div className="match-club">
                  <h3>Goleiro do {equipeA?.nome}</h3>

                  <select
                    value={goleiroA}
                    onChange={(evento) =>
                      setGoleiroA(evento.target.value)
                    }
                    disabled={salvando}
                  >
                    <option value="">Selecione o goleiro</option>

                    {goleiros.map((goleiro) => (
                      <option
                        key={goleiro.id}
                        value={goleiro.id}
                        disabled={
                          String(goleiro.id) === goleiroB
                        }
                      >
                        {goleiro.nome}
                      </option>
                    ))}
                  </select>

                  <select
                    value={golsSofridosA}
                    onChange={(evento) =>
                      setGolsSofridosA(evento.target.value)
                    }
                    disabled={salvando}
                  >
                    <option value="">
                      Contar gols sofridos?
                    </option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>

                <div className="match-club">
                  <h3>Goleiro do {equipeB?.nome}</h3>

                  <select
                    value={goleiroB}
                    onChange={(evento) =>
                      setGoleiroB(evento.target.value)
                    }
                    disabled={salvando}
                  >
                    <option value="">Selecione o goleiro</option>

                    {goleiros.map((goleiro) => (
                      <option
                        key={goleiro.id}
                        value={goleiro.id}
                        disabled={
                          String(goleiro.id) === goleiroA
                        }
                      >
                        {goleiro.nome}
                      </option>
                    ))}
                  </select>

                  <select
                    value={golsSofridosB}
                    onChange={(evento) =>
                      setGolsSofridosB(evento.target.value)
                    }
                    disabled={salvando}
                  >
                    <option value="">
                      Contar gols sofridos?
                    </option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginTop: "30px",
                }}
              >
                <button
                  type="button"
                  className="link-button"
                  onClick={salvarAutoresDosGols}
                  disabled={salvando}
                >
                  {salvando
                    ? "Encerrando..."
                    : "Encerrar partida"}
                </button>

                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    limparFormulario();
                    setMensagem(
                      "Registro cancelado. O placar já salvo no banco não foi apagado."
                    );
                  }}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default Partidas;