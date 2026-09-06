import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { escudoTime } from "../escudos";
function capitalizarNome(nome = "") {
  return String(nome ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, separador, letra) =>
        separador + letra.toLocaleUpperCase("pt-BR")
    );
}
function Home() {
  const [dados, setDados] = useState({
    lider: null,
    vice: null,
    terceiro: null,
    artilheiro: null,
    melhorGoleiro: null,
    jogosEncerrados: 0,
    totalGols: 0,
    mediaGols: "0.0",
  });

  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarPainel() {
      setCarregando(true);

      try {
        const agora = new Date();
        const anoAtual = agora.getFullYear();
        const mesAtual = agora.getMonth() + 1;

        const { data: temporadaAtual, error: erroTemporada } = await supabase
          .from("temporadas")
          .select("id, ano, mes, status")
          .eq("ano", anoAtual)
          .eq("mes", mesAtual)
          .maybeSingle();

        if (erroTemporada) throw erroTemporada;

        if (!temporadaAtual) {
          setDados({
            lider: null,
            vice: null,
            terceiro: null,
            artilheiro: null,
            melhorGoleiro: null,
            jogosEncerrados: 0,
            totalGols: 0,
            mediaGols: "0.0",
          });
          return;
        }

        const [resTimes, resJogos, resEstatisticas, resPartidasAcumuladas] = await Promise.all([
          supabase
            .from("times")
            .select("id, nome"),

          supabase
            .from("jogos_campeonato")
            .select(`
              id,
              time_a_id,
              time_b_id,
              gols_a,
              gols_b,
              status,
              partida_id
            `)
            .eq("temporada", anoAtual)
            .eq("mes", mesAtual),

          supabase
            .from("estatisticas_mensais")
            .select(`
              id,
              jogador_id,
              time_id,
              jogador_nome_snapshot,
              time_nome_snapshot,
              gols,
              jogos_goleiro,
              gols_sofridos
            `)
            .eq("temporada_id", temporadaAtual.id),

          // Resumo geral do projeto: mantém o acumulado de todas as partidas
          // já registradas, como o painel mostrava antes.
          supabase
            .from("partidas")
            .select("gols_a, gols_b"),
        ]);

        if (resTimes.error) throw resTimes.error;
        if (resJogos.error) throw resJogos.error;
        if (resEstatisticas.error) throw resEstatisticas.error;
        if (resPartidasAcumuladas.error) throw resPartidasAcumuladas.error;

        const timesBase = resTimes.data || [];
        const jogosDoMes = resJogos.data || [];
        const estatisticasDoMes = resEstatisticas.data || [];
        const partidasAcumuladas = resPartidasAcumuladas.data || [];

        const mapaTimes = new Map(
          timesBase.map((time) => [
            Number(time.id),
            {
              id: Number(time.id),
              nome: time.nome,
              pontos: 0,
              jogos: 0,
              vitorias: 0,
              empates: 0,
              derrotas: 0,
              gols_pro: 0,
              gols_contra: 0,
              saldo: 0,
            },
          ])
        );

        function jogoEncerrado(jogo) {
          const status = String(jogo.status || "").toLowerCase();

          return (
            status === "encerrado" ||
            status === "encerrada" ||
            status === "finalizado" ||
            status === "finalizada" ||
            jogo.partida_id !== null
          );
        }

        const jogosEncerrados = jogosDoMes.filter(jogoEncerrado);

        jogosEncerrados.forEach((jogo) => {
          const timeA = mapaTimes.get(Number(jogo.time_a_id));
          const timeB = mapaTimes.get(Number(jogo.time_b_id));

          if (!timeA || !timeB) return;

          const golsA = Number(jogo.gols_a ?? 0);
          const golsB = Number(jogo.gols_b ?? 0);

          timeA.jogos += 1;
          timeB.jogos += 1;

          timeA.gols_pro += golsA;
          timeA.gols_contra += golsB;
          timeB.gols_pro += golsB;
          timeB.gols_contra += golsA;

          if (golsA > golsB) {
            timeA.pontos += 3;
            timeA.vitorias += 1;
            timeB.derrotas += 1;
          } else if (golsB > golsA) {
            timeB.pontos += 3;
            timeB.vitorias += 1;
            timeA.derrotas += 1;
          } else {
            timeA.pontos += 1;
            timeB.pontos += 1;
            timeA.empates += 1;
            timeB.empates += 1;
          }
        });

        const classificacao = Array.from(mapaTimes.values())
          .map((time) => ({
            ...time,
            saldo: time.gols_pro - time.gols_contra,
          }))
          .sort(
            (a, b) =>
              b.pontos - a.pontos ||
              b.vitorias - a.vitorias ||
              b.saldo - a.saldo ||
              b.gols_pro - a.gols_pro ||
              String(a.nome || "").localeCompare(
                String(b.nome || ""),
                "pt-BR"
              )
          );

        const posicaoPorTime = new Map(
          classificacao.map((time, indice) => [
            Number(time.id),
            indice + 1,
          ])
        );

        const artilheirosOrdenados = estatisticasDoMes
          .filter((item) => Number(item.gols || 0) > 0)
          .map((item) => ({
            id: Number(item.jogador_id),
            nome: item.jogador_nome_snapshot || "Não informado",
            gols: Number(item.gols || 0),
            time_id: Number(item.time_id),
            time_nome: item.time_nome_snapshot || "",
            posicaoTime:
              posicaoPorTime.get(Number(item.time_id)) ??
              Number.POSITIVE_INFINITY,
          }))
          .sort(
            (a, b) =>
              b.gols - a.gols ||
              a.posicaoTime - b.posicaoTime ||
              a.nome.localeCompare(b.nome, "pt-BR")
          );

        const goleirosOrdenados = estatisticasDoMes
          .filter((item) => Number(item.jogos_goleiro || 0) > 0)
          .map((item) => {
            const jogos = Number(item.jogos_goleiro || 0);
            const sofridos = Number(item.gols_sofridos || 0);

            return {
              id: Number(item.jogador_id),
              nome: item.jogador_nome_snapshot || "Não informado",
              jogos_goleiro: jogos,
              gols_sofridos: sofridos,
              time_id: Number(item.time_id),
              time_nome: item.time_nome_snapshot || "",
              media:
                jogos > 0
                  ? sofridos / jogos
                  : Number.POSITIVE_INFINITY,
              posicaoTime:
                posicaoPorTime.get(Number(item.time_id)) ??
                Number.POSITIVE_INFINITY,
            };
          })
          .sort(
            (a, b) =>
              a.media - b.media ||
              a.gols_sofridos - b.gols_sofridos ||
              b.jogos_goleiro - a.jogos_goleiro ||
              a.posicaoTime - b.posicaoTime ||
              a.nome.localeCompare(b.nome, "pt-BR")
          );

        // Os destaques acima são mensais, mas estes 3 números são acumulados.
        const somaGols = partidasAcumuladas.reduce(
          (total, partida) =>
            total +
            Number(partida.gols_a ?? 0) +
            Number(partida.gols_b ?? 0),
          0
        );

        const quantidadeJogos = partidasAcumuladas.length;

        setDados({
          lider: classificacao[0] || null,
          vice: classificacao[1] || null,
          terceiro: classificacao[2] || null,
          artilheiro: artilheirosOrdenados[0] || null,
          melhorGoleiro: goleirosOrdenados[0] || null,
          jogosEncerrados: quantidadeJogos,
          totalGols: somaGols,
          mediaGols:
            quantidadeJogos > 0
              ? (somaGols / quantidadeJogos).toFixed(1)
              : "0.0",
        });
      } catch (error) {
        console.error("Erro ao carregar painel mensal:", error);
      } finally {
        setCarregando(false);
      }
    }

    carregarPainel();
  }, []);

  if (carregando) {
    return (
      <main className="page home-page">
        <p className="loading">Carregando painel...</p>
      </main>
    );
  }

  const nomeTimeArtilheiro = dados.artilheiro?.time_nome || "";
  const nomeTimeGoleiro = dados.melhorGoleiro?.time_nome || "";

  const mediaGoleiro =
    dados.melhorGoleiro?.jogos_goleiro > 0
      ? (
          Number(dados.melhorGoleiro.gols_sofridos || 0) /
          Number(dados.melhorGoleiro.jogos_goleiro)
        ).toFixed(1)
      : "0.0";

  function escudoDoTime(time) {
    if (!time?.nome) return "";
    return escudoTime(time.nome);
  }

  return (
    <main className="page home-page">
      <style>{`
        .home-page .highlight-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .home-page .highlight-card {
          width: 100%;
          min-width: 0;
          padding: 18px;
        }

        .home-page .leader-card {
          min-height: 170px;
        }

        .home-page .secondary-highlights {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .home-page .secondary-highlights .highlight-card {
          min-height: 205px;
        }

        .home-page .highlight-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .home-page .highlight-icon {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          font-size: 1.5rem;
        }

        .home-page .highlight-title strong {
          font-size: 1.25rem;
          line-height: 1.2;
        }

        .home-page .highlight-person {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .home-page .home-highlight-shield {
          width: 72px;
          height: 72px;
          flex: 0 0 72px;
          object-fit: contain;
        }

        .home-page .secondary-highlights .highlight-person {
          align-items: flex-start;
          flex-direction: column;
          gap: 12px;
        }

        .home-page .secondary-highlights .home-highlight-shield {
          width: 58px;
          height: 58px;
          flex-basis: 58px;
        }

        .home-page .highlight-card h2 {
          margin: 0 0 5px;
          font-size: 1.55rem;
          line-height: 1.15;
        }

        .home-page .highlight-card p {
          margin: 0;
          font-size: 1rem;
          line-height: 1.35;
          color: #ffffff;
        }

        .home-page .highlight-info {
          margin-top: 4px;
        }

        .home-page .award-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(193, 137, 42, 0.78);
          box-shadow:
            0 0 0 1px rgba(193, 137, 42, 0.08),
            0 0 20px rgba(193, 137, 42, 0.11),
            inset 0 0 22px rgba(193, 137, 42, 0.03);
        }

        .home-page .award-card .highlight-title {
          margin-bottom: 10px;
        }

        .home-page .award-card .highlight-title strong {
          color: #ffffff;
        }

        .home-page .award-content {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
        }

        .home-page .award-shield {
          width: 58px;
          height: 58px;
          object-fit: contain;
        }

        .home-page .summary-grid {
          margin-top: 14px;
          gap: 10px;
        }

        .home-page .summary-grid > div {
          min-width: 0;
          padding: 12px 8px;
          border: 1px solid rgba(43, 132, 255, 0.72);
          box-shadow:
            0 0 0 1px rgba(43, 132, 255, 0.06),
            0 0 18px rgba(43, 132, 255, 0.11),
            inset 0 0 20px rgba(43, 132, 255, 0.03);
        }

        .home-page .summary-label {
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          text-align: center;
          color: #ffffff;
          font-size: 0.72rem;
          line-height: 1.15;
          text-transform: uppercase;
        }

        .home-page .summary-icon {
          font-size: 1rem;
          line-height: 1;
        }

        .home-page .summary-grid strong {
          display: block;
          margin-top: 3px;
          font-size: 1.2rem;
        }

        @media (max-width: 700px) {
          .home-page {
            padding-top: 8px !important;
          }

          .home-page .highlight-list {
            gap: 12px;
          }

          .home-page .highlight-card {
            min-height: 0;
            padding: 16px;
          }

          .home-page .leader-card {
            min-height: 165px;
          }

          .home-page .secondary-highlights {
            gap: 10px;
          }

          .home-page .secondary-highlights .highlight-card {
            min-height: 188px;
            padding: 14px;
          }

          .home-page .highlight-title {
            gap: 10px;
            margin-bottom: 12px;
          }

          .home-page .highlight-icon {
            width: 50px;
            height: 50px;
            flex-basis: 50px;
            font-size: 1.35rem;
          }

          .home-page .secondary-highlights .highlight-icon {
            width: 46px;
            height: 46px;
            flex-basis: 46px;
            font-size: 1.2rem;
          }

          .home-page .highlight-title strong {
            font-size: 1.12rem;
          }

          .home-page .secondary-highlights .highlight-title strong {
            font-size: 0.98rem;
          }

          .home-page .highlight-person {
            gap: 15px;
          }

          .home-page .home-highlight-shield {
            width: 64px;
            height: 64px;
            flex-basis: 64px;
          }

          .home-page .secondary-highlights .home-highlight-shield {
            width: 52px;
            height: 52px;
            flex-basis: 52px;
          }

          .home-page .highlight-card h2 {
            font-size: 1.35rem;
          }

          .home-page .secondary-highlights .highlight-card h2 {
            font-size: 1.18rem;
          }

          .home-page .highlight-card p {
            font-size: 0.92rem;
          }

          .home-page .secondary-highlights .highlight-card p {
            font-size: 0.82rem;
          }

          .home-page .award-shield {
            width: 50px;
            height: 50px;
          }

          .home-page .summary-grid > div {
            padding: 10px 5px;
          }

          .home-page .summary-label {
            min-height: 34px;
            font-size: 0.63rem;
          }

          .home-page .summary-grid strong {
            font-size: 1.08rem;
          }
        }

        @media (max-width: 380px) {
          .home-page .secondary-highlights {
            grid-template-columns: 1fr;
          }

          .home-page .secondary-highlights .highlight-card {
            min-height: 0;
          }

          .home-page .secondary-highlights .highlight-person {
            flex-direction: row;
            align-items: center;
          }
        }
      `}</style>

      <section className="highlight-list">
        <article className="highlight-card leader-card">
          <div className="highlight-title">
            <span className="highlight-icon">🏆</span>
            <strong>Líder</strong>
          </div>

          {dados.lider ? (
            <div className="highlight-person">
              <img
                src={escudoDoTime(dados.lider)}
                alt={`Escudo do ${dados.lider.nome}`}
                className="home-highlight-shield"
                decoding="async"
              />

              <div>
                <h2>{dados.lider.nome}</h2>
                <p>{dados.lider.pontos ?? 0} pontos</p>
              </div>
            </div>
          ) : (
            <div className="highlight-info">
              <h2>Nenhum time cadastrado</h2>
            </div>
          )}
        </article>

        <div className="secondary-highlights">
          <article className="highlight-card vice-card">
            <div className="highlight-title">
              <span className="highlight-icon">🥈</span>
              <strong>Vice-líder</strong>
            </div>

            {dados.vice ? (
              <div className="highlight-person">
                <img
                  src={escudoDoTime(dados.vice)}
                  alt={`Escudo do ${dados.vice.nome}`}
                  className="home-highlight-shield"
                  decoding="async"
                />

                <div>
                  <h2>{dados.vice.nome}</h2>
                  <p>{dados.vice.pontos ?? 0} pontos</p>
                </div>
              </div>
            ) : (
              <div className="highlight-info">
                <h2>Nenhum time cadastrado</h2>
              </div>
            )}
          </article>

          <article className="highlight-card lantern-card">
            <div className="highlight-title">
              <span className="highlight-icon">🔻</span>
              <strong>3º lugar</strong>
            </div>

            {dados.terceiro ? (
              <div className="highlight-person">
                <img
                  src={escudoDoTime(dados.terceiro)}
                  alt={`Escudo do ${dados.terceiro.nome}`}
                  className="home-highlight-shield"
                  decoding="async"
                />

                <div>
                  <h2>{dados.terceiro.nome}</h2>
                  <p>{dados.terceiro.pontos ?? 0} pontos</p>
                </div>
              </div>
            ) : (
              <div className="highlight-info">
                <h2>Nenhum time cadastrado</h2>
              </div>
            )}
          </article>
        </div>

        <article className="highlight-card scorer-card award-card">
          <div className="highlight-title">
            <span className="highlight-icon">⚽</span>
            <strong>Artilheiro do mês</strong>
          </div>

          {dados.artilheiro ? (
            <div className="award-content">
              <div className="highlight-info">
               <h2>{capitalizarNome(dados.artilheiro.nome)}</h2>
                <p>
                  {dados.artilheiro.gols ?? 0} gols
                  {nomeTimeArtilheiro ? ` · ${nomeTimeArtilheiro}` : ""}
                </p>
              </div>

              {nomeTimeArtilheiro && (
                <img
                  src={escudoTime(nomeTimeArtilheiro)}
                  alt={`Escudo do ${nomeTimeArtilheiro}`}
                  className="award-shield"
                  decoding="async"
                />
              )}
            </div>
          ) : (
            <div className="highlight-info">
              <h2>Nenhum gol registrado</h2>
              <p>A artilharia começará após o primeiro gol.</p>
            </div>
          )}
        </article>

        <article className="highlight-card keeper-card award-card">
          <div className="highlight-title">
            <span className="highlight-icon">🧤</span>
            <strong>Goleiro do mês</strong>
          </div>

          {dados.melhorGoleiro ? (
            <div className="award-content">
              <div className="highlight-info">
                <h2>{capitalizarNome(dados.melhorGoleiro.nome)}</h2>
                <p>
                  {dados.melhorGoleiro.jogos_goleiro ?? 0} jogos ·{" "}
                  {dados.melhorGoleiro.gols_sofridos ?? 0} gols sofridos ·{" "}
                  média {mediaGoleiro}
                </p>
              </div>

              {nomeTimeGoleiro && (
                <img
                  src={escudoTime(nomeTimeGoleiro)}
                  alt={`Escudo do ${nomeTimeGoleiro}`}
                  className="award-shield"
                  decoding="async"
                />
              )}
            </div>
          ) : (
            <div className="highlight-info">
              <h2>Nenhum goleiro registrado</h2>
              <p>O ranking começará após a primeira partida.</p>
            </div>
          )}
        </article>
      </section>

      <section className="summary-grid" aria-label="Resumo do campeonato">
        <div>
          <span className="summary-label">
            <span className="summary-icon">⚔️</span>
            Jogos concluídos
          </span>
          <strong>{dados.jogosEncerrados}</strong>
        </div>

        <div>
          <span className="summary-label">
            <span className="summary-icon">⚽</span>
            Gols
          </span>
          <strong>{dados.totalGols}</strong>
        </div>

        <div>
          <span className="summary-label">
            <span className="summary-icon">↗</span>
            Média de gols
          </span>
          <strong>{dados.mediaGols}</strong>
        </div>
      </section>
    </main>
  );
}

export default Home;