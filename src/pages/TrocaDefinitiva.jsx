import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  validarSenhaAdmin,
  ativarModoAdmin,
  adminEstaAtivo,
  desativarModoAdmin,
} from "../auth/adminAuth";

function TrocaDefinitiva() {
 
  const [isAdmin, setIsAdmin] = useState(adminEstaAtivo());
  const [senhaDigitada, setSenhaDigitada] = useState("");

  const [temporadas, setTemporadas] = useState([]);
  const [temporadaId, setTemporadaId] = useState("");

  const [elenco, setElenco] = useState([]);
  const [jogadorSaidaId, setJogadorSaidaId] = useState("");

  const [novoNome, setNovoNome] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("sucesso");

  // =========================================================
  // CARREGA AS TEMPORADAS NÃO ENCERRADAS
  // =========================================================

  useEffect(() => {
    async function carregarTemporadas() {
      setCarregando(true);
      setMensagem("");

      const { data, error } = await supabase
        .from("temporadas")
        .select("id, ano, mes, nome, status")
        .neq("status", "encerrada")
        .order("ano", { ascending: false })
        .order("mes", { ascending: false });

      if (error) {
        console.error(
          "Erro ao carregar temporadas:",
          error
        );

        setTipoMensagem("erro");
        setMensagem(
          "Não foi possível carregar as competências."
        );

        setCarregando(false);
        return;
      }
const lista = data || [];

const agora = new Date();
const anoAtual = agora.getFullYear();
const mesAtual = agora.getMonth() + 1;

const temporadaAtual = lista.find(
  (temporada) =>
    Number(temporada.ano) === anoAtual &&
    Number(temporada.mes) === mesAtual
);

if (temporadaAtual) {
  setTemporadas([temporadaAtual]);
  setTemporadaId(String(temporadaAtual.id));
} else {
  setTemporadas([]);
  setTemporadaId("");
  setTipoMensagem("erro");
  setMensagem(
    `Ainda não existe campeonato criado para ${mesAtual}/${anoAtual}.`
  );
}

      setCarregando(false);
    }

    carregarTemporadas();
  }, []);

  // =========================================================
  // CARREGA O ELENCO DA TEMPORADA
  // =========================================================

  useEffect(() => {
    async function carregarElenco() {
      if (!temporadaId) {
        setElenco([]);
        setJogadorSaidaId("");
        return;
      }

      setJogadorSaidaId("");
      setElenco([]);
      setMensagem("");

      const { data, error } = await supabase
        .from("elencos")
        .select(`
          jogador_id,
          jogador_nome_snapshot,
          time_id,
          posicao,
          capitao,
          ativo,
          times (
            nome
          ),
          jogadores (
            id,
            nome,
            goleiro,
            ativo,
            jogos_goleiro,
            gols_sofridos
          )
        `)
        .eq("temporada_id", Number(temporadaId))
        .eq("ativo", true)
        .order("time_id", { ascending: true })
        .order("posicao", { ascending: true });

      if (error) {
        console.error(
          "Erro ao carregar elenco:",
          error
        );

        setTipoMensagem("erro");
        setMensagem(
          "Não foi possível carregar o elenco."
        );

        return;
      }

      const lista = (data || []).filter(
        (item) => item.jogadores?.ativo !== false
      );

      setElenco(lista);
    }

    carregarElenco();
  }, [temporadaId]);

  // =========================================================
  // JOGADOR SELECIONADO
  // =========================================================

  const jogadorSelecionado = useMemo(() => {
    return (
      elenco.find(
        (item) =>
          String(item.jogador_id) ===
          String(jogadorSaidaId)
      ) || null
    );
  }, [elenco, jogadorSaidaId]);

  const ehGoleiro =
    jogadorSelecionado?.jogadores?.goleiro === true;
function verificarSenhaAdmin(evento) {
  evento.preventDefault();

  if (validarSenhaAdmin(senhaDigitada)) {
    ativarModoAdmin();
    setIsAdmin(true);
    setSenhaDigitada("");
    setMensagem("");
    return;
  }

  alert(
    "Acesso negado! Apenas administradores podem realizar trocas definitivas."
  );
}

function sairDoModoAdmin() {
  desativarModoAdmin();
  setIsAdmin(false);
  setSenhaDigitada("");
  setMensagem("");
}
  // =========================================================
  // CONFIRMA TROCA
  // =========================================================

  async function confirmarTroca() {
    if (salvando) return;

    if (!temporadaId) {
      setTipoMensagem("erro");
      setMensagem("Selecione a competência.");
      return;
    }

    if (!jogadorSaidaId) {
      setTipoMensagem("erro");
      setMensagem(
        "Selecione o membro que vai sair."
      );
      return;
    }

    const nomeLimpo = novoNome.trim();

    if (!nomeLimpo) {
      setTipoMensagem("erro");
      setMensagem(
        "Digite o nome do novo membro."
      );
      return;
    }

    const nomeSaida =
      jogadorSelecionado?.jogadores?.nome ||
      jogadorSelecionado?.jogador_nome_snapshot ||
      "Jogador";

    const time =
      jogadorSelecionado?.times?.nome ||
      "time atual";

    const textoConfirmacao = ehGoleiro
      ? `${nomeSaida} será removido definitivamente do Ferino e ${nomeLimpo} entrará em sua vaga no ${time}.\n\n` +
        `Como ${nomeSaida} é goleiro, ${nomeLimpo} herdará o acumulado de jogos como goleiro e gols sofridos para o Paredão do Ano.\n\n` +
        `Os históricos dos meses anteriores continuarão preservados.\n\n` +
        `Deseja confirmar?`
      : `${nomeSaida} será removido definitivamente do Ferino e ${nomeLimpo} entrará em sua vaga no ${time}.\n\n` +
        `${nomeLimpo} começará com as estatísticas individuais zeradas.\n\n` +
        `Os históricos dos meses anteriores continuarão preservados.\n\n` +
        `Deseja confirmar?`;

    const confirmou = window.confirm(
      textoConfirmacao
    );

    if (!confirmou) return;

    setSalvando(true);
    setMensagem("");

    const { data, error } = await supabase.rpc(
      "ferino_troca_definitiva",
      {
        p_temporada_id: Number(temporadaId),
        p_jogador_saida_id: Number(jogadorSaidaId),
        p_novo_nome: nomeLimpo,
      }
    );

    if (error) {
      console.error(
        "Erro na troca definitiva:",
        error
      );

      setTipoMensagem("erro");

      setMensagem(
        error.message ||
          "Não foi possível realizar a troca definitiva."
      );

      setSalvando(false);
      return;
    }

    const resultado = data?.[0];

    setTipoMensagem("sucesso");

    setMensagem(
      resultado?.mensagem ||
        "Troca definitiva realizada com sucesso."
    );

    setNovoNome("");
    setJogadorSaidaId("");

    // Recarrega o elenco depois da troca
    const { data: elencoAtualizado, error: erroElenco } =
      await supabase
        .from("elencos")
        .select(`
          jogador_id,
          jogador_nome_snapshot,
          time_id,
          posicao,
          capitao,
          ativo,
          times (
            nome
          ),
          jogadores (
            id,
            nome,
            goleiro,
            ativo,
            jogos_goleiro,
            gols_sofridos
          )
        `)
        .eq("temporada_id", Number(temporadaId))
        .eq("ativo", true)
        .order("time_id", { ascending: true })
        .order("posicao", { ascending: true });

    if (!erroElenco) {
      setElenco(
        (elencoAtualizado || []).filter(
          (item) => item.jogadores?.ativo !== false
        )
      );
    }

    setSalvando(false);
  }
if (!isAdmin) {
  return (
    <main
      style={{
        padding: "20px",
        textAlign: "center",
        color: "#fff",
      }}
    >
      <section style={{ marginBottom: "16px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.7rem",
          }}
        >
          Troca definitiva
        </h2>
      </section>

      <form
        onSubmit={verificarSenhaAdmin}
        style={{
          background: "#1e1e24",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "400px",
          margin: "0 auto",
          border: "1px solid #333",
        }}
      >
        <label
          htmlFor="senha-admin-troca"
          style={{
            display: "block",
            color: "#aaa",
            marginBottom: "10px",
          }}
        >
          Digite a senha de administrador
        </label>

        <input
          id="senha-admin-troca"
          type="password"
          placeholder="Senha..."
          value={senhaDigitada}
          onChange={(evento) =>
            setSenhaDigitada(evento.target.value)
          }
          autoComplete="current-password"
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#2a2a32",
            border: "1px solid #444",
            color: "#fff",
            borderRadius: "4px",
            marginBottom: "14px",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
  // =========================================================
  // CARREGANDO
  // =========================================================

  if (carregando) {
    return (
      <main
        style={{
          padding: "24px",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        Carregando...
      </main>
    );
  }

  // =========================================================
  // TELA
  // =========================================================

  return (
    <main
      style={{
        width: "100%",
        maxWidth: "620px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <section
        style={{
          background: "#202022",
          border: "1px solid #34343a",
          borderRadius: "18px",
          padding: "20px",
          boxShadow:
            "0 18px 45px rgba(0,0,0,.28)",
        }}
      >
        <div
          style={{
            marginBottom: "22px",
          }}
        >
          <h2
            style={{
              margin: "0 0 6px",
              color: "#ffffff",
              fontSize: "1.45rem",
            }}
          >
            👥 Troca definitiva
          </h2>

          <p
            style={{
              margin: 0,
              color: "#a8a8ad",
              lineHeight: 1.5,
            }}
          >
            Use somente quando um membro deixar
            definitivamente o Ferino e outro assumir
            sua vaga.
          </p>
        </div>

        {/* COMPETÊNCIA */}

        <label
          style={{
            display: "block",
            marginBottom: "7px",
            color: "#d6d6da",
            fontWeight: "800",
          }}
        >
          Competência
        </label>

        <div
  style={{
    ...campoStyle,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "default",
  }}
>
  <span>
    {temporadas[0]?.nome || "Nenhuma competência ativa"}
  </span>

  <span
    aria-hidden="true"
    style={{
      color: "#9ca3af",
      fontSize: "0.9rem",
    }}
  >
    🔒
  </span>
</div>

        {/* MEMBRO QUE VAI SAIR */}

        <label
          style={{
            display: "block",
            margin: "18px 0 7px",
            color: "#d6d6da",
            fontWeight: "800",
          }}
        >
          Membro que vai sair
        </label>

        <select
          value={jogadorSaidaId}
          onChange={(e) => {
            setJogadorSaidaId(e.target.value);
            setMensagem("");
          }}
          style={campoStyle}
        >
          <option value="">
            Selecione o membro
          </option>

          {elenco.map((item) => {
            const nome =
              item.jogadores?.nome ||
              item.jogador_nome_snapshot;

            const time =
              item.times?.nome || "Sem time";

            const goleiro =
              item.jogadores?.goleiro === true;

            return (
              <option
                key={item.jogador_id}
                value={item.jogador_id}
              >
                {time} — {nome}
                {goleiro ? " 🧤" : ""}
              </option>
            );
          })}
        </select>

        {/* INFORMAÇÕES DA PESSOA SELECIONADA */}

        {jogadorSelecionado && (
          <div
            style={{
              marginTop: "14px",
              padding: "14px",
              borderRadius: "12px",
              background: ehGoleiro
                ? "#2d2414"
                : "#182b23",
              border: ehGoleiro
                ? "1px solid #8a6724"
                : "1px solid #27533f",
            }}
          >
            <strong
              style={{
                display: "block",
                color: ehGoleiro
                  ? "#e5bd5c"
                  : "#6ee7b7",
                marginBottom: "5px",
              }}
            >
              {ehGoleiro
                ? "🧤 Goleiro"
                : "⚽ Jogador de linha"}
            </strong>

            <span
              style={{
                color: "#d1d1d5",
                lineHeight: 1.5,
              }}
            >
              {ehGoleiro
                ? `O novo goleiro herdará o acumulado de ${jogadorSelecionado.jogadores?.jogos_goleiro ?? 0} jogos como goleiro e ${jogadorSelecionado.jogadores?.gols_sofridos ?? 0} gols sofridos do mês atual, além da sucessão para o ranking anual.`
                : "O novo membro começará com jogos, gols e cartões zerados."}
            </span>
          </div>
        )}

        {/* NOVO MEMBRO */}

        <label
          style={{
            display: "block",
            margin: "18px 0 7px",
            color: "#d6d6da",
            fontWeight: "800",
          }}
        >
          Nome do novo membro
        </label>

        <input
          type="text"
          value={novoNome}
          onChange={(e) =>
            setNovoNome(e.target.value)
          }
          placeholder="Ex.: José"
          autoComplete="off"
          style={campoStyle}
        />

        {/* MENSAGEM */}

        {mensagem && (
          <div
            style={{
              marginTop: "18px",
              padding: "13px 14px",
              borderRadius: "11px",
              color: "#ffffff",
              background:
                tipoMensagem === "sucesso"
                  ? "#153b2a"
                  : "#3b1c24",
              borderLeft:
                tipoMensagem === "sucesso"
                  ? "4px solid #22c55e"
                  : "4px solid #ef4444",
              lineHeight: 1.45,
            }}
          >
            {mensagem}
          </div>
        )}

        {/* BOTÃO */}

        <button
          type="button"
          onClick={confirmarTroca}
          disabled={
            salvando ||
            !temporadaId ||
            !jogadorSaidaId ||
            !novoNome.trim()
          }
          style={{
            width: "100%",
            marginTop: "22px",
            padding: "14px 16px",
            border: 0,
            borderRadius: "12px",
            background: "#c58b2a",
            color: "#101010",
            fontWeight: "900",
            fontSize: "1rem",
            cursor: salvando
              ? "not-allowed"
              : "pointer",
            opacity:
              salvando ||
              !temporadaId ||
              !jogadorSaidaId ||
              !novoNome.trim()
                ? 0.55
                : 1,
          }}
        >
          {salvando
            ? "Realizando troca..."
            : "Confirmar troca definitiva"}
        </button>

        <p
          style={{
            margin: "15px 0 0",
            color: "#8f8f95",
            fontSize: ".82rem",
            textAlign: "center",
            lineHeight: 1.45,
          }}
        >
          Esta operação é diferente da substituição
          temporária e deve ser utilizada somente para
          alteração permanente de membro.
        </p>
      </section>
    </main>
  );
}

const campoStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  borderRadius: "11px",
  border: "1px solid #44444a",
  background: "#29292d",
  color: "#ffffff",
  fontSize: "16px",
  outline: "none",
};

export default TrocaDefinitiva;