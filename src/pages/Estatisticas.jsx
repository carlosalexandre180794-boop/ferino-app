import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import Artilharia from "../components/Artilharia";
import GoleiroMes from "../components/GoleiroMes";

const CHAVE_ANO = "ferino_ano_ativo";
const CHAVE_MES = "ferino_mes_ativo";

function Estatisticas() {
  const [jogadoresMensais, setJogadoresMensais] = useState([]);
  const [artilheirosAnuais, setArtilheirosAnuais] = useState([]);
  const [goleirosAnuais, setGoleirosAnuais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const [filtroArtilharia, setFiltroArtilharia] = useState("mes");
  const [filtroGoleiros, setFiltroGoleiros] = useState("mes");

  const [anoAtivo] = useState(() =>
    Number(localStorage.getItem(CHAVE_ANO) || 2026)
  );

  const [mesAtivo] = useState(() =>
    Number(localStorage.getItem(CHAVE_MES) || 8)
  );

  useEffect(() => {
    async function carregarEstatisticas() {
      setCarregando(true);
      setMensagem("");

      try {
        const [
          respostaMensal,
          respostaArtilhariaAnual,
          respostaGoleirosAnual,
        ] = await Promise.all([
          supabase
            .from("jogadores")
            .select(`
              id,
              nome,
              jogos,
              gols,
              goleiro,
              jogos_goleiro,
              gols_sofridos,
              ativo,
              times (
                nome
              )
            `)
            .eq("ativo", true),

          supabase.rpc("artilharia_anual", {
            p_ano: anoAtivo,
          }),

          supabase.rpc("goleiros_anual", {
            p_ano: anoAtivo,
          }),
        ]);

        if (respostaMensal.error) {
          throw respostaMensal.error;
        }

        if (respostaArtilhariaAnual.error) {
          throw respostaArtilhariaAnual.error;
        }

        if (respostaGoleirosAnual.error) {
          throw respostaGoleirosAnual.error;
        }

        const listaMensal = (respostaMensal.data || []).map(
          (jogador) => ({
            id: jogador.id,
            nome: jogador.nome,
            goleiro: jogador.goleiro,
            time: jogador.times?.nome || "Sem time",
            gols: Number(jogador.gols || 0),
            jogos: Number(jogador.jogos || 0),
            jogosGoleiro: Number(jogador.jogos_goleiro || 0),
            golsSofridos: Number(jogador.gols_sofridos || 0),
          })
        );

        const listaArtilhariaAnual = (
          respostaArtilhariaAnual.data || []
        ).map((jogador) => ({
          id: jogador.id,
          nome: jogador.nome,
          goleiro: false,
          time: jogador.nome_time || "Sem time",
          gols: Number(jogador.gols || 0),
          jogos: Number(jogador.jogos || 0),
        }));

        const listaGoleirosAnual = (
          respostaGoleirosAnual.data || []
        ).map((goleiro) => ({
          id: goleiro.id,
          nome: goleiro.nome,
          goleiro: true,
          time: goleiro.nome_time || "Sem time",
          jogosGoleiro: Number(goleiro.jogos_goleiro || 0),
          golsSofridos: Number(goleiro.gols_sofridos || 0),
          media: Number(goleiro.media || 0).toFixed(2),
        }));

        setJogadoresMensais(listaMensal);
        setArtilheirosAnuais(listaArtilhariaAnual);
        setGoleirosAnuais(listaGoleirosAnual);
      } catch (erro) {
        console.error("Erro ao carregar estatísticas:", erro);
        setMensagem(
          `Erro ao carregar as estatísticas: ${erro.message}`
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarEstatisticas();
  }, [anoAtivo]);

  const artilheirosMensais = useMemo(
    () =>
      jogadoresMensais
        .filter(
          (jogador) =>
            !jogador.goleiro && jogador.gols > 0
        )
        .sort(
          (a, b) =>
            b.gols - a.gols ||
            a.nome.localeCompare(b.nome, "pt-BR")
        ),
    [jogadoresMensais]
  );

  const artilheirosExibidos =
    filtroArtilharia === "mes"
      ? artilheirosMensais
      : artilheirosAnuais;

  const goleirosMensais = useMemo(
    () =>
      jogadoresMensais
        .filter((jogador) => jogador.goleiro)
        .map((goleiro) => ({
          ...goleiro,
          media:
            goleiro.jogosGoleiro > 0
              ? (
                  goleiro.golsSofridos /
                  goleiro.jogosGoleiro
                ).toFixed(2)
              : "0.00",
        }))
        .sort((a, b) => {
          if (
            a.jogosGoleiro > 0 &&
            b.jogosGoleiro === 0
          ) {
            return -1;
          }

          if (
            a.jogosGoleiro === 0 &&
            b.jogosGoleiro > 0
          ) {
            return 1;
          }

          if (
            a.jogosGoleiro > 0 &&
            b.jogosGoleiro > 0
          ) {
            const mediaA =
              a.golsSofridos / a.jogosGoleiro;
            const mediaB =
              b.golsSofridos / b.jogosGoleiro;

            return (
              mediaA - mediaB ||
              a.golsSofridos - b.golsSofridos ||
              b.jogosGoleiro - a.jogosGoleiro ||
              a.nome.localeCompare(b.nome, "pt-BR")
            );
          }

          return a.nome.localeCompare(
            b.nome,
            "pt-BR"
          );
        }),
    [jogadoresMensais]
  );

  const goleirosExibidos =
    filtroGoleiros === "mes"
      ? goleirosMensais
      : goleirosAnuais;

  const melhorGoleiro =
    goleirosExibidos.find(
      (goleiro) => goleiro.jogosGoleiro > 0
    ) || null;

  const nomeMesAtivo = new Intl.DateTimeFormat(
    "pt-BR",
    { month: "long" }
  ).format(new Date(anoAtivo, mesAtivo - 1, 1));

  const periodoArtilharia =
    filtroArtilharia === "mes"
      ? `${nomeMesAtivo.charAt(0).toUpperCase()}${nomeMesAtivo.slice(
          1
        )} de ${anoAtivo}`
      : `Temporada ${anoAtivo}`;

  const periodoGoleiros =
    filtroGoleiros === "mes"
      ? `${nomeMesAtivo.charAt(0).toUpperCase()}${nomeMesAtivo.slice(
          1
        )} de ${anoAtivo}`
      : `Temporada ${anoAtivo}`;

  return (
    <main className="page">
      <section
        className="page-header"
        style={{
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            margin: 0,
          }}
        >
          Estatísticas
        </h2>
      </section>

      {mensagem && (
        <div
          style={{
            padding: "12px 14px",
            marginBottom: "18px",
            background: "#4a1f2a",
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
            marginTop: "40px",
          }}
        >
          Carregando estatísticas...
        </p>
      ) : (
        <>
          <div
            style={{
              marginBottom: "12px",
              maxWidth: "450px",
            }}
          >
            <GoleiroMes goleiro={melhorGoleiro} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
              marginTop: "0",
            }}
          >
            <div
              className="side-column"
              style={{ gap: "6px" }}
            >
              <CabecalhoRanking
                titulo="Artilharia"
                filtro={filtroArtilharia}
                setFiltro={setFiltroArtilharia}
              />

              <p
                style={{
                  color: "#94a3b8",
                  margin: "0 0 6px",
                  fontSize: "0.82rem",
                  lineHeight: "1.1",
                }}
              >
                {periodoArtilharia}
              </p>

              <Artilharia
                artilheiros={artilheirosExibidos}
              />
            </div>

            <div
              className="side-column"
              style={{ gap: "6px" }}
            >
              <CabecalhoRanking
                titulo="Goleiros"
                filtro={filtroGoleiros}
                setFiltro={setFiltroGoleiros}
              />

              <p
                style={{
                  color: "#94a3b8",
                  margin: "0 0 6px",
                  fontSize: "0.82rem",
                  lineHeight: "1.1",
                }}
              >
                {periodoGoleiros}
              </p>

              <TabelaGoleiros
                goleiros={goleirosExibidos}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function CabecalhoRanking({
  titulo,
  filtro,
  setFiltro,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0",
        gap: "10px",
      }}
    >
      <h3
        style={{
          color: "#fff",
          margin: 0,
          fontSize: "1.12rem",
          lineHeight: 1.1,
        }}
      >
        {titulo}
      </h3>

      <div
        style={{
          display: "flex",
          gap: "5px",
          background: "#1e1e24",
          padding: "3px",
          borderRadius: "6px",
        }}
      >
        <BotaoFiltro
          ativo={filtro === "mes"}
          onClick={() => setFiltro("mes")}
        >
          Mensal
        </BotaoFiltro>

        <BotaoFiltro
          ativo={filtro === "ano"}
          onClick={() => setFiltro("ano")}
        >
          Anual
        </BotaoFiltro>
      </div>
    </div>
  );
}

function BotaoFiltro({
  ativo,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: ativo ? "#333" : "transparent",
        color: "#fff",
        border: "none",
        padding: "6px 11px",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: ativo ? "bold" : "normal",
      }}
    >
      {children}
    </button>
  );
}


function TabelaGoleiros({ goleiros }) {
  const colunas =
    "28px minmax(92px, 1fr) 44px 58px 50px";

  const estiloCabecalho = {
    display: "grid",
    gridTemplateColumns: colunas,
    alignItems: "center",
    gap: "4px",
    padding: "10px 8px",
    borderBottom: "2px solid #2a2a32",
    color: "#7f8ba3",
    fontSize: "0.62rem",
    fontWeight: "bold",
    letterSpacing: "0.04em",
    textAlign: "center",
  };

  const estiloLinha = {
    display: "grid",
    gridTemplateColumns: colunas,
    alignItems: "center",
    gap: "4px",
    minHeight: "68px",
    padding: "10px 8px",
    borderBottom: "1px solid #2a2a32",
    fontSize: "0.82rem",
    textAlign: "center",
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        color: "#fff",
        background: "#1e1e24",
        borderRadius: "8px",
      }}
    >
      <div style={estiloCabecalho}>
        <span>#</span>

        <span style={{ textAlign: "left" }}>
          GOLEIRO
        </span>

        <span>JOGOS</span>

        <span>
          GOLS
          <br />
          SOFRIDOS
        </span>

        <span>MÉDIA</span>
      </div>

      {goleiros.length === 0 ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#aaa",
          }}
        >
          Nenhum goleiro listado.
        </div>
      ) : (
        goleiros.map((goleiro, indice) => (
          <div key={goleiro.id} style={estiloLinha}>
            <strong
              style={{
                color: "#4f46e5",
                fontSize: "1rem",
              }}
            >
              {indice + 1}
            </strong>

            <div
              style={{
                minWidth: 0,
                textAlign: "left",
              }}
            >
              <strong
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.86rem",
                }}
                title={goleiro.nome}
              >
                {goleiro.nome}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#aaa",
                  fontSize: "0.68rem",
                }}
                title={goleiro.time}
              >
                {goleiro.time}
              </span>
            </div>

            <span>{goleiro.jogosGoleiro}</span>

            <span style={{ color: "#ef4444" }}>
              {goleiro.golsSofridos}
            </span>

            <strong>{goleiro.media}</strong>
          </div>
        ))
      )}
    </div>
  );
}


export default Estatisticas;