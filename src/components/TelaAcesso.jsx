import { useState } from "react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import logoFerino from "../assets/logo-ferino.png";
import { supabase } from "../supabaseClient";

const URL_RETORNO = "br.com.ferino.app://login-callback";

function TelaAcesso() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrarComGoogle() {
    if (carregando) return;

    setCarregando(true);
    setErro("");

    try {
      const nativo = Capacitor.isNativePlatform();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: nativo ? URL_RETORNO : window.location.origin,
          skipBrowserRedirect: nativo,
        },
      });

      if (error) throw error;

      if (nativo) {
        if (!data?.url) {
          throw new Error("O Supabase não retornou a página de login.");
        }

        await Browser.open({ url: data.url });
      }
    } catch (error) {
      console.error("Erro no login com Google:", error);
      setErro(error?.message || "Não foi possível entrar com o Google.");
      setCarregando(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "grid",
        placeItems: "center",
        padding: "28px 18px",
        background:
          "radial-gradient(circle at top, rgba(151,102,22,.22), transparent 34%), #080808",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "430px",
          textAlign: "center",
        }}
      >
        <img
          src={logoFerino}
          alt="Logo do Ferino Pé de Pano"
          style={{
            width: "210px",
            height: "210px",
            objectFit: "contain",
            borderRadius: "50%",
            filter: "drop-shadow(0 0 24px rgba(218,165,32,.34))",
          }}
        />

        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={carregando}
          style={{
            width: "290px",
            maxWidth: "100%",
            minHeight: "58px",
            marginTop: "34px",
            padding: "14px 18px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            borderRadius: "12px",
            border: "1px solid #dadce0",
            background: "#fff",
            color: "#202124",
            fontSize: "1rem",
            fontWeight: "800",
            cursor: carregando ? "not-allowed" : "pointer",
            opacity: carregando ? 0.65 : 1,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              color: "#4285f4",
              fontSize: "22px",
              fontWeight: "900",
              fontFamily: "Arial, sans-serif",
            }}
          >
            G
          </span>
          {carregando ? "Abrindo o Google..." : "Continuar com o Google"}
        </button>

        {erro && (
          <p
            role="alert"
            style={{
              maxWidth: "320px",
              margin: "16px auto 0",
              color: "#fca5a5",
              fontSize: ".9rem",
              lineHeight: 1.4,
            }}
          >
            {erro}
          </p>
        )}
      </section>
    </main>
  );
}

export default TelaAcesso;
