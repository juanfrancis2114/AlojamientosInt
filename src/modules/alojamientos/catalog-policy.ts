const majorCities = new Set([
  'Distrito Metropolitano de Quito',
  'Guayaquil',
  'Cuenca',
  'Ambato',
  'Riobamba',
  'Loja',
  'Manta',
  'Portoviejo',
  'Machala',
  'Salinas',
  'Santa Cruz',
  'Baños de Agua Santa',
]);
export const catalogTarget = (name: string) => (majorCities.has(name) ? 5 : 1);
