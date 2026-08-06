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
    lanterna: null,
    artilheiro: null,
    melhorGoleiro: null,
    jogosEncerrados: 0,
    totalGols: 0,
    mediaGols: "0.0",
  });

  const [carregando, setCarregando] = useState(true);

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
            .order("pontos", { ascending: false })
            .order("saldo", { ascending: false })
            .order("gols_pro", { ascending: false }),

          supabase
            .from("jogadores")
            .select("nome, gols, times(nome)")
            .eq("goleiro", false)
            .gt("gols", 0)
            .order("gols", { ascending: false })
            .order("nome", { ascending: true })
            .limit(1),

          supabase
            .from("jogadores")
            .select(`
              id,
              nome,
              gols_sofridos,
              jogos_goleiro,
              times (
                nome,
                pontos,
                saldo,
                gols_pro
              )
            `)
            .eq("goleiro", true),

          supabase
            .from("partidas")
            .select("gols_a, gols_b"),
        ]);

        if (resTimes.error) throw resTimes.error;
        if (resArtilheiros.error) throw resArtilheiros.error;
        if (resGoleiros.error) throw resGoleiros.error;
        if (resPartidas.error) throw resPartidas.error;

        const times = resTimes.data || [];
        const partidas = resPartidas.data || [];

        const goleirosOrdenados = (resGoleiros.data || [])
          .map((goleiro) => ({
            ...goleiro,
            gols_sofridos: Number(goleiro.gols_sofridos || 0),
            jogos_goleiro: Number(goleiro.jogos_goleiro || 0),
            pontosTime: Number(goleiro.times?.pontos || 0),
            saldoTime: Number(goleiro.times?.saldo || 0),
            golsProTime: Number(goleiro.times?.gols_pro || 0),
          }))
          .filter((goleiro) => goleiro.jogos_goleiro > 0)
          .sort((a, b) => {
            const mediaA = a.gols_sofridos / a.jogos_goleiro;
            const mediaB = b.gols_sofridos / b.jogos_goleiro;

            return (
              mediaA - mediaB ||
              a.gols_sofridos - b.gols_sofridos ||
              b.jogos_goleiro - a.jogos_goleiro ||
              b.pontosTime - a.pontosTime ||
              b.saldoTime - a.saldoTime ||
              b.golsProTime - a.golsProTime ||
              a.nome.localeCompare(b.nome, "pt-BR")
            );
          });

        const somaGols = partidas.reduce(
          (total, partida) =>
            total +
            Number(partida.gols_a || 0) +
            Number(partida.gols_b || 0),
          0
        );

        const quantidadeJogos = partidas.length;

        setDados({
          lider: times[0] || null,
          vice: times[1] || null,
          lanterna:
            times.length > 0 ? times[times.length - 1] : null,
          artilheiro: resArtilheiros.data?.[0] || null,
          melhorGoleiro: goleirosOrdenados[0] || null,
          jogosEncerrados: quantidadeJogos,
          totalGols: somaGols,
          mediaGols:
            quantidadeJogos > 0
              ? (somaGols / quantidadeJogos).toFixed(1)
              : "0.0",
        });
      } catch (error) {
        console.error("Erro ao carregar painel:", error);
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

  const nomeTimeArtilheiro = dados.artilheiro?.times?.nome || "";
  const nomeTimeGoleiro = dados.melhorGoleiro?.times?.nome || "";

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
              <strong>Lanterna</strong>
            </div>

            {dados.lanterna ? (
              <div className="highlight-person">
                <img
                  src={escudoDoTime(dados.lanterna)}
                  alt={`Escudo do ${dados.lanterna.nome}`}
                  className="home-highlight-shield"
                  decoding="async"
                />

                <div>
                  <h2>{dados.lanterna.nome}</h2>
                  <p>{dados.lanterna.pontos ?? 0} pontos</p>
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