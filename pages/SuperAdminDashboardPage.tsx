
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ParkingLot } from '../types'; 
import * as firebaseService from '../services/firebaseService';
import { formatDate } from '../utils/helpers';
import { AdvertisementManagement } from '../components/AdvertisementManagement'; // Import AdvertisementManagement

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

enum SuperAdminTab {
  PARKING_LOTS = 'Gestión de Estacionamientos',
  ADVERTISING = 'Publicidad',
}

interface AddParkingLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParkingLotAdded: (newLot: ParkingLot) => void;
  lotName: string;
  onLotNameChange: (value: string) => void;
  ownerUsernameSeed: string;
  onOwnerUsernameSeedChange: (value: string) => void;
  lotAddress: string; 
  onLotAddressChange: (value: string) => void; 
  modalError: string | null;
  onModalErrorChange: (error: string | null) => void;
}

const AddParkingLotModal: React.FC<AddParkingLotModalProps> = ({ 
  isOpen, 
  onClose, 
  onParkingLotAdded,
  lotName,
  onLotNameChange,
  ownerUsernameSeed,
  onOwnerUsernameSeedChange,
  lotAddress, 
  onLotAddressChange, 
  modalError,
  onModalErrorChange
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!lotName.trim()) {
      onModalErrorChange('El nombre del estacionamiento es obligatorio.');
      return;
    }
    if (!ownerUsernameSeed.trim()) {
      onModalErrorChange('El identificador para el usuario dueño es obligatorio (ej: nombre corto del estacionamiento).');
      return;
    }
     if (!lotAddress.trim()) { 
      onModalErrorChange('La dirección del estacionamiento es obligatoria.');
      return;
    }
    onModalErrorChange(null);
    setIsLoading(true);
    try {
      const newLot = await firebaseService.addParkingLot(lotName, ownerUsernameSeed, lotAddress); // Pasar address
      onParkingLotAdded(newLot); 
      onClose(); 
    } catch (err: any) {
      onModalErrorChange((err as Error).message || 'Error al crear el estacionamiento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
        // Form fields are persisted by parent state
    }
  }, [isOpen, onModalErrorChange]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Estacionamiento">
      <div className="space-y-4">
        {modalError && <Alert type="error" message={modalError} onClose={() => onModalErrorChange(null)} />}
        <Input
          label="Nombre del Estacionamiento"
          value={lotName}
          onChange={(e) => onLotNameChange(e.target.value)}
          placeholder="Ej: NITU Plaza Central"
          required
        />
        <Input
          label="Dirección del Estacionamiento" 
          value={lotAddress}
          onChange={(e) => onLotAddressChange(e.target.value)}
          placeholder="Ej: Av. Principal 123, Ciudad"
          required
        />
        <Input
          label="Sufijo para Usuario Dueño (ej: 'plazacentral')"
          value={ownerUsernameSeed}
          onChange={(e) => onOwnerUsernameSeedChange(e.target.value)}
          placeholder="Se creará 'owner_sufijo'"
          required
        />
         <p className="text-xs text-gray-500 -mt-2">
            Se creará un usuario dueño con el formato <code>owner_[sufijo]</code> y contraseña <code>password</code>.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>Crear Estacionamiento</Button>
        </div>
      </div>
    </Modal>
  );
};

interface EditParkingLotModalProps {
    isOpen: boolean;
    onClose: () => void;
    lot: ParkingLotDisplayInfo | null;
    onLotUpdated: () => void;
}

const EditParkingLotModal: React.FC<EditParkingLotModalProps> = ({isOpen, onClose, lot, onLotUpdated}) => {
    const [editedName, setEditedName] = useState('');
    const [editedAddress, setEditedAddress] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (lot) {
            setEditedName(lot.name);
            setEditedAddress(lot.address || ''); 
            setError(null);
        }
    }, [lot, isOpen]);

    const handleSaveChanges = async () => {
        if (!lot) return;
        if (!editedName.trim()) {
            setError("El nombre del estacionamiento no puede estar vacío.");
            return;
        }
        if (!editedAddress.trim()) { 
            setError("La dirección del estacionamiento no puede estar vacía.");
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            await firebaseService.updateParkingLotDetails(lot.id, { name: editedName, address: editedAddress }); 
            onLotUpdated();
            onClose();
        } catch (e: any) {
            setError(e.message || "Error al actualizar los detalles del estacionamiento.");
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen || !lot) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editar Estacionamiento: ${lot.name}`}>
            <div className="space-y-4">
                {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
                <Input
                    label="Nuevo Nombre del Estacionamiento"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    required
                />
                <Input
                    label="Nueva Dirección del Estacionamiento" 
                    value={editedAddress}
                    onChange={(e) => setEditedAddress(e.target.value)}
                    required
                />
                <div className="flex justify-end space-x-3">
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={handleSaveChanges} isLoading={isLoading}>Guardar Cambios</Button>
                </div>
            </div>
        </Modal>
    );
};


interface ParkingLotDisplayInfo extends ParkingLot {
  ownerPassword?: string;
  ownerStatus?: 'Active' | 'Suspended';
}

export const SuperAdminDashboardPage: React.FC = () => {
  const { currentUser, logout, isLoading: authIsLoading } = useAuth();
  const [parkingLots, setParkingLots] = useState<ParkingLotDisplayInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For initial data loading per tab
  const [error, setError] = useState<string | null>(null);
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState<string | null>(null);
  
  const [newLotName, setNewLotName] = useState('');
  const [newLotOwnerUsernameSeed, setNewLotOwnerUsernameSeed] = useState('');
  const [newLotAddress, setNewLotAddress] = useState(''); 
  const [addLotModalError, setAddLotModalError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<(() => Promise<void>) | null>(null);
  const [actionLoadingUsername, setActionLoadingUsername] = useState<string | null>(null);

  const [isEditLotModalOpen, setIsEditLotModalOpen] = useState(false);
  const [lotToEdit, setLotToEdit] = useState<ParkingLotDisplayInfo | null>(null);
  
  const [activeTab, setActiveTab] = useState<SuperAdminTab>(SuperAdminTab.PARKING_LOTS);


  const fetchParkingLotsWithDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lotsFromService = await firebaseService.getParkingLots();
      setParkingLots(lotsFromService);
    } catch (err: any) {
      setError((err as Error).message || 'Error al cargar la lista de estacionamientos.');
    } finally {
      setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    if (currentUser && currentUser.role === 'super_admin') {
        if (activeTab === SuperAdminTab.PARKING_LOTS) {
            fetchParkingLotsWithDetails();
        }
        // Add logic for ADVERTISING tab if it needs initial data load
    }
  }, [fetchParkingLotsWithDetails, currentUser, activeTab]);

  const handleParkingLotAdded = (newLot: ParkingLot) => {
    fetchParkingLotsWithDetails(); 
    setGlobalSuccessMessage(`Estacionamiento "${newLot.name}" creado con éxito. Dueño: ${newLot.ownerUsername}`);
    setNewLotName(''); 
    setNewLotOwnerUsernameSeed('');
    setNewLotAddress(''); 
    setAddLotModalError(null); 
  };
  
  const openAddLotModal = () => {
    setNewLotName(''); 
    setNewLotOwnerUsernameSeed('');
    setNewLotAddress('');
    setAddLotModalError(null); 
    setIsAddModalOpen(true);
  }

  const handleToggleOwnerStatus = (lot: ParkingLotDisplayInfo) => {
    if (!lot.ownerStatus) return; 
    const newStatus = lot.ownerStatus === 'Active' ? 'Suspended' : 'Active';
    const actionVerb = newStatus === 'Active' ? 'reactivar' : 'suspender';
    
    setConfirmModalMessage(`¿Está seguro de que desea ${actionVerb} la cuenta del dueño "${lot.ownerUsername}" para el estacionamiento "${lot.name}"?`);
    setConfirmModalAction(() => async () => {
      setActionLoadingUsername(lot.ownerUsername);
      try {
        await firebaseService.updateOwnerStatus(lot.ownerUsername, newStatus);
        setGlobalSuccessMessage(`Cuenta de ${lot.ownerUsername} ${newStatus === 'Active' ? 'reactivada' : 'suspendida'}.`);
        fetchParkingLotsWithDetails(); 
      } catch (e: any) {
        setError((e as Error).message || `Error al ${actionVerb} la cuenta.`);
      } finally {
        setActionLoadingUsername(null);
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };
  
  const handleOpenEditLotModal = (lot: ParkingLotDisplayInfo) => {
    setLotToEdit(lot);
    setIsEditLotModalOpen(true);
  };

  const handleLotUpdated = () => {
    fetchParkingLotsWithDetails();
    setGlobalSuccessMessage("Detalles del estacionamiento actualizados.");
  };

  if (authIsLoading) {
    return <LoadingSpinner text="Verificando acceso..." />;
  }

  if (!currentUser || currentUser.role !== 'super_admin') {
    return <Alert type="error" message="Acceso denegado. Se requieren permisos de Super Administrador." />;
  }
  
  const renderTabContent = () => {
    if (isLoading && activeTab === SuperAdminTab.PARKING_LOTS) return <LoadingSpinner text="Cargando datos de la pestaña..." />;
    if (error && activeTab === SuperAdminTab.PARKING_LOTS) return <Alert type="error" message={error} onClose={() => setError(null)} />;

    switch (activeTab) {
      case SuperAdminTab.PARKING_LOTS:
        return (
          <Card title="Gestión de Estacionamientos Contratados">
            <div className="mb-6">
              <Button onClick={openAddLotModal}>
                + Crear Nuevo Estacionamiento
              </Button>
            </div>
            {!isLoading && parkingLots.length === 0 && (
              <p className="text-center text-gray-500 py-4">No hay estacionamientos registrados.</p>
            )}
            {!isLoading && parkingLots.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Estacionamiento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario Dueño</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contraseña Dueño (Mock)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Dueño</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parkingLots.map((lot) => (
                      <tr key={lot.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{lot.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lot.address || 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lot.ownerUsername}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{lot.ownerPassword || '(oculta)'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            lot.ownerStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {lot.ownerStatus === 'Active' ? 'Activo' : 'Suspendido'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(lot.createdAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                           <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenEditLotModal(lot)}
                          >
                            Editar Detalles
                          </Button>
                          <Button
                            variant={lot.ownerStatus === 'Active' ? 'warning' : 'success'}
                            size="sm"
                            onClick={() => handleToggleOwnerStatus(lot)}
                            isLoading={actionLoadingUsername === lot.ownerUsername}
                          >
                            {lot.ownerStatus === 'Active' ? 'Suspender Dueño' : 'Reactivar Dueño'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      case SuperAdminTab.ADVERTISING:
        return <AdvertisementManagement />;
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
                <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">Panel de Super Administrador</h1>
            </div>
            <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Hola, {currentUser.name || currentUser.username}</span>
                <Button onClick={logout} variant="secondary" size="sm">Cerrar Sesión</Button>
            </div>
        </div>
        <nav className="bg-gray-50 border-b border-gray-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1">
            {Object.values(SuperAdminTab).map((tab) => (
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
        {globalSuccessMessage && <Alert type="success" message={globalSuccessMessage} onClose={() => setGlobalSuccessMessage(null)} />}
        {renderTabContent()}
      </main>

      {/* Modals */}
      <AddParkingLotModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onParkingLotAdded={handleParkingLotAdded}
        lotName={newLotName}
        onLotNameChange={setNewLotName}
        ownerUsernameSeed={newLotOwnerUsernameSeed}
        onOwnerUsernameSeedChange={setNewLotOwnerUsernameSeed}
        lotAddress={newLotAddress}
        onLotAddressChange={setNewLotAddress}
        modalError={addLotModalError}
        onModalErrorChange={setAddLotModalError}
      />
      
      <EditParkingLotModal 
        isOpen={isEditLotModalOpen}
        onClose={() => setIsEditLotModalOpen(false)}
        lot={lotToEdit}
        onLotUpdated={handleLotUpdated}
      />

      {isConfirmModalOpen && (
        <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirmar Acción">
          <p className="mb-6">{confirmModalMessage}</p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)} disabled={actionLoadingUsername !== null}>Cancelar</Button>
            <Button onClick={() => confirmModalAction && confirmModalAction()} isLoading={actionLoadingUsername !== null} variant="danger">Confirmar</Button>
          </div>
        </Modal>
      )}

      <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-200 mt-8">
        NITU Parking System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};
