import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Tabela from "../components/Tabela";

const CHAVE_ANO = "ferino_ano_ativo";
const CHAVE_MES = "ferino_mes_ativo";

const MESES = [
  { id: 1, nome: "Janeiro" },
  { id: 2, nome: "Fevereiro" },
  { id: 3, nome: "Março" },
  { id: 4, nome: "Abril" },
  { id: 5, nome: "Maio" },
  { id: 6, nome: "Junho" },
  { id: 7, nome: "Julho" },
  { id: 8, nome: "Agosto" },
  { id: 9, nome: "Setembro" },
  { id: 10, nome: "Outubro" },
  { id: 11, nome: "Novembro" },
  { id: 12, nome: "Dezembro" },
];

function Classificacao() {
  const [dadosClassificacao, setDadosClassificacao] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [tipoCampeonato, setTipoCampeonato] = useState("mes");

  const [anoSelecionado, setAnoSelecionado] = useState(() =>
    Number(localStorage.getItem(CHAVE_ANO) || 2026)
  );

  const [mesSelecionado, setMesSelecionado] = useState(() =>
    Number(localStorage.getItem(CHAVE_MES) || 8)
  );

  function ordenarClassificacao(lista) {
    return [...(lista || [])].sort((a, b) => {
      const pontosA = Number(a.pontos ?? 0);
      const pontosB = Number(b.pontos ?? 0);

      if (pontosB !== pontosA) return pontosB - pontosA;

      const vitoriasA = Number(a.vitorias ?? a.vit ?? 0);
      const vitoriasB = Number(b.vitorias ?? b.vit ?? 0);

      if (vitoriasB !== vitoriasA) return vitoriasB - vitoriasA;

      const saldoA = Number(a.saldo ?? a.saldo_gols ?? 0);
      const saldoB = Number(b.saldo ?? b.saldo_gols ?? 0);

      if (saldoB !== saldoA) return saldoB - saldoA;

      const golsA = Number(a.gols_pro ?? a.gols_marcados ?? 0);
      const golsB = Number(b.gols_pro ?? b.gols_marcados ?? 0);

      if (golsB !== golsA) return golsB - golsA;

      return String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      );
    });
  }

  function jogoEstaEncerrado(jogo) {
    const status = String(jogo.status || "").toLowerCase();

    return (
      status === "encerrado" ||
      status === "encerrada" ||
      status === "finalizado" ||
      status === "finalizada" ||
      jogo.partida_id !== null
    );
  }

  function calcularClassificacaoMensal(times, jogos) {
    const mapa = new Map();

    (times || []).forEach((time) => {
      mapa.set(Number(time.id), {
        id: Number(time.id),
        nome: time.nome,
        pontos: 0,
        jogos: 0,
        partidas_jogadas: 0,
        pj: 0,
        vitorias: 0,
        vit: 0,
        empates: 0,
        e: 0,
        derrotas: 0,
        der: 0,
        gols_pro: 0,
        gols_marcados: 0,
        gm: 0,
        gols_contra: 0,
        gols_sofridos: 0,
        gc: 0,
        saldo: 0,
        saldo_gols: 0,
        sg: 0,
      });
    });

    (jogos || [])
      .filter(jogoEstaEncerrado)
      .forEach((jogo) => {
        const timeAId = Number(jogo.time_a_id);
        const timeBId = Number(jogo.time_b_id);

        const timeA = mapa.get(timeAId);
        const timeB = mapa.get(timeBId);

        if (!timeA || !timeB) return;

        const golsA = Number(jogo.gols_a ?? 0);
        const golsB = Number(jogo.gols_b ?? 0);

        timeA.jogos += 1;
        timeA.partidas_jogadas += 1;
        timeA.pj += 1;

        timeB.jogos += 1;
        timeB.partidas_jogadas += 1;
        timeB.pj += 1;

        timeA.gols_pro += golsA;
        timeA.gols_marcados += golsA;
        timeA.gm += golsA;
        timeA.gols_contra += golsB;
        timeA.gols_sofridos += golsB;
        timeA.gc += golsB;

        timeB.gols_pro += golsB;
        timeB.gols_marcados += golsB;
        timeB.gm += golsB;
        timeB.gols_contra += golsA;
        timeB.gols_sofridos += golsA;
        timeB.gc += golsA;

        if (golsA > golsB) {
          timeA.vitorias += 1;
          timeA.vit += 1;
          timeA.pontos += 3;

          timeB.derrotas += 1;
          timeB.der += 1;
        } else if (golsB > golsA) {
          timeB.vitorias += 1;
          timeB.vit += 1;
          timeB.pontos += 3;

          timeA.derrotas += 1;
          timeA.der += 1;
        } else {
          timeA.empates += 1;
          timeA.e += 1;
          timeA.pontos += 1;

          timeB.empates += 1;
          timeB.e += 1;
          timeB.pontos += 1;
        }
      });

    const lista = Array.from(mapa.values()).map((time) => {
      const saldo = Number(time.gols_pro) - Number(time.gols_contra);

      return {
        ...time,
        saldo,
        saldo_gols: saldo,
        sg: saldo,
      };
    });

    return ordenarClassificacao(lista);
  }

  useEffect(() => {
    async function buscarClassificacao() {
      setCarregando(true);
      setMensagem("");

      try {
        if (tipoCampeonato === "mes") {
          const [resultadoTimes, resultadoJogos] = await Promise.all([
            supabase
              .from("times")
              .select("id, nome")
              .order("nome", { ascending: true }),

            supabase
              .from("jogos_campeonato")
              .select(
                "id, temporada, mes, time_a_id, time_b_id, gols_a, gols_b, status, partida_id"
              )
              .eq("temporada", anoSelecionado)
              .eq("mes", mesSelecionado),
          ]);

          if (resultadoTimes.error) throw resultadoTimes.error;
          if (resultadoJogos.error) throw resultadoJogos.error;

          const jogosEncerrados = (resultadoJogos.data || []).filter(
            jogoEstaEncerrado
          );

          const classificacaoOrdenada = calcularClassificacaoMensal(
            resultadoTimes.data || [],
            jogosEncerrados
          );

          setDadosClassificacao(classificacaoOrdenada);

          if (jogosEncerrados.length === 0) {
            const nomeMes =
              MESES.find((item) => item.id === mesSelecionado)?.nome || "";

            setMensagem(
              `Nenhuma partida encerrada foi encontrada para ${nomeMes} de ${anoSelecionado}.`
            );
          }

          return;
        }

        const { data, error } = await supabase.rpc(
          "classificacao_anual",
          {
            p_ano: anoSelecionado,
          }
        );

        if (error) throw error;

        const classificacaoOrdenada = ordenarClassificacao(data || []);

        setDadosClassificacao(classificacaoOrdenada);

        if (classificacaoOrdenada.length === 0) {
          setMensagem(
            `Nenhuma partida encerrada foi encontrada em ${anoSelecionado}.`
          );
        }
      } catch (error) {
        console.error("Erro ao carregar classificação:", error);

        setDadosClassificacao([]);
        setMensagem(
          `Erro ao carregar a classificação: ${error.message}`
        );
      } finally {
        setCarregando(false);
      }
    }

    buscarClassificacao();
  }, [tipoCampeonato, anoSelecionado, mesSelecionado]);

  function alterarMes(novoMes) {
    localStorage.setItem(CHAVE_MES, String(novoMes));
    setMesSelecionado(novoMes);
  }

  function alterarAno(novoAno) {
    localStorage.setItem(CHAVE_ANO, String(novoAno));
    setAnoSelecionado(novoAno);
  }

  const nomeMesSelecionado =
    MESES.find((item) => item.id === mesSelecionado)?.nome || "";

  const tituloPeriodo =
    tipoCampeonato === "mes"
      ? `${nomeMesSelecionado} de ${anoSelecionado}`
      : `Temporada ${anoSelecionado}`;

  return (
    <main className="page classificacao-page">
      <style>{`
        .classificacao-page .classificacao-topo {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .classificacao-page .filtros-periodo {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          align-items: center;
        }

        .classificacao-page .filtros-periodo select {
          min-height: 42px;
          padding: 8px 12px;
          border: 1px solid #475569;
          border-radius: 7px;
          background: #1f2937;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
        }

        .classificacao-page .tab-buttons {
          display: flex;
          gap: 5px;
          background: #1e1e24;
          padding: 4px;
          border-radius: 6px;
        }

        .classificacao-page .tab-buttons button {
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }

        @media (max-width: 700px) {
          .classificacao-page {
            padding-top: 8px !important;
          }

          .classificacao-page .classificacao-topo {
            align-items: stretch;
            margin-bottom: 10px;
          }

          .classificacao-page .filtros-periodo {
            width: 100%;
          }

          .classificacao-page .filtros-periodo select {
            flex: 1;
            min-width: 120px;
          }

          .classificacao-page .tab-buttons {
            width: 100%;
          }

          .classificacao-page .tab-buttons button {
            flex: 1;
            padding: 7px 15px;
          }
        }
      `}</style>

      <section className="classificacao-topo">
        <div className="filtros-periodo">
          {tipoCampeonato === "mes" && (
            <select
              value={mesSelecionado}
              onChange={(evento) =>
                alterarMes(Number(evento.target.value))
              }
              aria-label="Selecionar mês da classificação"
            >
              {MESES.map((mes) => (
                <option key={mes.id} value={mes.id}>
                  {mes.nome}
                </option>
              ))}
            </select>
          )}

          <select
            value={anoSelecionado}
            onChange={(evento) =>
              alterarAno(Number(evento.target.value))
            }
            aria-label="Selecionar ano da classificação"
          >
            {Array.from(
              { length: 8 },
              (_, indice) => 2026 + indice
            ).map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>

        <div className="tab-buttons">
          <button
            type="button"
            onClick={() => setTipoCampeonato("mes")}
            style={{
              background:
                tipoCampeonato === "mes"
                  ? "#333"
                  : "transparent",
              fontWeight:
                tipoCampeonato === "mes"
                  ? "bold"
                  : "normal",
            }}
          >
            Mensal
          </button>

          <button
            type="button"
            onClick={() => setTipoCampeonato("ano")}
            style={{
              background:
                tipoCampeonato === "ano"
                  ? "#333"
                  : "transparent",
              fontWeight:
                tipoCampeonato === "ano"
                  ? "bold"
                  : "normal",
            }}
          >
            Anual
          </button>
        </div>
      </section>

      <div
        style={{
          marginBottom: "18px",
          padding: "12px 14px",
          borderRadius: "7px",
          background: "#172033",
          borderLeft: "4px solid #3b82f6",
          color: "#fff",
        }}
      >
        <strong>{tituloPeriodo}</strong>
        <span style={{ color: "#aaa" }}>
          {" "}
          ·{" "}
          {tipoCampeonato === "mes"
            ? "classificação das partidas encerradas no período"
            : "soma de todas as partidas encerradas no ano"}
        </span>
      </div>

      {mensagem && (
        <div
          style={{
            padding: "12px 14px",
            marginBottom: "18px",
            background: "#2a2a32",
            borderLeft: "4px solid #f59e0b",
            borderRadius: "6px",
            color: "#fff",
          }}
        >
          {mensagem}
        </div>
      )}

      {carregando ? (
        <p
          style={{
            color: "#fff",
            textAlign: "center",
          }}
        >
          Carregando classificação...
        </p>
      ) : (
        <Tabela classificacao={dadosClassificacao} />
      )}
    </main>
  );
}

export default Classificacao;