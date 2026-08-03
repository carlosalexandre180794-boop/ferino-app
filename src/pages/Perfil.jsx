import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function Perfil() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] =
    useState("sucesso");

  useEffect(() => {
    async function carregarUsuario() {
      setCarregando(true);

      const { data, error } =
        await supabase.auth.getUser();

      if (error) {
        console.error(
          "Erro ao carregar usuário:",
          error
        );

        setMensagem(
          "Não foi possível carregar os dados da conta."
        );

        setTipoMensagem("erro");
      }

      setUsuario(data?.user ?? null);
      setCarregando(false);
    }

    carregarUsuario();
  }, []);

  const dados = useMemo(() => {
    const metadata = usuario?.user_metadata || {};
    const identidade =
      usuario?.identities?.[0] || null;

    const provider =
      identidade?.provider ||
      usuario?.app_metadata?.provider ||
      "email";

    return {
      nome:
        metadata.full_name ||
        metadata.name ||
        usuario?.email?.split("@")[0] ||
        "Usuário",

      email:
        usuario?.email ||
        "E-mail não disponível",

      foto:
        metadata.avatar_url ||
        metadata.picture ||
        "",

      provider,
    };
  }, [usuario]);

  async function alterarSenha() {
    if (!usuario?.email || enviando) {
      return;
    }

    setEnviando(true);
    setMensagem("");

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        usuario.email
      );

    if (error) {
      console.error(
        "Erro ao enviar recuperação de senha:",
        error
      );

      setTipoMensagem("erro");

      setMensagem(
        "Não foi possível enviar o e-mail de recuperação."
      );
    } else {
      setTipoMensagem("sucesso");

      setMensagem(
        "Enviamos um link de recuperação para o seu e-mail."
      );
    }

    setEnviando(false);
  }

  function sairDaConta() {
    const confirmou = window.confirm(
      "Deseja realmente sair da sua conta?"
    );

    if (!confirmou) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("ferino-encerrar-acesso")
    );
  }

  if (carregando) {
    return (
      <main className="page">
        <p
          style={{
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          Carregando conta...
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <section
        style={{
          width: "100%",
          maxWidth: "520px",
          margin: "0 auto",
          padding: "24px",
          border: "1px solid #34343a",
          borderRadius: "18px",
          background: "#202022",
          boxShadow:
            "0 18px 45px rgba(0,0,0,.28)",
        }}
      >
        <div
          style={{
            display: "grid",
            justifyItems: "center",
            textAlign: "center",
          }}
        >
          {dados.foto ? (
            <img
              src={dados.foto}
              alt={`Foto de ${dados.nome}`}
              referrerPolicy="no-referrer"
              style={{
                width: "104px",
                height: "104px",
                objectFit: "cover",
                borderRadius: "50%",
                border: "3px solid #c58b2a",
                boxShadow:
                  "0 0 18px rgba(197,139,42,.25)",
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: "104px",
                height: "104px",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                border: "3px solid #c58b2a",
                background: "#2b2b2f",
                fontSize: "2.6rem",
              }}
            >
              👤
            </div>
          )}

          <h2
            style={{
              margin: "18px 0 5px",
              color: "#ffffff",
              fontSize: "1.65rem",
            }}
          >
            {dados.nome}
          </h2>

          <p
            style={{
              margin: 0,
              color: "#a8a8ad",
              wordBreak: "break-word",
            }}
          >
            {dados.email}
          </p>

          <span
            style={{
              marginTop: "12px",
              padding: "7px 11px",
              borderRadius: "999px",
              background: "#2d2414",
              color: "#e5bd5c",
              fontSize: ".78rem",
              fontWeight: "800",
            }}
          >
            {dados.provider === "google"
              ? "Conta Google"
              : "Conta por e-mail"}
          </span>
        </div>

        {mensagem && (
          <div
            style={{
              marginTop: "22px",
              padding: "12px 14px",
              borderRadius: "10px",
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

        <div
          style={{
            display: "grid",
            gap: "11px",
            marginTop: "26px",
          }}
        >
          {dados.provider === "email" && (
            <button
              type="button"
              onClick={alterarSenha}
              disabled={enviando}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "11px",
                border: "1px solid #4b5563",
                background: "#29292d",
                color: "#ffffff",
                fontWeight: "800",
                cursor: enviando
                  ? "not-allowed"
                  : "pointer",
                opacity: enviando ? 0.6 : 1,
              }}
            >
              {enviando
                ? "Enviando..."
                : "Alterar senha"}
            </button>
          )}

          <button
            type="button"
            onClick={sairDaConta}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: "11px",
              border: "1px solid #ef4444",
              background: "#3b1c24",
              color: "#ffffff",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            Sair da conta
          </button>
        </div>
      </section>
    </main>
  );
}

export default Perfil;