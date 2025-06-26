
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EmployeeMainView } from '../components/EmployeeMainView';
import { ShiftReport } from '../components/ShiftReport';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import { Transaction } from '../types';
import * as firebaseService from '../services/databaseService';
import { WaitingListManagement } from '../components/WaitingListManagement'; // Added

enum EmployeeTab {
  OPERATIONS = 'Operaciones',
  SHIFT_REPORT = 'Mi Turno',
  WAITING_LIST = 'Lista de Espera', // Added
}

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

export const EmployeeDashboardPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<EmployeeTab>(EmployeeTab.OPERATIONS);
  const [transactions, setTransactions] = useState<Transaction[]>([]); // For ShiftReport
  const [isLoading, setIsLoading] = useState(true); // General loading for dashboard data
  const [error, setError] = useState<string | null>(null);
  const [parkingLotName, setParkingLotName] = useState<string>('');

  const parkingLotId = currentUser?.parkingLotId;

  // This fetchData is primarily for ShiftReport's transactions and general dashboard info like parkingLotName.
  // EmployeeMainView and WaitingListManagement will fetch their specific operational data.
  const fetchDashboardData = useCallback(async (isManualRefresh: boolean = false) => {
    if (!currentUser || currentUser.role !== 'employee' || !parkingLotId) {
        setError("Datos de empleado o estacionamiento no disponibles.");
        setIsLoading(false);
        return;
    }
    if (isManualRefresh) setIsLoading(true);
    setError(null);
    try {
      const allLots = await firebaseService.getParkingLots(); 
      const currentLot = allLots.find(lot => lot.id === parkingLotId);
      setParkingLotName(currentLot?.name || 'Estacionamiento Asignado');

      const fetchedTransactions = await firebaseService.getTransactions(parkingLotId, {});
      setTransactions(fetchedTransactions);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos del empleado.');
    } finally {
      if (isManualRefresh || isLoading) setIsLoading(false);
    }
  }, [currentUser, parkingLotId, isLoading]); 
  
  useEffect(() => {
    fetchDashboardData(true); // Initial fetch with loader
    const intervalId = setInterval(() => fetchDashboardData(false), 60000); 
    return () => clearInterval(intervalId);
  }, [fetchDashboardData]); // Rerun if fetchDashboardData changes (it won't often due to useCallback dependencies)


  if (!currentUser || currentUser.role !== 'employee') {
    return <p>Acceso denegado. No eres un empleado.</p>;
  }
   if (!parkingLotId && !isLoading) {
      return <Alert type="error" message="Este usuario Empleado no está asignado a ningún estacionamiento. Contacte al Dueño o Super Administrador." />;
  }

  const handleDataRefreshRequestFromChild = () => {
      // This could trigger a refresh of transactions for ShiftReport if needed,
      // or simply be a passthrough if main view handles its own data fully.
      // For now, let EmployeeMainView handle its refresh, this one is for ShiftReport's data.
      fetchDashboardData(true); 
  };

  const renderTabContent = () => {
    if (isLoading && activeTab !== EmployeeTab.OPERATIONS && activeTab !== EmployeeTab.WAITING_LIST) return <LoadingSpinner text="Cargando..." />;
    if (error) return <Alert type="error" message={error} />;
    if (!parkingLotId) return <Alert type="error" message="ID de estacionamiento no encontrado para este empleado."/>;

    switch (activeTab) {
      case EmployeeTab.OPERATIONS:
        return <EmployeeMainView currentUser={currentUser} parkingLotId={parkingLotId} onDataRefreshNeeded={handleDataRefreshRequestFromChild} />;
      case EmployeeTab.SHIFT_REPORT:
        return <ShiftReport employeeId={currentUser.id} allTransactions={transactions} parkingLotId={parkingLotId} />;
      case EmployeeTab.WAITING_LIST: // Added
        return <WaitingListManagement parkingLotId={parkingLotId} employeeId={currentUser.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <NituLogoSmall />
                <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
                    Panel de Empleado: <span className="text-primary">{parkingLotName || 'Cargando...'}</span>
                </h1>
            </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Hola, {currentUser.name || currentUser.username}</span>
            <Button onClick={logout} variant="secondary" size="sm">Cerrar Sesión</Button>
          </div>
        </div>
        <nav className="bg-gray-50 border-b border-gray-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1">
            {Object.values(EmployeeTab).map((tab) => (
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
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>
      <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-200 mt-8">
        NITU Parking System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};
