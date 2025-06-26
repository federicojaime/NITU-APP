import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Advertisement, AdvertisementDisplayLocation } from '../types';
import * as firebaseService from '../services/databaseService';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RenderAdvertisement } from '../components/RenderAdvertisement';

const NituLogo = () => (
    <svg viewBox="0 0 200 50" className="h-12 w-auto mx-auto mb-2 text-primary" fill="currentColor">
        <text x="10" y="40" fontFamily="Arial, sans-serif" fontSize="40" fontWeight="bold">
            NITU
        </text>
        <text x="100" y="40" fontFamily="Arial, sans-serif" fontSize="20" fill="#6b7280"> {/* gray-500 */}
            Parking
        </text>
    </svg>
);

export const ClientPortalPage: React.FC = () => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchAdvertisements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ads = await firebaseService.getAdvertisements({
        displayLocation: AdvertisementDisplayLocation.CLIENT_PORTAL_MAIN,
        status: 'Active',
      });
      setAdvertisements(ads);
    } catch (err) {
      console.error("Error fetching client portal advertisements:", err);
      setError('No se pudieron cargar los anuncios en este momento. Intente más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvertisements();
  }, [fetchAdvertisements]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-sky-100 via-indigo-50 to-purple-100 p-4">
      <div className="w-full max-w-3xl my-8">
        <header className="text-center mb-10">
            <NituLogo />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Portal de Clientes y Novedades</h1>
            <p className="text-gray-600 mt-2">Descubra nuestras últimas promociones y anuncios. Gestione su experiencia de estacionamiento.</p>
        </header>

        {isLoading && <LoadingSpinner text="Cargando anuncios..." />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {!isLoading && !error && advertisements.length === 0 && (
          <Card className="text-center">
            <p className="text-gray-500 text-lg py-8">
              No hay novedades o promociones disponibles en este momento. ¡Vuelve pronto!
            </p>
          </Card>
        )}

        {!isLoading && !error && advertisements.length > 0 && (
          <div className="space-y-6">
            {advertisements.map((ad) => (
              <RenderAdvertisement key={ad.id} advertisement={ad} className="bg-white shadow-lg" />
            ))}
          </div>
        )}

        <div className="mt-12 text-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Button 
            onClick={() => navigate('/client/login')} 
            variant="primary" 
            size="lg"
            className="px-8 py-3 w-full sm:w-auto"
          >
            Iniciar Sesión (Cliente)
          </Button>
          <Button 
            onClick={() => navigate('/client/register')} 
            variant="secondary" 
            size="lg"
            className="px-8 py-3 w-full sm:w-auto"
          >
            Registrarse (Nuevo Cliente)
          </Button>
        </div>
        <div className="mt-8 text-center">
            <Link to="/login" className="text-sm text-primary hover:text-primary-dark">
                ¿Eres administrador o empleado? Inicia sesión aquí.
            </Link>
        </div>
      </div>
       <footer className="w-full text-center py-6 text-sm text-gray-600 mt-auto">
        NITU Parking System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};