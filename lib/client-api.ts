export async function readApiResponse(response: Response): Promise<Record<string, unknown>> {
  const contentType=response.headers.get("content-type")||"";
  if(contentType.includes("application/json")) return response.json();
  return {error:response.status===502||response.status===503?"El servicio se está reiniciando o no está disponible. Inténtalo nuevamente en un minuto.":`El servidor respondió con un error (${response.status}).`};
}
