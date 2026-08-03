import "./App.css";
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

import Header from "./components/Header";
import Menu from "./components/Menu";
import TelaAcesso from "./components/TelaAcesso";

import Home from "./pages/Home";
import Jogos from "./pages/Jogos";
import Partidas from "./pages/Partidas";
import Classificacao from "./pages/Classificacao";
import Estatisticas from "./pages/Estatisticas";
import Jogadores from "./pages/Jogadores";
import Substituicao from "./pages/Substituicao";
import Campeoes from "./pages/Campeoes";
import Campeonato from "./pages/Campeonato";
import FichaPartida from "./pages/FichaPartida";
import Perfil from "./pages/Perfil";

import { supabase } from "./supabaseClient";
import { desativarModoAdmin } from "./auth/adminAuth";

const URL_RETORNO =
  "br.com.ferino.app://login-callback";

function lerParametrosDoRetorno(url) {
  const parteHash = url.includes("#")
    ? url.split("#")[1]
    : "";

  const parteQuery = url.includes("?")
    ? url.split("?")[1].split("#")[0]
    : "";

  return {
    hash: new URLSearchParams(parteHash),
    query: new URLSearchParams(parteQuery),
  };
}

function App() {
  const [sessao, setSessao] = useState(null);

  const [carregandoSessao, setCarregandoSessao] =
    useState(true);

  useEffect(() => {
    let ativo = true;
    let ouvinteDeepLink;

    async function carregarSessao() {
      const { data, error } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          "Erro ao recuperar sessão:",
          error
        );
      }

      if (ativo) {
        setSessao(data?.session ?? null);
        setCarregandoSessao(false);
      }
    }

    async function tratarRetornoDoLogin({ url }) {
      if (!url?.startsWith(URL_RETORNO)) {
        return;
      }

      try {
        const { hash, query } =
          lerParametrosDoRetorno(url);

        const erroOAuth =
          hash.get("error_description") ||
          query.get("error_description");

        if (erroOAuth) {
          throw new Error(
            decodeURIComponent(erroOAuth)
          );
        }

        const codigo = query.get("code");

        if (codigo) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              codigo
            );

          if (error) {
            throw error;
          }
        } else {
          const accessToken =
            hash.get("access_token");

          const refreshToken =
            hash.get("refresh_token");

          if (!accessToken || !refreshToken) {
            throw new Error(
              "O retorno do Google não trouxe uma sessão válida."
            );
          }

          const { error } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (error) {
            throw error;
          }
        }

        await Browser.close().catch(() => {});
      } catch (error) {
        console.error(
          "Erro ao concluir o login:",
          error
        );

        await Browser.close().catch(() => {});

        window.alert(
          error?.message ||
            "Não foi possível concluir o login."
        );
      }
    }

    async function sairDaConta() {
      desativarModoAdmin();

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Erro ao sair:",
          error
        );
      }
    }

    carregarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_evento, novaSessao) => {
        if (ativo) {
          setSessao(novaSessao);
          setCarregandoSessao(false);
        }
      }
    );

    CapacitorApp.addListener(
      "appUrlOpen",
      tratarRetornoDoLogin
    ).then((handle) => {
      ouvinteDeepLink = handle;
    });

    window.addEventListener(
      "ferino-encerrar-acesso",
      sairDaConta
    );

    return () => {
      ativo = false;

      subscription.unsubscribe();
      ouvinteDeepLink?.remove();

      window.removeEventListener(
        "ferino-encerrar-acesso",
        sairDaConta
      );
    };
  }, []);

  if (carregandoSessao) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#080808",
          color: "#d5af57",
          fontWeight: "800",
        }}
      >
        Carregando...
      </main>
    );
  }

  if (!sessao) {
    return <TelaAcesso />;
  }

  return (
    <div className="app">
      <Header />
      <Menu />

      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/jogos"
          element={<Jogos />}
        />

        <Route
          path="/partidas"
          element={<Partidas />}
        />

        <Route
          path="/classificacao"
          element={<Classificacao />}
        />

        <Route
          path="/estatisticas"
          element={<Estatisticas />}
        />

        <Route
          path="/jogadores"
          element={<Jogadores />}
        />

        <Route
          path="/substituicao"
          element={<Substituicao />}
        />

        <Route
          path="/campeoes"
          element={<Campeoes />}
        />

        <Route
          path="/campeonato"
          element={<Campeonato />}
        />

        <Route
          path="/ficha-partida"
          element={<FichaPartida />}
        />

        <Route
          path="/perfil"
          element={<Perfil />}
        />
      </Routes>
    </div>
  );
}

export default App;