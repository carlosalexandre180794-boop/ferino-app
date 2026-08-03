const CHAVE_ADMIN = "ferino_admin_ativo";
const CHAVE_ACESSO = "ferino_acesso_liberado";
const CHAVE_TIPO_ACESSO = "ferino_tipo_acesso";

const SENHA_ADMIN = "ferino2026";

export function validarSenhaAdmin(senha) {
  return String(senha || "") === SENHA_ADMIN;
}

export function liberarAcessoConsulta() {
  sessionStorage.setItem(CHAVE_ACESSO, "true");
  sessionStorage.setItem(CHAVE_TIPO_ACESSO, "consulta");
  sessionStorage.removeItem(CHAVE_ADMIN);
}

export function ativarModoAdmin() {
  sessionStorage.setItem(CHAVE_ACESSO, "true");
  sessionStorage.setItem(
    CHAVE_TIPO_ACESSO,
    "administrador"
  );
  sessionStorage.setItem(CHAVE_ADMIN, "true");
}

export function desativarModoAdmin() {
  sessionStorage.removeItem(CHAVE_ADMIN);

  if (
    sessionStorage.getItem(CHAVE_TIPO_ACESSO) ===
    "administrador"
  ) {
    sessionStorage.setItem(
      CHAVE_TIPO_ACESSO,
      "consulta"
    );
  }
}

export function adminEstaAtivo() {
  return (
    sessionStorage.getItem(CHAVE_ADMIN) === "true"
  );
}

export function acessoEstaLiberado() {
  return (
    sessionStorage.getItem(CHAVE_ACESSO) === "true"
  );
}

export function tipoAcessoAtual() {
  return (
    sessionStorage.getItem(CHAVE_TIPO_ACESSO) ||
    "consulta"
  );
}

export function encerrarAcesso() {
  sessionStorage.removeItem(CHAVE_ACESSO);
  sessionStorage.removeItem(CHAVE_TIPO_ACESSO);
  sessionStorage.removeItem(CHAVE_ADMIN);
}

export function solicitarEncerramentoDoAcesso() {
  window.dispatchEvent(
    new CustomEvent("ferino-encerrar-acesso")
  );
}