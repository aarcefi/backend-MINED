// El municipio es texto libre: "Plaza" y "Plaza de la Revolución" son el mismo
export const mismoMunicipio = (a?: string | null, b?: string | null) => {
  const [x, y] = [a?.trim().toLowerCase(), b?.trim().toLowerCase()];
  return !!x && !!y && (x.includes(y) || y.includes(x));
};
