import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Campeoes() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [uploadEmAndamento, setUploadEmAndamento] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("sucesso");

  async function carregarHistorico() {
    setCarregando(true);
    setMensagem("");

    const { data, error } = await supabase
      .from("campeoes_mes")
      .select(`
        id,
        data_registro,
        campeao,
        vice,
        artilheiro,
        gols_artilheiro,
        goleiro,
        media_gols,
        foto_campeao_url,
        created_at
      `)
      .order("data_registro", { ascending: false });

    if (error) {
      console.error("Erro ao carregar campeões:", error);
      setHistorico([]);
      setTipoMensagem("erro");
      setMensagem(`Erro ao carregar o histórico: ${error.message}`);
    } else {
      setHistorico(data || []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

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

  function formatarMes(dataRegistro) {
    if (!dataRegistro) return "Mês não informado";

    return new Date(`${dataRegistro}T12:00:00`)
      .toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
      .replace(/^./, (letra) => letra.toUpperCase());
  }

  async function enviarFoto(item, arquivo) {
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

    setUploadEmAndamento(item.id);
    setMensagem("");

    try {
      const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
      const nomeArquivo = `campeao_${item.id}_${Date.now()}.${extensao}`;

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

      const { error: erroAtualizacao } = await supabase
        .from("campeoes_mes")
        .update({
          foto_campeao_url: urlPublica,
        })
        .eq("id", item.id);

      if (erroAtualizacao) throw erroAtualizacao;

      setTipoMensagem("sucesso");
      setMensagem(`Foto do campeão ${item.campeao} salva com sucesso.`);
      await carregarHistorico();
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      setTipoMensagem("erro");
      setMensagem(`Erro ao enviar a foto: ${error.message}`);
    } finally {
      setUploadEmAndamento(null);
    }
  }

  async function removerFoto(item) {
    const confirmar = window.confirm(
      `Deseja remover a foto do campeão ${item.campeao}?`
    );

    if (!confirmar) return;

    setUploadEmAndamento(item.id);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("campeoes_mes")
        .update({
          foto_campeao_url: null,
        })
        .eq("id", item.id);

      if (error) throw error;

      setTipoMensagem("sucesso");
      setMensagem("Foto removida do histórico.");
      await carregarHistorico();
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      setTipoMensagem("erro");
      setMensagem(`Erro ao remover a foto: ${error.message}`);
    } finally {
      setUploadEmAndamento(null);
    }
  }

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
        }}
      >
        <div>
          <span className="panel-label">GALERIA DE HONRA</span>
          <h2>Campeões do Mês</h2>
          <p>
            Histórico automático dos campeões e destaques do Ferino Pé de Pano.
          </p>
        </div>

        {!isAdmin ? (
          <form
            onSubmit={verificarSenhaAdmin}
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
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
                borderRadius: "6px",
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
                fontWeight: "bold",
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
              cursor: "pointer",
            }}
          >
            Sair do modo administrador
          </button>
        )}
      </section>

      {mensagem && (
        <div
          style={{
            padding: "14px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
            color: "#fff",
            background:
              tipoMensagem === "sucesso" ? "#153b2a" : "#4a1f2a",
            borderLeft:
              tipoMensagem === "sucesso"
                ? "4px solid #22c55e"
                : "4px solid #ef4444",
          }}
        >
          {mensagem}
        </div>
      )}

      {carregando ? (
        <p style={{ textAlign: "center", color: "#fff" }}>
          Carregando histórico...
        </p>
      ) : historico.length === 0 ? (
        <section
          className="panel"
          style={{
            textAlign: "center",
            padding: "32px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Nenhum campeão registrado</h3>
          <p style={{ color: "#aaa" }}>
            O primeiro registro aparecerá automaticamente após o encerramento
            de um campeonato.
          </p>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "22px",
          }}
        >
          {historico.map((item) => (
            <article
              key={item.id}
              style={{
                overflow: "hidden",
                background: "#111827",
                border: "1px solid #25324a",
                borderRadius: "14px",
                boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  minHeight: "210px",
                  background: item.foto_campeao_url
                    ? `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.65)), url("${item.foto_campeao_url}") center/cover`
                    : "linear-gradient(135deg, #2b2111, #111827)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "22px",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      background: "rgba(0,0,0,.65)",
                      color: "#facc15",
                      fontWeight: "bold",
                      fontSize: "0.82rem",
                    }}
                  >
                    📅 {formatarMes(item.data_registro)}
                  </span>

                  <h3
                    style={{
                      margin: "12px 0 0",
                      color: "#fff",
                      fontSize: "1.65rem",
                      textShadow: "0 2px 8px rgba(0,0,0,.8)",
                    }}
                  >
                    🏆 {item.campeao || "Campeão não informado"}
                  </h3>
                </div>
              </div>

              <div style={{ padding: "22px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <Dado
                    titulo="🥈 Vice"
                    valor={item.vice || "Não informado"}
                  />

                  <Dado
                    titulo="⚽ Artilheiro"
                    valor={
                      item.artilheiro
                        ? `${item.artilheiro} · ${item.gols_artilheiro || 0} gols`
                        : "Não informado"
                    }
                  />

                  <Dado
                    titulo="🧤 Melhor goleiro"
                    valor={item.goleiro || "Não informado"}
                  />

                  <Dado
                    titulo="📈 Média de gols"
                    valor={`${Number(item.media_gols || 0).toFixed(2)} por partida`}
                  />
                </div>

                {isAdmin && (
                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "18px",
                      borderTop: "1px solid #2a3448",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        color: "#aaa",
                        fontSize: "0.85rem",
                        marginBottom: "8px",
                      }}
                    >
                      Foto do campeão
                    </label>

                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadEmAndamento === item.id}
                      onChange={(evento) => {
                        const arquivo = evento.target.files?.[0];
                        enviarFoto(item, arquivo);
                        evento.target.value = "";
                      }}
                      style={{
                        width: "100%",
                        color: "#fff",
                        marginBottom: "10px",
                      }}
                    />

                    {item.foto_campeao_url && (
                      <button
                        type="button"
                        onClick={() => removerFoto(item)}
                        disabled={uploadEmAndamento === item.id}
                        style={{
                          padding: "9px 12px",
                          border: "1px solid #ef4444",
                          borderRadius: "6px",
                          background: "transparent",
                          color: "#fca5a5",
                          cursor: "pointer",
                        }}
                      >
                        Remover foto
                      </button>
                    )}

                    {uploadEmAndamento === item.id && (
                      <p style={{ color: "#facc15", marginBottom: 0 }}>
                        Enviando foto...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function Dado({ titulo, valor }) {
  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "9px",
        background: "#1e293b",
        border: "1px solid #2b3950",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: "6px",
          color: "#94a3b8",
          fontSize: "0.78rem",
          fontWeight: "bold",
          textTransform: "uppercase",
        }}
      >
        {titulo}
      </span>

      <strong style={{ color: "#fff", lineHeight: 1.35 }}>
        {valor}
      </strong>
    </div>
  );
}

export default Campeoes;