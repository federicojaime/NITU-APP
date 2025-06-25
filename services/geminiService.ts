
// Ya no se importa GoogleGenAI ni se usa la API_KEY directamente en el frontend.
// import { GoogleGenAI, GenerateContentResponse, GroundingMetadata } from "@google/genai"; 
import { GEMINI_MODEL_NAME } from '../constants';
import { Transaction, GroundingMetadata, GenerateContentResponse } from "../types"; // Asumiendo que GenerateContentResponse se usa para el tipado de la respuesta del proxy.

// ESTA URL ES UN EJEMPLO. Deberás reemplazarla con la URL real de tu Cloud Function o proxy backend.
const GEMINI_PROXY_URL = 'https_tu_region_tu_proyecto_cloudfunctions_net/geminiProxy'; 

interface GeminiInsightResponse {
    text: string;
    groundingMetadata?: GroundingMetadata;
}

export const getInsightsFromGemini = async (
  promptFromUser: string, // El prompt original del usuario
  transactions: Transaction[]
): Promise<GeminiInsightResponse> => {
  // Prepara un resumen de las transacciones para enviar al proxy.
  // El proxy, a su vez, lo incluirá en el contexto para Gemini.
  const transactionSummary = transactions.slice(0, 50).map(t => ({
    plate: t.vehiclePlate,
    type: t.vehicleType,
    entry: new Date(t.entryTime).toLocaleString(),
    exit: t.exitTime ? new Date(t.exitTime).toLocaleString() : 'N/A',
    fee: t.totalFee,
    vip: t.isVipStay
  }));

  // El prompt completo que se enviará al proxy, que luego lo usará para Gemini
  const fullPromptForGemini = `
    Context: You are an AI assistant for a parking lot manager.
    The following is a summary of recent parking transactions:
    ${JSON.stringify(transactionSummary)}

    User Query: ${promptFromUser}

    Please provide a concise and helpful answer based on the transaction data and general knowledge.
    If the query is about current trends or specific data points not obvious from the summary,
    try to infer or state if the provided data is insufficient.
    If the question is about recent events or general knowledge that might require web search, use Google Search grounding.
    `;
    
  // Determinar si se necesita búsqueda (esta lógica puede ir en el frontend o backend)
  const requiresSearch = promptFromUser.toLowerCase().includes("current") || 
                         promptFromUser.toLowerCase().includes("latest") || 
                         promptFromUser.toLowerCase().includes("news") || 
                         promptFromUser.toLowerCase().includes("recent events");
  
  const modelConfig = requiresSearch ? { tools: [{googleSearch: {}}] } : {};

  try {
    const response = await fetch(GEMINI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL_NAME, // El modelo a usar
        contents: fullPromptForGemini, // El prompt completo para Gemini
        config: modelConfig // Configuración adicional, como 'tools' para Google Search
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error from Gemini proxy backend:', response.status, errorBody);
      return { text: `Error del proxy de Gemini (${response.status}): ${errorBody || 'Respuesta de error vacía.'}` };
    }

    let data: GenerateContentResponse;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response from proxy:', jsonError);
      const responseText = await response.text(); // Get raw text if JSON parsing fails
      console.error('Raw response text from proxy:', responseText);
      return { text: 'Error: La respuesta del proxy de IA no es un JSON válido.' };
    }
    
    if (typeof data.text !== 'string') {
        console.warn('Proxy response JSON does not contain a "text" field or it is not a string:', data);
        return { text: 'Error: La respuesta del proxy de IA tiene un formato inesperado (falta o es incorrecto el campo de texto).' };
    }

    return {
        text: data.text,
        groundingMetadata: data.candidates?.[0]?.groundingMetadata
    };

  } catch (networkOrOtherError) {
    console.error('Error calling Gemini proxy (network or other):', networkOrOtherError);
    if (networkOrOtherError instanceof Error) {
        // Specific check for fetch failure (e.g. incorrect GEMINI_PROXY_URL or network down)
        if (networkOrOtherError.message.toLowerCase().includes('failed to fetch')) {
             return { text: `Error de red o conexión al servicio de IA: No se pudo alcanzar el servidor proxy. Verifique la URL del proxy (${GEMINI_PROXY_URL}) y su conexión a internet.` };
        }
        return { text: `Error de red o conexión al servicio de IA: ${networkOrOtherError.message}` };
    }
    return { text: 'Un error de red o conexión desconocido ocurrió al contactar el servicio de IA.' };
  }
};
