export function escudoTime(nome) {
  const chave = nome
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

  return `/escudos/${chave}.svg`;
}