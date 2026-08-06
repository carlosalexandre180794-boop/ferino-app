import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import Artilharia from "../components/Artilharia";
import GoleiroMes from "../components/GoleiroMes";
import { escudoTime } from "../escudos";

const CHAVE_ANO = "ferino_ano_ativo";
const CHAVE_MES = "ferino_mes_ativo";

const LISTA_MESES = [
  { id: 1, nome: "Janeiro" }, { id: 2, nome: "Fevereiro" }, { id: 3, nome: "Março" },
  { id: 4, nome: "Abril" }, { id: 5, nome: "Maio" }, { id: 6, nome: "Junho" },
  { id: 7, nome: "Julho" }, { id: 8, nome: "Agosto" }, { id: 9, nome: "Setembro" },
  { id: 10, nome: "Outubro" }, { id: 11, nome: "Novembro" }, { id: 12, nome: "Dezembro" }
];

function Estatisticas() {
  const [jogadoresMensais, setJogadoresMensais] = useState([]);
  const [artilheirosAnuais, setArtilheirosAnuais] = useState([]);
  const [goleirosAnuais, setGoleirosAnuais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const [filtroArtilharia, setFiltroArtilharia] = useState("mes");
  const [filtroGoleiros, setFiltroGoleiros] = useState("mes");

  const [anoAtivo, setAnoAtivo] = useState(() =>
    Number(localStorage.getItem(CHAVE_ANO) || 2026)
  );

  // Alterado para useState comum para permitir a troca dinâmica de meses na tela
  const [mesAtivo, setMesAtivo] = useState(() =>
    Number(localStorage.getItem(CHAVE_MES) || 8)
  );

  useEffect(() => {
    async function carregarEstatisticas() {
      setCarregando(true);
      setMensagem("");

      try {
        const { data: temporada, error: erroTemporada } = await supabase
          .from("temporadas")
          .select("id")
          .eq("ano", anoAtivo)
          .eq("mes", mesAtivo)
          .maybeSingle();

        if (erroTemporada) throw erroTemporada;

        const consultas = [
          supabase.rpc("artilharia_anual", {
            p_ano: anoAtivo,
          }),
          supabase.rpc("goleiros_anual", {
            p_ano: anoAtivo,
          }),
          supabase
            .from("jogadores")
            .select(`
              id,
              nome,
              goleiro,
              gols,
              jogos,
              jogos_goleiro,
              gols_sofridos,
              time_id,
              times (
                nome
              )
            `)
            .eq("ativo", true),
          supabase
            .from("times")
            .select("*"),
        ];

        if (temporada?.id) {
          consultas.unshift(
            supabase
              .from("estatisticas_mensais")
              .select(`
                jogador_id,
                jogador_nome_snapshot,
                time_nome_snapshot,
                jogos,
                gols,
                jogos_goleiro,
                gols_sofridos,
                pontos_time,
                saldo_time,
                gols_pro_time,
                media_gols_sofridos
              `)
              .eq("temporada_id", temporada.id)
          );
        } else {
          consultas.unshift(
            Promise.resolve({
              data: [],
              error: null,
            })
          );
        }

        const [
          respostaMensal,
          respostaArtilhariaAnual,
          respostaGoleirosAnual,
          respostaJogadoresAtuais,
          respostaTimesAtuais,
        ] = await Promise.all(consultas);

        if (respostaMensal.error) throw respostaMensal.error;
        if (respostaArtilhariaAnual.error) {
          throw respostaArtilhariaAnual.error;
        }
        if (respostaGoleirosAnual.error) {
          throw respostaGoleirosAnual.error;
        }
        if (respostaJogadoresAtuais.error) {
          throw respostaJogadoresAtuais.error;
        }
        if (respostaTimesAtuais.error) {
          throw respostaTimesAtuais.error;
        }

        const classificacaoAtualPorTime = new Map(
          (respostaTimesAtuais.data || []).map((time) => [
            Number(time.id),
            {
              pontos: Number(time.pontos || 0),
              saldo: Number(
                time.saldo ?? time.saldo_gols ?? 0
              ),
              golsPro: Number(
                time.gols_pro ?? time.gols_marcados ?? 0
              ),
            },
          ])
        );

        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear();
        const mesAtual = dataAtual.getMonth() + 1;

        const selecionouPeriodoAtual =
          Number(anoAtivo) === Number(anoAtual) &&
          Number(mesAtivo) === Number(mesAtual);

        const snapshotMensal = respostaMensal.data || [];

        const listaMensalDoHistorico = snapshotMensal.map(
          (registro) => ({
            id: Number(registro.jogador_id),
            nome:
              registro.jogador_nome_snapshot ||
              "Jogador não informado",
            goleiro:
              Number(registro.jogos_goleiro || 0) > 0,
            time:
              registro.time_nome_snapshot || "Sem time",
            gols: Number(registro.gols || 0),
            jogos: Number(registro.jogos || 0),
            jogosGoleiro: Number(
              registro.jogos_goleiro || 0
            ),
            golsSofridos: Number(
              registro.gols_sofridos || 0
            ),
            pontosTime: Number(
              registro.pontos_time || 0
            ),
            saldoTime: Number(
              registro.saldo_time || 0
            ),
            golsProTime: Number(
              registro.gols_pro_time || 0
            ),
          })
        );

        const listaMensalAtual = (
          respostaJogadoresAtuais.data || []
        ).map((jogador) => {
          const classificacaoTime =
            classificacaoAtualPorTime.get(
              Number(jogador.time_id)
            ) || {
              pontos: 0,
              saldo: 0,
              golsPro: 0,
            };

          return {
            id: Number(jogador.id),
            nome:
              jogador.nome ||
              "Jogador não informado",
            goleiro: Boolean(jogador.goleiro),
            time:
              jogador.times?.nome || "Sem time",
            gols: Number(jogador.gols || 0),
            jogos: Number(jogador.jogos || 0),
            jogosGoleiro: Number(
              jogador.jogos_goleiro || 0
            ),
            golsSofridos: Number(
              jogador.gols_sofridos || 0
            ),
            pontosTime: classificacaoTime.pontos,
            saldoTime: classificacaoTime.saldo,
            golsProTime: classificacaoTime.golsPro,
          };
        });

        const listaMensal =
          listaMensalDoHistorico.length > 0
            ? listaMensalDoHistorico
            : selecionouPeriodoAtual
              ? listaMensalAtual
              : [];

        const listaArtilhariaAnual = (
          respostaArtilhariaAnual.data || []
        )
          .map((jogador) => ({
            id: jogador.id,
            nome: jogador.nome,
            goleiro: Boolean(jogador.goleiro),
            time: jogador.nome_time || "Sem time",
            gols: Number(jogador.gols || 0),
            jogos: Number(jogador.jogos || 0),
          }))
          .filter((jogador) => jogador.gols > 0);

        const listaGoleirosAnual = (
          respostaGoleirosAnual.data || []
        )
          .map((goleiro) => ({
            id: goleiro.id,
            nome: goleiro.nome,
            goleiro: true,
            time: goleiro.nome_time || "Sem time",
            jogosGoleiro: Number(
              goleiro.jogos_goleiro || 0
            ),
            golsSofridos: Number(
              goleiro.gols_sofridos || 0
            ),
            pontosTime: Number(
              goleiro.pontos_time || 0
            ),
            saldoTime: Number(
              goleiro.saldo_time || 0
            ),
            golsProTime: Number(
              goleiro.gols_pro_time || 0
            ),
            media: Number(
              goleiro.media || 0
            ).toFixed(2),
          }))
          .filter((goleiro) => goleiro.jogosGoleiro > 0);

        setJogadoresMensais(listaMensal);
        setArtilheirosAnuais(listaArtilhariaAnual);
        setGoleirosAnuais(listaGoleirosAnual);

        if (
          listaMensal.length === 0 &&
          !selecionouPeriodoAtual
        ) {
          const nomeMes =
            LISTA_MESES.find(
              (item) => item.id === mesAtivo
            )?.nome || "";

          setMensagem(
            `Nenhum registro mensal foi encontrado para ${nomeMes} de ${anoAtivo}.`
          );
        }
      } catch (erro) {
        console.error(
          "Erro ao carregar estatísticas:",
          erro
        );
        setJogadoresMensais([]);
        setArtilheirosAnuais([]);
        setGoleirosAnuais([]);
        setMensagem(
          `Erro ao carregar as estatísticas: ${erro.message}`
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarEstatisticas();
  }, [anoAtivo, mesAtivo]);

  // CORREÇÃO: Removido o !jogador.goleiro para permitir goleiros marcarem gols na artilharia geral
  const artilheirosMensais = useMemo(
    () =>
      jogadoresMensais
        .filter((jogador) => jogador.gols > 0)
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
              ? (goleiro.golsSofridos / goleiro.jogosGoleiro).toFixed(2)
              : "0.00",
        }))
        .sort((a, b) => {
          if (a.jogosGoleiro > 0 && b.jogosGoleiro === 0) return -1;
          if (a.jogosGoleiro === 0 && b.jogosGoleiro > 0) return 1;

          if (a.jogosGoleiro > 0 && b.jogosGoleiro > 0) {
            const mediaA = a.golsSofridos / a.jogosGoleiro;
            const mediaB = b.golsSofridos / b.jogosGoleiro;

            return (
              mediaA - mediaB ||
              a.golsSofridos - b.golsSofridos ||
              b.jogosGoleiro - a.jogosGoleiro ||
              b.pontosTime - a.pontosTime ||
              b.saldoTime - a.saldoTime ||
              b.golsProTime - a.golsProTime ||
              a.nome.localeCompare(b.nome, "pt-BR")
            );
          }

          return a.nome.localeCompare(b.nome, "pt-BR");
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

  const artilheiroDestaque =
    artilheirosExibidos.length > 0
      ? artilheirosExibidos[0]
      : null;

  const nomeMesAtivo = new Intl.DateTimeFormat(
    "pt-BR",
    { month: "long" }
  ).format(new Date(anoAtivo, mesAtivo - 1, 1));

  const periodoArtilharia =
    filtroArtilharia === "mes"
      ? `${nomeMesAtivo.charAt(0).toUpperCase()}${nomeMesAtivo.slice(1)} de ${anoAtivo}`
      : `Temporada ${anoAtivo}`;

  const periodoGoleiros =
    filtroGoleiros === "mes"
      ? `${nomeMesAtivo.charAt(0).toUpperCase()}${nomeMesAtivo.slice(1)} de ${anoAtivo}`
      : `Temporada ${anoAtivo}`;

  // DEFINIÇÃO DOS NOMES DINÂMICOS DOS CARDS
  const tituloCardDefesa =
    filtroGoleiros === "mes"
      ? "Paredão do Mês"
      : "Paredão do Ano";
  const tituloCardArtilheiro =
    filtroArtilharia === "mes"
      ? "Artilheiro do Mês"
      : "Artilheiro do Ano";

  function lidarComMudancaMes(evento) {
    const novoMes = Number(evento.target.value);
    setMesAtivo(novoMes);
    localStorage.setItem(CHAVE_MES, String(novoMes));
  }

  function lidarComMudancaAno(evento) {
    const novoAno = Number(evento.target.value);
    setAnoAtivo(novoAno);
    localStorage.setItem(CHAVE_ANO, String(novoAno));
  }

  return (
    <main className="page estatisticas-page">
      <section className="page-header estatisticas-header">
        <h2>Estatísticas</h2>
      </section>

      {(filtroArtilharia === "mes" ||
        filtroGoleiros === "mes") && (
        <section
          className="estatisticas-seletor-mes"
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor="select-mes"
            style={{ fontWeight: "bold" }}
          >
            Ver registros do período:
          </label>

          <select
            id="select-mes"
            value={mesAtivo}
            onChange={lidarComMudancaMes}
            style={{
              minHeight: "42px",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            {LISTA_MESES.map((mes) => (
              <option key={mes.id} value={mes.id}>
                {mes.nome}
              </option>
            ))}
          </select>

          <select
            value={anoAtivo}
            onChange={lidarComMudancaAno}
            aria-label="Selecionar ano das estatísticas"
            style={{
              minHeight: "42px",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
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
        </section>
      )}

      {mensagem &&
        (filtroArtilharia === "mes" ||
          filtroGoleiros === "mes") && (
          <div className="estatisticas-erro">
            {mensagem}
          </div>
        )}

      {carregando ? (
        <p className="estatisticas-loading">
          Carregando estatísticas...
        </p>
      ) : (
        <>
          <section className="estatisticas-destaques">
            <GoleiroMes
              tipo="goleiro"
              tituloCustomizado={tituloCardDefesa}
              goleiro={melhorGoleiro}
            />

            <GoleiroMes
              tipo="artilheiro"
              tituloCustomizado={tituloCardArtilheiro}
              artilheiro={artilheiroDestaque}
            />
          </section>

          <section className="estatisticas-rankings">
            <div className="estatisticas-coluna">
              <CabecalhoRanking
                titulo="Artilharia"
                filtro={filtroArtilharia}
                setFiltro={setFiltroArtilharia}
              />

              <p className="estatisticas-periodo">
                {periodoArtilharia}
              </p>

              <Artilharia
                artilheiros={artilheirosExibidos}
              />
            </div>

            <div className="estatisticas-coluna">
              <CabecalhoRanking
                titulo="Goleiros"
                filtro={filtroGoleiros}
                setFiltro={setFiltroGoleiros}
              />

              <p className="estatisticas-periodo">
                {periodoGoleiros}
              </p>

              <TabelaGoleiros
                goleiros={goleirosExibidos}
              />
            </div>
          </section>
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
    <div className="estatisticas-ranking-header">
      <h3>{titulo}</h3>

      <div className="estatisticas-filtros">
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
      className={
        ativo
          ? "estatisticas-filtro ativo"
          : "estatisticas-filtro"
      }
    >
      {children}
    </button>
  );
}

function TabelaGoleiros({ goleiros }) {
  return (
    <div className="goleiros-tabela">
      <div className="goleiros-cabecalho">
        <span>#</span>
        <span>GOLEIRO</span>
        <span>J</span>
        <span>GS</span>
        <span>MÉDIA</span>
      </div>

      {goleiros.length === 0 ? (
        <div className="goleiros-vazio">
          Nenhum goleiro listado.
        </div>
      ) : (
        goleiros.map((goleiro, indice) => (
          <div
            key={goleiro.id}
            className={`goleiros-linha ${
              indice === 0
                ? "goleiros-top-1"
                : indice === 1
                ? "goleiros-top-2"
                : indice === 2
                ? "goleiros-top-3"
                : ""
            }`}
          >
            <strong
              className={`goleiros-posicao ${
                indice === 0
                  ? "top-1"
                  : indice === 1
                  ? "top-2"
                  : indice === 2
                  ? "top-3"
                  : ""
              }`}
            >
              {indice + 1}
            </strong>

            <div className="goleiros-jogador">
              <img
                className="goleiros-escudo"
                src={escudoTime(goleiro.time)}
                alt={`Escudo do ${goleiro.time}`}
              />

              <div className="goleiros-info">
                <strong title={goleiro.nome}>
                  {goleiro.nome}
                </strong>

                <span title={goleiro.time}>
                  {goleiro.time}
                </span>
              </div>
            </div>

            <span>{goleiro.jogosGoleiro}</span>

            <span className="goleiros-sofridos">
              -{goleiro.golsSofridos}
            </span>

            <strong>{goleiro.media}</strong>
          </div>
        ))
      )}
    </div>
  );
}

export default Estatisticas;