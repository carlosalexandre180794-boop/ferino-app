function GoleiroMes({ goleiro }) {
  if (!goleiro) {
    return (
      <article className="goalkeeper-card" style={{ background: "#1e1e24", padding: "20px", borderRadius: "8px" }}>
        <span className="panel-label">GOLEIRO DO MÊS</span>
        <h3 style={{ color: "#fff", marginTop: "5px" }}>Nenhum goleiro realizou jogos</h3>
      </article>
    );
  }

  return (
    <article className="goalkeeper-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e1e24", padding: "20px", borderRadius: "8px", borderLeft: "4px solid #22c55e" }}>
      <div>
        <span className="panel-label" style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: "bold" }}>👑 DESTAQUE DA DEFESA</span>
        <h3 style={{ color: "#fff", fontSize: "1.4rem", margin: "4px 0" }}>{goleiro.nome}</h3>
        <p style={{ color: "#aaa", margin: "2px 0" }}>{goleiro.time}</p>
        <small style={{ color: "#4f46e5", fontWeight: "bold" }}>{goleiro.jogosGoleiro} jogo(s) realizado(s)</small>
      </div>

      <div className="clean-sheet" style={{ textAlign: "center", background: "#2a2a32", padding: "10px 15px", borderRadius: "6px" }}>
        <strong style={{ display: "block", fontSize: "1.8rem", color: "#ef4444" }}>{goleiro.golsSofridos}</strong>
        <span style={{ fontSize: "0.75rem", color: "#aaa" }}>gols sofridos</span>
      </div>
    </article>
  );
}

export default GoleiroMes;
