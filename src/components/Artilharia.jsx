import { escudoTime } from "../escudos";

function Artilharia({ artilheiros }) {
  return (
    <article className="artilharia-painel">
      <div className="artilharia-lista">
        {artilheiros.length === 0 ? (
          <p className="artilharia-vazio">
            Nenhum gol registrado ainda.
          </p>
        ) : (
          artilheiros.map((jogador, index) => {
            const posicao = index + 1;

            const classeDestaque =
              posicao === 1
                ? "artilharia-top-1"
                : posicao === 2
                ? "artilharia-top-2"
                : posicao === 3
                ? "artilharia-top-3"
                : "";

            return (
              <div
                className={`artilharia-linha ${classeDestaque}`}
                key={jogador.id}
              >
                <span className="artilharia-posicao">
                  {posicao}
                </span>

                <img
                  className="artilharia-escudo"
                  src={escudoTime(jogador.time)}
                  alt={`Escudo do ${jogador.time}`}
                />

                <div className="artilharia-info">
                  <strong title={jogador.nome}>
                    {jogador.nome}
                  </strong>

                  <span title={jogador.time}>
                    {jogador.time}
                  </span>
                </div>

                <div className="artilharia-gols">
                  <strong>{jogador.gols}</strong>
                  <span>
                    {jogador.gols === 1 ? "gol" : "gols"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}

export default Artilharia;