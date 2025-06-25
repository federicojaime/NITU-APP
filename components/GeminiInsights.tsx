
import React, { useState } from 'react';
import { Transaction, GroundingChunk } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Alert } from './ui/Alert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { getInsightsFromGemini } from '../services/geminiService';

interface GeminiInsightsProps {
  transactions: Transaction[]; // Assumed to be for the current parking lot
}

export const GeminiInsights: React.FC<GeminiInsightsProps> = ({ transactions }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitQuery = async () => {
    if (!query.trim()) {
      setError('Por favor, ingrese una pregunta.');
      return;
    }
    setError(null);
    setResponse(null);
    setGroundingChunks([]);
    setIsLoading(true);

    try {
      const result = await getInsightsFromGemini(query, transactions);
      
      // Check if the text itself indicates an error
      const resultTextIsError = result.text && (
        result.text.toLowerCase().startsWith("error:") ||
        result.text.includes("API key not configured") || // For specific known strings from proxy
        result.text.includes("Error del proxy de Gemini") ||
        result.text.includes("Error de red o conexión") ||
        result.text.includes("formato inesperado") ||
        result.text.includes("JSON válido")
      );

      if (resultTextIsError) {
          setError(result.text); 
          setResponse(null); 
      } else if (result.text) { 
          setResponse(result.text);
          setError(null); 
      } else { 
          setError("La IA no devolvió una respuesta de texto válida.");
          setResponse(null);
      }

      if (result.groundingMetadata?.groundingChunks) {
        setGroundingChunks(result.groundingMetadata.groundingChunks as GroundingChunk[]);
      } else {
        setGroundingChunks([]); 
      }
    } catch (err: any) { 
      // This catch block is less likely to be hit now that getInsightsFromGemini handles its own errors
      // and returns them in the 'text' field. But it's good for safety.
      console.error("Unexpected error in handleSubmitQuery:", err);
      setError(err.message || 'Error inesperado al procesar la solicitud de IA.');
      setResponse(null);
      setGroundingChunks([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Insights con IA (Gemini API)">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      
      <div className="space-y-4">
        <Input
          label="Pregunte sobre sus datos de transacciones o tendencias:"
          id="geminiQuery"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej: ¿Cuál es el tipo de vehículo más común? ¿Hay algún patrón en los horarios pico?"
          containerClassName='mb-0'
        />
        <Button onClick={handleSubmitQuery} isLoading={isLoading} className="w-full sm:w-auto">
          Obtener Insights
        </Button>
      </div>

      {isLoading && <LoadingSpinner text="Consultando a Gemini..." />}

      {response && !isLoading && !error && (
        <div className="mt-6 p-4 border border-primary-light rounded-lg bg-sky-50">
          <h4 className="text-md font-semibold text-sky-800 mb-2">Respuesta de Gemini:</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{response}</p>
          {groundingChunks.length > 0 && (
            <div className="mt-4">
              <h5 className="text-xs font-semibold text-gray-600 mb-1">Fuentes (Google Search):</h5>
              <ul className="list-disc list-inside text-xs space-y-1">
                {groundingChunks.filter(chunk => chunk.web && chunk.web.uri).map((chunk, index) => (
                  <li key={index}>
                    <a 
                      href={chunk.web!.uri!} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline"
                      title={chunk.web!.title || 'Fuente web'}
                    >
                      {chunk.web!.title || chunk.web!.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
       <p className="text-xs text-gray-500 mt-4">
        Nota: La funcionalidad de IA es experimental. Las respuestas se basan en los datos de transacciones y el modelo Gemini.
        Asegúrese de que la <strong className="font-semibold">clave API de Gemini</strong> esté configurada correctamente en el <strong className="font-semibold">servidor proxy (backend)</strong> para usar esta función.
        La URL del proxy actualmente configurada es: <code>https_tu_region_tu_proyecto_cloudfunctions_net/geminiProxy</code>. Si esta URL es un marcador de posición, la función no operará.
      </p>
    </Card>
  );
};
