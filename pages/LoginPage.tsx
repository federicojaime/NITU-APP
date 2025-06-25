
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Advertisement, AdvertisementDisplayLocation } from '../types';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Select } from '../components/ui/Select';
import { RenderAdvertisement } from '../components/RenderAdvertisement'; // Added
import * as firebaseService from '../services/firebaseService'; // Added

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


export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleAttempt, setRoleAttempt] = useState<UserRole>(UserRole.EMPLOYEE); 
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading, currentUser } = useAuth(); 
  const navigate = useNavigate();
  const [loginBannerAd, setLoginBannerAd] = useState<Advertisement | null>(null); // Added state for ad

  useEffect(() => {
    if (currentUser && !isLoading) {
      if (currentUser.role === UserRole.SUPER_ADMIN) navigate('/superadmin');
      else if (currentUser.role === UserRole.OWNER) navigate('/owner');
      else if (currentUser.role === UserRole.EMPLOYEE) navigate('/employee');
    }
  }, [currentUser, isLoading, navigate]);

  // Fetch Login Banner Ad
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const ads = await firebaseService.getAdvertisements({
          displayLocation: AdvertisementDisplayLocation.LOGIN_BANNER,
          status: 'Active',
        });
        if (ads.length > 0) {
          setLoginBannerAd(ads[0]); // Show the first active ad for this location
        }
      } catch (err) {
        console.error("Error fetching login banner ad:", err);
      }
    };
    fetchAd();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = await login(username, password, roleAttempt); 
    if (success) {
      const loggedInUser = JSON.parse(localStorage.getItem('currentUser') || '{}'); 
      if (loggedInUser.role === UserRole.SUPER_ADMIN) {
        navigate('/superadmin');
      } else if (loggedInUser.role === UserRole.OWNER) {
        navigate('/owner');
      } else if (loggedInUser.role === UserRole.EMPLOYEE) {
        navigate('/employee');
      } else {
        navigate('/'); 
      }
    } else {
      setError('Credenciales incorrectas, usuario inactivo, o rol no coincide. Por favor, intente de nuevo.');
    }
  };

  const handleClientModuleAccess = () => {
    navigate('/client-portal'); // Navigate to placeholder client portal
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-purple-100 p-4">
      <div className="w-full max-w-md"> {/* Container for ad and login form */}
        {loginBannerAd && (
          <div className="mb-6">
            <RenderAdvertisement advertisement={loginBannerAd} />
          </div>
        )}
        <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl">
          <div className="text-center mb-8">
              <NituLogo />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">NITU Parking System</h1>
            <p className="text-gray-600 mt-1">Bienvenido. Por favor, inicie sesión.</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Select
              label="Acceder como"
              id="roleAttempt"
              value={roleAttempt}
              onChange={(e) => setRoleAttempt(e.target.value as UserRole)}
              options={[
                { value: UserRole.EMPLOYEE, label: 'Empleado' },
                { value: UserRole.OWNER, label: 'Dueño de Estacionamiento' },
                { value: UserRole.SUPER_ADMIN, label: 'Super Administrador' },
              ]}
            />
            <Input
              label="Usuario"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={
                  roleAttempt === UserRole.OWNER ? "owner_..." : 
                  (roleAttempt === UserRole.EMPLOYEE ? "employee" : "superadmin")
              }
            />
            <Input
              label="Contraseña"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="contraseña"
            />
            <Button type="submit" isLoading={isLoading} className="w-full text-lg py-2.5">
              Iniciar Sesión
            </Button>
          </form>
          
          <div className="mt-6 text-center">
              <Button variant="ghost" onClick={handleClientModuleAccess} size="sm">
                  Acceso Cliente
              </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
};
