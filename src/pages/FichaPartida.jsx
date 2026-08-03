import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { supabase } from "../supabaseClient";
import { escudoTime } from "../escudos";

function DropdownGoleiro({
  goleiros,
  value,
  onChange,
  idBloqueado,
  disabled,
  placeholder = "Selecione o goleiro",
}) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);

  const goleiroSelecionado = goleiros.find(
    (goleiro) => String(goleiro.id) === String(value)
  );

  useEffect(() => {
    function fecharAoClicarFora(evento) {
      if (
        containerRef.current &&
        !containerRef.current.contains(evento.target)
      ) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("touchstart", fecharAoClicarFora);

    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("touchstart", fecharAoClicarFora);
    };
  }, []);

  function nomeTimeDoGoleiro(goleiro) {
    return goleiro?.times?.nome || "Time não informado";
  }

  function selecionarGoleiro(goleiroId) {
    if (disabled) return;
    onChange(String(goleiroId));
    setAberto(false);
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        zIndex: aberto ? 100000 : 1,
        isolation: aberto ? "isolate" : "auto",
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setAberto((estadoAtual) => !estadoAtual);
          }
        }}
        style={{
          width: "100%",
          minHeight: "58px",
          display: "grid",
          gridTemplateColumns: "42px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: "10px",
          padding: "9px 12px",
          border: aberto
            ? "1px solid #3b82f6"
            : "1px solid #475569",
          borderRadius: "10px",
          background: disabled ? "#202936" : "#111827",
          color: "#ffffff",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.65 : 1,
        }}
      >
        {goleiroSelecionado ? (
          <>
            <img
              src={escudoTime(
                nomeTimeDoGoleiro(goleiroSelecionado)
              )}
              alt={nomeTimeDoGoleiro(goleiroSelecionado)}
              style={{
                width: "34px",
                height: "34px",
                objectFit: "contain",
              }}
            />

            <span
              style={{
                minWidth: 0,
                display: "grid",
                gap: "2px",
              }}
            >
              <strong
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {goleiroSelecionado.nome}
              </strong>

              <small style={{ color: "#94a3b8" }}>
                {nomeTimeDoGoleiro(goleiroSelecionado)}
              </small>
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              style={{
                width: "34px",
                height: "34px",
                display: "grid",
                placeItems: "center",
                borderRadius: "8px",
                background: "#1f2937",
                fontSize: "20px",
              }}
            >
              🧤
            </span>

            <span style={{ color: "#cbd5e1" }}>
              {placeholder}
            </span>
          </>
        )}

        <span
          aria-hidden="true"
          style={{
            color: "#94a3b8",
            transform: aberto
              ? "rotate(180deg)"
              : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>
      </button>

      {aberto && !disabled && (
        <div
          style={{
            position: "absolute",
            zIndex: 100001,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: "280px",
            overflowY: "auto",
            padding: "6px",
            border: "1px solid #475569",
            borderRadius: "12px",
            background: "#111827",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
          }}
        >
          {goleiros.map((goleiro) => {
            const bloqueado =
              String(goleiro.id) === String(idBloqueado);

            const selecionado =
              String(goleiro.id) === String(value);

            const nomeTime = nomeTimeDoGoleiro(goleiro);

            return (
              <button
                key={goleiro.id}
                type="button"
                disabled={bloqueado}
                onClick={() =>
                  selecionarGoleiro(goleiro.id)
                }
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "40px minmax(0, 1fr)",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px",
                  borderRadius: "9px",
                  background: selecionado
                    ? "#1d4ed8"
                    : "transparent",
                  color: "#ffffff",
                  textAlign: "left",
                  cursor: bloqueado
                    ? "not-allowed"
                    : "pointer",
                  opacity: bloqueado ? 0.42 : 1,
                }}
              >
                <img
                  src={escudoTime(nomeTime)}
                  alt={nomeTime}
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "contain",
                  }}
                />

                <span
                  style={{
                    minWidth: 0,
                    display: "grid",
                    gap: "2px",
                  }}
                >
                  <strong
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {goleiro.nome}
                  </strong>

                  <small
                    style={{
                      color: selecionado
                        ? "#dbeafe"
                        : "#94a3b8",
                    }}
                  >
                    {nomeTime}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FichaPartida() {
  const location = useLocation();
  const navigate = useNavigate();

  const jogo = location.state?.jogo;

  const [golsCasa, setGolsCasa] = useState("");
  const [golsFora, setGolsFora] = useState("");

  const [timeCasaId, setTimeCasaId] = useState(null);
  const [timeForaId, setTimeForaId] = useState(null);

  const [jogadoresCasa, setJogadoresCasa] = useState([]);
  const [jogadoresFora, setJogadoresFora] = useState([]);
  const [todosJogadores, setTodosJogadores] = useState([]);

  const [autoresCasa, setAutoresCasa] = useState([]);
  const [autoresFora, setAutoresFora] = useState([]);

  const [goleiroCasa, setGoleiroCasa] = useState("");
  const [goleiroFora, setGoleiroFora] = useState("");

  const [contarGolsCasa, setContarGolsCasa] =
    useState(true);

  const [contarGolsFora, setContarGolsFora] =
    useState(true);

  const [salvando, setSalvando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const bloqueioEnvioRef = useRef(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] =
    useState("erro");

  useEffect(() => {
    async function carregarDados() {
      if (!jogo) return;

      setMensagem("");

      const [resultadoTimes, resultadoJogadores] =
        await Promise.all([
          supabase
            .from("times")
            .select("id,nome")
            .order("nome", { ascending: true }),

          supabase
            .from("jogadores")
            .select("id,nome,time_id,goleiro,times(nome)")
            .eq("ativo", true)
            .order("nome", { ascending: true }),
        ]);

      if (resultadoTimes.error) {
        console.error(
          "Erro ao carregar times:",
          resultadoTimes.error
        );

        setTipoMensagem("erro");
        setMensagem(
          "Não foi possível carregar os times."
        );
        return;
      }

      if (resultadoJogadores.error) {
        console.error(
          "Erro ao carregar jogadores:",
          resultadoJogadores.error
        );

        setTipoMensagem("erro");
        setMensagem(
          "Não foi possível carregar os jogadores."
        );
        return;
      }

      const times = resultadoTimes.data || [];
      const jogadores = resultadoJogadores.data || [];

      const timeCasa = times.find(
        (time) => time.nome === jogo.casa
      );

      const timeFora = times.find(
        (time) => time.nome === jogo.fora
      );

      if (!timeCasa || !timeFora) {
        setTipoMensagem("erro");
        setMensagem(
          "Um dos times da partida não foi encontrado no banco."
        );
        return;
      }

      setTimeCasaId(timeCasa.id);
      setTimeForaId(timeFora.id);

      setTodosJogadores(jogadores);

      setJogadoresCasa(
  jogadores.filter(
    (jogador) =>
      jogador.time_id === timeCasa.id
  )
);

setJogadoresFora(
  jogadores.filter(
    (jogador) =>
      jogador.time_id === timeFora.id
  )
);
    }

    carregarDados();
  }, [jogo]);

  const goleiros = useMemo(() => {
    const jogadoresMarcadosComoGoleiro =
      todosJogadores.filter(
        (jogador) => jogador.goleiro === true
      );

    /*
      Caso nenhum jogador esteja marcado como goleiro
      no Supabase, mostramos todos para não bloquear
      o registro da partida.
    */
    if (jogadoresMarcadosComoGoleiro.length === 0) {
      return todosJogadores;
    }

    return jogadoresMarcadosComoGoleiro;
  }, [todosJogadores]);

  useEffect(() => {
    /*
      Durante a troca de um placar, o campo pode ficar
      vazio por um instante. Nesse momento não apagamos
      os autores já escolhidos.
    */
    if (golsCasa === "") return;

    const quantidadeGols = Number(golsCasa);

    setAutoresCasa((autoresAtuais) =>
      Array.from(
        { length: quantidadeGols },
        (_, indice) =>
          autoresAtuais[indice] || {
            jogadorId: "",
            contaArtilharia: true,
          }
      )
    );
  }, [golsCasa]);

  useEffect(() => {
    /*
      Durante a troca de um placar, o campo pode ficar
      vazio por um instante. Nesse momento não apagamos
      os autores já escolhidos.
    */
    if (golsFora === "") return;

    const quantidadeGols = Number(golsFora);

    setAutoresFora((autoresAtuais) =>
      Array.from(
        { length: quantidadeGols },
        (_, indice) =>
          autoresAtuais[indice] || {
            jogadorId: "",
            contaArtilharia: true,
          }
      )
    );
  }, [golsFora]);

  function alterarAutorCasa(indice, campo, valor) {
    setAutoresCasa((autoresAtuais) =>
      autoresAtuais.map((autor, posicao) => {
        if (posicao !== indice) return autor;

        if (campo === "jogadorId") {
          if (valor === "gol-contra") {
            return {
              ...autor,
              jogadorId: "gol-contra",
              contaArtilharia: false,
            };
          }

          return {
            ...autor,
            jogadorId: valor,
            contaArtilharia: true,
          };
        }

        return {
          ...autor,
          [campo]: valor,
        };
      })
    );
  }

  function alterarAutorFora(indice, campo, valor) {
    setAutoresFora((autoresAtuais) =>
      autoresAtuais.map((autor, posicao) => {
        if (posicao !== indice) return autor;

        if (campo === "jogadorId") {
          if (valor === "gol-contra") {
            return {
              ...autor,
              jogadorId: "gol-contra",
              contaArtilharia: false,
            };
          }

          return {
            ...autor,
            jogadorId: valor,
            contaArtilharia: true,
          };
        }

        return {
          ...autor,
          [campo]: valor,
        };
      })
    );
  }

  function agruparAutores(lista) {
    const contagem = {};

    lista.forEach((autor) => {
      /*
        Um gol desmarcado continua fazendo parte
        do placar, mas não entra na artilharia.
      */
      if (
        !autor.jogadorId ||
        autor.jogadorId === "gol-contra" ||
        autor.contaArtilharia !== true
      ) {
        return;
      }

      const jogadorId = autor.jogadorId;

      contagem[jogadorId] =
        (contagem[jogadorId] || 0) + 1;
    });

    return Object.entries(contagem).map(
      ([jogadorId, quantidade]) => ({
        jogador_id: Number(jogadorId),
        quantidade,
      })
    );
  }

  function validarPartida() {
    if (!timeCasaId || !timeForaId) {
      return "Os times da partida ainda não foram carregados.";
    }

    const placarCasa = Number(golsCasa || 0);
    const placarFora = Number(golsFora || 0);

    if (
      !Number.isInteger(placarCasa) ||
      !Number.isInteger(placarFora) ||
      placarCasa < 0 ||
      placarFora < 0
    ) {
      return "Digite um placar válido.";
    }

    const autoresIncompletos =
      autoresCasa.some((autor) => !autor.jogadorId) ||
      autoresFora.some((autor) => !autor.jogadorId);

    if (autoresIncompletos) {
      return "Selecione o jogador de todos os gols.";
    }

    if (!goleiroCasa || !goleiroFora) {
      return "Selecione os dois goleiros.";
    }

    if (goleiroCasa === goleiroFora) {
      return "Os dois times não podem usar o mesmo goleiro.";
    }

    return "";
  }

  async function finalizarPartida() {
    if (
      bloqueioEnvioRef.current ||
      salvando ||
      finalizado
    ) {
      return;
    }

    setMensagem("");

    const erroValidacao = validarPartida();

    if (erroValidacao) {
      setTipoMensagem("erro");
      setMensagem(erroValidacao);
      return;
    }

    const confirmar = window.confirm(
      `Confirmar o resultado?\n\n${jogo.casa} ${golsCasa} x ${golsFora} ${jogo.fora}`
    );

    if (!confirmar) return;

    bloqueioEnvioRef.current = true;
    setSalvando(true);

    let concluidoComSucesso = false;

    try {
      const {
        data: partidaId,
        error: erroPartida,
      } = await supabase.rpc("registrar_partida", {
        p_time_a: Number(timeCasaId),
        p_time_b: Number(timeForaId),
        p_gols_a: Number(golsCasa),
        p_gols_b: Number(golsFora),
      });

      if (erroPartida) {
        throw new Error(
          `Erro ao registrar a partida: ${erroPartida.message}`
        );
      }

      if (!partidaId) {
        throw new Error(
          "O Supabase não retornou o código da partida."
        );
      }

      const golsRegistrados = [
        ...agruparAutores(autoresCasa),
        ...agruparAutores(autoresFora),
      ];

      /*
        A função é chamada mesmo quando todos os gols forem
        "gol contra" ou estiverem fora da artilharia.
        Nesse caso, enviamos um array vazio. A função do Supabase
        aceita que a soma dos gols atribuídos seja menor que o placar.
      */
      const { error: erroGols } =
        await supabase.rpc(
          "registrar_gols_da_partida",
          {
            p_partida_id: Number(partidaId),
            p_gols: golsRegistrados,
          }
        );

      if (erroGols) {
        throw new Error(
          `O placar foi salvo, mas houve erro nos autores dos gols: ${erroGols.message}`
        );
      }

      const golsSofridosGoleiroCasa =
        contarGolsCasa ? Number(golsFora) : 0;

      const golsSofridosGoleiroFora =
        contarGolsFora ? Number(golsCasa) : 0;

      const { error: erroGoleiros } =
        await supabase.rpc(
          "registrar_goleiros_da_partida",
          {
            p_partida_id: Number(partidaId),
            p_goleiro_a: Number(goleiroCasa),
            p_goleiro_b: Number(goleiroFora),
            p_gols_sofridos_a:
              golsSofridosGoleiroCasa,
            p_gols_sofridos_b:
              golsSofridosGoleiroFora,
          }
        );

      if (erroGoleiros) {
        throw new Error(
          `A partida e os gols foram salvos, mas houve erro nos goleiros: ${erroGoleiros.message}`
        );
      }

      const { error: erroCalendario } =
        await supabase
          .from("jogos_campeonato")
          .update({
            status: "encerrado",
            gols_a: Number(golsCasa),
            gols_b: Number(golsFora),
            partida_id: Number(partidaId),
          })
          .eq(
            "id",
            Number(
              jogo.jogoCampeonatoId ?? jogo.id
            )
          );

      if (erroCalendario) {
        throw new Error(
          `A partida foi registrada, porém o calendário não foi atualizado: ${erroCalendario.message}`
        );
      }

      concluidoComSucesso = true;
      setFinalizado(true);
      setTipoMensagem("sucesso");
      setMensagem(
        "✅ Partida finalizada! Aguarde o retorno para a tela de jogos."
      );

      setTimeout(() => {
        navigate("/jogos", {
          replace: true,
          state: {
            mensagem:
              "Partida registrada com sucesso.",
          },
        });
      }, 1200);
    } catch (erro) {
      console.error(
        "Erro ao finalizar a partida:",
        erro
      );

      setTipoMensagem("erro");
      setMensagem(
        erro.message ||
          "Não foi possível finalizar a partida."
      );
    } finally {
      if (!concluidoComSucesso) {
        bloqueioEnvioRef.current = false;
        setSalvando(false);
      }
    }
  }
  if (!jogo) {
    return (
      <main className="page">
        <section className="panel">
          <h2>Nenhuma partida selecionada.</h2>

          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/jogos")}
          >
            Voltar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page ficha-partida-page">
      <style>{`
        .ficha-partida-page {
          padding-top: 8px !important;
        }

        .ficha-partida-page .ficha-titulo {
          margin: 0 0 14px;
          color: #38bdf8;
          font-size: 0.82rem;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .ficha-partida-page .placar-card {
          padding: 12px;
          margin-bottom: 12px;
        }

        .ficha-partida-page .placar-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            54px
            minmax(0, 1fr);
          align-items: center;
          gap: 8px;
        }

        .ficha-partida-page .time-placar {
          min-width: 0;
          display: grid;
          justify-items: center;
          gap: 6px;
          text-align: center;
        }

        .ficha-partida-page .time-placar img {
          width: 50px;
          height: 50px;
          object-fit: contain;
        }

        .ficha-partida-page .time-placar strong {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.98rem;
        }

        .ficha-partida-page .time-placar input {
          width: 58px;
          height: 48px;
          padding: 0;
          border-radius: 8px;
          font-size: 1.6rem;
          text-align: center;
        }

        .ficha-partida-page .placar-x {
          margin: 0;
          font-size: 1.55rem;
          text-align: center;
        }

        .ficha-partida-page .duas-colunas {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          align-items: start;
        }

        .ficha-partida-page .ficha-card {
          min-width: 0;
          padding: 12px;
          overflow: visible;
        }

        .ficha-partida-page .ficha-card h3 {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 10px;
          font-size: 0.96rem;
        }

        .ficha-partida-page .ficha-card h3 img {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }

        .ficha-partida-page .goleiros-grid {
          position: relative;
          z-index: 40;
          margin-bottom: 10px;
        }

        .ficha-partida-page .gols-grid {
          position: relative;
          z-index: 10;
        }

        .ficha-partida-page .gol-item {
          padding: 9px 0 10px;
          border-bottom: 1px solid #2b364b;
        }

        .ficha-partida-page .gol-item:last-child {
          border-bottom: 0;
        }

        .ficha-partida-page .gol-item h4 {
          margin: 0 0 7px;
          color: #ffffff;
          font-size: 0.84rem;
        }

        .ficha-partida-page .gol-item label {
          display: block;
          margin-bottom: 5px;
          font-size: 0.75rem;
        }

        .ficha-partida-page .gol-item select {
          width: 100%;
          min-height: 38px;
          font-size: 0.78rem;
        }

        .ficha-partida-page .check-label {
          display: flex !important;
          align-items: flex-start;
          gap: 5px;
          margin-top: 8px !important;
          margin-bottom: 0 !important;
          color: #cbd5e1;
          font-size: 0.7rem !important;
          line-height: 1.25;
        }

        .ficha-partida-page .sem-gol {
          margin: 0;
          color: #94a3b8;
          font-size: 0.8rem;
        }

        .ficha-partida-page .finalizar-area {
          margin-top: 14px;
          margin-bottom: 48px;
          text-align: center;
        }

        .ficha-partida-page .finalizar-area button {
          min-width: 220px;
          padding: 12px 22px;
          font-size: 0.95rem;
        }

        @media (max-width: 390px) {
          .ficha-partida-page .placar-card {
            padding: 10px 8px;
          }

          .ficha-partida-page .time-placar img {
            width: 44px;
            height: 44px;
          }

          .ficha-partida-page .time-placar strong {
            font-size: 0.92rem;
          }

          .ficha-partida-page .time-placar input {
            width: 52px;
            height: 46px;
            font-size: 1.45rem;
          }

          .ficha-partida-page .placar-grid {
            grid-template-columns:
              minmax(0, 1fr)
              38px
              minmax(0, 1fr);
            gap: 4px;
          }

          .ficha-partida-page .duas-colunas {
            gap: 7px;
          }

          .ficha-partida-page .ficha-card {
            padding: 9px;
          }

          .ficha-partida-page .ficha-card h3 {
            font-size: 0.82rem;
          }

          .ficha-partida-page .ficha-card h3 img {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>

      <h1 className="ficha-titulo">
        FICHA DA PARTIDA
      </h1>

      {mensagem && (
        <div
          style={{
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "8px",
            textAlign: "center",
            color: "#ffffff",
            background:
              tipoMensagem === "sucesso"
                ? "#153b2a"
                : "#3b1c24",
            borderLeft:
              tipoMensagem === "sucesso"
                ? "4px solid #22c55e"
                : "4px solid #ef4444",
            fontSize: "0.86rem",
          }}
        >
          {mensagem}
        </div>
      )}

      <section className="panel placar-card">
        <div className="placar-grid">
          <div className="time-placar">
            <img
              src={escudoTime(jogo.casa)}
              alt={`Escudo do ${jogo.casa}`}
            />

            <strong title={jogo.casa}>
              {jogo.casa}
            </strong>

            <input
              type="number"
              min="0"
              step="1"
              value={golsCasa}
              placeholder="0"
              inputMode="numeric"
              aria-label={`Gols do ${jogo.casa}`}
              disabled={salvando || finalizado}
              onFocus={(evento) => evento.target.select()}
              onChange={(evento) => {
                const texto = evento.target.value;

                if (texto === "") {
                  setGolsCasa("");
                  return;
                }

                if (!/^\d+$/.test(texto)) return;

                setGolsCasa(String(Number(texto)));
              }}
            />
          </div>

          <h2 className="placar-x">X</h2>

          <div className="time-placar">
            <img
              src={escudoTime(jogo.fora)}
              alt={`Escudo do ${jogo.fora}`}
            />

            <strong title={jogo.fora}>
              {jogo.fora}
            </strong>

            <input
              type="number"
              min="0"
              step="1"
              value={golsFora}
              placeholder="0"
              inputMode="numeric"
              aria-label={`Gols do ${jogo.fora}`}
              disabled={salvando || finalizado}
              onFocus={(evento) => evento.target.select()}
              onChange={(evento) => {
                const texto = evento.target.value;

                if (texto === "") {
                  setGolsFora("");
                  return;
                }

                if (!/^\d+$/.test(texto)) return;

                setGolsFora(String(Number(texto)));
              }}
            />
          </div>
        </div>
      </section>

      <section className="duas-colunas goleiros-grid">
        <div className="panel ficha-card">
          <h3>
            <img
              src={escudoTime(jogo.casa)}
              alt={jogo.casa}
            />
            Goleiro {jogo.casa}
          </h3>

          <DropdownGoleiro
            goleiros={goleiros}
            value={goleiroCasa}
            onChange={setGoleiroCasa}
            idBloqueado={goleiroFora}
            disabled={salvando || finalizado}
            placeholder="Selecionar"
          />

          <label className="check-label">
            <input
              type="checkbox"
              checked={contarGolsCasa}
              disabled={salvando || finalizado}
              onChange={(evento) =>
                setContarGolsCasa(evento.target.checked)
              }
            />
            Contar gols sofridos
          </label>
        </div>

        <div className="panel ficha-card">
          <h3>
            <img
              src={escudoTime(jogo.fora)}
              alt={jogo.fora}
            />
            Goleiro {jogo.fora}
          </h3>

          <DropdownGoleiro
            goleiros={goleiros}
            value={goleiroFora}
            onChange={setGoleiroFora}
            idBloqueado={goleiroCasa}
            disabled={salvando || finalizado}
            placeholder="Selecionar"
          />

          <label className="check-label">
            <input
              type="checkbox"
              checked={contarGolsFora}
              disabled={salvando || finalizado}
              onChange={(evento) =>
                setContarGolsFora(evento.target.checked)
              }
            />
            Contar gols sofridos
          </label>
        </div>
      </section>

      <section className="duas-colunas gols-grid">
        <div className="panel ficha-card">
          <h3>
            <img
              src={escudoTime(jogo.casa)}
              alt={jogo.casa}
            />
            Gols {jogo.casa}
          </h3>

          {Number(golsCasa || 0) === 0 && (
            <p className="sem-gol">
              Nenhum gol marcado.
            </p>
          )}

          {autoresCasa.map((autor, indice) => (
            <div
              key={`casa-${indice}`}
              className="gol-item"
            >
              <h4>⚽ {indice + 1}º Gol</h4>

              <label>Jogador</label>

              <select
                value={autor.jogadorId}
                disabled={salvando || finalizado}
                onChange={(evento) =>
                  alterarAutorCasa(
                    indice,
                    "jogadorId",
                    evento.target.value
                  )
                }
              >
                <option value="">
                  Selecionar
                </option>

                <option value="gol-contra">
                  Gol contra
                </option>

                {jogadoresCasa.map((jogador) => (
                  <option
                    key={jogador.id}
                    value={jogador.id}
                  >
                    {jogador.nome}
                  </option>
                ))}
              </select>

              <label className="check-label">
                <input
                  type="checkbox"
                  checked={autor.contaArtilharia}
                  disabled={
                    salvando ||
                    finalizado ||
                    autor.jogadorId === "gol-contra"
                  }
                  onChange={(evento) =>
                    alterarAutorCasa(
                      indice,
                      "contaArtilharia",
                      evento.target.checked
                    )
                  }
                />

                {autor.jogadorId === "gol-contra"
                  ? "Gol contra"
                  : "Conta para artilharia"}
              </label>
            </div>
          ))}
        </div>

        <div className="panel ficha-card">
          <h3>
            <img
              src={escudoTime(jogo.fora)}
              alt={jogo.fora}
            />
            Gols {jogo.fora}
          </h3>

          {Number(golsFora || 0) === 0 && (
            <p className="sem-gol">
              Nenhum gol marcado.
            </p>
          )}

          {autoresFora.map((autor, indice) => (
            <div
              key={`fora-${indice}`}
              className="gol-item"
            >
              <h4>⚽ {indice + 1}º Gol</h4>

              <label>Jogador</label>

              <select
                value={autor.jogadorId}
                disabled={salvando || finalizado}
                onChange={(evento) =>
                  alterarAutorFora(
                    indice,
                    "jogadorId",
                    evento.target.value
                  )
                }
              >
                <option value="">
                  Selecionar
                </option>

                <option value="gol-contra">
                  Gol contra
                </option>

                {jogadoresFora.map((jogador) => (
                  <option
                    key={jogador.id}
                    value={jogador.id}
                  >
                    {jogador.nome}
                  </option>
                ))}
              </select>

              <label className="check-label">
                <input
                  type="checkbox"
                  checked={autor.contaArtilharia}
                  disabled={
                    salvando ||
                    finalizado ||
                    autor.jogadorId === "gol-contra"
                  }
                  onChange={(evento) =>
                    alterarAutorFora(
                      indice,
                      "contaArtilharia",
                      evento.target.checked
                    )
                  }
                />

                {autor.jogadorId === "gol-contra"
                  ? "Gol contra"
                  : "Conta para artilharia"}
              </label>
            </div>
          ))}
        </div>
      </section>

      <div className="finalizar-area">
        <button
          type="button"
          className="link-button"
          onClick={finalizarPartida}
          disabled={salvando || finalizado}
          style={{
            cursor:
              salvando || finalizado
                ? "not-allowed"
                : "pointer",
            opacity:
              salvando || finalizado ? 0.65 : 1,
            background: finalizado
              ? "#166534"
              : undefined,
          }}
        >
          {finalizado
            ? "✅ PARTIDA FINALIZADA"
            : salvando
            ? "⏳ SALVANDO..."
            : "✅ FINALIZAR PARTIDA"}
        </button>
      </div>
    </main>
  );
}

export default FichaPartida;