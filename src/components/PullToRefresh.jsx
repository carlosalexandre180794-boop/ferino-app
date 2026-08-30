import { useRef, useState } from "react";

const LIMITE_ATUALIZAR = 72;
const LIMITE_VISUAL = 105;

export default function PullToRefresh({ children }) {
  const inicioY = useRef(null);
  const inicioX = useRef(null);
  const gestoValido = useRef(false);

  const [distancia, setDistancia] = useState(0);
  const [atualizando, setAtualizando] = useState(false);

  function iniciar(evento) {
    if (evento.touches.length !== 1) {
      gestoValido.current = false;
      return;
    }

    if (window.scrollY > 0) {
      gestoValido.current = false;
      return;
    }

    const toque = evento.touches[0];

    inicioY.current = toque.clientY;
    inicioX.current = toque.clientX;
    gestoValido.current = true;
  }

  function mover(evento) {
    if (
      !gestoValido.current ||
      atualizando ||
      evento.touches.length !== 1
    ) {
      return;
    }

    const toque = evento.touches[0];

    const deltaY =
      toque.clientY - inicioY.current;

    const deltaX =
      toque.clientX - inicioX.current;

    // Movimento horizontal continua reservado
    // para a troca de abas.
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      gestoValido.current = false;
      setDistancia(0);
      return;
    }

    if (deltaY <= 0 || window.scrollY > 0) {
      setDistancia(0);
      return;
    }

    const resistencia = Math.min(
      deltaY * 0.48,
      LIMITE_VISUAL
    );

    setDistancia(resistencia);

    if (evento.cancelable) {
      evento.preventDefault();
    }
  }

  function finalizar() {
    if (
      !gestoValido.current ||
      atualizando
    ) {
      gestoValido.current = false;
      setDistancia(0);
      return;
    }

    const deveAtualizar =
      distancia >= LIMITE_ATUALIZAR;

    gestoValido.current = false;

    if (!deveAtualizar) {
      setDistancia(0);
      return;
    }

    setAtualizando(true);
    setDistancia(54);

    window.dispatchEvent(
      new CustomEvent("ferino-atualizar")
    );

    window.setTimeout(() => {
      setAtualizando(false);
      setDistancia(0);
    }, 900);
  }

  return (
    <div
      onTouchStart={iniciar}
      onTouchMove={mover}
      onTouchEnd={finalizar}
      onTouchCancel={finalizar}
      style={{
        width: "100%",
        minHeight: "auto",
        touchAction: "pan-x pan-y",
      }}
    >
      <div
        aria-live="polite"
        style={{
          height: distancia,
          overflow: "hidden",
          display: "grid",
          placeItems: "end center",
          transition: atualizando
            ? "height 180ms ease"
            : "none",
          color: "#d5af57",
          fontWeight: 800,
          fontSize: 13,
          paddingBottom:
            distancia > 0 ? 10 : 0,
          boxSizing: "border-box",
        }}
      >
        {atualizando
          ? "↻ Atualizando..."
          : distancia >= LIMITE_ATUALIZAR
          ? "Solte para atualizar"
          : distancia > 8
          ? "↓ Puxe para atualizar"
          : ""}
      </div>

      <div
        style={{
          width: "100%",
          minHeight: "auto",
          transform:
            distancia > 0
              ? `translateY(${Math.min(
                  distancia * 0.12,
                  10
                )}px)`
              : "none",
          transition: atualizando
            ? "transform 180ms ease"
            : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}