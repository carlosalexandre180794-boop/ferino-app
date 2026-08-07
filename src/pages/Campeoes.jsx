import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

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

const LISTA_MESES = [
  { id: 1, nome: "Janeiro" }, { id: 2, nome: "Fevereiro" }, { id: 3, nome: "Março" },
  { id: 4, nome: "Abril" }, { id: 5, nome: "Maio" }, { id: 6, nome: "Junho" },
  { id: 7, nome: "Julho" }, { id: 8, nome: "Agosto" }, { id: 9, nome: "Setembro" },
  { id: 10, nome: "Outubro" }, { id: 11, nome: "Novembro" }, { id: 12, nome: "Dezembro" }
];

function Campeoes() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [uploadEmAndamento, setUploadEmAndamento] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("sucesso");

  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado] = useState(2026);

  async function carregarHistorico() {
    setCarregando(true);
    setMensagem("");

    try {
      const { data: dadosCampeoes, error: erroCampeoes } = await supabase
        .from("campeoes_mensais")
        .select(`
          id,
          mes,
          ano,
          foto_campeao,
foto_vice,
foto_terceiro,
foto_artilheiro,
foto_goleiro,
          campeao:campeao_time_id ( id, nome ),
          vice:vice_time_id ( id, nome ),
          terceiro:terceiro_time_id ( id, nome ),
          artilheiro_id:artilheiro_jogador_id,
          goleiro_id:goleiro_jogador_id,
          artilheiro_nome,
          gols_artilheiro,
          goleiro_nome,
          jogos_goleiro,
          gols_sofridos_goleiro
        `)
        .eq("mes", mesSelecionado)
        .eq("ano", anoSelecionado);

      if (erroCampeoes) throw erroCampeoes;

      const { data: temporadaSelecionada, error: erroTemporada } =
        await supabase
          .from("temporadas")
          .select("id, status")
          .eq("ano", anoSelecionado)
          .eq("mes", mesSelecionado)
          .maybeSingle();

      if (erroTemporada) throw erroTemporada;

      const campeonatoEncerrado =
        String(temporadaSelecionada?.status || "").toLowerCase() ===
        "encerrada";

      if (!dadosCampeoes || dadosCampeoes.length === 0) {
        setHistorico([]);
        setCarregando(false);
        return;
      }

      const item = dadosCampeoes[0];

      let golsArtilheiro = 0;
      let nomeArtilheiro = "Não informado";
      let artilheiroIdAtual = item.artilheiro_id || null;

      let golsSofridosGoleiro = 0;
      let jogosGoleiro = 0;
      let nomeGoleiro = "Não informado";
      let goleiroIdAtual = item.goleiro_id || null;

      if (!campeonatoEncerrado) {
        const [
          { data: jogadoresAtuais, error: erroJogadoresAtuais },
          { data: goleirosAtuais, error: erroGoleirosAtuais },
        ] = await Promise.all([
          supabase
            .from("jogadores")
            .select(`
              id,
              nome,
              gols,
              times (
                nome,
                pontos,
                saldo,
                gols_pro
              )
            `)
            .gt("gols", 0),

          supabase
            .from("jogadores")
            .select(`
              id,
              nome,
              jogos_goleiro,
              gols_sofridos,
              times (
                nome,
                pontos,
                saldo,
                gols_pro
              )
            `)
            .gt("jogos_goleiro", 0),
        ]);

        if (erroJogadoresAtuais) throw erroJogadoresAtuais;
        if (erroGoleirosAtuais) throw erroGoleirosAtuais;

        const artilheirosOrdenados = (jogadoresAtuais || [])
          .map((jogador) => ({
            ...jogador,
            gols: Number(jogador.gols || 0),
            pontosTime: Number(jogador.times?.pontos || 0),
            saldoTime: Number(jogador.times?.saldo || 0),
            golsProTime: Number(jogador.times?.gols_pro || 0),
          }))
          .sort(
            (a, b) =>
              b.gols - a.gols ||
              b.pontosTime - a.pontosTime ||
              b.saldoTime - a.saldoTime ||
              b.golsProTime - a.golsProTime ||
              a.nome.localeCompare(b.nome, "pt-BR")
          );

        const goleirosOrdenados = (goleirosAtuais || [])
          .map((goleiro) => ({
            ...goleiro,
            jogos_goleiro: Number(goleiro.jogos_goleiro || 0),
            gols_sofridos: Number(goleiro.gols_sofridos || 0),
            pontosTime: Number(goleiro.times?.pontos || 0),
            saldoTime: Number(goleiro.times?.saldo || 0),
            golsProTime: Number(goleiro.times?.gols_pro || 0),
          }))
          .sort((a, b) => {
            const mediaA =
              a.jogos_goleiro > 0
                ? a.gols_sofridos / a.jogos_goleiro
                : Number.POSITIVE_INFINITY;

            const mediaB =
              b.jogos_goleiro > 0
                ? b.gols_sofridos / b.jogos_goleiro
                : Number.POSITIVE_INFINITY;

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

        const artilheiroAtual = artilheirosOrdenados[0] || null;
        const goleiroAtual = goleirosOrdenados[0] || null;

        if (artilheiroAtual) {
          artilheiroIdAtual = artilheiroAtual.id;
          nomeArtilheiro = artilheiroAtual.nome;
          golsArtilheiro = artilheiroAtual.gols;
        }

        if (goleiroAtual) {
          goleiroIdAtual = goleiroAtual.id;
          nomeGoleiro = goleiroAtual.nome;
          golsSofridosGoleiro = goleiroAtual.gols_sofridos;
          jogosGoleiro = goleiroAtual.jogos_goleiro;
        }
      } else {
        if (item.artilheiro_id) {
          const { data: jogador, error: erroJogador } = await supabase
            .from("jogadores")
            .select("nome")
            .eq("id", item.artilheiro_id)
            .single();

          if (erroJogador) throw erroJogador;

          nomeArtilheiro =
            item.artilheiro_nome ||
            jogador?.nome ||
            "Não informado";

          golsArtilheiro = Number(item.gols_artilheiro || 0);
        }

        if (item.goleiro_id) {
          const { data: goleiro, error: erroGoleiro } = await supabase
            .from("jogadores")
            .select("nome")
            .eq("id", item.goleiro_id)
            .single();

          if (erroGoleiro) throw erroGoleiro;

          nomeGoleiro =
            item.goleiro_nome ||
            goleiro?.nome ||
            "Não informado";

          golsSofridosGoleiro = Number(
            item.gols_sofridos_goleiro || 0
          );

          jogosGoleiro = Number(item.jogos_goleiro || 0);
        }
      }

      const dadosFormatados = [{
        id: item.id,
        mes: item.mes,
        ano: item.ano,
        campeao: item.campeao?.nome || "Não informado",
        vice: item.vice?.nome || "Não informado",
        terceiro: item.terceiro?.nome || "Não informado",
        artilheiro: nomeArtilheiro,
        gols_artilheiro: golsArtilheiro,
        goleiro: nomeGoleiro,
        gols_sofridos_goleiro: golsSofridosGoleiro,
        jogos_goleiro: jogosGoleiro,
        foto_campeao_url: item.foto_campeao,
foto_vice_url: item.foto_vice,
foto_terceiro_url: item.foto_terceiro,
foto_artilheiro_url: item.foto_artilheiro,
foto_goleiro_url: item.foto_goleiro,
      }];

      setHistorico(dadosFormatados);
    } catch (erro) {
      console.error("Erro ao carregar campeões dinâmicos:", erro);
      setHistorico([]);
      setTipoMensagem("erro");
      setMensagem(`Erro ao carregar o histórico: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, [mesSelecionado, anoSelecionado]);
  function verificarSenhaAdmin(evento) {
    evento.preventDefault();
    if (senhaDigitada === "ferino2026") {
      setIsAdmin(true);
      setSenhaDigitada("");
      setTipoMensagem("sucesso");
      setMensagem("Modo administrador ativado.");
      return;
    }
    setTipoMensagem("erro");
    setMensagem("Senha incorreta.");
  }

  function formatarMesExtenso(mesNum, anoNum) {
    const nomeMes = LISTA_MESES.find(m => m.id === mesNum)?.nome || "";
    return `${nomeMes} de ${anoNum}`;
  }

  async function enviarFoto(item, arquivo, colunaFoto) {
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setTipoMensagem("erro");
      setMensagem("Selecione um arquivo de imagem.");
      return;
    }

    const tamanhoMaximo = 5 * 1024 * 1024;
    if (arquivo.size > tamanhoMaximo) {
      setTipoMensagem("erro");
      setMensagem("A imagem deve ter no máximo 5 MB.");
      return;
    }

    const chaveUpload = `${item.id}_${colunaFoto}`;
    setUploadEmAndamento(chaveUpload);
    setMensagem("");

    try {
      const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
      const nomeArquivo = `${colunaFoto}_${item.id}_${Date.now()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("fotos-campeonatos")
        .upload(nomeArquivo, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type,
        });

      if (erroUpload) throw erroUpload;

      const { data: dadosUrl } = supabase.storage
        .from("fotos-campeonatos")
        .getPublicUrl(nomeArquivo);

      const urlPublica = dadosUrl?.publicUrl;
      if (!urlPublica) {
        throw new Error("Não foi possível obter a URL pública da foto.");
      }

      const camposAtualizar = {};
      camposAtualizar[colunaFoto] = urlPublica;

      const { error: erroAtualizacao } = await supabase
        .from("campeoes_mensais")
        .update(camposAtualizar)
        .eq("id", item.id);

      if (erroAtualizacao) throw erroAtualizacao;

      setTipoMensagem("sucesso");
      setMensagem("Foto salva com sucesso.");
      await carregarHistorico();
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      setTipoMensagem("erro");
      setMensagem(`Erro ao enviar a foto: ${error.message}`);
    } finally {
      setUploadEmAndamento(null);
    }
  }

  async function removerFoto(item, colunaFoto, rotuloTime) {
    const confirmar = window.confirm(`Deseja remover a foto do ${rotuloTime}?`);
    if (!confirmar) return;

    const chaveUpload = `${item.id}_${colunaFoto}`;
    setUploadEmAndamento(chaveUpload);
    setMensagem("");

    try {
      const camposAtualizar = {};
      camposAtualizar[colunaFoto] = null;

      const { error } = await supabase
        .from("campeoes_mensais")
        .update(camposAtualizar)
        .eq("id", item.id);

      if (error) throw error;

      setTipoMensagem("sucesso");
      setMensagem(`Foto do ${rotuloTime} removida do histórico.`);
      await carregarHistorico();
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      setTipoMensagem("erro");
      setMensagem(`Erro ao remover a foto: ${error.message}`);
    } finally {
      setUploadEmAndamento(null);
    }
  }

  const dadosExibidos =
    historico.length > 0
      ? historico
      : [
          {
            id: 0,
            mes: mesSelecionado,
            ano: anoSelecionado,
            campeao: "Aguardando definição",
            vice: "Aguardando definição",
            terceiro: "Aguardando definição",
            artilheiro: "Sem registro",
            gols_artilheiro: 0,
            goleiro: "Sem registro",
            gols_sofridos_goleiro: 0,
            jogos_goleiro: 0,
            foto_campeao_url: null,
foto_vice_url: null,
foto_terceiro_url: null,
foto_artilheiro_url: null,
foto_goleiro_url: null,
          },
        ];

  return (
    <main className="page">
      <section
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "24px"
        }}
      >
        <div>
          <span className="panel-label">GALERIA DE HONRA</span>
          <h2>Campeões do Mês</h2>
          <p>Histórico completo dos três primeiros colocados e destaques do Ferino Pé de Pano.</p>
        </div>

        {!isAdmin ? (
          <form onSubmit={verificarSenhaAdmin} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="password"
              value={senhaDigitada}
              onChange={(evento) => setSenhaDigitada(evento.target.value)}
              placeholder="Senha do administrador"
              autoComplete="current-password"
              style={{
                padding: "10px 12px",
                background: "#1e1e24",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: "6px"
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 16px",
                border: "1px solid #4f46e5",
                borderRadius: "6px",
                background: "#312e81",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Administrar fotos
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsAdmin(false);
              setMensagem("");
            }}
            style={{
              padding: "10px 16px",
              border: "1px solid #555",
              borderRadius: "6px",
              background: "transparent",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            Sair do modo administrador
          </button>
        )}
      </section>

      <section style={{ marginBottom: "24px", background: "#111827", padding: "16px", borderRadius: "10px", border: "1px solid #25324a" }}>
        <label htmlFor="select-mes-campeoes" style={{ marginRight: "12px", fontWeight: "bold", color: "#fff" }}>
          Filtrar Galeria por Mês:
        </label>
        <select
          id="select-mes-campeoes"
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(Number(e.target.value))}
          style={{ padding: "8px 16px", borderRadius: "6px", background: "#1f2937", color: "#fff", border: "1px solid #4b5563" }}
        >
          {LISTA_MESES.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      </section>

      {mensagem && (
        <div
          style={{
            padding: "14px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
            color: "#fff",
            background: tipoMensagem === "sucesso" ? "#153b2a" : "#4a1f2a",
            borderLeft: tipoMensagem === "sucesso" ? "4px solid #22c55e" : "4px solid #ef4444"
          }}
        >
          {mensagem}
        </div>
      )}

      {carregando ? (
        <p style={{ textAlign: "center", color: "#fff" }}>Carregando galeria...</p>
      ) : (
        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {dadosExibidos.map((item) => (
            <article
              key={item.id}
              style={{
                background: "#111827",
                border: "1px solid #25324a",
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
                padding: "24px"
              }}
            >
              <div style={{ marginBottom: "20px", borderBottom: "1px solid #25324a", paddingBottom: "12px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#facc15" }}>
                  📅 Registro Oficial: {formatarMesExtenso(item.mes, item.ano)}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                
                <div style={{ background: "#1e293b", border: "1px solid #eab308", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ height: "160px", background: item.foto_campeao_url ? `url("${item.foto_campeao_url}") center/cover` : "linear-gradient(to bottom, #3b2a0c, #1e293b)" }} />
                  <div style={{ padding: "16px" }}>
                    <span style={{ color: "#eab308", fontWeight: "bold", display: "block", marginBottom: "4px" }}>🏆 1º LUGAR (CAMPEÃO)</span>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "1.4rem" }}>{item.campeao}</h4>
                    {isAdmin && item.id !== 0 && <SeletorFoto item={item} coluna="foto_campeao" rotulo="Campeão" uploadEmAndamento={uploadEmAndamento} enviarFoto={enviarFoto} removerFoto={removerFoto} url={item.foto_campeao_url} />}
                  </div>
                </div>

                <div style={{ background: "#1e293b", border: "1px solid #94a3b8", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ height: "160px", background: item.foto_vice_url ? `url("${item.foto_vice_url}") center/cover` : "linear-gradient(to bottom, #27303f, #1e293b)" }} />
                  <div style={{ padding: "16px" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "bold", display: "block", marginBottom: "4px" }}>🥈 2º LUGAR (VICE)</span>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "1.4rem" }}>{item.vice}</h4>
                    {isAdmin && item.id !== 0 && <SeletorFoto item={item} coluna="foto_vice" rotulo="Vice-Campeão" uploadEmAndamento={uploadEmAndamento} enviarFoto={enviarFoto} removerFoto={removerFoto} url={item.foto_vice_url} />}
                  </div>
                </div>
                <div style={{ background: "#1e293b", border: "1px solid #cd7f32", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ height: "160px", background: item.foto_terceiro_url ? `url("${item.foto_terceiro_url}") center/cover` : "linear-gradient(to bottom, #33231a, #1e293b)" }} />
                  <div style={{ padding: "16px" }}>
                    <span style={{ color: "#cd7f32", fontWeight: "bold", display: "block", marginBottom: "4px" }}>🥉 3º LUGAR</span>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "1.4rem" }}>{item.terceiro}</h4>
                    {isAdmin && item.id !== 0 && <SeletorFoto item={item} coluna="foto_terceiro" rotulo="3º Colocado" uploadEmAndamento={uploadEmAndamento} enviarFoto={enviarFoto} removerFoto={removerFoto} url={item.foto_terceiro_url} />}
                  </div>
                </div>

              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "10px" }}>
                
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "220px",
                      background: item.foto_artilheiro_url
                        ? `url("${item.foto_artilheiro_url}") center/cover`
                        : "linear-gradient(to bottom, rgba(14, 77, 120, 0.55), #0f172a)",
                    }}
                  />
                  <div style={{ padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <div>
                        <span style={{ color: "#38bdf8", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
                          ⚽ Artilheiro do Mês
                        </span>
                        <strong style={{ color: "#fff", fontSize: "1.2rem" }}>
                          {capitalizarNome(item.artilheiro)}
                        </strong>
                      </div>

                      <div style={{ textShadow: "none", textAlign: "right", background: "rgba(56, 189, 248, 0.1)", padding: "8px 12px", borderRadius: "6px" }}>
                        <strong style={{ color: "#38bdf8", fontSize: "1.3rem", display: "block" }}>
                          {item.gols_artilheiro}
                        </strong>
                        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                          {item.gols_artilheiro === 1 ? "gol" : "gols"}
                        </span>
                      </div>
                    </div>

                    {isAdmin && item.id !== 0 && (
                      <SeletorFoto
                        item={item}
                        coluna="foto_artilheiro"
                        rotulo="Artilheiro"
                        uploadEmAndamento={uploadEmAndamento}
                        enviarFoto={enviarFoto}
                        removerFoto={removerFoto}
                        url={item.foto_artilheiro_url}
                      />
                    )}
                  </div>
                </div>

                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "220px",
                      background: item.foto_goleiro_url
                        ? `url("${item.foto_goleiro_url}") center/cover`
                        : "linear-gradient(to bottom, rgba(22, 101, 52, 0.55), #0f172a)",
                    }}
                  />
                  <div style={{ padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <div>
                        <span style={{ color: "#4ade80", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
                          🧤 Paredão do Mês
                        </span>
                        <strong style={{ color: "#fff", fontSize: "1.2rem" }}>
                          {capitalizarNome(item.goleiro)}
                        </strong>
                        <small style={{ color: "#94a3b8", display: "block", marginTop: "4px" }}>
                          {item.jogos_goleiro} jogos realizados
                        </small>
                      </div>

                      <div style={{ textShadow: "none", textAlign: "right", background: "rgba(74, 222, 128, 0.1)", padding: "8px 12px", borderRadius: "6px" }}>
                        <strong style={{ color: "#4ade80", fontSize: "1.3rem", display: "block" }}>
                          -{item.gols_sofridos_goleiro}
                        </strong>
                        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                          {item.gols_sofridos_goleiro === 1 ? "gol sofrido" : "gols sofridos"}
                        </span>
                      </div>
                    </div>

                    {isAdmin && item.id !== 0 && (
                      <SeletorFoto
                        item={item}
                        coluna="foto_goleiro"
                        rotulo="Paredão"
                        uploadEmAndamento={uploadEmAndamento}
                        enviarFoto={enviarFoto}
                        removerFoto={removerFoto}
                        url={item.foto_goleiro_url}
                      />
                    )}
                  </div>
                </div>

              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function SeletorFoto({ item, coluna, rotulo, uploadEmAndamento, enviarFoto, removerFoto, url }) {
  const chaveAtiva = `${item.id}_${coluna}`;
  return (
    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #334155" }}>
      <label style={{ display: "block", color: "#94a3b8", fontSize: "0.8rem", marginBottom: "6px" }}>
        Atualizar Foto do {rotulo}:
      </label>
      <input
        type="file"
        accept="image/*"
        disabled={uploadEmAndamento === chaveAtiva}
        onChange={(evento) => {
          const arquivo = evento.target.files && evento.target.files.length > 0 ? evento.target.files[0] : null;
          enviarFoto(item, arquivo, coluna);

          evento.target.value = "";
        }}
        style={{ width: "100%", color: "#fff", fontSize: "0.85rem", marginBottom: "8px" }}
      />
      {url && (
        <button
          type="button"
          onClick={() => removerFoto(item, coluna, rotulo)}
          disabled={uploadEmAndamento === chaveAtiva}
          style={{ padding: "6px 10px", border: "1px solid #ef4444", borderRadius: "4px", background: "transparent", color: "#fca5a5", cursor: "pointer", fontSize: "0.8rem" }}
        >
          Remover imagem
        </button>
      )}
      {uploadEmAndamento === chaveAtiva && (
        <p style={{ color: "#facc15", fontSize: "0.8rem", margin: "4px 0 0" }}>Enviando imagem...</p>
      )}
    </div>
  );
}

export default Campeoes;