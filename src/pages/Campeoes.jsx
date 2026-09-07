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


function jogoEstaEncerrado(jogo) {
  const status = String(jogo.status || "").toLowerCase();

  return (
    status === "encerrado" ||
    status === "encerrada" ||
    status === "finalizado" ||
    status === "finalizada" ||
    jogo.partida_id !== null
  );
}

function calcularClassificacaoAtual(times, jogos) {
  const mapa = new Map();

  (times || []).forEach((time) => {
    mapa.set(Number(time.id), {
      id: Number(time.id),
      nome: time.nome,
      pontos: 0,
      vitorias: 0,
      golsPro: 0,
      golsContra: 0,
      saldo: 0,
    });
  });

  (jogos || [])
    .filter(jogoEstaEncerrado)
    .forEach((jogo) => {
      const timeA = mapa.get(Number(jogo.time_a_id));
      const timeB = mapa.get(Number(jogo.time_b_id));

      if (!timeA || !timeB) return;

      const golsA = Number(jogo.gols_a ?? 0);
      const golsB = Number(jogo.gols_b ?? 0);

      timeA.golsPro += golsA;
      timeA.golsContra += golsB;
      timeB.golsPro += golsB;
      timeB.golsContra += golsA;

      if (golsA > golsB) {
        timeA.pontos += 3;
        timeA.vitorias += 1;
      } else if (golsB > golsA) {
        timeB.pontos += 3;
        timeB.vitorias += 1;
      } else {
        timeA.pontos += 1;
        timeB.pontos += 1;
      }
    });

  const lista = Array.from(mapa.values()).map((time) => ({
    ...time,
    saldo: time.golsPro - time.golsContra,
  }));

  return lista.sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.saldo - a.saldo ||
      b.golsPro - a.golsPro ||
      a.nome.localeCompare(b.nome, "pt-BR")
  );
}

function Campeoes() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [uploadEmAndamento, setUploadEmAndamento] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("sucesso");
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

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
          artilheiro_nome,
          gols_artilheiro,
          goleiro_nome,
          jogos_goleiro,
          gols_sofridos_goleiro,
          campeao:campeao_time_id ( id, nome ),
          vice:vice_time_id ( id, nome ),
          terceiro:terceiro_time_id ( id, nome ),
          artilheiro_id:artilheiro_jogador_id,
          goleiro_id:goleiro_jogador_id
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

      const itemSalvo =
        dadosCampeoes && dadosCampeoes.length > 0
          ? dadosCampeoes[0]
          : null;

      /*
       * Mês encerrado:
       * usa exclusivamente o registro oficial salvo em campeoes_mensais.
       *
       * Mês em andamento:
       * mesmo que ainda NÃO exista registro em campeoes_mensais, cria um
       * item provisório visual e alimenta os cards com os dados mensais vivos.
       */
      if (campeonatoEncerrado) {
        if (!itemSalvo) {
          setHistorico([]);
          return;
        }

        setHistorico([{
          id: itemSalvo.id,
          mes: itemSalvo.mes,
          ano: itemSalvo.ano,
          provisorio: false,
          campeao: itemSalvo.campeao?.nome || "Não informado",
          vice: itemSalvo.vice?.nome || "Não informado",
          terceiro: itemSalvo.terceiro?.nome || "Não informado",
          campeao_id: itemSalvo.campeao?.id ?? null,
          vice_id: itemSalvo.vice?.id ?? null,
          terceiro_id: itemSalvo.terceiro?.id ?? null,
          artilheiro_id: itemSalvo.artilheiro_id ?? null,
          goleiro_id: itemSalvo.goleiro_id ?? null,
          artilheiro: capitalizarNome(
            itemSalvo.artilheiro_nome || "Não informado"
          ),
          gols_artilheiro: Number(itemSalvo.gols_artilheiro || 0),
          goleiro: capitalizarNome(
            itemSalvo.goleiro_nome || "Não informado"
          ),
          gols_sofridos_goleiro: Number(
            itemSalvo.gols_sofridos_goleiro || 0
          ),
          jogos_goleiro: Number(itemSalvo.jogos_goleiro || 0),
          foto_campeao_url: itemSalvo.foto_campeao,
          foto_vice_url: itemSalvo.foto_vice,
          foto_terceiro_url: itemSalvo.foto_terceiro,
          foto_artilheiro_url: itemSalvo.foto_artilheiro,
          foto_goleiro_url: itemSalvo.foto_goleiro,
        }]);

        return;
      }

      // Sem temporada criada ainda, não existe campeonato para acompanhar.
      if (!temporadaSelecionada?.id) {
        setHistorico([]);
        return;
      }

      const [
        { data: timesAtuais, error: erroTimesAtuais },
        { data: jogosAtuais, error: erroJogosAtuais },
        { data: estatisticasMensais, error: erroEstatisticasMensais },
        { data: goleirosMensais, error: erroGoleirosMensais },
      ] = await Promise.all([
        supabase
          .from("times")
          .select("id, nome"),

        supabase
          .from("jogos_campeonato")
          .select(
            "id, temporada, mes, time_a_id, time_b_id, gols_a, gols_b, status, partida_id"
          )
          .eq("temporada", anoSelecionado)
          .eq("mes", mesSelecionado),

        supabase
          .from("estatisticas_mensais")
          .select(`
            jogador_id,
            jogador_nome_snapshot,
            time_id,
            time_nome_snapshot,
            gols,
            jogos_goleiro,
            gols_sofridos,
            pontos_time,
            saldo_time,
            gols_pro_time
          `)
          .eq("temporada_id", temporadaSelecionada.id),

        supabase.rpc("goleiros_mensal", {
          p_ano: anoSelecionado,
          p_mes: mesSelecionado,
        }),
      ]);

      if (erroTimesAtuais) throw erroTimesAtuais;
      if (erroJogosAtuais) throw erroJogosAtuais;
      if (erroEstatisticasMensais) throw erroEstatisticasMensais;
      if (erroGoleirosMensais) throw erroGoleirosMensais;

      const classificacaoAtual =
        calcularClassificacaoAtual(
          timesAtuais || [],
          jogosAtuais || []
        );

      const jogosEncerrados =
        (jogosAtuais || []).filter(jogoEstaEncerrado);

      const campeaoAtual =
        jogosEncerrados.length > 0
          ? classificacaoAtual[0]?.nome || "Não informado"
          : "Não informado";

      const viceAtual =
        jogosEncerrados.length > 0
          ? classificacaoAtual[1]?.nome || "Não informado"
          : "Não informado";

      const terceiroAtual =
        jogosEncerrados.length > 0
          ? classificacaoAtual[2]?.nome || "Não informado"
          : "Não informado";

      const posicaoPorTime = new Map(
        classificacaoAtual.map((time, indice) => [
          Number(time.id),
          indice + 1,
        ])
      );

      /*
       * Artilharia e goleiros usam estatisticas_mensais.
       * Assim a aba Campeões fica com a MESMA fonte já validada na aba
       * Artilheiros, inclusive respeitando as correções de time por mês.
       */
      const artilheirosOrdenados = (estatisticasMensais || [])
        .filter((registro) => Number(registro.gols || 0) > 0)
        .map((registro) => ({
          id: Number(registro.jogador_id),
          nome:
            registro.jogador_nome_snapshot ||
            "Não informado",
          gols: Number(registro.gols || 0),
          timeId: Number(registro.time_id),
          posicaoTime:
            posicaoPorTime.get(Number(registro.time_id)) ??
            Number.POSITIVE_INFINITY,
        }))
        .sort(
          (a, b) =>
            b.gols - a.gols ||
            a.posicaoTime - b.posicaoTime ||
            a.nome.localeCompare(b.nome, "pt-BR")
        );

      const goleirosOrdenados = (goleirosMensais || [])
        .map((goleiro) => ({
          id: Number(goleiro.id),
          nome: goleiro.nome || "Não informado",
          jogos: Number(goleiro.jogos_goleiro || 0),
          sofridos: Number(goleiro.gols_sofridos || 0),
          media: Number(goleiro.media || 0),
          timeNome: goleiro.nome_time || "Sem time",
        }))
        .filter((goleiro) => goleiro.jogos > 0);

      const artilheiroAtual = artilheirosOrdenados[0] || null;
      const goleiroAtual = goleirosOrdenados[0] || null;

      const itemVisual = {
        // Se já houver linha salva, preserva o ID e as fotos.
        // Se ainda não houver, cria apenas um ID visual provisório.
        id:
          itemSalvo?.id ??
          `provisorio-${anoSelecionado}-${mesSelecionado}`,
        mes: mesSelecionado,
        ano: anoSelecionado,
        provisorio: !itemSalvo,

        campeao: campeaoAtual,
        vice: viceAtual,
        terceiro: terceiroAtual,

        campeao_id: classificacaoAtual[0]?.id ?? null,
        vice_id: classificacaoAtual[1]?.id ?? null,
        terceiro_id: classificacaoAtual[2]?.id ?? null,

        artilheiro_id: artilheiroAtual?.id ?? null,
        artilheiro_time:
          timesAtuais?.find(
            (time) => Number(time.id) === Number(artilheiroAtual?.timeId)
          )?.nome || "Sem time",
        artilheiro: artilheiroAtual
          ? capitalizarNome(artilheiroAtual.nome)
          : "Não informado",
        gols_artilheiro: artilheiroAtual?.gols || 0,

        goleiro_id: goleiroAtual?.id ?? null,
        goleiro_time:
          goleiroAtual?.timeNome || "Sem time",
        goleiro: goleiroAtual
          ? capitalizarNome(goleiroAtual.nome)
          : "Não informado",
        gols_sofridos_goleiro: goleiroAtual?.sofridos || 0,
        jogos_goleiro: goleiroAtual?.jogos || 0,

        foto_campeao_url: itemSalvo?.foto_campeao || null,
        foto_vice_url: itemSalvo?.foto_vice || null,
        foto_terceiro_url: itemSalvo?.foto_terceiro || null,
        foto_artilheiro_url: itemSalvo?.foto_artilheiro || null,
        foto_goleiro_url: itemSalvo?.foto_goleiro || null,
      };

      setHistorico([itemVisual]);
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

  async function garantirRegistroParaFotos(item) {
    if (!item?.provisorio && Number.isFinite(Number(item?.id))) {
      return Number(item.id);
    }

    const { data: existente, error: erroBusca } = await supabase
      .from("campeoes_mensais")
      .select("id")
      .eq("ano", Number(item.ano))
      .eq("mes", Number(item.mes))
      .maybeSingle();

    if (erroBusca) throw erroBusca;

    if (existente?.id) {
      return Number(existente.id);
    }

    const jogosGoleiro = Number(item.jogos_goleiro || 0);
    const golsSofridos = Number(item.gols_sofridos_goleiro || 0);
    const mediaGoleiro =
      jogosGoleiro > 0 ? golsSofridos / jogosGoleiro : null;

    const novoRegistro = {
      ano: Number(item.ano),
      mes: Number(item.mes),
      campeao_time_id: item.campeao_id ?? null,
      vice_time_id: item.vice_id ?? null,
      terceiro_time_id: item.terceiro_id ?? null,
      artilheiro_jogador_id: item.artilheiro_id ?? null,
      goleiro_jogador_id: item.goleiro_id ?? null,
      campeao_nome: item.campeao || "Não informado",
      vice_nome: item.vice || "Não informado",
      terceiro_nome: item.terceiro || "Não informado",
      artilheiro_nome: item.artilheiro || "Não informado",
      artilheiro_time: item.artilheiro_time || "Sem time",
      gols_artilheiro: Number(item.gols_artilheiro || 0),
      goleiro_nome: item.goleiro || "Não informado",
      goleiro_time: item.goleiro_time || "Sem time",
      jogos_goleiro: jogosGoleiro,
      gols_sofridos_goleiro: golsSofridos,
      media_goleiro: mediaGoleiro,
    };

    const { data: criado, error: erroCriacao } = await supabase
      .from("campeoes_mensais")
      .insert(novoRegistro)
      .select("id")
      .single();

    if (erroCriacao) throw erroCriacao;

    return Number(criado.id);
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
      const registroId = await garantirRegistroParaFotos(item);

      const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
      const nomeArquivo = `${colunaFoto}_${registroId}_${Date.now()}.${extensao}`;

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
        .eq("id", registroId);

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
      const registroId = await garantirRegistroParaFotos(item);

      const camposAtualizar = {};
      camposAtualizar[colunaFoto] = null;

      const { error } = await supabase
        .from("campeoes_mensais")
        .update(camposAtualizar)
        .eq("id", registroId);

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
      ) : historico.length === 0 ? (
        <section className="panel" style={{ textAlign: "center", padding: "32px" }}>
          <h3 style={{ marginTop: 0 }}>Nenhum registro para este período</h3>
          <p style={{ color: "#aaa" }}>
            Não encontramos pódios ou destaques salvos para {formatarMesExtenso(mesSelecionado, anoSelecionado)}.
          </p>
        </section>
      ) : (
        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {historico.map((item) => (
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
                  {item.provisorio ? "📊 Acompanhamento Atual:" : "📅 Registro Oficial:"}{" "}
                  {formatarMesExtenso(item.mes, item.ano)}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                
                <div style={{ background: "#1e293b", border: "1px solid #eab308", borderRadius: "10px", overflow: "hidden" }}>
                  {item.foto_campeao_url && (
                    <div
                      onClick={() => setFotoAmpliada(item.foto_campeao_url)}
                      title="Clique para ampliar"
                      style={{
                        height: "320px",
                        background: `url("${item.foto_campeao_url}") center/contain no-repeat`,
                        backgroundColor: "#3b2a0c",
                        cursor: "zoom-in"
                      }}
                    />
                  )}
                  <div style={{ padding: "16px" }}>
                    <span style={{ color: "#eab308", fontWeight: "bold", display: "block", marginBottom: "4px" }}>🏆 1º LUGAR (CAMPEÃO)</span>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "1.4rem" }}>{item.campeao}</h4>
                    {isAdmin && <SeletorFoto item={item} coluna="foto_campeao" rotulo="Campeão" uploadEmAndamento={uploadEmAndamento} enviarFoto={enviarFoto} removerFoto={removerFoto} url={item.foto_campeao_url} />}
                  </div>
                </div>

                <div style={{ background: "#1e293b", border: "1px solid #94a3b8", borderRadius: "10px", overflow: "hidden" }}>
                  {item.foto_vice_url && (
                    <div
                      onClick={() => setFotoAmpliada(item.foto_vice_url)}
                      title="Clique para ampliar"
                      style={{
                        height: "320px",
                        background: `url("${item.foto_vice_url}") center/contain no-repeat`,
                        backgroundColor: "#27303f",
                        cursor: "zoom-in"
                      }}
                    />
                  )}
                  <div style={{ padding: "16px" }}>
                    <span style={{ color: "#94a3b8", fontWeight: "bold", display: "block", marginBottom: "4px" }}>🥈 2º LUGAR (VICE)</span>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "1.4rem" }}>{item.vice}</h4>
                    {isAdmin && <SeletorFoto item={item} coluna="foto_vice" rotulo="Vice-Campeão" uploadEmAndamento={uploadEmAndamento} enviarFoto={enviarFoto} removerFoto={removerFoto} url={item.foto_vice_url} />}
                  </div>
                </div>
                <div style={{ background: "#1e293b", border: "1px solid #cd7f32", borderRadius: "10px", overflow: "hidden" }}>
                  {item.foto_terceiro_url && (
                    <div
                      onClick={() => setFotoAmpliada(item.foto_terceiro_url)}
                      title="Clique para ampliar"
                      style={{
                        height: "320px",
                        background: `url("${item.foto_terceiro_url}") center/contain no-repeat`,
                        backgroundColor: "#33231a",
                        cursor: "zoom-in"
                      }}
                    />
                  )}
                  <div style={{ padding: "16px" }}>
                    <span style={{ color: "#cd7f32", fontWeight: "bold", display: "block", marginBottom: "4px" }}>🥉 3º LUGAR</span>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "1.4rem" }}>{item.terceiro}</h4>
                    {isAdmin && <SeletorFoto item={item} coluna="foto_terceiro" rotulo="3º Colocado" uploadEmAndamento={uploadEmAndamento} enviarFoto={enviarFoto} removerFoto={removerFoto} url={item.foto_terceiro_url} />}
                  </div>
                </div>

              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "10px" }}>

                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", overflow: "hidden" }}>
                  <div
                    onClick={() => item.foto_artilheiro_url && setFotoAmpliada(item.foto_artilheiro_url)}
                    title={item.foto_artilheiro_url ? "Clique para ampliar" : undefined}
                    style={{
                      height: "320px",
                      background: item.foto_artilheiro_url
                        ? `url("${item.foto_artilheiro_url}") center/contain no-repeat`
                        : "linear-gradient(to bottom, #0c2740, #0f172a)",
                      backgroundColor: "#0f172a",
                      cursor: item.foto_artilheiro_url ? "zoom-in" : "default",
                    }}
                  />
                  <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div>
                      <span style={{ color: "#38bdf8", fontWeight: "bold", display: "block", marginBottom: "6px" }}>⚽ Artilheiro do Mês</span>
                      <strong style={{ color: "#fff", fontSize: "1.2rem" }}>{item.artilheiro}</strong>
                    </div>
                    <div style={{ textShadow: "none", textAlign: "right", background: "rgba(56, 189, 248, 0.1)", padding: "8px 12px", borderRadius: "6px" }}>
                      <strong style={{ color: "#38bdf8", fontSize: "1.3rem", display: "block" }}>{item.gols_artilheiro}</strong>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{item.gols_artilheiro === 1 ? "gol" : "gols"}</span>
                    </div>
                  </div>

                           {isAdmin && <div style={{ padding: "0 16px 16px 16px" }}><SeletorFoto item={item} coluna="foto_artilheiro" rotulo="Artilheiro" uploadEmAndamento={uploadEmAndamento} enviarFoto={enviarFoto} removerFoto={removerFoto} url={item.foto_artilheiro_url} /></div>}
                </div>

                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", overflow: "hidden" }}>
                  <div
                    onClick={() => item.foto_goleiro_url && setFotoAmpliada(item.foto_goleiro_url)}
                    title={item.foto_goleiro_url ? "Clique para ampliar" : undefined}
                    style={{
                      height: "320px",
                      background: item.foto_goleiro_url
                        ? `url("${item.foto_goleiro_url}") center/contain no-repeat`
                        : "linear-gradient(to bottom, #14281d, #0f172a)",
                      backgroundColor: "#0f172a",
                      cursor: item.foto_goleiro_url ? "zoom-in" : "default",
                    }}
                  />
                  <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div>
                      <span style={{ color: "#22c55e", fontWeight: "bold", display: "block", marginBottom: "6px" }}>🧤 Paredão do Mês</span>
                      <strong style={{ color: "#fff", fontSize: "1.2rem" }}>{item.goleiro}</strong>
                      <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginTop: "2px" }}>{item.jogos_goleiro || 0} jogos realizados</span>
                    </div>
                    <div style={{ textShadow: "none", textAlign: "right", background: "rgba(34, 197, 94, 0.1)", padding: "8px 12px", borderRadius: "6px" }}>
                      <strong style={{ color: "#22c55e", fontSize: "1.3rem", display: "block" }}>{item.gols_sofridos_goleiro}</strong>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>sofridos</span>
                    </div>
                  </div>
                  {isAdmin && <div style={{ padding: "0 16px 16px 16px" }}><SeletorFoto item={item} coluna="foto_goleiro" rotulo="Melhor Goleiro" uploadEmAndamento={uploadEmAndamento} enviarFoto={enviarFoto} removerFoto={removerFoto} url={item.foto_goleiro_url} /></div>}
                </div>

              </div>
            </article>
          ))}
        </section>
      )}

      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "zoom-out",
            padding: "20px"
          }}
        >
          <img
            src={fotoAmpliada}
            alt="Foto ampliada"
            onClick={(evento) => evento.stopPropagation()}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "calc(100vh - 40px)",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: "10px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
              cursor: "default"
            }}
          />
        </div>
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
