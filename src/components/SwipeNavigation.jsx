import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ROTAS = [
  "/",
  "/classificacao",
  "/jogos",
  "/estatisticas",
  "/campeoes",
];

function elementoIgnorado(alvo) {
  if (!(alvo instanceof Element)) {
    return false;
  }

  return Boolean(
    alvo.closest(
      [
        "input",
        "select",
        "textarea",
        "button",
        "a",
        "[role='button']",
        "[draggable='true']",
        "[data-no-swipe='true']",
      ].join(",")
    )
  );
}

function SwipeNavigation({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const inicioRef = useRef(null);

  function iniciarToque(evento) {
    if (evento.touches.length !== 1) {
      inicioRef.current = null;
      return;
    }

    if (elementoIgnorado(evento.target)) {
      inicioRef.current = null;
      return;
    }

    const toque = evento.touches[0];

    inicioRef.current = {
      x: toque.clientX,
      y: toque.clientY,
      horario: Date.now(),
    };
  }

  function terminarToque(evento) {
    if (!inicioRef.current) {
      return;
    }

    const toque = evento.changedTouches?.[0];

    if (!toque) {
      inicioRef.current = null;
      return;
    }

    const diferencaX =
      toque.clientX - inicioRef.current.x;

    const diferencaY =
      toque.clientY - inicioRef.current.y;

    const tempo =
      Date.now() - inicioRef.current.horario;

    inicioRef.current = null;

    const distanciaHorizontal =
      Math.abs(diferencaX);

    const distanciaVertical =
      Math.abs(diferencaY);

    if (tempo > 800) {
      return;
    }

    if (distanciaHorizontal < 70) {
      return;
    }

    if (
      distanciaHorizontal <
      distanciaVertical * 1.5
    ) {
      return;
    }

    const indiceAtual =
      ROTAS.indexOf(location.pathname);

    if (indiceAtual === -1) {
      return;
    }

    // Deslizou para esquerda -> próxima página
    if (diferencaX < 0) {
      const proximaRota =
        ROTAS[indiceAtual + 1];

      if (proximaRota) {
        navigate(proximaRota);
      }

      return;
    }

    // Deslizou para direita -> página anterior
    const rotaAnterior =
      ROTAS[indiceAtual - 1];

    if (rotaAnterior) {
      navigate(rotaAnterior);
    }
  }

  return (
    <div
      onTouchStart={iniciarToque}
      onTouchEnd={terminarToque}
      style={{
        minHeight: "100%",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

export default SwipeNavigation;