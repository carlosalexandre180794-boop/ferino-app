import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../supabaseClient";
import AdminLogin from "../components/AdminLogin";

import {
  adminEstaAtivo,
  desativarModoAdmin,
} from "../auth/adminAuth";

function EditarElenco() {
  const navigate = useNavigate();

  const [adminLiberado, setAdminLiberado] = useState(
    adminEstaAtivo()
  );

  const agora = new Date();

  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth() + 1);

  const [temporada, setTemporada] = useState(null);
  const [elenco, setElenco] = useState([]);

  const [jogadorA, setJogadorA] = useState("");
  const [jogadorB, setJogadorB] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] =
    useState("sucesso");

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const anos = Array.from(
    { length: 8 },
    (_, indice) => 2026 + indice
  );

  useEffect(() => {
    if (adminLiberado) {
      carregarElenco();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes, adminLiberado]);

  async function carregarElenco() {
    setCarregando(true);
    setMensagem("");
    setJogadorA("");
    setJogadorB("");
    setTemporada(null);
    setElenco([]);

    try {
      const { data: temporadaEncontrada, error: erroTemp } =
        await supabase
          .from("temporadas")
          .select("id, ano, mes, nome, status")
          .eq("ano", Number(ano))
          .eq("mes", Number(mes))
          .maybeSingle();

      if (erroTemp) {
        throw erroTemp;
      }

      if (!temporadaEncontrada) {
        setTipoMensagem("erro");
        setMensagem(
          `Não existe elenco criado para ${meses[mes - 1]} de ${ano}.`
        );
        return;
      }

      setTemporada(temporadaEncontrada);

      const { data, error } = await supabase
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
        .eq(
          "temporada_id",
          Number(temporadaEncontrada.id)
        )
        .eq("ativo", true)
        .order("time_id", { ascending: true })
        .order("posicao", { ascending: true });

      if (error) {
        throw error;
      }

      setElenco(data || []);
    } catch (erro) {
      console.error(
        "Erro ao carregar elenco para edição:",
        erro
      );

      setTipoMensagem("erro");
      setMensagem(
        erro.message ||
          "Não foi possível carregar o elenco."
      );
    } finally {
      setCarregando(false);
    }
  }

  const registroA = useMemo(
    () =>
      elenco.find(
        (registro) =>
          Number(registro.jogador_id) ===
          Number(jogadorA)
      ) || null,
    [elenco, jogadorA]
  );

  const registroB = useMemo(
    () =>
      elenco.find(
        (registro) =>
          Number(registro.jogador_id) ===
          Number(jogadorB)
      ) || null,
    [elenco, jogadorB]
  );

  const jogadoresDisponiveisB = useMemo(() => {
    if (!registroA) {
      return [];
    }

    return elenco.filter(
      (registro) =>
        Number(registro.jogador_id) !==
          Number(registroA.jogador_id) &&
        Number(registro.time_id) !==
          Number(registroA.time_id)
    );
  }, [elenco, registroA]);

  async function trocarJogadores() {
    if (
      !temporada ||
      !jogadorA ||
      !jogadorB ||
      salvando
    ) {
      return;
    }

    if (!adminEstaAtivo()) {
      setAdminLiberado(false);
      return;
    }

    if (
      String(temporada.status || "").toLowerCase() ===
      "encerrada"
    ) {
      setTipoMensagem("erro");
      setMensagem(
        "Este campeonato já foi encerrado e o elenco não pode mais ser alterado."
      );
      return;
    }

    if (!registroA || !registroB) {
      setTipoMensagem("erro");
      setMensagem(
        "Não foi possível localizar os dois jogadores."
      );
      return;
    }

    const confirmou = window.confirm(
      `Deseja corrigir o elenco de ${meses[mes - 1]} de ${ano}?\n\n` +
        `${registroA.jogador_nome_snapshot} (${registroA.time_nome_snapshot})\n` +
        `↕\n` +
        `${registroB.jogador_nome_snapshot} (${registroB.time_nome_snapshot})\n\n` +
        `Eles trocarão de equipe somente neste mês.\n\n` +
        `Jogos, resultados e estatísticas não serão apagados.`
    );

    if (!confirmou) {
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const { error } = await supabase.rpc(
        "ferino_trocar_jogadores_elenco",
        {
          p_temporada_id: Number(temporada.id),
          p_jogador_a_id: Number(jogadorA),
          p_jogador_b_id: Number(jogadorB),
        }
      );

      if (error) {
        throw error;
      }

      setTipoMensagem("sucesso");

      setMensagem(
        `✅ ${registroA.jogador_nome_snapshot} e ${registroB.jogador_nome_snapshot} trocaram de equipe somente em ${meses[mes - 1]} de ${ano}.`
      );

      setJogadorA("");
      setJogadorB("");

      await carregarElenco();
    } catch (erro) {
      console.error(
        "Erro ao corrigir elenco mensal:",
        erro
      );

      setTipoMensagem("erro");
      setMensagem(
        erro.message ||
          "Não foi possível alterar o elenco."
      );
    } finally {
      setSalvando(false);
    }
  }

  function sairModoAdministrador() {
    desativarModoAdmin();
    setAdminLiberado(false);
  }

  if (!adminLiberado) {
    return (
      <main className="page">
        <AdminLogin
          titulo="Editar elenco do mês"
          descricao="Digite a senha de administrador para corrigir o elenco mensal."
          onLiberado={() =>
            setAdminLiberado(true)
          }
          onCancelar={() =>
            navigate("/campeonato")
          }
        />
      </main>
    );
  }

  return (
    <main
      className="page"
      style={{
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
      <section
        className="page-header"
        style={{
          marginBottom: "20px",
        }}
      >
        <span className="panel-label">
          CAMPEONATO
        </span>

        <h2>✏️ Editar elenco do mês</h2>

        <p>
          Corrija jogadores colocados em equipes
          erradas sem apagar jogos, resultados ou
          estatísticas.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "18px",
          }}
        >
          <button
            type="button"
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
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
              padding: "10px 16px",
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
            padding: "13px 14px",
            marginBottom: "18px",
            borderRadius: "8px",
            color: "#fff",
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

      <section
        className="panel"
        style={{
          padding: "20px",
        }}
      >
        <h3
          style={{
            marginTop: 0,
          }}
        >
          Competência
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          <label>
            <span style={labelStyle}>
              Mês
            </span>

            <select
              value={mes}
              onChange={(evento) =>
                setMes(
                  Number(evento.target.value)
                )
              }
              disabled={salvando}
              style={campoStyle}
            >
              {meses.map(
                (nomeMes, indice) => (
                  <option
                    key={nomeMes}
                    value={indice + 1}
                  >
                    {nomeMes}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span style={labelStyle}>
              Ano
            </span>

            <select
              value={ano}
              onChange={(evento) =>
                setAno(
                  Number(evento.target.value)
                )
              }
              disabled={salvando}
              style={campoStyle}
            >
              {anos.map((anoOpcao) => (
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

        {carregando ? (
          <p style={{ color: "#aaa" }}>
            Carregando elenco...
          </p>
        ) : temporada && elenco.length > 0 ? (
          <>
            <div
              style={{
                padding: "12px",
                marginBottom: "20px",
                borderRadius: "8px",
                background: "#172033",
                color: "#d5d9e3",
              }}
            >
              <strong>
                {temporada.nome ||
                  `${meses[mes - 1]} de ${ano}`}
              </strong>

              <div
                style={{
                  marginTop: "4px",
                  fontSize: ".85rem",
                  color: "#9ca3af",
                }}
              >
                {elenco.length} jogadores no
                elenco
              </div>
            </div>

            <label>
              <span style={labelStyle}>
                1º jogador
              </span>

              <select
                value={jogadorA}
                onChange={(evento) => {
                  setJogadorA(
                    evento.target.value
                  );
                  setJogadorB("");
                  setMensagem("");
                }}
                disabled={salvando}
                style={campoStyle}
              >
                <option value="">
                  Selecione o jogador que está
                  no time errado...
                </option>

                {elenco.map((registro) => (
                  <option
                    key={registro.jogador_id}
                    value={registro.jogador_id}
                  >
                    {registro.time_nome_snapshot}
                    {" — "}
                    {registro.jogador_nome_snapshot}
                  </option>
                ))}
              </select>
            </label>

            {registroA && (
              <div
                style={{
                  margin: "12px 0",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#2d2414",
                  border:
                    "1px solid #795c20",
                }}
              >
                <strong
                  style={{
                    color: "#e5bd5c",
                  }}
                >
                  Sai de{" "}
                  {registroA.time_nome_snapshot}
                </strong>

                <div
                  style={{
                    marginTop: "4px",
                    color: "#ddd",
                  }}
                >
                  {
                    registroA.jogador_nome_snapshot
                  }
                </div>
              </div>
            )}

            <label>
              <span style={labelStyle}>
                2º jogador
              </span>

              <select
                value={jogadorB}
                onChange={(evento) => {
                  setJogadorB(
                    evento.target.value
                  );
                  setMensagem("");
                }}
                disabled={
                  !registroA || salvando
                }
                style={campoStyle}
              >
                <option value="">
                  {registroA
                    ? "Selecione com quem ele deve trocar..."
                    : "Selecione o primeiro jogador antes"}
                </option>

                {jogadoresDisponiveisB.map(
                  (registro) => (
                    <option
                      key={
                        registro.jogador_id
                      }
                      value={
                        registro.jogador_id
                      }
                    >
                      {
                        registro.time_nome_snapshot
                      }
                      {" — "}
                      {
                        registro.jogador_nome_snapshot
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            {registroA && registroB && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "15px",
                  borderRadius: "10px",
                  background: "#172b22",
                  border:
                    "1px solid #276047",
                  color: "#fff",
                }}
              >
                <strong>
                  Resultado da correção:
                </strong>

                <p
                  style={{
                    margin:
                      "10px 0 4px",
                  }}
                >
                  {
                    registroA.jogador_nome_snapshot
                  }
                  {" → "}
                  <strong
                    style={{
                      color: "#6ee7b7",
                    }}
                  >
                    {
                      registroB.time_nome_snapshot
                    }
                  </strong>
                </p>

                <p
                  style={{
                    margin: "4px 0",
                  }}
                >
                  {
                    registroB.jogador_nome_snapshot
                  }
                  {" → "}
                  <strong
                    style={{
                      color: "#6ee7b7",
                    }}
                  >
                    {
                      registroA.time_nome_snapshot
                    }
                  </strong>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={trocarJogadores}
              disabled={
                !jogadorA ||
                !jogadorB ||
                salvando
              }
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "14px",
                border: "none",
                borderRadius: "9px",
                background: "#0f766e",
                color: "#fff",
                fontWeight: "900",
                fontSize: "1rem",
                cursor:
                  !jogadorA ||
                  !jogadorB ||
                  salvando
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  !jogadorA ||
                  !jogadorB ||
                  salvando
                    ? 0.55
                    : 1,
              }}
            >
              {salvando
                ? "Corrigindo elenco..."
                : "⇄ Confirmar troca no elenco"}
            </button>

            <p
              style={{
                margin:
                  "14px 0 0",
                color: "#999",
                fontSize: ".82rem",
                textAlign: "center",
                lineHeight: 1.45,
              }}
            >
              Esta alteração vale somente
              para o elenco desta competência.
              Os cadastros oficiais dos
              jogadores não serão alterados.
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}

const campoStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "46px",
  padding: "11px 12px",
  borderRadius: "7px",
  border: "1px solid #444",
  background: "#29292d",
  color: "#fff",
  fontSize: "16px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#aaa",
  fontWeight: "700",
};

export default EditarElenco;