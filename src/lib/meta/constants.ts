/**
 * Versão única da Graph/Marketing API da Meta. A Meta costuma aposentar
 * versões ~2 anos após o lançamento — revisar a cada 6 meses em
 * https://developers.facebook.com/docs/graph-api/changelog/versions/
 * Verificada em 17/07/2026: v25.0 é a corrente (lançada 18/02/2026);
 * v26.0 esperada por volta de set/2026.
 */
export const META_GRAPH_API_VERSION = "v25.0";

export const META_GRAPH_API_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

/** Códigos de erro de throttle da Meta — nunca fazer retry imediato nesses casos. */
export const META_THROTTLE_ERROR_CODES = [17, 80000, 80001, 80002, 80003, 80004] as const;
