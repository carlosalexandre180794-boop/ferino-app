import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AdminLogin from "../components/AdminLogin";
import {
  adminEstaAtivo,
  desativarModoAdmin,
} from "../auth/adminAuth";

const CHAVE_ANO = "ferino_ano_ativo";
const CHAVE_MES = "ferino_mes_ativo";

function Campeonato() {
  const navigate = useNavigate();
  const [adminLiberado, setAdminLiberado] = useState(
    adminEstaAtivo()
  );

  const anoAtual = Number(
    localStorage.getItem(CHAVE_ANO) || 2026
  );

  const mesAtual = Number(
    localStorage.getItem(CHAVE_MES) || 8
  );

  const [ano, setAno] = useState(anoAtual);
  const [mes, setMes] = useState(mesAtual);
  const [gerando, setGerando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] =
    useState("sucesso");

function sairModoAdministrador() {
  desativarModoAdmin();
  setAdminLiberado(false);
}

  const confrontos = useMemo(
    () => [
      ["Flamengo", "Vasco"],
      ["São Paulo", "Palmeiras"],
      ["Sport", "Grêmio"],
      ["Flamengo", "Ceará"],
      ["Vasco", "São Paulo"],
      ["Palmeiras", "Sport"],
      ["Grêmio", "Ceará"],
      ["Flamengo", "São Paulo"],
      ["Vasco", "Palmeiras"],
      ["Sport", "Ceará"],
      ["Flamengo", "Grêmio"],
      ["Vasco", "Sport"],
      ["São Paulo", "Grêmio"],
      ["Palmeiras", "Ceará"],
      ["Flamengo", "Sport"],
      ["Vasco", "Grêmio"],
      ["São Paulo", "Ceará"],
      ["Flamengo", "Palmeiras"],
      ["Vasco", "Ceará"],
      ["São Paulo", "Sport"],
      ["Palmeiras", "Grêmio"],
    ],
    []
  );

  const datasDasRodadas = useMemo(
    () => obterSabadosDoMes(ano, mes),
    [ano, mes]
  );

  const totalDeJogos =
    datasDasRodadas.length * confrontos.length;

  const nomeDoMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(new Date(ano, mes - 1, 1));

  function obterSabadosDoMes(anoSelecionado, mesSelecionado) {
    const sabados = [];
    const dataAtual = new Date(
      anoSelecionado,
      mesSelecionado - 1,
      1
    );

    while (
      dataAtual.getMonth() === mesSelecionado - 1
    ) {
      if (dataAtual.getDay() === 6) {
        const anoData = dataAtual.getFullYear();
        const mesData = String(
          dataAtual.getMonth() + 1
        ).padStart(2, "0");
        const diaData = String(
          dataAtual.getDate()
        ).padStart(2, "0");

        sabados.push(
          `${anoData}-${mesData}-${diaData}`
        );
      }

      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return sabados;
  }

  function normalizarTexto(texto) {
    return String(texto || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function salvarMesAtivo(anoAtivo, mesAtivo) {
    localStorage.setItem(CHAVE_ANO, String(anoAtivo));
    localStorage.setItem(CHAVE_MES, String(mesAtivo));
    window.dispatchEvent(new Event("ferino-mes-alterado"));
  }

  function definirMesAtivo() {
    salvarMesAtivo(ano, mes);

    setTipoMensagem("sucesso");
    setMensagem(
      `✅ ${capitalizar(nomeDoMes)} de ${ano} foi definido como o mês ativo do aplicativo.`
    );
  }

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  async function gerarCampeonato() {
    if (gerando) return;

    const confirmar = window.confirm(
      `Deseja gerar ${totalDeJogos} jogos para ${nomeDoMes} de ${ano}?`
    );

    if (!confirmar) return;

    setGerando(true);
    setMensagem("");

    try {
      const { data: times, error: erroTimes } =
        await supabase
          .from("times")
          .select("id, nome")
          .order("nome", { ascending: true });

      if (erroTimes) {
        throw new Error(
          `Erro ao carregar os times: ${erroTimes.message}`
        );
      }

      if (!times || times.length < 7) {
        throw new Error(
          "Não foram encontrados os 7 times no banco."
        );
      }

      function encontrarTime(nome) {
        return times.find(
          (time) =>
            normalizarTexto(time.nome) ===
            normalizarTexto(nome)
        );
      }

      const nomesDosTimes = [
        "Flamengo",
        "Vasco",
        "São Paulo",
        "Palmeiras",
        "Sport",
        "Grêmio",
        "Ceará",
      ];

      const timesNaoEncontrados =
        nomesDosTimes.filter(
          (nome) => !encontrarTime(nome)
        );

      if (timesNaoEncontrados.length > 0) {
        throw new Error(
          `Times não encontrados: ${timesNaoEncontrados.join(
            ", "
          )}`
        );
      }

      const {
        data: jogosExistentes,
        error: erroConsulta,
      } = await supabase
        .from("jogos_campeonato")
        .select("id")
        .eq("temporada", ano)
        .eq("mes", mes)
        .limit(1);

      if (erroConsulta) {
        throw new Error(
          `Erro ao verificar o campeonato: ${erroConsulta.message}`
        );
      }

      if (
        jogosExistentes &&
        jogosExistentes.length > 0
      ) {
        definirMesAtivo();

        setTipoMensagem("erro");
        setMensagem(
          `O campeonato de ${nomeDoMes} de ${ano} já foi gerado. O mês foi definido como ativo.`
        );

        return;
      }

      const jogosParaInserir = [];

      datasDasRodadas.forEach(
        (dataJogo, indiceRodada) => {
          confrontos.forEach(
            ([nomeTimeA, nomeTimeB], indiceJogo) => {
              const timeA =
                encontrarTime(nomeTimeA);
              const timeB =
                encontrarTime(nomeTimeB);

              jogosParaInserir.push({
                temporada: ano,
                mes,
                rodada: indiceRodada + 1,
                ordem_jogo: indiceJogo + 1,
                data_jogo: dataJogo,
                time_a_id: timeA.id,
                time_b_id: timeB.id,
                status: "pendente",
                gols_a: null,
                gols_b: null,
                partida_id: null,
              });
            }
          );
        }
      );

      const { error: erroInsercao } =
        await supabase
          .from("jogos_campeonato")
          .insert(jogosParaInserir);

      if (erroInsercao) {
        throw new Error(
          `Erro ao gerar os jogos: ${erroInsercao.message}`
        );
      }

      salvarMesAtivo(ano, mes);

      setTipoMensagem("sucesso");
      setMensagem(
        `✅ Campeonato de ${nomeDoMes} de ${ano} gerado com sucesso: ${totalDeJogos} jogos em ${datasDasRodadas.length} sábados.`
      );
    } catch (erro) {
      console.error(
        "Erro ao gerar campeonato:",
        erro
      );

      setTipoMensagem("erro");
      setMensagem(
        erro.message ||
          "Não foi possível gerar o campeonato."
      );
    } finally {
      setGerando(false);
    }
  }

  async function encerrarCampeonato() {
    if (encerrando || gerando) return;

    const mesFormatado = capitalizar(nomeDoMes);

    const confirmar = window.confirm(
      `ATENÇÃO: deseja encerrar ${mesFormatado} de ${ano}?\n\n` +
        "O sistema salvará campeão, vice, artilheiro e goleiro no histórico e zerará as estatísticas mensais. Esta ação não deve ser feita antes de todos os jogos terminarem."
    );

    if (!confirmar) return;

    const confirmarNovamente = window.confirm(
      "Confirma o encerramento definitivo deste campeonato?"
    );

    if (!confirmarNovamente) return;

    setEncerrando(true);
    setMensagem("");

    try {
      const { data, error } = await supabase.rpc(
        "encerrar_campeonato",
        {
          p_ano: ano,
          p_mes: mes,
        }
      );

      if (error) {
        throw error;
      }

      const resultado = Array.isArray(data) ? data[0] : data;
      const proximoMes = mes === 12 ? 1 : mes + 1;
      const proximoAno = mes === 12 ? ano + 1 : ano;

      salvarMesAtivo(proximoAno, proximoMes);
      setAno(proximoAno);
      setMes(proximoMes);

      setTipoMensagem("sucesso");
      setMensagem(
        `✅ Campeonato encerrado com sucesso! Campeão: ${
          resultado?.campeao || "não informado"
        }. Vice: ${
          resultado?.vice || "não informado"
        }. Artilheiro: ${
          resultado?.artilheiro || "não informado"
        } (${
          resultado?.gols_artilheiro || 0
        } gols). Melhor goleiro: ${
          resultado?.goleiro || "não informado"
        }. O aplicativo foi preparado para o próximo mês.`
      );
    } catch (erro) {
      console.error(
        "Erro ao encerrar campeonato:",
        erro
      );

      setTipoMensagem("erro");
      setMensagem(
        erro.message ||
          "Não foi possível encerrar o campeonato."
      );
    } finally {
      setEncerrando(false);
    }
  }

  const anosDisponiveis = Array.from(
    { length: 8 },
    (_, indice) => 2026 + indice
  );

  if (!adminLiberado) {
    return (
      <main className="page">
        <AdminLogin
          titulo="Área administrativa"
          descricao="Digite a senha para acessar o gerenciamento do campeonato."
          onLiberado={() => setAdminLiberado(true)}
          onCancelar={() => navigate("/")}
        />
      </main>
    );
  }

  return (
    <main className="page">
      <section className="page-header">
        <span className="panel-label">
          CAMPEONATO
        </span>

        <h2>Gerenciar Campeonato</h2>

        <p>
          Escolha o mês e gere automaticamente todas
          as rodadas.
        </p>
        <div
  style={{
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "20px",
    marginBottom: "24px",
  }}
>
  <button
  type="button"
  style={{
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "12px 18px",
    borderRadius: "8px",
    fontWeight: "bold",
  }}
>
  ✅ Modo administrador ativo
</button>

  <button
  type="button"
  onClick={sairModoAdministrador}
  style={{
    background: "transparent",
    color: "#fff",
    border: "1px solid #666",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  }}
>
  Sair do modo administrador
</button>
</div>
      </section>

      {mensagem && (
        <div
          style={{
            padding: "14px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
            color: "#ffffff",
            background:
              tipoMensagem === "sucesso"
                ? "#153b2a"
                : "#3b1c24",
            borderLeft:
              tipoMensagem === "sucesso"
                ? "4px solid #22c55e"
                : "4px solid #ef4444",
          }}
        >
          {mensagem}
        </div>
      )}

      <section className="panel">
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          <label>
            <span
              style={{
                display: "block",
                marginBottom: "8px",
              }}
            >
              Mês
            </span>

            <select
              value={mes}
              onChange={(evento) =>
                setMes(Number(evento.target.value))
              }
              style={{
                width: "100%",
                padding: "12px",
              }}
            >
              {Array.from(
                { length: 12 },
                (_, indice) => {
                  const numeroMes = indice + 1;
                  const nomeMes =
                    new Intl.DateTimeFormat(
                      "pt-BR",
                      { month: "long" }
                    ).format(
                      new Date(ano, indice, 1)
                    );

                  return (
                    <option
                      key={numeroMes}
                      value={numeroMes}
                    >
                      {capitalizar(nomeMes)}
                    </option>
                  );
                }
              )}
            </select>
          </label>

          <label>
            <span
              style={{
                display: "block",
                marginBottom: "8px",
              }}
            >
              Ano
            </span>

            <select
              value={ano}
              onChange={(evento) =>
                setAno(Number(evento.target.value))
              }
              style={{
                width: "100%",
                padding: "12px",
              }}
            >
              {anosDisponiveis.map((anoOpcao) => (
                <option
                  key={anoOpcao}
                  value={anoOpcao}
                >
                  {anoOpcao}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <button
            type="button"
            className="link-button"
            onClick={gerarCampeonato}
            disabled={gerando}
          >
            {gerando
              ? "Gerando campeonato..."
              : "Gerar Campeonato"}
          </button>

          <button
            type="button"
            onClick={definirMesAtivo}
            style={{
              padding: "12px 18px",
              border: "1px solid #22c55e",
              borderRadius: "8px",
              background: "#153b2a",
              color: "#ffffff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Usar este mês no app
          </button>

          <button
            type="button"
            onClick={encerrarCampeonato}
            disabled={encerrando || gerando}
            style={{
              padding: "12px 18px",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              background: "#3b1c24",
              color: "#ffffff",
              fontWeight: "bold",
              cursor:
                encerrando || gerando
                  ? "not-allowed"
                  : "pointer",
              opacity: encerrando || gerando ? 0.7 : 1,
            }}
          >
            {encerrando
              ? "Encerrando campeonato..."
              : "🏁 Encerrar Campeonato"}
          </button>
        </div>

        <div style={{ marginTop: "22px" }}>
          <p>
            <strong>Temporada:</strong> {ano}
          </p>

          <p>
            <strong>Mês:</strong>{" "}
            {capitalizar(nomeDoMes)}
          </p>

          <p>
            <strong>Sábados:</strong>{" "}
            {datasDasRodadas.length}
          </p>

          <p>
            <strong>Jogos por sábado:</strong>{" "}
            {confrontos.length}
          </p>

          <p>
            <strong>Total de jogos:</strong>{" "}
            {totalDeJogos}
          </p>
        </div>
      </section>
    </main>
  );
}

export default Campeonato;