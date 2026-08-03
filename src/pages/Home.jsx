import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { escudoTime } from "../escudos";

function Home() {
  const [dados, setDados] = useState({
    lider: null,
    vice: null,
    lanterna: null,
    artilheiro: null,
    melhorGoleiro: null,
    jogosEncerrados: 0,
    totalGols: 0,
    mediaGols: "0.0",
  });

  const [carregando, setCarregando] =
    useState(true);

  useEffect(() => {
    async function carregarPainel() {
      try {
        const [
          resTimes,
          resArtilheiros,
          resGoleiros,
          resPartidas,
        ] = await Promise.all([
          supabase
            .from("times")
            .select("*")
            .order("pontos", {
              ascending: false,
            })
            .order("saldo", {
              ascending: false,
            })
            .order("gols_pro", {
              ascending: false,
            }),

          supabase
            .from("jogadores")
            .select(
              "nome, gols, times(nome)"
            )
            .eq("goleiro", false)
            .gt("gols", 0)
            .order("gols", {
              ascending: false,
            })
            .limit(1),

          supabase
            .from("jogadores")
            .select(
              "nome, gols_sofridos, jogos_goleiro, times(nome)"
            )
            .eq("goleiro", true)
            .gt("jogos_goleiro", 0)
            .order("gols_sofridos", {
              ascending: true,
            })
            .order("jogos_goleiro", {
              ascending: false,
            })
            .limit(1),

          supabase
            .from("partidas")
            .select("gols_a, gols_b"),
        ]);

        if (resTimes.error) throw resTimes.error;
        if (resArtilheiros.error) {
          throw resArtilheiros.error;
        }
        if (resGoleiros.error) {
          throw resGoleiros.error;
        }
        if (resPartidas.error) {
          throw resPartidas.error;
        }

        const times = resTimes.data || [];
        const partidas =
          resPartidas.data || [];

        const somaGols = partidas.reduce(
          (total, partida) =>
            total +
            Number(partida.gols_a || 0) +
            Number(partida.gols_b || 0),
          0
        );

        const quantidadeJogos =
          partidas.length;

        setDados({
          lider: times[0] || null,
          vice: times[1] || null,
          lanterna:
            times.length > 0
              ? times[times.length - 1]
              : null,

          artilheiro:
            resArtilheiros.data?.[0] ||
            null,

          melhorGoleiro:
            resGoleiros.data?.[0] ||
            null,

          jogosEncerrados:
            quantidadeJogos,

          totalGols: somaGols,

          mediaGols:
            quantidadeJogos > 0
              ? (
                  somaGols /
                  quantidadeJogos
                ).toFixed(1)
              : "0.0",
        });
      } catch (error) {
        console.error(
          "Erro ao carregar painel:",
          error
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarPainel();
  }, []);

  if (carregando) {
    return (
      <main className="page home-page">
        <p className="loading">
          Carregando painel...
        </p>
      </main>
    );
  }

  const nomeTimeArtilheiro =
    dados.artilheiro?.times?.nome || "";

  const mediaGoleiro =
    dados.melhorGoleiro?.jogos_goleiro >
    0
      ? (
          Number(
            dados.melhorGoleiro
              .gols_sofridos || 0
          ) /
          Number(
            dados.melhorGoleiro
              .jogos_goleiro
          )
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

        .home-page .highlight-card h2 {
          margin: 0 0 5px;
          font-size: 1.55rem;
          line-height: 1.15;
        }

        .home-page .highlight-card p {
          margin: 0;
          font-size: 1rem;
          line-height: 1.35;
        }

        .home-page .highlight-info {
          margin-top: 4px;
        }

        .home-page .summary-grid {
          margin-top: 14px;
          gap: 10px;
        }

        .home-page .summary-grid > div {
          padding: 12px 10px;
        }

        .home-page .summary-grid span {
          font-size: 0.8rem;
        }

        .home-page .summary-grid strong {
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

          .home-page .highlight-title strong {
            font-size: 1.12rem;
          }

          .home-page .highlight-person {
            gap: 15px;
          }

          .home-page .home-highlight-shield {
            width: 64px;
            height: 64px;
            flex-basis: 64px;
          }

          .home-page .highlight-card h2 {
            font-size: 1.35rem;
          }

          .home-page .highlight-card p {
            font-size: 0.92rem;
          }
        }
      `}</style>
      <section className="highlight-list">
        <article className="highlight-card leader-card">
          <div className="highlight-title">
            <span className="highlight-icon">
              🏆
            </span>

            <strong>Líder</strong>
          </div>

          {dados.lider ? (
            <div className="highlight-person">
              <img
                src={escudoDoTime(
                  dados.lider
                )}
                alt={`Escudo do ${dados.lider.nome}`}
                className="home-highlight-shield"
                decoding="async"
              />

              <div>
                <h2>
                  {dados.lider.nome}
                </h2>

                <p>
                  {dados.lider.pontos ?? 0}{" "}
                  pontos
                </p>
              </div>
            </div>
          ) : (
            <div className="highlight-info">
              <h2>
                Nenhum time cadastrado
              </h2>
            </div>
          )}
        </article>

        <article className="highlight-card vice-card">
          <div className="highlight-title">
            <span className="highlight-icon">
  🥈
</span>

<strong>Vice-líder</strong>
          </div>

          {dados.vice ? (
            <div className="highlight-person">
              <img
                src={escudoDoTime(
                  dados.vice
                )}
                alt={`Escudo do ${dados.vice.nome}`}
                className="home-highlight-shield"
                decoding="async"
              />

              <div>
                <h2>
                  {dados.vice.nome}
                </h2>

                <p>
                  {dados.vice.pontos ?? 0}{" "}
                  pontos
                </p>
              </div>
            </div>
          ) : (
            <div className="highlight-info">
              <h2>
                Nenhum time cadastrado
              </h2>
            </div>
          )}
        </article>

        <article className="highlight-card lantern-card">
          <div className="highlight-title">
            <span className="highlight-icon">
              🔻
            </span>

            <strong>Lanterna</strong>
          </div>

          {dados.lanterna ? (
            <div className="highlight-person">
              <img
                src={escudoDoTime(
                  dados.lanterna
                )}
                alt={`Escudo do ${dados.lanterna.nome}`}
                className="home-highlight-shield"
                decoding="async"
              />

              <div>
                <h2>
                  {dados.lanterna.nome}
                </h2>

                <p>
                  {dados.lanterna.pontos ??
                    0}{" "}
                  pontos
                </p>
              </div>
            </div>
          ) : (
            <div className="highlight-info">
              <h2>
                Nenhum time cadastrado
              </h2>
            </div>
          )}
        </article>

        <article className="highlight-card scorer-card">
          <div className="highlight-title">
            <span className="highlight-icon">
              ⚽
            </span>

            <strong>
              Artilheiro do mês
            </strong>
          </div>

          <div className="highlight-info">
            {dados.artilheiro ? (
              <>
                <h2>
                  {dados.artilheiro.nome}
                </h2>

                <p>
                  ◎{" "}
                  {dados.artilheiro.gols ??
                    0}{" "}
                  gols
                  {nomeTimeArtilheiro
                    ? ` · ${nomeTimeArtilheiro}`
                    : ""}
                </p>
              </>
            ) : (
              <>
                <h2>
                  Nenhum gol registrado
                </h2>

                <p>
                  A artilharia começará após
                  o primeiro gol.
                </p>
              </>
            )}
          </div>
        </article>

        <article className="highlight-card keeper-card">
          <div className="highlight-title">
            <span className="highlight-icon">
              🧤
            </span>

            <strong>
              Melhor goleiro
            </strong>
          </div>

          <div className="highlight-info">
            {dados.melhorGoleiro ? (
              <>
                <h2>
                  {
                    dados.melhorGoleiro
                      .nome
                  }
                </h2>

                <p>
                  ◯{" "}
                  {dados.melhorGoleiro
                    .jogos_goleiro ?? 0}{" "}
                  jogos ·{" "}
                  {dados.melhorGoleiro
                    .gols_sofridos ?? 0}{" "}
                  gols sofridos · média{" "}
                  {mediaGoleiro}
                </p>
              </>
            ) : (
              <>
                <h2>
                  Nenhum goleiro registrado
                </h2>

                <p>
                  O ranking começará após a
                  primeira partida.
                </p>
              </>
            )}
          </div>
        </article>
      </section>

      <section
        className="summary-grid"
        aria-label="Resumo do campeonato"
      >
        <div>
          <span>Jogos</span>
          <strong>
            {dados.jogosEncerrados}
          </strong>
        </div>

        <div>
          <span>Gols</span>
          <strong>
            {dados.totalGols}
          </strong>
        </div>

        <div>
          <span>Média</span>
          <strong>
            {dados.mediaGols}
          </strong>
        </div>
      </section>
    </main>
  );
}

export default Home;