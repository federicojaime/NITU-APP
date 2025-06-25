import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';

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

export const ClientLoginPage: React.FC = () => {
  const [email, setEmail] = useState(''); // Clients log in with email
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.role === UserRole.CLIENT && !isLoading) {
      navigate('/client/dashboard');
    }
  }, [currentUser, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Pass UserRole.CLIENT as the roleAttempt to ensure we are trying to log in a client
    const success = await login(email, password, UserRole.CLIENT); 
    if (success) {
      navigate('/client/dashboard');
    } else {
      setError('Correo electrónico o contraseña incorrectos. Por favor, intente de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-purple-100 p-4">
      <Card className="w-full max-w-md" titleClassName="text-center" bodyClassName="p-8 sm:p-10">
        <div className="text-center mb-8">
            <NituLogo />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Acceso Clientes</h1>
          <p className="text-gray-600 mt-1">Bienvenido de nuevo.</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Correo Electrónico"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="suemail@ejemplo.com"
          />
          <Input
            label="Contraseña"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Su contraseña"
          />
          <Button type="submit" isLoading={isLoading} className="w-full text-lg py-2.5">
            Iniciar Sesión
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link to="/client/register" className="font-medium text-primary hover:text-primary-dark">
              Regístrate aquí
            </Link>
          </p>
          <p className="mt-2">
            <Link to="/client-portal" className="text-xs text-gray-500 hover:text-gray-700">
                Volver al Portal Principal
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};