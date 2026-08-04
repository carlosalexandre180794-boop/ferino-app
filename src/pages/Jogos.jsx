import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../supabaseClient";
import AdminLogin from "../components/AdminLogin";
import { adminEstaAtivo } from "../auth/adminAuth";
import { escudoTime } from "../escudos";

function JogoOrdenavel({ id, editando, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(id),
    disabled: !editando,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "grid",
        gridTemplateColumns: editando ? "44px minmax(0, 1fr)" : "1fr",
        gap: editando ? "8px" : "0",
        alignItems: "center",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.72 : 1,
        position: "relative",
        zIndex: isDragging ? 30 : 1,
      }}
    >
      {editando && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Segure e arraste para mudar a posição do jogo"
          title="Segure e arraste"
          style={{
            width: "44px",
            minHeight: "68px",
            display: "grid",
            placeItems: "center",
            border: "1px solid #475569",
            borderRadius: "12px",
            background: isDragging ? "#0f766e" : "#172033",
            color: "#ffffff",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            fontSize: "22px",
            fontWeight: "bold",
          }}
        >
          ☰
        </button>
      )}

      {children}
    </div>
  );
}

function Jogos() {
  const navigate = useNavigate();

  const [ano, setAno] = useState(() =>
    Number(localStorage.getItem("ferino_ano_ativo") || 2026)
  );

  const [mes, setMes] = useState(() =>
    Number(localStorage.getItem("ferino_mes_ativo") || 8)
  );

  const [rodadaAberta, setRodadaAberta] = useState(1);
  const [jogos, setJogos] = useState([]);
  const [times, setTimes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [alterandoJogoId, setAlterandoJogoId] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");
  const [adminLiberado, setAdminLiberado] = useState(
    adminEstaAtivo()
  );
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState(null);
  const [editandoOrdem, setEditandoOrdem] = useState(false);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  const [rodadasEncerradas, setRodadasEncerradas] = useState({});
  const [encerrandoRodada, setEncerrandoRodada] = useState(null);

  const sensores = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    carregarJogos();
  }, [ano, mes]);

  async function carregarJogos() {
    setCarregando(true);
    setMensagem("");

    try {
      const [
        resultadoJogos,
        resultadoTimes,
        resultadoRodadas,
      ] = await Promise.all([
        supabase
          .from("jogos_campeonato")
          .select("*")
          .eq("temporada", ano)
          .eq("mes", mes)
          .order("rodada", { ascending: true })
          .order("ordem_jogo", { ascending: true }),

        supabase
          .from("times")
          .select("id, nome")
          .order("nome", { ascending: true }),

        supabase
          .from("rodadas_campeonato")
          .select("rodada, status, encerrada_em")
          .eq("temporada", ano)
          .eq("mes", mes)
          .order("rodada", { ascending: true }),
      ]);

      if (resultadoJogos.error) {
        throw new Error(
          `Erro ao carregar os jogos: ${resultadoJogos.error.message}`
        );
      }

      if (resultadoTimes.error) {
        throw new Error(
          `Erro ao carregar os times: ${resultadoTimes.error.message}`
        );
      }

      if (resultadoRodadas.error) {
        throw new Error(
          `Erro ao carregar o status das rodadas: ${resultadoRodadas.error.message}`
        );
      }

      const mapaRodadas = {};

      (resultadoRodadas.data || []).forEach((item) => {
        mapaRodadas[Number(item.rodada)] =
          String(item.status || "").toLowerCase() === "encerrada";
      });

      const jogosCarregados = resultadoJogos.data || [];

      setJogos(jogosCarregados);
      setTimes(resultadoTimes.data || []);
      setRodadasEncerradas(mapaRodadas);

      const numerosRodadas = [
        ...new Set(
          jogosCarregados.map((jogo) => Number(jogo.rodada))
        ),
      ].sort((a, b) => a - b);

      const primeiraNaoEncerrada =
        numerosRodadas.find(
          (numeroRodada) => !mapaRodadas[numeroRodada]
        ) || numerosRodadas[0] || 1;

      setRodadaAberta(primeiraNaoEncerrada);
    } catch (erro) {
      console.error("Erro ao carregar calendário:", erro);
      setTipoMensagem("erro");
      setMensagem(
        erro.message ||
          "Não foi possível carregar os jogos do campeonato."
      );
    } finally {
      setCarregando(false);
    }
  }

  function encontrarTimePorId(timeId) {
    return times.find(
      (time) => Number(time.id) === Number(timeId)
    );
  }

  function nomeDoTime(timeId) {
    return encontrarTimePorId(timeId)?.nome || "Time não encontrado";
  }

  function formatarData(dataBanco) {
    if (!dataBanco) return "";

    const [anoData, mesData, diaData] = dataBanco.split("-");
    return `${diaData}/${mesData}/${anoData}`;
  }

  function jogoFinalizado(jogo) {
    const status = String(jogo.status || "").toLowerCase();

    return (
      status === "encerrado" ||
      status === "finalizada" ||
      jogo.partida_id !== null
    );
  }

  function abrirPartida(jogo) {
    if (editandoOrdem) return;

    if (rodadasEncerradas[Number(jogo.rodada)]) {
      setTipoMensagem("erro");
      setMensagem(
        `A Rodada ${jogo.rodada} está encerrada. Use a seta de correção apenas se precisar alterar um resultado.`
      );
      return;
    }

    if (!adminEstaAtivo()) {
      setAdminLiberado(false);
      setAcaoPendente({
        tipo: "abrir",
        jogo,
      });
      setMostrarLogin(true);
      setTipoMensagem("erro");
      setMensagem(
        "Acesso restrito. Digite a senha de administrador para registrar ou alterar resultados."
      );
      return;
    }

    const timeCasa = encontrarTimePorId(jogo.time_a_id);
    const timeFora = encontrarTimePorId(jogo.time_b_id);

    if (!timeCasa || !timeFora) {
      setTipoMensagem("erro");
      setMensagem(
        "Não foi possível identificar os times desta partida."
      );
      return;
    }

    navigate("/ficha-partida", {
      state: {
        jogo: {
          id: jogo.id,
          jogoCampeonatoId: jogo.id,
          rodada: jogo.rodada,
          ordemJogo: jogo.ordem_jogo,
          dataJogo: jogo.data_jogo,
          casa: timeCasa.nome,
          fora: timeFora.nome,
          timeAId: timeCasa.id,
          timeBId: timeFora.id,
          time_a_id: timeCasa.id,
          time_b_id: timeFora.id,
        },
      },
    });
  }

  async function reabrirJogo(jogo) {
    if (editandoOrdem) return;

    if (!adminEstaAtivo()) {
      setAdminLiberado(false);
      setAcaoPendente({
        tipo: "reabrir",
        jogo,
      });
      setMostrarLogin(true);
      setTipoMensagem("erro");
      setMensagem(
        "Acesso restrito. Digite a senha de administrador para desfazer resultados."
      );
      return;
    }

    if (alterandoJogoId !== null) return;

    if (!jogo.partida_id) {
      setTipoMensagem("erro");
      setMensagem(
        "Este jogo não possui uma partida registrada para desfazer."
      );
      return;
    }

    const nomeCasa = nomeDoTime(jogo.time_a_id);
    const nomeFora = nomeDoTime(jogo.time_b_id);

    const confirmar = window.confirm(
      `Deseja desfazer completamente o resultado de ${nomeCasa} x ${nomeFora}?\n\n` +
        "A classificação, a artilharia e as estatísticas dos goleiros também serão atualizadas."
    );

    if (!confirmar) return;

    setAlterandoJogoId(jogo.id);
    setMensagem("");

    try {
      const { error } = await supabase.rpc("desfazer_partida", {
        p_partida_id: Number(jogo.partida_id),
      });

      if (error) {
        throw new Error(
          `Não foi possível desfazer a partida: ${error.message}`
        );
      }

      const { error: erroRodada } = await supabase
        .from("rodadas_campeonato")
        .upsert(
          {
            temporada: ano,
            mes,
            rodada: Number(jogo.rodada),
            status: "aberta",
            encerrada_em: null,
          },
          {
            onConflict: "temporada,mes,rodada",
          }
        );

      if (erroRodada) {
        throw new Error(
          `O resultado foi desfeito, mas não foi possível reabrir a rodada: ${erroRodada.message}`
        );
      }

      setJogos((jogosAtuais) =>
        jogosAtuais.map((item) =>
          Number(item.id) === Number(jogo.id)
            ? {
                ...item,
                status: "pendente",
                gols_a: null,
                gols_b: null,
                partida_id: null,
              }
            : item
        )
      );

      setRodadasEncerradas((estadoAtual) => ({
        ...estadoAtual,
        [Number(jogo.rodada)]: false,
      }));

      setRodadaAberta(Number(jogo.rodada));

      setTipoMensagem("sucesso");
      setMensagem(
        "✅ Resultado desfeito. Classificação, artilharia e goleiros foram atualizados."
      );
    } catch (erro) {
      console.error("Erro ao desfazer partida:", erro);
      setTipoMensagem("erro");
      setMensagem(
        erro.message || "Não foi possível desfazer a partida."
      );
    } finally {
      setAlterandoJogoId(null);
    }
  }

  function solicitarEdicaoOrdem() {
    if (Number(rodadaAberta) !== 1) {
      setTipoMensagem("erro");
      setMensagem(
        "A ordem padrão do mês deve ser organizada na Rodada 1. Ao salvar, ela será replicada para as próximas rodadas."
      );
      setRodadaAberta(1);
      return;
    }

    if (!adminEstaAtivo()) {
      setAdminLiberado(false);
      setAcaoPendente({
        tipo: "editarOrdem",
      });
      setMostrarLogin(true);
      setTipoMensagem("erro");
      setMensagem(
        "Acesso restrito. Digite a senha de administrador para reorganizar os jogos."
      );
      return;
    }

    setAdminLiberado(true);
    setEditandoOrdem(true);
    setTipoMensagem("sucesso");
    setMensagem(
      "Segure o botão ☰ de um jogo e arraste para a posição desejada."
    );
  }

  async function cancelarEdicaoOrdem() {
    setEditandoOrdem(false);
    setTipoMensagem("sucesso");
    setMensagem("Alterações de ordem canceladas.");
    await carregarJogos();
  }

  function reordenarRodada(numeroRodada, idAtivo, idDestino) {
    if (!idDestino || String(idAtivo) === String(idDestino)) {
      return;
    }

    setJogos((jogosAtuais) => {
      const indicesDaRodada = jogosAtuais
        .map((jogo, indice) =>
          Number(jogo.rodada) === Number(numeroRodada)
            ? indice
            : -1
        )
        .filter((indice) => indice >= 0);

      const jogosDaRodada = indicesDaRodada.map(
        (indice) => jogosAtuais[indice]
      );

      const indiceAntigo = jogosDaRodada.findIndex(
        (jogo) => String(jogo.id) === String(idAtivo)
      );

      const indiceNovo = jogosDaRodada.findIndex(
        (jogo) => String(jogo.id) === String(idDestino)
      );

      if (indiceAntigo < 0 || indiceNovo < 0) {
        return jogosAtuais;
      }

      const novaRodada = arrayMove(
        jogosDaRodada,
        indiceAntigo,
        indiceNovo
      ).map((jogo, indice) => ({
        ...jogo,
        ordem_jogo: indice + 1,
      }));

      const novaLista = [...jogosAtuais];

      indicesDaRodada.forEach((indiceGlobal, indiceRodada) => {
        novaLista[indiceGlobal] = novaRodada[indiceRodada];
      });

      return novaLista;
    });
  }

  function chaveDoConfronto(jogo) {
    const ids = [
      Number(jogo.time_a_id),
      Number(jogo.time_b_id),
    ].sort((a, b) => a - b);

    return `${ids[0]}-${ids[1]}`;
  }

  async function salvarOrdemDosJogos() {
    if (!adminEstaAtivo()) {
      solicitarEdicaoOrdem();
      return;
    }

    if (salvandoOrdem) return;

    const jogosRodadaUm = jogos
      .filter((jogo) => Number(jogo.rodada) === 1)
      .sort(
        (a, b) =>
          Number(a.ordem_jogo) - Number(b.ordem_jogo)
      );

    if (jogosRodadaUm.length === 0) {
      setTipoMensagem("erro");
      setMensagem(
        "A Rodada 1 não possui jogos para definir a ordem padrão."
      );
      return;
    }

    const ordemPorConfronto = new Map();

    jogosRodadaUm.forEach((jogo, indice) => {
      ordemPorConfronto.set(
        chaveDoConfronto(jogo),
        indice + 1
      );
    });

    const jogosComOrdemReplicada = jogos.map((jogo) => {
      const ordemPadrao = ordemPorConfronto.get(
        chaveDoConfronto(jogo)
      );

      return {
        ...jogo,
        ordem_jogo:
          ordemPadrao ?? Number(jogo.ordem_jogo),
      };
    });

    setSalvandoOrdem(true);
    setMensagem("");

    try {
      const resultadosTemporarios = await Promise.all(
        jogosComOrdemReplicada.map((jogo) =>
          supabase
            .from("jogos_campeonato")
            .update({
              ordem_jogo: 1000000 + Number(jogo.id),
            })
            .eq("id", Number(jogo.id))
        )
      );

      const erroTemporario = resultadosTemporarios.find(
        (resultado) => resultado.error
      );

      if (erroTemporario?.error) {
        throw new Error(
          `Erro ao preparar a nova ordem: ${erroTemporario.error.message}`
        );
      }

      const resultadosFinais = await Promise.all(
        jogosComOrdemReplicada.map((jogo) =>
          supabase
            .from("jogos_campeonato")
            .update({
              ordem_jogo: Number(jogo.ordem_jogo),
            })
            .eq("id", Number(jogo.id))
        )
      );

      const erroFinal = resultadosFinais.find(
        (resultado) => resultado.error
      );

      if (erroFinal?.error) {
        throw new Error(
          `Erro ao salvar a ordem definitiva: ${erroFinal.error.message}`
        );
      }

      setJogos(jogosComOrdemReplicada);
      setEditandoOrdem(false);
      setTipoMensagem("sucesso");
      setMensagem(
        "✅ Ordem da Rodada 1 salva e replicada para todas as rodadas do mês."
      );

      await carregarJogos();
    } catch (erro) {
      console.error("Erro ao salvar ordem dos jogos:", erro);
      setTipoMensagem("erro");
      setMensagem(
        `Não foi possível salvar e replicar a ordem: ${erro.message}`
      );
    } finally {
      setSalvandoOrdem(false);
    }
  }

  async function encerrarRodada(rodada) {
    if (!adminEstaAtivo()) {
      setAdminLiberado(false);
      setTipoMensagem("erro");
      setMensagem(
        "Acesso restrito. Ative o modo administrador para encerrar a rodada."
      );
      setMostrarLogin(true);
      return;
    }

    const totalJogos = rodada.jogos.length;
    const concluidos = rodada.jogos.filter(
      jogoFinalizado
    ).length;

    if (totalJogos !== 21) {
      setTipoMensagem("erro");
      setMensagem(
        `A Rodada ${rodada.numero} possui ${totalJogos} jogos. São necessários exatamente 21 jogos para encerrá-la.`
      );
      return;
    }

    if (concluidos !== totalJogos) {
      setTipoMensagem("erro");
      setMensagem(
        `Ainda faltam ${totalJogos - concluidos} jogo(s) para concluir a Rodada ${rodada.numero}.`
      );
      return;
    }

    const confirmar = window.confirm(
      `Encerrar a Rodada ${rodada.numero}?\n\nTodos os 21 jogos estão concluídos. A próxima rodada será aberta automaticamente.`
    );

    if (!confirmar) return;

    setEncerrandoRodada(rodada.numero);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("rodadas_campeonato")
        .upsert(
          {
            temporada: ano,
            mes,
            rodada: Number(rodada.numero),
            status: "encerrada",
            encerrada_em: new Date().toISOString(),
          },
          {
            onConflict: "temporada,mes,rodada",
          }
        );

      if (error) {
        throw new Error(error.message);
      }

      setRodadasEncerradas((estadoAtual) => ({
        ...estadoAtual,
        [Number(rodada.numero)]: true,
      }));

      const proximaRodada = rodadas.find(
        (item) =>
          Number(item.numero) > Number(rodada.numero)
      );

      if (proximaRodada) {
        setRodadaAberta(proximaRodada.numero);
      }

      setTipoMensagem("sucesso");
      setMensagem(
        proximaRodada
          ? `✅ Rodada ${rodada.numero} encerrada. Rodada ${proximaRodada.numero} aberta.`
          : `✅ Rodada ${rodada.numero} encerrada. Todas as rodadas do mês foram concluídas.`
      );
    } catch (erro) {
      console.error("Erro ao encerrar rodada:", erro);
      setTipoMensagem("erro");
      setMensagem(
        `Não foi possível encerrar a rodada: ${erro.message}`
      );
    } finally {
      setEncerrandoRodada(null);
    }
  }

  function concluirLoginAdmin() {
    setAdminLiberado(true);
    setMostrarLogin(false);
    setTipoMensagem("sucesso");
    setMensagem("✅ Modo administrador ativado.");

    const acao = acaoPendente;
    setAcaoPendente(null);

    if (!acao) {
      return;
    }

    setTimeout(() => {
      if (acao.tipo === "abrir") {
        abrirPartida(acao.jogo);
      }

      if (acao.tipo === "reabrir") {
        reabrirJogo(acao.jogo);
      }

      if (acao.tipo === "editarOrdem") {
        setEditandoOrdem(true);
        setTipoMensagem("sucesso");
        setMensagem(
          "Segure o botão ☰ de um jogo e arraste para a posição desejada."
        );
      }
    }, 0);
  }

  function alterarMesAtivo(novoAno, novoMes) {
    localStorage.setItem(
      "ferino_ano_ativo",
      String(novoAno)
    );
    localStorage.setItem(
      "ferino_mes_ativo",
      String(novoMes)
    );

    setEditandoOrdem(false);
    setAno(novoAno);
    setMes(novoMes);
    setRodadaAberta(1);
  }

  const nomeMesAtivo = new Intl.DateTimeFormat(
    "pt-BR",
    { month: "long" }
  ).format(new Date(ano, mes - 1, 1));

  const rodadas = useMemo(() => {
    const grupos = {};

    jogos.forEach((jogo) => {
      const numeroRodada = Number(jogo.rodada);

      if (!grupos[numeroRodada]) {
        grupos[numeroRodada] = {
          numero: numeroRodada,
          data: jogo.data_jogo,
          jogos: [],
        };
      }

      grupos[numeroRodada].jogos.push(jogo);
    });

    return Object.values(grupos).sort(
      (a, b) => a.numero - b.numero
    );
  }, [jogos]);

  return (
    <main className="page jogos-page">
      <style>{`
        @media (max-width: 700px) {
          .jogos-page {
            padding-top: 12px !important;
          }

          .jogos-page .jogos-page-header {
            margin-bottom: 14px !important;
          }

          .jogos-page .jogos-page-header .panel-label {
            font-size: 0.72rem;
          }

          .jogos-page .jogos-page-header h2 {
            font-size: 1.95rem !important;
          }

          .jogos-page .jogos-page-header p {
            font-size: 0.96rem !important;
          }

          .jogos-page select {
            font-size: 0.92rem;
          }

          .jogos-page .jogos-page-header {
            padding-bottom: 0 !important;
          }
        }
      `}</style>
      <section
        className="page-header jogos-page-header"
        style={{
          marginBottom: "8px",
        }}
      >
        <span className="panel-label">JOGOS</span>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "7px",
            marginTop: "6px",
          }}
        >
          <select
            value={mes}
            disabled={editandoOrdem || salvandoOrdem}
            onChange={(evento) =>
              alterarMesAtivo(
                ano,
                Number(evento.target.value)
              )
            }
            style={{ padding: "8px 10px", minHeight: "44px" }}
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
                    {nomeMes.charAt(0).toUpperCase() +
                      nomeMes.slice(1)}
                  </option>
                );
              }
            )}
          </select>

          <select
            value={ano}
            disabled={editandoOrdem || salvandoOrdem}
            onChange={(evento) =>
              alterarMesAtivo(
                Number(evento.target.value),
                mes
              )
            }
            style={{ padding: "8px 10px", minHeight: "44px" }}
          >
            {Array.from(
              { length: 8 },
              (_, indice) => 2026 + indice
            ).map((anoOpcao) => (
              <option
                key={anoOpcao}
                value={anoOpcao}
              >
                {anoOpcao}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          {adminLiberado ? (
            <span
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                color: "#86efac",
                background: "#153b2a",
                border: "1px solid #22c55e",
                fontWeight: "bold",
              }}
            >
              ✅ Modo administrador ativo
            </span>
          ) : (
            <span
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                color: "#cbd5e1",
                background: "#1f2937",
                border: "1px solid #475569",
              }}
            >
              🔒 Somente consulta
            </span>
          )}

          {!editandoOrdem ? (
            <button
              type="button"
              onClick={solicitarEdicaoOrdem}
              disabled={carregando || jogos.length === 0}
              style={{
                padding: "9px 14px",
                borderRadius: "8px",
                background: "#1d4ed8",
                color: "#ffffff",
                fontWeight: "bold",
                cursor:
                  carregando || jogos.length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  carregando || jogos.length === 0
                    ? 0.55
                    : 1,
              }}
            >
              ↕ Editar ordem
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={salvarOrdemDosJogos}
                disabled={salvandoOrdem}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  background: "#15803d",
                  color: "#ffffff",
                  fontWeight: "bold",
                  cursor: salvandoOrdem
                    ? "wait"
                    : "pointer",
                  opacity: salvandoOrdem ? 0.65 : 1,
                }}
              >
                {salvandoOrdem
                  ? "Salvando..."
                  : "✅ Salvar ordem"}
              </button>

              <button
                type="button"
                onClick={cancelarEdicaoOrdem}
                disabled={salvandoOrdem}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1px solid #64748b",
                  background: "#1f2937",
                  color: "#ffffff",
                  fontWeight: "bold",
                  cursor: salvandoOrdem
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </section>

      {mostrarLogin && !adminLiberado && (
        <AdminLogin
          titulo="Área administrativa"
          descricao="Digite a senha para registrar, corrigir ou reorganizar os jogos."
          onLiberado={concluirLoginAdmin}
          onCancelar={() => {
            setMostrarLogin(false);
            setAcaoPendente(null);
            setTipoMensagem("erro");
            setMensagem(
              "Acesso restrito. Apenas administradores podem alterar os jogos."
            );
          }}
        />
      )}

      {mensagem && (
        <div
          style={{
            padding: "14px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
            color: "#ffffff",
            background:
              tipoMensagem === "sucesso" ? "#153b2a" : "#3b1c24",
            borderLeft:
              tipoMensagem === "sucesso"
                ? "4px solid #22c55e"
                : "4px solid #ef4444",
          }}
        >
          {mensagem}
        </div>
      )}

      {carregando && (
        <div
          className="panel"
          style={{ marginBottom: "20px", textAlign: "center" }}
        >
          <p>Carregando os jogos...</p>
        </div>
      )}

      {!carregando && jogos.length === 0 && (
        <div className="panel" style={{ textAlign: "center" }}>
          <p>
            Nenhum campeonato foi encontrado para{" "}
            {nomeMesAtivo} de {ano}.
          </p>
        </div>
      )}

      {!carregando &&
        rodadas.map((rodada) => {
          const jogosConcluidos = rodada.jogos.filter(
            jogoFinalizado
          ).length;
          const totalJogosRodada = rodada.jogos.length;
          const rodadaCompleta =
            totalJogosRodada === 21 &&
            jogosConcluidos === totalJogosRodada;
          const rodadaEncerrada =
            Boolean(rodadasEncerradas[rodada.numero]);
          const percentual =
            totalJogosRodada > 0
              ? Math.round(
                  (jogosConcluidos / totalJogosRodada) * 100
                )
              : 0;

          return (
          <section
            key={rodada.numero}
            className="panel"
            style={{
              marginBottom: "16px",
              padding: "12px",
            }}
          >
            <button
              type="button"
              className="link-button"
              onClick={() =>
                setRodadaAberta(
                  rodadaAberta === rodada.numero ? 0 : rodada.numero
                )
              }
              style={{
                width: "100%",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "left",
              }}
            >
              <span>
                Rodada {rodada.numero}
                {rodadaEncerrada ? " · ✅ Encerrada" : ""}
              </span>
              <span>{formatarData(rodada.data)}</span>
            </button>

            {rodadaAberta === rodada.numero && (
              <DndContext
                sensors={sensores}
                collisionDetection={closestCenter}
                onDragEnd={({ active, over }) =>
                  reordenarRodada(
                    rodada.numero,
                    active.id,
                    over?.id
                  )
                }
              >
                <SortableContext
                  items={rodada.jogos.map((jogo) =>
                    String(jogo.id)
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    style={{
                      display: "grid",
                      gap: "9px",
                      marginTop: "12px",
                    }}
                  >
                    {rodada.jogos.map((jogo) => {
                      const nomeCasa = nomeDoTime(jogo.time_a_id);
                      const nomeFora = nomeDoTime(jogo.time_b_id);
                      const finalizado = jogoFinalizado(jogo);
                      const alterando =
                        Number(alterandoJogoId) === Number(jogo.id);

                      return (
                        <JogoOrdenavel
                          key={jogo.id}
                          id={jogo.id}
                          editando={editandoOrdem}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                finalizado && !editandoOrdem
                                  ? "minmax(0, 1fr) 36px"
                                  : "1fr",
                              gap: "6px",
                              alignItems: "center",
                            }}
                          >
                            <button
                              type="button"
                              disabled={editandoOrdem}
                              title={
                                editandoOrdem
                                  ? `Jogo ${jogo.ordem_jogo}. Use o botão ☰ para arrastar`
                                  : rodadaEncerrada
                                  ? "Rodada encerrada"
                                  : finalizado
                                  ? "Resultado encerrado"
                                  : adminLiberado
                                  ? "Abrir ficha da partida"
                                  : "Acesso restrito: somente administradores podem registrar resultados"
                              }
                              onClick={() => {
                                if (!finalizado && !editandoOrdem) {
                                  abrirPartida(jogo);
                                }
                              }}
                              style={{
                                width: "100%",
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(0, 1fr) 62px minmax(0, 1fr)",
                                alignItems: "center",
                                gap: "5px",
                                padding: "8px 8px",
                                color: "#ffffff",
                                background: editandoOrdem
                                  ? "#172033"
                                  : finalizado
                                  ? "#16352d"
                                  : "#1f2937",
                                border: editandoOrdem
                                  ? "1px solid #3b82f6"
                                  : finalizado
                                  ? "1px solid #22c55e"
                                  : "1px solid rgba(148, 163, 184, 0.16)",
                                borderRadius: "12px",
                                cursor: editandoOrdem
                                  ? "default"
                                  : finalizado
                                  ? "default"
                                  : adminLiberado
                                  ? "pointer"
                                  : "not-allowed",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: "5px",
                                  textAlign: "right",
                                  minWidth: 0,
                                }}
                              >
                                <strong
                                  style={{
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize: "0.92rem",
                                  }}
                                >
                                  {nomeCasa}
                                </strong>
                                <img
                                  src={escudoTime(nomeCasa)}
                                  alt={nomeCasa}
                                  style={{
                                    width: "30px",
                                    height: "30px",
                                    objectFit: "contain",
                                  }}
                                />
                              </div>

                              <div
                                style={{
                                  minWidth: "62px",
                                  textAlign: "center",
                                }}
                              >
                                {editandoOrdem && (
                                  <span
                                    style={{
                                      display: "block",
                                      marginBottom: "3px",
                                      color: "#60a5fa",
                                      fontSize: "11px",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    JOGO {jogo.ordem_jogo}
                                  </span>
                                )}

                                {finalizado ? (
                                  <>
                                    <strong
                                      style={{
                                        display: "block",
                                        fontSize: "18px",
                                      }}
                                    >
                                      {jogo.gols_a ?? 0} x {jogo.gols_b ?? 0}
                                    </strong>
                                    <span
                                      style={{
                                        color: "#4ade80",
                                        fontSize: "12px",
                                      }}
                                    >
                                      Encerrado
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <strong
                                      style={{
                                        display: "block",
                                        fontSize: "18px",
                                      }}
                                    >
                                      x
                                    </strong>
                                    <span
                                      style={{
                                        color: "#94a3b8",
                                        fontSize: "12px",
                                      }}
                                    >
                                      Pendente
                                    </span>
                                  </>
                                )}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-start",
                                  gap: "5px",
                                  textAlign: "left",
                                  minWidth: 0,
                                }}
                              >
                                <img
                                  src={escudoTime(nomeFora)}
                                  alt={nomeFora}
                                  style={{
                                    width: "30px",
                                    height: "30px",
                                    objectFit: "contain",
                                  }}
                                />
                                <strong
                                  style={{
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize: "0.92rem",
                                  }}
                                >
                                  {nomeFora}
                                </strong>
                              </div>
                            </button>

                            {finalizado && !editandoOrdem && (
                              <button
                                type="button"
                                disabled={alterando}
                                aria-label={
                                  alterando
                                    ? "Alterando resultado"
                                    : "Corrigir resultado"
                                }
                                title={
                                  alterando
                                    ? "Alterando resultado"
                                    : "Corrigir resultado"
                                }
                                onClick={(evento) => {
                                  evento.preventDefault();
                                  evento.stopPropagation();
                                  reabrirJogo(jogo);
                                }}
                                style={{
                                  width: "36px",
                                  minWidth: "36px",
                                  height: "36px",
                                  minHeight: "36px",
                                  padding: 0,
                                  display: "grid",
                                  placeItems: "center",
                                  border: "1px solid #f59e0b",
                                  borderRadius: "8px",
                                  background: "#3a2a10",
                                  color: "#fbbf24",
                                  fontWeight: "bold",
                                  fontSize: "1rem",
                                  lineHeight: 1,
                                  cursor: alterando ? "wait" : "pointer",
                                  opacity: alterando ? 0.6 : 1,
                                  pointerEvents: "auto",
                                  position: "relative",
                                  zIndex: 999,
                                }}
                              >
                                <span
                                  aria-hidden="true"
                                >
                                  {alterando ? "…" : "↩"}
                                </span>

                                <span
                                  style={{
                                    position: "absolute",
                                    width: "1px",
                                    height: "1px",
                                    padding: 0,
                                    margin: "-1px",
                                    overflow: "hidden",
                                    clip: "rect(0, 0, 0, 0)",
                                    whiteSpace: "nowrap",
                                    border: 0,
                                  }}
                                >
                                  {alterando
                                    ? "Alterando resultado"
                                    : adminLiberado
                                    ? "Corrigir resultado"
                                    : "Acesso restrito para corrigir resultado"}
                                </span>
                              </button>
                            )}
                          </div>
                        </JogoOrdenavel>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {rodadaAberta === rodada.numero && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop:
                    "1px solid rgba(148, 163, 184, 0.18)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "7px",
                    color: "#cbd5e1",
                    fontSize: "0.84rem",
                  }}
                >
                  <span>
                    {jogosConcluidos}/{totalJogosRodada} jogos concluídos
                  </span>

                  <strong
                    style={{
                      color: rodadaCompleta
                        ? "#4ade80"
                        : "#fbbf24",
                    }}
                  >
                    {percentual}%
                  </strong>
                </div>

                <div
                  style={{
                    height: "7px",
                    overflow: "hidden",
                    borderRadius: "999px",
                    background: "#253044",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: `${percentual}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: rodadaCompleta
                        ? "#22c55e"
                        : "#f59e0b",
                      transition: "width 0.25s ease",
                    }}
                  />
                </div>

                <button
                  type="button"
                  disabled={
                    !rodadaCompleta ||
                    rodadaEncerrada ||
                    encerrandoRodada === rodada.numero
                  }
                  onClick={() => encerrarRodada(rodada)}
                  style={{
                    width: "100%",
                    minHeight: "40px",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "9px",
                    background: rodadaEncerrada
                      ? "#153b2a"
                      : rodadaCompleta
                      ? "#15803d"
                      : "#293244",
                    color: rodadaEncerrada
                      ? "#86efac"
                      : rodadaCompleta
                      ? "#ffffff"
                      : "#94a3b8",
                    fontWeight: "bold",
                    cursor:
                      rodadaCompleta &&
                      !rodadaEncerrada &&
                      encerrandoRodada !== rodada.numero
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  {rodadaEncerrada
                    ? "✅ Rodada encerrada"
                    : encerrandoRodada === rodada.numero
                    ? "Encerrando..."
                    : rodadaCompleta
                    ? "✅ Encerrar rodada"
                    : `Faltam ${
                        Math.max(
                          0,
                          totalJogosRodada - jogosConcluidos
                        )
                      } jogo(s)`}
                </button>
              </div>
            )}
          </section>
          );
        })}
    </main>
  );
}

export default Jogos;