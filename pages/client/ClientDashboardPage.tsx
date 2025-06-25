
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { UserRole, ParkingLot, ParkingLotAvailability, ClientReservation, AuthenticatedUser } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ParkingLotList } from '../../components/client/ParkingLotList';
import { ParkingLotDetailModal } from '../../components/client/ParkingLotDetailModal';
import { ClientActiveReservations } from '../../components/client/ClientActiveReservations';
import { ClientVehicleManagement } from '../../components/client/ClientVehicleManagement'; // New Import
import * as firebaseService from '../../services/firebaseService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';

const NituLogoSmall = () => (
    <svg viewBox="0 0 120 30" className="h-6 w-auto text-primary" fill="currentColor">
        <text x="5" y="22" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold">
            NITU
        </text>
        <text x="60" y="22" fontFamily="Arial, sans-serif" fontSize="12" fill="#6b7280">
            Parking
        </text>
    </svg>
);

enum ClientDashboardTab {
  OVERVIEW = 'Resumen y Estacionamientos',
  RESERVATIONS = 'Mis Reservas Activas',
  VEHICLES = 'Mis Vehículos',
}

export const ClientDashboardPage: React.FC = () => {
  const { currentUser, logout, updateCurrentUser } = useAuth(); // Added updateCurrentUser
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ClientDashboardTab>(ClientDashboardTab.OVERVIEW);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(true);
  const [errorLots, setErrorLots] = useState<string | null>(null);

  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [refreshReservationsKey, setRefreshReservationsKey] = useState(0);

  const fetchParkingLots = useCallback(async () => {
    setIsLoadingLots(true);
    setErrorLots(null);
    try {
      const lots = await firebaseService.getParkingLots();
      setParkingLots(lots);
    } catch (err: any) {
      setErrorLots(err.message || 'Error al cargar estacionamientos.');
    } finally {
      setIsLoadingLots(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === ClientDashboardTab.OVERVIEW) {
        fetchParkingLots();
    }
  }, [fetchParkingLots, activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/client/login'); 
  };

  const handleViewDetails = (lot: ParkingLot) => {
    setSelectedLot(lot);
    setIsDetailModalOpen(true);
  };
  
  const handleReservationUpdate = () => {
    setRefreshReservationsKey(prevKey => prevKey + 1); 
  };

  const handleVehiclesUpdated = (updatedUser: AuthenticatedUser) => {
    updateCurrentUser(updatedUser); // Update context and localStorage
    // Optionally, re-fetch reservations if plate changes affect active reservations display
    // setRefreshReservationsKey(prevKey => prevKey + 1); 
  };

  if (!currentUser || currentUser.role !== UserRole.CLIENT) {
    navigate('/client/login');
    return <LoadingSpinner text="Redireccionando..." />;
  }
  
  const renderTabContent = () => {
    switch (activeTab) {
      case ClientDashboardTab.OVERVIEW:
        return (
          <div className="space-y-6">
            <Card title={`Bienvenido a tu Panel, ${currentUser.name || currentUser.username}!`}>
              <div className="py-4">
                <p className="text-lg text-gray-700">
                  Aquí podrás ver los estacionamientos disponibles, gestionar tus reservas y vehículos.
                </p>
                { currentUser.email && <p className="text-xs text-gray-500 mt-1">Usuario/Email: {currentUser.email}</p>}
                {(currentUser.clientVehiclePlates && currentUser.clientVehiclePlates.length > 0) && 
                  <p className="text-xs text-gray-500">Patente Principal: {currentUser.clientVehiclePlates[0]}</p>
                }
              </div>
            </Card>
             {isLoadingLots && <LoadingSpinner text="Cargando estacionamientos..." />}
             {errorLots && <Alert type="error" message={errorLots} onClose={() => setErrorLots(null)} />}
             {!isLoadingLots && !errorLots && (
                <ParkingLotList parkingLots={parkingLots} onViewDetails={handleViewDetails} />
             )}
          </div>
        );
      case ClientDashboardTab.RESERVATIONS:
        return <ClientActiveReservations clientId={currentUser.id} key={refreshReservationsKey} onReservationCancelled={handleReservationUpdate}/>;
      case ClientDashboardTab.VEHICLES:
        return <ClientVehicleManagement currentUser={currentUser} onVehiclesUpdated={handleVehiclesUpdated} />;
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <NituLogoSmall />
            <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
              Portal Cliente
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Hola, {currentUser.name || currentUser.username}
            </span>
            <Button onClick={handleLogout} variant="secondary" size="sm">
              Cerrar Sesión
            </Button>
          </div>
        </div>
        <nav className="bg-gray-50 border-b border-gray-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1">
            {Object.values(ClientDashboardTab).map((tab) => (
                <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 text-sm font-medium border-b-2
                    ${activeTab === tab 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } focus:outline-none`}
                >
                {tab}
                </button>
            ))}
            </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {renderTabContent()}
        
        {selectedLot && (
            <ParkingLotDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                parkingLot={selectedLot}
                onReservationMade={handleReservationUpdate}
            />
        )}

      </main>
      <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-200 mt-8">
        NITU Parking System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};
