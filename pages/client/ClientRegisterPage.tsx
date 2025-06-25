
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext'; // Ya no es necesario para auto-login
import { UserRole } from '../../types';
import * as firebaseService from '../../services/firebaseService';
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

export const ClientRegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [primaryPlateInput, setPrimaryPlateInput] = useState(''); // Changed name for clarity
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setError('El nombre completo es obligatorio.');
      return;
    }
    if (!email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      // primaryPlateInput will be used to initialize clientVehiclePlates array
      await firebaseService.registerClientUser(name, email, password, primaryPlateInput); 
      setSuccessMessage('¡Registro exitoso! Serás redirigido a la página de inicio de sesión en unos momentos...');
      
      setTimeout(() => {
        navigate('/client/login');
      }, 3000); 

    } catch (err: any) {
      setError(err.message || 'Error durante el registro. Por favor, intente de nuevo.');
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-purple-100 p-4">
      <Card className="w-full max-w-md" titleClassName="text-center" bodyClassName="p-8 sm:p-10">
        <div className="text-center mb-8">
            <NituLogo />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Registro de Nuevo Cliente</h1>
          <p className="text-gray-600 mt-1">Crea tu cuenta para gestionar tu estacionamiento.</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {successMessage && <Alert type="success" message={successMessage} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre Completo"
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading || !!successMessage}
          />
          <Input
            label="Correo Electrónico"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="será tu usuario de acceso"
            disabled={isLoading || !!successMessage}
          />
          <Input
            label="Contraseña"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
            disabled={isLoading || !!successMessage}
          />
          <Input
            label="Confirmar Contraseña"
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading || !!successMessage}
          />
          <Input
            label="Patente de tu Vehículo Principal (Opcional)"
            id="primaryPlateInput"
            type="text"
            value={primaryPlateInput}
            onChange={(e) => setPrimaryPlateInput(e.target.value.toUpperCase())}
            placeholder="Ej: AA123BB"
            maxLength={10}
            disabled={isLoading || !!successMessage}
          />
          <Button type="submit" isLoading={isLoading} className="w-full text-lg py-2.5" disabled={isLoading || !!successMessage}>
            Registrarse
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/client/login" className="font-medium text-primary hover:text-primary-dark">
              Inicia sesión aquí
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
