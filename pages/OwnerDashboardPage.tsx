import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import { OccupancySummary } from '../components/OccupancySummary';
import { RateSettingsForm } from '../components/RateSettingsForm';
import { EmployeeManagement } from '../components/EmployeeManagement';
import { CustomerManagement } from '../components/CustomerManagement';
import { TransactionHistory } from '../components/TransactionHistory';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { BillingExport } from '../components/BillingExport';
import { GeminiInsights } from '../components/GeminiInsights';
import { ParkingGrid } from '../components/ParkingGrid';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ManageSpaceModal } from '../components/ManageSpaceModal';
import { DailyActivitySummary } from '../components/DailyActivitySummary';
import { RenderAdvertisement } from '../components/RenderAdvertisement'; 
import { WaitingListManagement } from '../components/WaitingListManagement'; 
import { ClientReservationsManagement } from '../components/owner/ClientReservationsManagement'; // New


import { ParkingSpace, PricingSettings, Employee, Customer, Transaction, Advertisement, AdvertisementDisplayLocation } from '../types'; 
import * as firebaseService from '../services/firebaseService';
import { DEFAULT_PRICING_SETTINGS } from '../constants';

enum OwnerTab {
  OVERVIEW = 'Resumen General',
  SPACES_CONFIG = 'Config. General Espacios', 
  SPACES_MANAGE = 'Gestionar Espacios Indiv.',
  CLIENT_RESERVATIONS = 'Reservas Clientes', // New Tab
  RATES = 'Tarifas',
  EMPLOYEES = 'Empleados',
  CUSTOMERS = 'Clientes',
  WAITING_LIST = 'Lista de Espera', 
  HISTORY = 'Historial',
  REPORTS = 'Reportes y Fact.',
  INSIGHTS = 'IA Insights',
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

interface SpaceGeneralConfiguratorProps {
    currentTotalSpaces: number;
    currentVipSpacesInput: string;
    onConfigSave: (total: number, vipList: string[]) => Promise<void>;
    isLoading: boolean;
    parkingLotName?: string;
}

const SpaceGeneralConfigurator: React.FC<SpaceGeneralConfiguratorProps> = ({ 
    currentTotalSpaces, 
    currentVipSpacesInput, 
    onConfigSave, 
    isLoading: parentLoading, 
    parkingLotName 
}) => {
    const [totalSpaces, setTotalSpaces] = useState(currentTotalSpaces);
    const [vipSpacesInput, setVipSpacesInput] = useState(currentVipSpacesInput);
    const [localLoading, setLocalLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setTotalSpaces(currentTotalSpaces);
        setVipSpacesInput(currentVipSpacesInput);
    }, [currentTotalSpaces, currentVipSpacesInput]);

    const handleSaveConfig = async () => {
        setError('');
        setSuccess('');
        if (totalSpaces <= 0 || totalSpaces > 200) {
            setError("El número total de espacios debe ser entre 1 y 200.");
            return;
        }
        const vipList = vipSpacesInput.split(',')
            .map(s => s.trim())
            .filter(s => s !== '' && !isNaN(Number(s)) && Number(s) > 0 && Number(s) <= totalSpaces);
        
        const uniqueVipList = [...new Set(vipList)];

        setLocalLoading(true);
        try {
            await onConfigSave(totalSpaces, uniqueVipList);
            setSuccess("Configuración general de espacios guardada. La cuadrícula se regenerará.");
        } catch (e: any) {
            setError(e.message || "Error guardando configuración general.");
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <Card title={`Configuración General de Espacios para: ${parkingLotName || 'Estacionamiento'}`}>
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
            <div className="space-y-4">
                <Input 
                    label="Cantidad Total de Cajones"
                    type="number"
                    value={totalSpaces.toString()}
                    onChange={e => setTotalSpaces(parseInt(e.target.value) || 0)}
                    min="1"
                    max="200"
                />
                <Input
                    label="Números de Cajones VIP (separados por coma)"
                    value={vipSpacesInput}
                    onChange={e => setVipSpacesInput(e.target.value)}
                    placeholder="Ej: 1, 2, 3, 10, 11"
                />
                <Button onClick={handleSaveConfig} isLoading={localLoading || parentLoading}>
                    Guardar Configuración General
                </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
                Nota: Guardar esta configuración regenerará la cuadrícula de espacios. Los estados de ocupación, reserva o mantenimiento actuales de los espacios se perderán para este estacionamiento.
            </p>
        </Card>
    );
};


export const OwnerDashboardPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<OwnerTab>(OwnerTab.OVERVIEW);
  
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]); 
  const [dailyTransactions, setDailyTransactions] = useState<Transaction[]>([]);
  const [parkingLotName, setParkingLotName] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true); 
  const [isRealtimeLoading, setIsRealtimeLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState<string | null>(null);

  const [isManageSpaceModalOpen, setIsManageSpaceModalOpen] = useState(false);
  const [spaceToManage, setSpaceToManage] = useState<ParkingSpace | null>(null);
  const [footerAd, setFooterAd] = useState<Advertisement | null>(null); 

  const parkingLotId = currentUser?.parkingLotId;

  const fetchData = useCallback(async (isRefreshClick: boolean = false) => {
    if (!parkingLotId) {
      setError("No se ha identificado un estacionamiento para este dueño.");
      setIsLoading(false);
      return;
    }
    if (isRefreshClick) setIsLoading(true); 
    else if (!isRealtimeLoading) setIsLoading(true); 
    
    setError(null);
    try {
      const allLots = await firebaseService.getParkingLots();
      const currentLot = allLots.find(lot => lot.id === parkingLotId);
      setParkingLotName(currentLot?.name || 'Mi Estacionamiento');

      const [s, ps, e, c, t, ads] = await Promise.all([
        firebaseService.getParkingSpaces(parkingLotId),
        firebaseService.getPricingSettings(parkingLotId),
        firebaseService.getEmployees(parkingLotId),
        firebaseService.getCustomers(parkingLotId),
        firebaseService.getTransactions(parkingLotId, {}),
        firebaseService.getAdvertisements({ 
            displayLocation: AdvertisementDisplayLocation.OWNER_DASHBOARD_FOOTER,
            status: 'Active'
        })
      ]);
      setSpaces(s);
      setPricingSettings(ps || DEFAULT_PRICING_SETTINGS);
      setEmployees(e);
      setCustomers(c);
      setTransactions(t); 
      if (ads.length > 0) setFooterAd(ads[0]);
      
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const todaysTrans = await firebaseService.getTransactions(parkingLotId, { 
          startDate: todayStart.getTime(), 
          endDate: todayEnd.getTime() 
      });
      setDailyTransactions(todaysTrans);

    } catch (err: any) {
      console.error("Owner dashboard fetch error:", err);
      setError(err.message || 'Error al cargar datos del dashboard.');
      if (err.message && err.message.includes("cannot get pricing settings")) {
        setPricingSettings(DEFAULT_PRICING_SETTINGS); 
      }
    } finally {
      setIsLoading(false);
    }
  }, [parkingLotId, isRealtimeLoading]); 

  const fetchRealtimeMetrics = useCallback(async () => {
      if (!parkingLotId) return;
      setIsRealtimeLoading(true);
      try {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        const [currentSpaces, todaysTrans] = await Promise.all([
          firebaseService.getParkingSpaces(parkingLotId),
          firebaseService.getTransactions(parkingLotId, { 
            startDate: todayStart.getTime(), 
            endDate: todayEnd.getTime() 
          })
        ]);
        
        setSpaces(currentSpaces);
        setDailyTransactions(todaysTrans);

      } catch (err) {
        console.warn("Error fetching real-time metrics:", err);
      } finally {
          setIsRealtimeLoading(false);
      }
  }, [parkingLotId]);

  useEffect(() => {
    fetchData(); 
    const mainIntervalId = setInterval(() => fetchData(), 60000 * 2); 
    const realtimeIntervalId = setInterval(fetchRealtimeMetrics, 30000); 
    
    return () => {
      clearInterval(mainIntervalId);
      clearInterval(realtimeIntervalId);
    };
  }, [fetchData, fetchRealtimeMetrics]);
  
  const handleRefreshData = () => {
    setGlobalSuccessMessage("Actualizando datos...");
    fetchData(true); 
    fetchRealtimeMetrics(); 
    // Refresh for ClientReservationsManagement might be needed if it doesn't have its own interval
    if (activeTab === OwnerTab.CLIENT_RESERVATIONS) {
        // This is tricky, the component itself should refetch or OwnerDashboard should pass a key
    }
    setTimeout(() => setGlobalSuccessMessage(null), 2000);
  };

  const handleOpenManageSpaceModal = (space: ParkingSpace) => {
    setSpaceToManage(space);
    setIsManageSpaceModalOpen(true);
  };
  
  const handleSpaceUpdated = () => {
    fetchRealtimeMetrics(); // For occupancy, grid etc.
    // If ClientReservationsManagement is active, it might need a signal to refresh
    if (activeTab === OwnerTab.CLIENT_RESERVATIONS || activeTab === OwnerTab.SPACES_MANAGE) {
        // Potentially trigger a key change or callback for ClientReservationsManagement if it needs it
        // For now, SPACES_MANAGE's ParkingGrid will reflect changes from fetchRealtimeMetrics
    }
  }


  const handleSavePricing = async (settings: PricingSettings) => {
    if (!parkingLotId) return;
    setGlobalSuccessMessage(null); setError(null);
    try {
      await firebaseService.updatePricingSettings(parkingLotId, settings);
      setPricingSettings(settings);
      setGlobalSuccessMessage('Configuración de tarifas guardada.');
    } catch (e: any) { setError(e.message || 'Error guardando tarifas.'); throw e; }
  };

  const handleAddEmployee = async (empData: Omit<Employee, 'id' | 'parkingLotId' | 'status'> & {status: 'Active' | 'Inactive'}) => {
    if (!parkingLotId) return;
    setGlobalSuccessMessage(null); setError(null);
    try {
      const newEmp = await firebaseService.addEmployee(parkingLotId, empData);
      if(newEmp) setEmployees([...employees, newEmp]);
      setGlobalSuccessMessage('Empleado agregado.');
      fetchData(); 
      return newEmp;
    } catch (e: any) { setError(e.message || 'Error agregando empleado.'); throw e; }
  };

  const handleUpdateEmployeeStatus = async (empId: string, status: 'Active' | 'Inactive') => {
    if (!parkingLotId) return;
    setGlobalSuccessMessage(null); setError(null);
    try {
      const updatedEmp = await firebaseService.updateEmployee(parkingLotId, empId, { status });
      setGlobalSuccessMessage('Estado de empleado actualizado.');
      fetchData(); 
      return updatedEmp;
    } catch (e: any) { setError(e.message || 'Error actualizando empleado.'); throw e; }
  };

  const handleConfigureSpaces = async (total: number, vipList: string[]) => {
    if (!parkingLotId) return;
    setGlobalSuccessMessage(null); setError(null);
    try {
        await firebaseService.configureParkingSpaces(parkingLotId, total, vipList);
        setGlobalSuccessMessage('Configuración general de espacios actualizada. La cuadrícula se regenerará.');
        fetchData(); 
    } catch (e: any) {
        setError(e.message || "Error al configurar espacios.");
        throw e;
    }
  };

  const handleAddCustomer = async (custData: Omit<Customer, 'id'>) => {
    if (!parkingLotId) return;
    setGlobalSuccessMessage(null); setError(null);
    try {
      await firebaseService.addCustomer(parkingLotId, custData);
      setGlobalSuccessMessage('Cliente agregado.');
      fetchData(); 
    } catch (e: any) { setError(e.message || 'Error agregando cliente.'); throw e; }
  };

  if (!currentUser || currentUser.role !== 'owner') {
    return <p>Acceso denegado.</p>;
  }
  if (!parkingLotId && !isLoading) {
      return <Alert type="error" message="Este usuario Dueño no está asignado a ningún estacionamiento. Contacte al Super Administrador." />;
  }


  const renderTabContent = () => {
    if (isLoading && ![OwnerTab.OVERVIEW, OwnerTab.SPACES_MANAGE, OwnerTab.WAITING_LIST, OwnerTab.CLIENT_RESERVATIONS].includes(activeTab)) {
        return <LoadingSpinner text="Cargando datos..." />;
    }
    if (error && !isLoading) return <Alert type="error" message={error} />;
    if (!parkingLotId && !isLoading) return null; 

    switch (activeTab) {
      case OwnerTab.OVERVIEW:
        return (
          <div className="space-y-6">
            {(isLoading || isRealtimeLoading) && activeTab === OwnerTab.OVERVIEW && <LoadingSpinner text="Actualizando resumen..." />}
            <OccupancySummary spaces={spaces} />
            <DailyActivitySummary dailyTransactions={dailyTransactions} />
            <AnalyticsCharts transactions={transactions} />
            <TransactionHistory transactions={transactions} title="Últimos Movimientos Completados" maxRows={10} />
          </div>
        );
      case OwnerTab.SPACES_CONFIG:
        return (
            <SpaceGeneralConfigurator 
                currentTotalSpaces={spaces.length}
                currentVipSpacesInput={spaces.filter(s => s.isVip).map(s => s.number).join(', ')}
                onConfigSave={handleConfigureSpaces} 
                isLoading={isLoading}
                parkingLotName={parkingLotName}
            />
        );
      case OwnerTab.SPACES_MANAGE:
        return (
             <div className="space-y-6">
                {(isLoading || isRealtimeLoading) && <LoadingSpinner text="Cargando espacios..." />}
                {(!isLoading && !isRealtimeLoading && spaces.length > 0) && 
                    <ParkingGrid 
                        spaces={spaces} 
                        onSpaceClick={handleOpenManageSpaceModal} 
                        title="Gestionar Espacios Individuales (Reservas / Mantenimiento)" 
                    />
                }
                {(!isLoading && !isRealtimeLoading &&spaces.length === 0) && 
                    <p className="text-gray-500 text-center py-4">No hay espacios configurados para este estacionamiento. Vaya a 'Config. General Espacios'.</p>
                }
            </div>
        );
      case OwnerTab.CLIENT_RESERVATIONS:
        return <ClientReservationsManagement parkingLotId={parkingLotId} ownerId={currentUser.id} />;
      case OwnerTab.RATES:
        return <RateSettingsForm initialSettings={pricingSettings} onSave={handleSavePricing} />;
      case OwnerTab.EMPLOYEES:
        return <EmployeeManagement employees={employees} onAddEmployee={handleAddEmployee} onUpdateEmployeeStatus={handleUpdateEmployeeStatus} />;
      case OwnerTab.CUSTOMERS:
        return <CustomerManagement customers={customers} onAddCustomer={handleAddCustomer} />;
      case OwnerTab.WAITING_LIST: 
        return <WaitingListManagement parkingLotId={parkingLotId} employeeId={currentUser.id} />;
      case OwnerTab.HISTORY:
        return <TransactionHistory transactions={transactions} />; 
      case OwnerTab.REPORTS:
        return <BillingExport parkingLotId={parkingLotId} />;
      case OwnerTab.INSIGHTS:
        return <GeminiInsights transactions={transactions} />;
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
                Panel de Dueño: <span className="text-primary">{parkingLotName || 'Cargando...'}</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button onClick={handleRefreshData} variant="ghost" size="sm" isLoading={isLoading || isRealtimeLoading}>Refrescar Datos</Button>
            <span className="text-sm text-gray-600 hidden md:inline">Bienvenido, {currentUser.name || currentUser.username}</span>
            <Button onClick={logout} variant="secondary" size="sm">Cerrar Sesión</Button>
          </div>
        </div>
         <nav className="bg-gray-50 border-b border-gray-200 overflow-x-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 whitespace-nowrap">
            {Object.values(OwnerTab).map((tab) => (
                <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                 className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2
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
        {globalSuccessMessage && <Alert type="success" message={globalSuccessMessage} onClose={() => setGlobalSuccessMessage(null)} />}
        {renderTabContent()}
      </main>
       <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-200 mt-8">
        {footerAd && (
            <div className="mb-4 container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                <RenderAdvertisement advertisement={footerAd} />
            </div>
        )}
        NITU Parking System &copy; {new Date().getFullYear()}
      </footer>
      {parkingLotId && spaceToManage && (
        <ManageSpaceModal
            isOpen={isManageSpaceModalOpen}
            onClose={() => setIsManageSpaceModalOpen(false)}
            space={spaceToManage}
            parkingLotId={parkingLotId}
            onSpaceUpdated={handleSpaceUpdated}
        />
      )}
    </div>
  );
};