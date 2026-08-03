import { escudoTime } from "../escudos";

function GoleiroMes({
  tipo = "goleiro",
  goleiro,
  artilheiro,
}) {
  const destaque =
    tipo === "artilheiro" ? artilheiro : goleiro;

  const titulo =
    tipo === "artilheiro"
      ? "⚽ ARTILHEIRO"
      : "👑 DESTAQUE DA DEFESA";

  if (!destaque) {
    return (
      <article className="estatistica-destaque-card">
        <span className="estatistica-destaque-titulo">
          {titulo}
        </span>

        <div className="estatistica-destaque-vazio">
          Nenhum destaque disponível
        </div>
      </article>
    );
  }

  const numero =
    tipo === "artilheiro"
      ? destaque.gols
      : destaque.golsSofridos;

  const rotuloNumero =
    tipo === "artilheiro"
      ? numero === 1
        ? "gol"
        : "gols"
      : numero === 1
      ? "gol sofrido"
      : "gols sofridos";

  const rodape =
    tipo === "artilheiro"
      ? `${destaque.gols} ${
          destaque.gols === 1
            ? "gol marcado"
            : "gols marcados"
        }`
      : `${destaque.jogosGoleiro} ${
          destaque.jogosGoleiro === 1
            ? "jogo realizado"
            : "jogos realizados"
        }`;

  return (
    <article className="estatistica-destaque-card">
      <span className="estatistica-destaque-titulo">
        {titulo}
      </span>

      <div className="estatistica-destaque-conteudo">
        <img
          src={escudoTime(destaque.time)}
          alt={`Escudo do ${destaque.time}`}
        />

        <div className="estatistica-destaque-pessoa">
          <strong title={destaque.nome}>
            {destaque.nome}
          </strong>

          <span title={destaque.time}>
            {destaque.time}
          </span>

          <small>{rodape}</small>
        </div>

        <div className="estatistica-destaque-numero">
          <strong>{numero}</strong>
          <span>{rotuloNumero}</span>
        </div>
      </div>
    </article>
  );
}

export default GoleiroMes;