import React, { useState, useEffect } from 'react';
import { ParkingSpace, SpaceStatus } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Alert } from './ui/Alert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Card } from './ui/Card'; 
import * as firebaseService from '../services/firebaseService';
import { formatDate } from '../utils/helpers';

interface ManageSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: ParkingSpace | null;
  parkingLotId: string;
  onSpaceUpdated: () => void; // Callback to refresh data in parent
}

export const ManageSpaceModal: React.FC<ManageSpaceModalProps> = ({
  isOpen,
  onClose,
  space,
  parkingLotId,
  onSpaceUpdated,
}) => {
  const [isReserved, setIsReserved] = useState(false);
  const [reservedUntil, setReservedUntil] = useState(''); // Store as string from datetime-local
  const [reservedFor, setReservedFor] = useState(''); // Holds space.reservedForPlateOrUserId
  
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (space) {
      setIsReserved(space.isReserved || false);
      if (space.reservedUntil) {
        const d = new Date(space.reservedUntil);
        const year = d.getFullYear();
        const month = (`0${d.getMonth() + 1}`).slice(-2);
        const day = (`0${d.getDate()}`).slice(-2);
        const hours = (`0${d.getHours()}`).slice(-2);
        const minutes = (`0${d.getMinutes()}`).slice(-2);
        setReservedUntil(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setReservedUntil('');
      }
      setReservedFor(space.reservedForPlateOrUserId || '');
      
      setIsMaintenance(space.status === SpaceStatus.MAINTENANCE);
      setMaintenanceNotes(space.maintenanceNotes || '');
      setError(null);
      setSuccessMessage(null);
    }
  }, [space, isOpen]);

  const handleSaveReservation = async () => {
    if (!space) return;
    setError(null); setSuccessMessage(null);
    
    let reservedUntilTimestamp: number | null = null;
    if (isReserved && reservedUntil) {
        reservedUntilTimestamp = new Date(reservedUntil).getTime();
        if (isNaN(reservedUntilTimestamp)) {
            setError("Fecha/Hora de reserva inválida.");
            return;
        }
        if (reservedUntilTimestamp <= Date.now()) {
            setError("La fecha/hora de reserva debe ser futura.");
            return;
        }
    }
    if (isReserved && !reservedFor.trim()) {
        setError("Debe especificar para quién es la reserva (Patente manual / ID Cliente / Texto).");
        return;
    }

    setIsLoading(true);
    try {
      await firebaseService.setSpaceReservation(
        parkingLotId,
        space.id,
        isReserved,
        reservedUntilTimestamp,
        isReserved ? reservedFor.trim() : null // 'reservedFor' state holds the new value for reservedForPlateOrUserId
      );
      setSuccessMessage('Estado de reserva actualizado.');
      onSpaceUpdated();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar reserva.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMaintenance = async () => {
    if (!space) return;
    setError(null); setSuccessMessage(null);
    setIsLoading(true);
    try {
      await firebaseService.setSpaceMaintenanceStatus(
        parkingLotId,
        space.id,
        isMaintenance,
        isMaintenance ? maintenanceNotes.trim() : undefined
      );
      setSuccessMessage('Estado de mantenimiento actualizado.');
      onSpaceUpdated();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar mantenimiento.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFullClose = () => {
    setError(null);
    setSuccessMessage(null);
    onClose();
  }

  if (!isOpen || !space) return null;

  const canModifyReservation = space.status === SpaceStatus.FREE || (space.isReserved && space.status !== SpaceStatus.OCCUPIED);
  const canModifyMaintenance = space.status !== SpaceStatus.OCCUPIED;
  const isClientReservation = space.isReserved && space.reservedForPlateOrUserId?.startsWith('client_');

  return (
    <Modal isOpen={isOpen} onClose={handleFullClose} title={`Gestionar Espacio #${space.number} ${space.isVip ? '(VIP)' : ''}`} size="lg">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      {isLoading && <LoadingSpinner text="Actualizando..." />}

      <div className="space-y-6">
        <Card title="Gestión de Reserva" bodyClassName="space-y-4">
          {isClientReservation && (
            <div className={`mb-3 p-3 rounded-md border ${
                space.clientReservationStatus === 'PENDING_CONFIRMATION' ? 'bg-amber-50 border-amber-200' : 
                space.clientReservationStatus === 'CONFIRMED_BY_OWNER' ? 'bg-sky-50 border-sky-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <p className={`text-sm font-semibold ${
                  space.clientReservationStatus === 'PENDING_CONFIRMATION' ? 'text-amber-700' : 
                  space.clientReservationStatus === 'CONFIRMED_BY_OWNER' ? 'text-sky-700' : 'text-gray-700'
              }`}>
                Reserva de Cliente: 
                {space.clientReservationStatus === 'PENDING_CONFIRMATION' ? ' PENDIENTE DE CONFIRMACIÓN POR DUEÑO' : 
                 space.clientReservationStatus === 'CONFIRMED_BY_OWNER' ? ' CONFIRMADA POR DUEÑO' : 
                 ' (Estado no especificado)'}
              </p>
              <p className="text-xs text-gray-600 mt-1">Para Patente: {space.reservedVehiclePlate}</p>
              <p className="text-xs text-gray-500 mt-1">
                (ID Cliente para sistema: {space.reservedForPlateOrUserId})
              </p>
              {space.reservedUntil && <p className="text-xs text-gray-500">Hasta: {formatDate(space.reservedUntil)}</p>}
               <p className="text-xs text-gray-500 mt-1">La aceptación/rechazo de reservas de cliente se gestiona desde la pestaña "Reservas Clientes" del panel de Dueño.</p>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isReservedCheckbox"
              checked={isReserved}
              onChange={(e) => setIsReserved(e.target.checked)}
              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              disabled={!canModifyReservation || isLoading}
            />
            <label htmlFor="isReservedCheckbox" className="ml-2 block text-sm text-gray-900">
              {isClientReservation ? "Modificar Reserva Manualmente (Sobrescribirá reserva de cliente)" : "Marcar como Reservado Manualmente"}
            </label>
          </div>

          {isReserved && canModifyReservation && (
            <>
              <Input
                label="Identificador de Reserva (Patente Manual / ID Cliente / Texto)"
                id="reservedFor"
                value={reservedFor} 
                onChange={(e) => setReservedFor(e.target.value)}
                placeholder="Patente (ej: AAA111), ID Cliente, o texto (ej: 'Gerente')"
                disabled={isLoading}
              />
              <Input
                label="Reservar Hasta (Fecha y Hora)"
                id="reservedUntil"
                type="datetime-local"
                value={reservedUntil}
                onChange={(e) => setReservedUntil(e.target.value)}
                disabled={isLoading}
              />
            </>
          )}
           {!canModifyReservation && space.status === SpaceStatus.OCCUPIED && (
            <p className="text-xs text-amber-600">No se puede modificar la reserva de un espacio ocupado.</p>
          )}
          {!canModifyReservation && space.status === SpaceStatus.MAINTENANCE && (
            <p className="text-xs text-amber-600">No se puede modificar la reserva de un espacio en mantenimiento.</p>
          )}
          <Button onClick={handleSaveReservation} isLoading={isLoading} disabled={!canModifyReservation || isLoading}>
            {isReserved ? 'Guardar Cambios de Reserva Manual' : 'Liberar Reserva'}
          </Button>
        </Card>

        <Card title="Gestión de Mantenimiento" bodyClassName="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isMaintenanceCheckbox"
              checked={isMaintenance}
              onChange={(e) => setIsMaintenance(e.target.checked)}
              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              disabled={!canModifyMaintenance || isLoading}
            />
            <label htmlFor="isMaintenanceCheckbox" className="ml-2 block text-sm text-gray-900">
              Marcar como En Mantenimiento
            </label>
          </div>

          {isMaintenance && canModifyMaintenance && (
            <Input
              label="Notas de Mantenimiento (Opcional)"
              id="maintenanceNotes"
              value={maintenanceNotes}
              onChange={(e) => setMaintenanceNotes(e.target.value)}
              placeholder="Ej: Limpieza profunda, pintura"
              disabled={isLoading}
            />
          )}
           {!canModifyMaintenance && (
            <p className="text-xs text-amber-600">No se puede poner en mantenimiento un espacio ocupado.</p>
          )}
          <Button onClick={handleSaveMaintenance} isLoading={isLoading} disabled={!canModifyMaintenance || isLoading}>
            {isMaintenance ? 'Guardar Estado Mantenimiento' : 'Quitar de Mantenimiento'}
          </Button>
        </Card>
        
        <div className="mt-6 flex justify-end">
             <Button variant="secondary" onClick={handleFullClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
};