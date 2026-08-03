import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Tabela from "../components/Tabela";

const CHAVE_ANO = "ferino_ano_ativo";
const CHAVE_MES = "ferino_mes_ativo";

function Classificacao() {
  const [dadosClassificacao, setDadosClassificacao] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [tipoCampeonato, setTipoCampeonato] = useState("mes");

  const [anoAtivo] = useState(() =>
    Number(localStorage.getItem(CHAVE_ANO) || 2026)
  );

  const [mesAtivo] = useState(() =>
    Number(localStorage.getItem(CHAVE_MES) || 8)
  );

  function ordenarClassificacao(lista) {
    return [...(lista || [])].sort((a, b) => {
      const pontosA = Number(a.pontos ?? 0);
      const pontosB = Number(b.pontos ?? 0);

      if (pontosB !== pontosA) {
        return pontosB - pontosA;
      }

      const saldoA = Number(a.saldo ?? a.saldo_gols ?? 0);
      const saldoB = Number(b.saldo ?? b.saldo_gols ?? 0);

      if (saldoB !== saldoA) {
        return saldoB - saldoA;
      }

      const golsA = Number(a.gols_pro ?? a.gols_marcados ?? 0);
      const golsB = Number(b.gols_pro ?? b.gols_marcados ?? 0);

      if (golsB !== golsA) {
        return golsB - golsA;
      }

      return String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      );
    });
  }

  useEffect(() => {
    async function buscarClassificacao() {
      setCarregando(true);
      setMensagem("");

      try {
        if (tipoCampeonato === "mes") {
          const { data, error } = await supabase
            .from("times")
            .select("*");

          if (error) throw error;

          const classificacaoOrdenada =
            ordenarClassificacao(data || []);

          setDadosClassificacao(classificacaoOrdenada);

          if (classificacaoOrdenada.length === 0) {
            setMensagem(
              "Nenhum time foi encontrado na tabela times."
            );
          }

          return;
        }

        const { data, error } = await supabase.rpc(
          "classificacao_anual",
          {
            p_ano: anoAtivo,
          }
        );

        if (error) throw error;

        const classificacaoOrdenada =
          ordenarClassificacao(data || []);

        setDadosClassificacao(classificacaoOrdenada);

        if (classificacaoOrdenada.length === 0) {
          setMensagem(
            `Nenhuma partida encerrada foi encontrada em ${anoAtivo}.`
          );
        }
      } catch (error) {
        console.error(
          "Erro ao carregar classificação:",
          error
        );

        setDadosClassificacao([]);
        setMensagem(
          `Erro ao carregar a classificação: ${error.message}`
        );
      } finally {
        setCarregando(false);
      }
    }

    buscarClassificacao();
  }, [tipoCampeonato, anoAtivo]);

  const nomeMesAtivo = new Intl.DateTimeFormat(
    "pt-BR",
    { month: "long" }
  ).format(new Date(anoAtivo, mesAtivo - 1, 1));

  const tituloPeriodo =
    tipoCampeonato === "mes"
      ? `${nomeMesAtivo.charAt(0).toUpperCase()}${nomeMesAtivo.slice(
          1
        )} de ${anoAtivo}`
      : `Temporada ${anoAtivo}`;

  return (
    <main className="page classificacao-page">
      <style>{`
        .classificacao-page .classificacao-topo {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-bottom: 14px;
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
            justify-content: flex-start;
            margin-bottom: 10px;
          }

          .classificacao-page .tab-buttons button {
            padding: 7px 15px;
          }
        }
      `}</style>

      <section className="classificacao-topo">
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
            ? "dados do campeonato atual"
            : "soma de todas as partidas encerradas no ano"}
        </span>
      </div>

      {mensagem && (
        <div
          style={{
            padding: "12px 14px",
            marginBottom: "18px",
            background: "#2a2a32",
            borderLeft: "4px solid #ef4444",
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