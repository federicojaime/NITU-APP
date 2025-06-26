import React, { useState, useEffect, useCallback } from 'react';
import { ParkingSpace, VehicleType, SpaceStatus, Transaction, PricingSettings, AuthenticatedUser } from '../types';
import { ParkingGrid } from './ParkingGrid';
import { VehicleEntryForm } from './VehicleEntryForm';
import { VehicleExitForm } from './VehicleExitForm';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Alert } from './ui/Alert';
import { Modal } from './ui/Modal'; 
import { Button } from './ui/Button'; 
import { ManageSpaceModal } from './ManageSpaceModal';
import * as firebaseService from '../services/databaseService';
import { formatCurrency } from '../utils/helpers';

interface EmployeeMainViewProps {
  currentUser: AuthenticatedUser;
  parkingLotId: string;
  onDataRefreshNeeded: () => void; // Callback to parent to trigger data refresh for whole EmployeeDashboard
}

export const EmployeeMainView: React.FC<EmployeeMainViewProps> = ({ currentUser, parkingLotId, onDataRefreshNeeded }) => {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [selectedSpaceForForm, setSelectedSpaceForForm] = useState<ParkingSpace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState<string | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isManageSpaceModalOpen, setIsManageSpaceModalOpen] = useState(false);
  // spaceToManage will be same as selectedSpaceForForm for simplicity of triggering ManageSpaceModal
  
  const fetchData = useCallback(async (isManualRefresh: boolean = false) => {
    if (!parkingLotId) {
        setError("ID de estacionamiento no disponible para cargar datos.");
        setIsLoading(false);
        return;
    }
    if(isManualRefresh) setGlobalSuccessMessage("Actualizando datos...");
    setIsLoading(true); 
    setError(null);
    try {
      const [fetchedSpaces, fetchedPricing] = await Promise.all([
        firebaseService.getParkingSpaces(parkingLotId),
        firebaseService.getPricingSettings(parkingLotId),
      ]);
      setSpaces(fetchedSpaces);
      setPricingSettings(fetchedPricing);
      if(isManualRefresh) setGlobalSuccessMessage("Datos actualizados.");
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos operativos.');
       if (err.message && err.message.includes("cannot get pricing settings")) {
        setError('Error al cargar configuración de tarifas. Funcionalidad de cobro limitada. Contacte al administrador.');
      }
      if(isManualRefresh) setGlobalSuccessMessage(null); // Clear success if error
    } finally {
      setIsLoading(false);
      if(isManualRefresh) setTimeout(() => setGlobalSuccessMessage(null), 2000);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSpaceClick = (space: ParkingSpace) => {
    setGlobalSuccessMessage(null); 
    setError(null);
    setSelectedSpaceForForm(space); 
    
    if (space.status === SpaceStatus.FREE) {
      if (space.clientReservationStatus === 'PENDING_CONFIRMATION') {
        setGlobalSuccessMessage(`Espacio #${space.number} tiene una reserva de cliente PENDIENTE DE CONFIRMACIÓN por el dueño. Use 'Gestionar Espacio' o espere confirmación para ingresar.`);
        setIsEntryModalOpen(false); // Do not open entry modal directly
        setIsExitModalOpen(false);
      } else {
        // Includes CONFIRMED_BY_OWNER, manual reservations, or no reservation
        setIsEntryModalOpen(true);
        setIsExitModalOpen(false);
      }
    } else if (space.status === SpaceStatus.OCCUPIED) {
      setIsExitModalOpen(true);
      setIsEntryModalOpen(false);
    } else if (space.status === SpaceStatus.RESERVED) { 
        // This case is less likely now with clientReservationStatus handling
        // but kept for safety. If it's "RESERVED" and not FREE, it's an odd state.
        setGlobalSuccessMessage(`Espacio #${space.number} está ${space.status}. Use 'Gestionar Espacio' para más opciones.`);
        setIsEntryModalOpen(false);
        setIsExitModalOpen(false);
    } else if (space.status === SpaceStatus.MAINTENANCE) {
        setGlobalSuccessMessage(`El espacio #${space.number} está ${space.status}. Use 'Gestionar Espacio' para cambiar estado.`);
        setIsEntryModalOpen(false);
        setIsExitModalOpen(false);
    }
  };

  const handleOpenManualEntryModal = () => {
    setGlobalSuccessMessage(null); setError(null);
    setSelectedSpaceForForm(null); 
    setIsEntryModalOpen(true);
    setIsExitModalOpen(false);
  };

  const handleOpenManualExitModal = () => {
    setGlobalSuccessMessage(null); setError(null);
    setSelectedSpaceForForm(null); 
    setIsExitModalOpen(true);
    setIsEntryModalOpen(false);
  };

  const handleOpenManageSpaceModal = () => {
      if (selectedSpaceForForm) {
          setIsManageSpaceModalOpen(true);
      } else {
          setError("Seleccione un espacio de la cuadrícula primero para gestionarlo.");
      }
  }
  
  const handleSpaceUpdatedByModal = () => {
      fetchData(); 
      onDataRefreshNeeded(); 
  }

  const handleVehicleEntered = async (
    space: ParkingSpace,
    plate: string,
    vehicleType: VehicleType,
    customerData?: { id?: string, name?: string}
  ): Promise<void> => {
    if (!parkingLotId) throw new Error("ID de estacionamiento no disponible.");
    setGlobalSuccessMessage(null); setError(null);

    if (space.status === SpaceStatus.MAINTENANCE) {
        throw new Error(`El espacio #${space.number} está en mantenimiento y no se puede ocupar.`);
    }

    // Handle client reservations
    if (space.isReserved && space.clientReservationStatus === 'PENDING_CONFIRMATION') {
        throw new Error(`El espacio #${space.number} tiene una reserva de cliente PENDIENTE DE CONFIRMACIÓN por el dueño. No se puede ingresar aún.`);
    }
    
    if (space.isReserved && space.status === SpaceStatus.FREE) {
        let reservationMismatchMessage = "";
        if (space.clientReservationStatus === 'CONFIRMED_BY_OWNER') {
            if (space.reservedVehiclePlate && space.reservedVehiclePlate.toUpperCase() !== plate.toUpperCase()) {
                reservationMismatchMessage = `El espacio #${space.number} está reservado para la patente ${space.reservedVehiclePlate} (Cliente Confirmado).\nLa patente ingresada es ${plate}.\n¿Desea ocupar este espacio igualmente? (Esto ignorará la reserva del cliente).`;
            }
        } else { // Manual reservation by employee/owner
             if (space.reservedForPlateOrUserId && space.reservedForPlateOrUserId.toUpperCase() !== plate.toUpperCase() && !space.reservedForPlateOrUserId.startsWith('client_')) {
                reservationMismatchMessage = `El espacio #${space.number} está reservado para ${space.reservedForPlateOrUserId}.\nLa patente ingresada es ${plate}.\n¿Desea ocupar este espacio igualmente? (Esto podría ignorar la reserva manual).`;
            }
        }
        
        if (reservationMismatchMessage) {
            const confirmOverride = window.confirm(reservationMismatchMessage);
            if (!confirmOverride) {
                 throw new Error("Operación cancelada por el usuario debido a discrepancia en reserva.");
            }
        }
    }


    try {
      let resolvedCustomerId: string | undefined = customerData?.id;
      let resolvedCustomerName: string | undefined = customerData?.name;
      
      const customerInfo = await firebaseService.findCustomerByPlate(parkingLotId, plate);
      if (customerInfo) {
          resolvedCustomerId = customerInfo.id;
          resolvedCustomerName = customerInfo.name;
      }

      const newTransaction = await firebaseService.addTransaction(parkingLotId, {
        vehiclePlate: plate,
        vehicleType,
        spaceId: space.id,
        spaceNumber: space.number,
        employeeId: currentUser.id,
        customerId: resolvedCustomerId,
        customerName: resolvedCustomerName,
        spaceIsVip: space.isVip,
      });

      await firebaseService.updateParkingSpace(parkingLotId, space.id, {
        status: SpaceStatus.OCCUPIED,
        vehiclePlate: plate,
        entryTime: newTransaction.entryTime,
        currentTransactionId: newTransaction.id,
        isReserved: false, 
        reservedForPlateOrUserId: null,
        reservedUntil: null,
        reservedVehiclePlate: null,
        clientReservationStatus: null, // Clear client reservation status upon entry
      });

      setGlobalSuccessMessage(`Vehículo ${plate} ingresado en espacio ${space.number}.`);
      fetchData(); 
      onDataRefreshNeeded();
      setIsEntryModalOpen(false); 
      setSelectedSpaceForForm(null); 
    } catch (err: any) {
      console.error("Error in handleVehicleEntered:", err);
      throw err; 
    }
  };

  const handleVehicleExited = async (
    transaction: Transaction,
    space: ParkingSpace,
    fee: number,
    originalFee: number,
    discountApplied: number
  ): Promise<void> => {
    if (!parkingLotId) throw new Error("ID de estacionamiento no disponible.");
    setGlobalSuccessMessage(null); setError(null);
    try {
      await firebaseService.updateTransaction(parkingLotId, transaction.id, {
        exitTime: Date.now(),
        totalFee: fee,
        originalFee: originalFee,
        discountApplied: discountApplied,
      });

      await firebaseService.updateParkingSpace(parkingLotId, space.id, {
        status: SpaceStatus.FREE,
        vehiclePlate: undefined,
        entryTime: undefined,
        currentTransactionId: undefined,
        // Reservation status is not automatically re-applied on exit here.
        // Owner manages new reservations or client makes one.
        isReserved: false,
        reservedForPlateOrUserId: null,
        reservedUntil: null,
        reservedVehiclePlate: null,
        clientReservationStatus: null, // Ensure this is also cleared
      });

      setGlobalSuccessMessage(`Salida de ${transaction.vehiclePlate} registrada. Tarifa: ${formatCurrency(fee)}.`);
      fetchData(); 
      onDataRefreshNeeded();
      setIsExitModalOpen(false); 
      setSelectedSpaceForForm(null); 
    } catch (err: any) {
      console.error("Error in handleVehicleExited:", err);
      throw err; 
    }
  };

  if (isLoading) return <LoadingSpinner text="Cargando operaciones..." />;
  if (error && !isLoading) return <Alert type="error" message={error} onClose={() => setError(null)} />;
  if (!parkingLotId && !isLoading) return <Alert type="error" message="No se pudo determinar el estacionamiento para las operaciones." />;

  return (
    <div className="space-y-6">
      {globalSuccessMessage && <Alert type="success" message={globalSuccessMessage} onClose={() => setGlobalSuccessMessage(null)} />}
      
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
        <Button 
            onClick={handleOpenManualEntryModal} 
            variant="success"
            className="w-full sm:w-auto"
            disabled={!pricingSettings} 
        >
            Registrar Ingreso Manual
        </Button>
        <Button 
            onClick={handleOpenManualExitModal} 
            variant="danger"
            className="w-full sm:w-auto"
            disabled={!pricingSettings} 
        >
            Registrar Salida Manual
        </Button>
         <Button 
            onClick={handleOpenManageSpaceModal} 
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={!selectedSpaceForForm}
        >
            Gestionar Espacio Seleccionado
        </Button>
        <Button onClick={() => fetchData(true)} variant="ghost" size="sm" className="ml-auto" isLoading={isLoading}>Refrescar Datos</Button>
      </div>
      {!pricingSettings && (
          <Alert type="warning" message="La configuración de tarifas no está disponible. Las funciones de ingreso y salida están limitadas."/>
      )}

      <ParkingGrid
        spaces={spaces}
        onSpaceClick={handleSpaceClick}
        selectedSpaceId={selectedSpaceForForm?.id} 
        isLoading={isLoading}
        title="Estado de Espacios del Estacionamiento"
      />

      {isEntryModalOpen && (
        <Modal
          isOpen={isEntryModalOpen}
          onClose={() => {
            setIsEntryModalOpen(false);
          }}
          title={selectedSpaceForForm ? `Registrar Ingreso - Espacio #${selectedSpaceForForm.number} ${selectedSpaceForForm.isVip ? '(VIP)' : ''}` : "Registrar Ingreso Manual"}
          size="lg"
        >
          <VehicleEntryForm
            spaces={spaces} 
            onVehicleEntered={handleVehicleEntered} 
            selectedSpace={selectedSpaceForForm} 
            employeeId={currentUser.id}
            parkingLotId={parkingLotId}
          />
        </Modal>
      )}

      {isExitModalOpen && pricingSettings && (
        <Modal
          isOpen={isExitModalOpen}
          onClose={() => {
            setIsExitModalOpen(false);
          }}
          title={selectedSpaceForForm ? `Registrar Salida - Espacio #${selectedSpaceForForm.number} (${selectedSpaceForForm.vehiclePlate})` : "Registrar Salida Manual"}
          size="lg"
        >
          <VehicleExitForm
            spaces={spaces} 
            pricingSettings={pricingSettings}
            onVehicleExited={handleVehicleExited} 
            selectedSpace={selectedSpaceForForm} 
            employeeId={currentUser.id}
            parkingLotId={parkingLotId}
          />
        </Modal>
      )}
      {parkingLotId && selectedSpaceForForm && (
          <ManageSpaceModal
            isOpen={isManageSpaceModalOpen}
            onClose={() => setIsManageSpaceModalOpen(false)}
            space={selectedSpaceForForm}
            parkingLotId={parkingLotId}
            onSpaceUpdated={handleSpaceUpdatedByModal}
          />
      )}
    </div>
  );
};