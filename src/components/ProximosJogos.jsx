function ProximosJogos({ jogos }) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-label">PRÓXIMA RODADA</span>
          <h3>Próximos jogos</h3>
        </div>
      </div>

      <div className="matches">
        {jogos.map((jogo) => (
          <div
            className="match"
            key={`${jogo.timeA}-${jogo.timeB}`}
          >
            <div className="match-teams">
              <div className="match-team">
                <img src={jogo.escudoA} alt={jogo.timeA} />
                <strong>{jogo.timeA}</strong>
              </div>

              <span>contra</span>

              <div className="match-team">
                <img src={jogo.escudoB} alt={jogo.timeB} />
                <strong>{jogo.timeB}</strong>
              </div>
            </div>

            <time>{jogo.horario}</time>
          </div>
        ))}
      </div>
    </article>
  );
}

export default ProximosJogos;