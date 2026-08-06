import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { escudoTime } from "../escudos";
import AdminLogin from "../components/AdminLogin";
import {
  adminEstaAtivo,
  desativarModoAdmin,
} from "../auth/adminAuth";

const MESES = [
  { valor: 1, nome: "Janeiro" },
  { valor: 2, nome: "Fevereiro" },
  { valor: 3, nome: "Março" },
  { valor: 4, nome: "Abril" },
  { valor: 5, nome: "Maio" },
  { valor: 6, nome: "Junho" },
  { valor: 7, nome: "Julho" },
  { valor: 8, nome: "Agosto" },
  { valor: 9, nome: "Setembro" },
  { valor: 10, nome: "Outubro" },
  { valor: 11, nome: "Novembro" },
  { valor: 12, nome: "Dezembro" },
];

const ANO_INICIAL = 2026;
const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from(
  { length: Math.max(1, ANO_ATUAL - ANO_INICIAL + 4) },
  (_, indice) => ANO_INICIAL + indice
);

function Jogadores() {
  const agora = new Date();

  const [anoSelecionado, setAnoSelecionado] = useState(
    Math.max(ANO_INICIAL, agora.getFullYear())
  );
  const [mesSelecionado, setMesSelecionado] = useState(
    agora.getFullYear() === ANO_INICIAL ? agora.getMonth() + 1 : 1
  );

  const [temporadaId, setTemporadaId] = useState(null);
  const [jogadoresBase, setJogadoresBase] = useState([]);
  const [elencos, setElencos] = useState([]);
  const [times, setTimes] = useState([]);
  const [substituicoes, setSubstituicoes] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [salvandoTroca, setSalvandoTroca] = useState(false);
  const [adminLiberado, setAdminLiberado] = useState(adminEstaAtivo());
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [seletorAberto, setSeletorAberto] = useState(null);

  useEffect(() => {
    carregarDadosFixos();
  }, []);

  useEffect(() => {
    if (times.length > 0 && jogadoresBase.length > 0) {
      carregarElencoMensal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSelecionado, mesSelecionado, times.length, jogadoresBase.length]);

  async function carregarDadosFixos() {
    setCarregando(true);
    setMensagem("");

    try {
      const [resJogadores, resTimes] = await Promise.all([
        supabase
          .from("jogadores")
          .select(`
            id,
            nome,
            capitao,
            jogos,
            gols,
            time_id,
            ativo,
            times (
              id,
              nome,
              escudo
            )
          `)
          .eq("ativo", true)
          .order("nome", { ascending: true }),

        supabase
          .from("times")
          .select("id, nome, escudo")
          .order("nome", { ascending: true }),
      ]);

      if (resJogadores.error) {
        throw new Error(
          `Erro ao buscar jogadores: ${resJogadores.error.message}`
        );
      }

      if (resTimes.error) {
        throw new Error(
          `Erro ao buscar times: ${resTimes.error.message}`
        );
      }

      setJogadoresBase(resJogadores.data || []);
      setTimes(resTimes.data || []);
    } catch (erro) {
      console.error("Erro ao carregar dados fixos:", erro);
      setMensagem(
        erro.message || "Não foi possível carregar jogadores e times."
      );
      setCarregando(false);
    }
  }

  async function carregarElencoMensal() {
    setCarregando(true);
    setMensagem("");
    setSeletorAberto(null);

    try {
      /*
       * A função cria a competência e, somente se estiver vazia,
       * copia o elenco atual como ponto de partida.
       * Depois disso, cada mês passa a ter seu próprio elenco.
       */
      const { data: idCriado, error: erroCriar } = await supabase.rpc(
        "ferino_criar_elenco_mes",
        {
          p_ano: Number(anoSelecionado),
          p_mes: Number(mesSelecionado),
        }
      );

      if (erroCriar) {
        throw new Error(
          `Erro ao preparar o elenco mensal: ${erroCriar.message}`
        );
      }

      const idCompetencia = Number(idCriado);
      setTemporadaId(idCompetencia);

      const [resElencos, resSubstituicoes] = await Promise.all([
        supabase
          .from("elencos")
          .select(`
            id,
            temporada_id,
            time_id,
            jogador_id,
            posicao,
            capitao,
            ativo,
            jogador_nome_snapshot,
            time_nome_snapshot
          `)
          .eq("temporada_id", idCompetencia)
          .eq("ativo", true)
          .order("time_id", { ascending: true })
          .order("posicao", { ascending: true }),

        supabase
          .from("substituicoes")
          .select(`
            id,
            temporada_id,
            time_id,
            partida_id,
            rodada,
            data_substituicao,
            jogador_saida_id,
            jogador_saida_nome_snapshot,
            jogador_entrada_id,
            jogador_entrada_nome_snapshot,
            motivo,
            status
          `)
          .eq("temporada_id", idCompetencia)
          .eq("status", "ativa")
          .order("data_substituicao", { ascending: false }),
      ]);

      if (resElencos.error) {
        throw new Error(
          `Erro ao buscar o elenco mensal: ${resElencos.error.message}`
        );
      }

      if (resSubstituicoes.error) {
        throw new Error(
          `Erro ao buscar substituições: ${resSubstituicoes.error.message}`
        );
      }

      setElencos(resElencos.data || []);
      setSubstituicoes(resSubstituicoes.data || []);
    } catch (erro) {
      console.error("Erro ao carregar elenco mensal:", erro);
      setElencos([]);
      setSubstituicoes([]);
      setMensagem(
        erro.message || "Não foi possível carregar o elenco deste mês."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function trocarJogadores(jogadorAtualId, jogadorEscolhidoId) {
    setSeletorAberto(null);

    if (!adminEstaAtivo()) {
      setAdminLiberado(false);
      setMostrarLogin(true);
      setMensagem(
        "Acesso restrito. Digite a senha de administrador para alterar o elenco."
      );
      return;
    }

    const atualId = Number(jogadorAtualId);
    const escolhidoId = Number(jogadorEscolhidoId);

    if (
      !Number.isFinite(atualId) ||
      !Number.isFinite(escolhidoId) ||
      !Number.isFinite(Number(temporadaId))
    ) {
      setMensagem("O jogador ou a competência selecionada é inválida.");
      return;
    }

    if (atualId === escolhidoId) {
      return;
    }

    const jogadorAtual = jogadoresBase.find(
      (jogador) => Number(jogador.id) === atualId
    );
    const jogadorEscolhido = jogadoresBase.find(
      (jogador) => Number(jogador.id) === escolhidoId
    );

    if (!jogadorAtual || !jogadorEscolhido) {
      setMensagem("Não foi possível localizar os jogadores.");
      return;
    }

    const registroAtual = elencos.find(
      (registro) => Number(registro.jogador_id) === atualId
    );
    const registroEscolhido = elencos.find(
      (registro) => Number(registro.jogador_id) === escolhidoId
    );

    if (!registroAtual || !registroEscolhido) {
      setMensagem(
        "Os dois jogadores precisam pertencer ao elenco do mês selecionado."
      );
      return;
    }

    if (Number(registroAtual.time_id) === Number(registroEscolhido.time_id)) {
      setMensagem("Os dois jogadores já pertencem ao mesmo time neste mês.");
      return;
    }

    setSalvandoTroca(true);
    setMensagem("");

    try {
      const { error } = await supabase.rpc(
        "ferino_trocar_jogadores_elenco",
        {
          p_temporada_id: Number(temporadaId),
          p_jogador_a_id: atualId,
          p_jogador_b_id: escolhidoId,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      await carregarElencoMensal();

      setMensagem(
        `✅ ${jogadorAtual.nome} e ${jogadorEscolhido.nome} trocaram de time somente em ${nomeMesSelecionado} de ${anoSelecionado}.`
      );
    } catch (erro) {
      console.error("Erro ao trocar jogadores no elenco mensal:", erro);
      setMensagem(
        erro.message ||
          "Não foi possível realizar a troca no elenco deste mês."
      );
    } finally {
      setSalvandoTroca(false);
    }
  }

  function sairDoModoAdmin() {
    desativarModoAdmin();
    setAdminLiberado(false);
    setMostrarLogin(false);
    setSeletorAberto(null);
    setMensagem("Modo administrador encerrado.");
  }

  const nomeMesSelecionado =
    MESES.find((mes) => mes.valor === Number(mesSelecionado))?.nome ||
    "Mês";

  const jogadoresDoMes = useMemo(() => {
    const mapaJogadores = new Map(
      jogadoresBase.map((jogador) => [Number(jogador.id), jogador])
    );

    return elencos.map((registro) => {
      const cadastro = mapaJogadores.get(Number(registro.jogador_id));

      return {
        ...cadastro,
        id: Number(registro.jogador_id),
        nome:
          registro.jogador_nome_snapshot ||
          cadastro?.nome ||
          "Jogador sem nome",
        time_id: Number(registro.time_id),
        posicao: Number(registro.posicao),
        capitao: Boolean(registro.capitao),
        elenco_id: registro.id,
      };
    });
  }, [elencos, jogadoresBase]);

  const jogadoresPorTime = useMemo(
    () =>
      times.map((time) => ({
        ...time,
        jogadores: jogadoresDoMes
          .filter(
            (jogador) =>
              Number(jogador.time_id) === Number(time.id)
          )
          .sort(
            (a, b) =>
              Number(a.posicao) - Number(b.posicao) ||
              a.nome.localeCompare(b.nome, "pt-BR")
          ),
      })),
    [times, jogadoresDoMes]
  );

  const substituicaoPorJogadorSaida = useMemo(() => {
    const mapa = new Map();

    substituicoes.forEach((substituicao) => {
      const chave = Number(substituicao.jogador_saida_id);

      if (!mapa.has(chave)) {
        mapa.set(chave, substituicao);
      }
    });

    return mapa;
  }, [substituicoes]);

  return (
    <main className="page jogadores-page">
      <style>{`
        .jogadores-page,
        .jogadores-page * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        .jogadores-page *::selection {
          color: inherit;
          background: transparent;
        }

        .jogadores-page *::-moz-selection {
          color: inherit;
          background: transparent;
        }

        .jogadores-page .competencia-card {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 220px));
          gap: 12px;
          margin: 18px 0 20px;
          padding: 16px;
          border-radius: 14px;
          background: #0e1b31;
          border: 1px solid rgba(96, 165, 250, 0.25);
        }

        .jogadores-page .competencia-field {
          display: grid;
          gap: 7px;
        }

        .jogadores-page .competencia-field label {
          color: #aab6ca;
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .jogadores-page .competencia-field select {
          width: 100%;
          min-height: 46px;
          padding: 0 12px;
          border: 1px solid rgba(96, 165, 250, 0.6);
          border-radius: 10px;
          color: #ffffff;
          background: #101f37;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .jogadores-page .competencia-resumo {
          grid-column: 1 / -1;
          margin: 0;
          color: #8dd8ff;
          font-size: 0.92rem;
          font-weight: 800;
        }

        .jogadores-page .players-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: start;
        }

        .jogadores-page .team-card {
          position: relative;
          min-width: 0;
          overflow: visible;
          border-radius: 18px;
          background: #0e1b31;
          border: 1px solid rgba(96, 165, 250, 0.24);
        }

        .jogadores-page .team-card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 116px;
          padding: 20px 24px;
        }

        .jogadores-page .team-card-header img {
          width: 56px;
          height: 56px;
          flex: 0 0 56px;
          object-fit: contain;
        }

        .jogadores-page .team-card-header h3 {
          margin: 3px 0 0;
          color: #ffffff;
          font-size: 1.35rem;
          line-height: 1.1;
        }

        .jogadores-page .players-table-header,
        .jogadores-page .player-row {
          display: grid;
          grid-template-columns:
            42px
            minmax(120px, 0.78fr)
            minmax(220px, 1.42fr);
          align-items: center;
          column-gap: 12px;
        }

        .jogadores-page .players-table-header {
          margin: 0 22px;
          padding: 12px 10px;
          color: #aab6ca;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }

        .jogadores-page .players-list {
          display: grid;
          gap: 9px;
          padding: 9px 22px 22px;
        }

        .jogadores-page .player-row {
          position: relative;
          user-select: none;
          -webkit-user-select: none;
          width: 100%;
          min-width: 0;
          min-height: 62px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(24, 42, 70, 0.72);
          border: 1px solid rgba(96, 165, 250, 0.06);
        }

        .jogadores-page .player-number {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #ffffff;
          background: rgba(59, 130, 246, 0.20);
          border: 1px solid rgba(96, 165, 250, 0.62);
          font-weight: 900;
          user-select: none;
        }

        .jogadores-page .fixed-team {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #ffffff;
        }

        .jogadores-page .fixed-team img {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          object-fit: contain;
        }

        .jogadores-page .fixed-team span {
          min-width: 0;
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 800;
          line-height: 1.15;
          white-space: nowrap;
        }

        .jogadores-page .player-picker {
          position: relative;
          width: 100%;
          min-width: 0;
        }

        .jogadores-page .player-picker-button {
          width: 100%;
          min-width: 0;
          min-height: 44px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 20px;
          align-items: center;
          gap: 8px;
          padding: 8px 10px 8px 13px;
          border: 1px solid rgba(96, 165, 250, 0.78);
          border-radius: 10px;
          color: #ffffff;
          background: #101f37;
          font-weight: 800;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .jogadores-page .player-picker-button:hover,
        .jogadores-page .player-picker-button[aria-expanded="true"] {
          background: rgba(59, 130, 246, 0.16);
          border-color: #60a5fa;
        }

        .jogadores-page .player-picker-button:disabled {
          cursor: not-allowed;
          opacity: 0.72;
        }

        .jogadores-page .player-picker-label {
          display: block;
          width: 100%;
          min-width: 0;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 800;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
          user-select: none;
          -webkit-user-select: none;
        }

        .jogadores-page .player-picker-arrow {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          color: #cbd5e1;
          background: transparent;
          border: 0;
          border-radius: 0;
          font-size: 0.72rem;
          line-height: 1;
          user-select: none;
          -webkit-user-select: none;
        }

        .jogadores-page .player-picker-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 100;
          width: 100%;
          max-height: 320px;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 6px;
          border-radius: 10px;
          border: 1px solid rgba(96, 165, 250, 0.75);
          background: #101f37;
          box-shadow: 0 20px 44px rgba(0, 0, 0, 0.58);
        }

        .jogadores-page .player-picker-option {
          width: 100%;
          min-height: 40px;
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          padding: 6px 9px;
          border: 0;
          border-radius: 8px;
          color: #ffffff;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }

        .jogadores-page .player-picker-option:hover,
        .jogadores-page .player-picker-option.ativo {
          background: rgba(59, 130, 246, 0.20);
        }

        .jogadores-page .player-picker-option img {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }

        .jogadores-page .player-picker-option span {
          min-width: 0;
          color: #ffffff;
          font-size: 0.87rem;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .jogadores-page .player-name-readonly {
          min-width: 0;
          min-height: 44px;
          display: flex;
          align-items: center;
          padding: 8px 13px;
          border-radius: 10px;
          color: #ffffff;
          background: #101f37;
          border: 1px solid rgba(96, 165, 250, 0.45);
          font-size: 0.88rem;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          user-select: none;
          -webkit-user-select: none;
        }

        .jogadores-page .substitution-box {
          min-width: 0;
          min-height: 44px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px 12px;
          padding: 8px 13px;
          border-radius: 10px;
          color: #ffffff;
          background: #101f37;
          border: 1px solid rgba(96, 165, 250, 0.45);
          line-height: 1.2;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .jogadores-page .substitution-item {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .jogadores-page .substitution-arrow-in {
          flex: 0 0 auto;
          color: #4ade80;
          font-size: 0.9rem;
          line-height: 1;
        }

        .jogadores-page .substitution-arrow-out {
          flex: 0 0 auto;
          color: #f87171;
          font-size: 0.9rem;
          line-height: 1;
        }

        .jogadores-page .substitution-name {
          min-width: 0;
          color: #ffffff !important;
          background: transparent !important;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .jogadores-page .substitution-box ::selection {
          color: inherit;
          background: transparent;
        }


        /* Aparência original: sem azul forte nem seleção de texto */
        .jogadores-page .player-row,
        .jogadores-page .player-number,
        .jogadores-page .fixed-team,
        .jogadores-page .fixed-team span,
        .jogadores-page .player-picker,
        .jogadores-page .player-picker-button,
        .jogadores-page .player-picker-label,
        .jogadores-page .player-picker-arrow,
        .jogadores-page .player-picker-option,
        .jogadores-page .player-picker-option span,
        .jogadores-page .player-name-readonly {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }

        .jogadores-page .player-row ::selection,
        .jogadores-page .player-picker-button::selection,
        .jogadores-page .player-picker-label::selection,
        .jogadores-page .fixed-team span::selection,
        .jogadores-page .player-picker-option span::selection {
          color: inherit;
          background: transparent;
        }

        .jogadores-page .player-row {
          background: rgba(24, 42, 70, 0.72);
        }

        .jogadores-page .player-number {
          background: rgba(59, 130, 246, 0.14);
          border-color: rgba(96, 165, 250, 0.52);
        }

        .jogadores-page .player-picker-button,
        .jogadores-page .player-name-readonly {
          color: #ffffff;
          background: #101f37 !important;
          border-color: rgba(96, 165, 250, 0.45) !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .jogadores-page .player-picker-button:hover,
        .jogadores-page .player-picker-button:focus,
        .jogadores-page .player-picker-button:focus-visible,
        .jogadores-page .player-picker-button:active,
        .jogadores-page .player-picker-button[aria-expanded="true"] {
          color: #ffffff;
          background: #101f37 !important;
          border-color: rgba(96, 165, 250, 0.58) !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .jogadores-page .player-picker-label,
        .jogadores-page .fixed-team span {
          color: #ffffff !important;
          background: transparent !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .jogadores-page .player-picker-arrow {
          color: #cbd5e1;
          background: transparent !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .jogadores-page .player-picker-option:hover,
        .jogadores-page .player-picker-option:focus,
        .jogadores-page .player-picker-option:active,
        .jogadores-page .player-picker-option.ativo {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06) !important;
          outline: none !important;
          box-shadow: none !important;
        }

        @media (max-width: 1450px) {
          .jogadores-page .players-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .jogadores-page .competencia-card {
            grid-template-columns: 1fr 1fr;
            padding: 12px;
          }

          .jogadores-page .team-card-header {
            min-height: 104px;
            padding: 16px 18px;
          }

          .jogadores-page .team-card-header img {
            width: 50px;
            height: 50px;
            flex-basis: 50px;
          }

          .jogadores-page .players-table-header,
          .jogadores-page .player-row {
            grid-template-columns:
              34px
              minmax(82px, 0.72fr)
              minmax(0, 1.28fr);
            column-gap: 7px;
          }

          .jogadores-page .players-table-header {
            margin: 0 12px;
            padding: 10px 7px;
            font-size: 0.64rem;
          }

          .jogadores-page .players-list {
            gap: 7px;
            padding: 7px 12px 16px;
          }

          .jogadores-page .player-row {
            min-height: 56px;
            padding: 6px 7px;
          }

          .jogadores-page .player-number {
            width: 28px;
            height: 28px;
            font-size: 0.8rem;
          }

          .jogadores-page .fixed-team {
            gap: 6px;
          }

          .jogadores-page .fixed-team img {
            width: 26px;
            height: 26px;
            flex-basis: 26px;
          }

          .jogadores-page .fixed-team span,
          .jogadores-page .player-picker-label,
          .jogadores-page .player-name-readonly {
            font-size: 0.74rem;
          }
        }
      `}</style>

      <section className="page-header">
        <span className="panel-label">ELENCOS</span>
        <h2>Jogadores</h2>

        <p>
          Selecione o mês e o ano. Cada competência mantém seu próprio
          elenco sem alterar os registros dos outros meses.
        </p>

        <div className="competencia-card">
          <div className="competencia-field">
            <label htmlFor="elenco-mes">Mês</label>
            <select
              id="elenco-mes"
              value={mesSelecionado}
              disabled={carregando || salvandoTroca}
              onChange={(evento) =>
                setMesSelecionado(Number(evento.target.value))
              }
            >
              {MESES.map((mes) => (
                <option key={mes.valor} value={mes.valor}>
                  {mes.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="competencia-field">
            <label htmlFor="elenco-ano">Ano</label>
            <select
              id="elenco-ano"
              value={anoSelecionado}
              disabled={carregando || salvandoTroca}
              onChange={(evento) =>
                setAnoSelecionado(Number(evento.target.value))
              }
            >
              {ANOS.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>

          <p className="competencia-resumo">
            Elenco de {nomeMesSelecionado} de {anoSelecionado}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {!adminLiberado ? (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMensagem("");
                setMostrarLogin(true);
              }}
            >
              🔒 Ativar edição administrativa
            </button>
          ) : (
            <>
              <span
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  color: "#86efac",
                  background: "#153b2a",
                  border: "1px solid #22c55e",
                  fontWeight: "bold",
                }}
              >
                ✅ Modo administrador ativo
              </span>

              <button
                type="button"
                onClick={sairDoModoAdmin}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  color: "#ffffff",
                  background: "transparent",
                  border: "1px solid #64748b",
                  cursor: "pointer",
                }}
              >
                Sair do modo administrador
              </button>
            </>
          )}
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
            background: mensagem.startsWith("✅")
              ? "#153b2a"
              : "#3b1c24",
            borderLeft: mensagem.startsWith("✅")
              ? "4px solid #22c55e"
              : "4px solid #ef4444",
          }}
        >
          {mensagem}
        </div>
      )}

      {mostrarLogin && !adminLiberado && (
        <AdminLogin
          titulo="Área administrativa"
          descricao="Digite a senha para liberar a edição do elenco mensal."
          onLiberado={() => {
            setAdminLiberado(true);
            setMostrarLogin(false);
            setMensagem("✅ Edição administrativa liberada.");
          }}
          onCancelar={() => {
            setMostrarLogin(false);
            setMensagem(
              "Acesso restrito. Apenas administradores podem alterar jogadores."
            );
          }}
        />
      )}

      {carregando ? (
        <p style={{ color: "#fff", textAlign: "center" }}>
          Carregando elenco de {nomeMesSelecionado} de {anoSelecionado}...
        </p>
      ) : (
        <section className="players-grid">
          {jogadoresPorTime.map((time) => (
            <article className="team-card" key={time.id}>
              <div className="team-card-header">
                <img
                  src={escudoTime(time.nome)}
                  alt={`Escudo do ${time.nome}`}
                />

                <div>
                  <span className="panel-label">EQUIPE</span>
                  <h3>{time.nome}</h3>
                </div>
              </div>

              <div className="players-table-header">
                <span>Nº</span>
                <span>Time</span>
                <span>Nome</span>
              </div>

              <div className="players-list">
                {time.jogadores.map((jogador) => {
                  const substituicao =
                    substituicaoPorJogadorSaida.get(Number(jogador.id));

                  return (
                    <div className="player-row" key={jogador.elenco_id}>
                      <strong className="player-number">
                        {jogador.posicao}
                      </strong>

                      <div className="fixed-team">
                        <img
                          src={escudoTime(time.nome)}
                          alt={`Escudo do ${time.nome}`}
                        />
                        <span title={time.nome}>{time.nome}</span>
                      </div>

                      {substituicao ? (
                        <div className="substitution-box">
                          <span className="substitution-item">
                            <span
                              className="substitution-arrow-in"
                              aria-hidden="true"
                            >
                              ▲
                            </span>
                            <span className="substitution-name">
                              {substituicao.jogador_entrada_nome_snapshot}
                            </span>
                          </span>

                          <span className="substitution-item">
                            <span
                              className="substitution-arrow-out"
                              aria-hidden="true"
                            >
                              ▼
                            </span>
                            <span className="substitution-name">
                              {substituicao.jogador_saida_nome_snapshot}
                            </span>
                          </span>
                        </div>
                      ) : adminLiberado ? (
                        <div className="player-picker">
                          <button
                            type="button"
                            className="player-picker-button"
                            disabled={salvandoTroca}
                            onClick={() =>
                              setSeletorAberto((aberto) =>
                                aberto === jogador.elenco_id
                                  ? null
                                  : jogador.elenco_id
                              )
                            }
                            aria-expanded={
                              seletorAberto === jogador.elenco_id
                            }
                            aria-label={`Selecionar jogador para a posição ${jogador.posicao} do ${time.nome}`}
                          >
                            <span className="player-picker-label">
                              {jogador.nome}
                              {jogador.capitao ? " (C)" : ""}
                            </span>

                            <span className="player-picker-arrow">▾</span>
                          </button>

                          {seletorAberto === jogador.elenco_id && (
                            <div className="player-picker-menu">
                              {jogadoresDoMes
                                .slice()
                                .sort((a, b) =>
                                  a.nome.localeCompare(b.nome, "pt-BR")
                                )
                                .map((opcao) => {
                                  const timeOpcao = times.find(
                                    (item) =>
                                      Number(item.id) ===
                                      Number(opcao.time_id)
                                  );

                                  return (
                                    <button
                                      type="button"
                                      key={opcao.id}
                                      className={`player-picker-option ${
                                        Number(opcao.id) ===
                                        Number(jogador.id)
                                          ? "ativo"
                                          : ""
                                      }`}
                                      onClick={() =>
                                        trocarJogadores(
                                          jogador.id,
                                          opcao.id
                                        )
                                      }
                                    >
                                      <img
                                        src={escudoTime(
                                          timeOpcao?.nome || "Sem time"
                                        )}
                                        alt=""
                                        aria-hidden="true"
                                      />

                                      <span>
                                        {opcao.nome}
                                        {opcao.capitao ? " (C)" : ""}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="player-name-readonly"
                          title={jogador.nome}
                        >
                          {jogador.nome}
                          {jogador.capitao ? " (C)" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}

                {time.jogadores.length === 0 && (
                  <p
                    style={{
                      color: "#9aa7bd",
                      padding: "14px",
                    }}
                  >
                    Nenhum jogador neste time neste mês.
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default Jogadores;