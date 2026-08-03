function Artilharia({ artilheiros }) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-label">DESTAQUES</span>
          <h3>Artilharia</h3>
        </div>
      </div>

      <div className="scorers">
        {artilheiros.length === 0 ? (
          <p style={{ color: "#fff" }}>
            Nenhum gol registrado ainda.
          </p>
        ) : (
          artilheiros.map((jogador, index) => (
            <div className="scorer" key={jogador.id}>
              <span className="scorer-position">
                {index + 1}
              </span>

              <div className="scorer-info">
                <strong>{jogador.nome}</strong>
                <span>{jogador.time}</span>
              </div>

              <div className="goal-count">
                <strong>{jogador.gols}</strong>
                <span>gols</span>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export default Artilharia;