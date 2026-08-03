import { useState } from "react";
import {
  ativarModoAdmin,
  validarSenhaAdmin,
} from "../auth/adminAuth";

function AdminLogin({
  onLiberado,
  onCancelar,
  titulo = "Área administrativa",
  descricao = "Digite a senha para continuar.",
  compacto = false,
}) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function entrar(evento) {
    evento.preventDefault();

    if (carregando) return;

    setErro("");

    if (!validarSenhaAdmin(senha)) {
      setErro("Senha incorreta. Acesso não autorizado.");
      return;
    }

    setCarregando(true);
    ativarModoAdmin();

    if (typeof onLiberado === "function") {
      onLiberado();
    }

    setCarregando(false);
  }

  return (
    <section
      style={{
        width: "100%",
        maxWidth: compacto ? "100%" : "430px",
        margin: compacto ? "0" : "40px auto",
        padding: compacto ? "20px" : "28px",
        background: "#111827",
        border: "1px solid #3b2d15",
        borderRadius: "16px",
        boxShadow: "0 18px 45px rgba(0,0,0,.35)",
      }}
    >
      <h2 style={{ margin: "0 0 8px", color: "#fff" }}>
        {titulo}
      </h2>

      <p style={{ margin: "0 0 22px", color: "#94a3b8", lineHeight: 1.5 }}>
        {descricao}
      </p>

      <form onSubmit={entrar}>
        <label
          htmlFor="senha-admin"
          style={{
            display: "block",
            marginBottom: "8px",
            color: "#e5e7eb",
            fontWeight: "bold",
          }}
        >
          Senha do administrador
        </label>

        <input
          id="senha-admin"
          type="password"
          value={senha}
          onChange={(evento) => {
            setSenha(evento.target.value);
            setErro("");
          }}
          placeholder="Digite a senha"
          autoComplete="current-password"
          autoFocus
          style={{
            width: "100%",
            padding: "14px",
            border: erro ? "1px solid #ef4444" : "1px solid #4b5563",
            borderRadius: "10px",
            background: "#0b1220",
            color: "#fff",
            outline: "none",
            fontSize: "16px",
          }}
        />

        {erro && (
          <p style={{ margin: "10px 0 0", color: "#fca5a5", fontSize: "14px" }}>
            {erro}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "22px",
          }}
        >
          {typeof onCancelar === "function" && (
            <button
              type="button"
              onClick={onCancelar}
              disabled={carregando}
              style={{
                padding: "11px 16px",
                border: "1px solid #4b5563",
                borderRadius: "9px",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Voltar
            </button>
          )}

          <button
            type="submit"
            disabled={carregando || senha.trim() === ""}
            style={{
              padding: "11px 18px",
              border: "1px solid #d3a632",
              borderRadius: "9px",
              background: "#5b4215",
              color: "#fff",
              fontWeight: "bold",
              cursor:
                carregando || senha.trim() === ""
                  ? "not-allowed"
                  : "pointer",
              opacity:
                carregando || senha.trim() === ""
                  ? 0.55
                  : 1,
            }}
          >
            {carregando ? "Entrando..." : "Entrar como administrador"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AdminLogin;
