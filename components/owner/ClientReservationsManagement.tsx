import React, { useState, useEffect, useCallback } from 'react';
import { ParkingSpace } from '../../types';
import * as firebaseService from '../../services/firebaseService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import { formatDate } from '../../utils/helpers';
import { Modal } from '../ui/Modal';

interface ClientReservationsManagementProps {
  parkingLotId: string;
  ownerId: string; // Current owner ID for logging actions
}

export const ClientReservationsManagement: React.FC<ClientReservationsManagementProps> = ({ parkingLotId, ownerId }) => {
  const [pendingReservations, setPendingReservations] = useState<ParkingSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<ParkingSpace | null>(null);
  const [actionLoading, setActionLoading] = useState(false);


  const fetchPendingReservations = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);
    try {
      const pending = await firebaseService.getPendingClientReservationsForLot(parkingLotId);
      setPendingReservations(pending);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las reservas pendientes de clientes.');
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchPendingReservations();
    const intervalId = setInterval(() => fetchPendingReservations(false), 30000); // Refresh silently every 30s
    return () => clearInterval(intervalId);
  }, [fetchPendingReservations]);

  const handleOpenConfirmModal = (reservation: ParkingSpace, action: 'accept' | 'reject') => {
    setSelectedReservation(reservation);
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  const executeConfirmedAction = async () => {
    if (!selectedReservation || !confirmAction) return;

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (confirmAction === 'accept') {
        await firebaseService.acceptClientReservation(parkingLotId, selectedReservation.id, ownerId);
        setSuccessMessage(`Reserva para ${selectedReservation.reservedVehiclePlate} (Espacio #${selectedReservation.number}) ACEPTADA.`);
      } else if (confirmAction === 'reject') {
        await firebaseService.rejectClientReservation(parkingLotId, selectedReservation.id, ownerId);
        setSuccessMessage(`Reserva para ${selectedReservation.reservedVehiclePlate} (Espacio #${selectedReservation.number}) RECHAZADA y cancelada.`);
      }
      fetchPendingReservations(); // Refresh list
    } catch (err: any) {
      setError(err.message || `Error al ${confirmAction === 'accept' ? 'aceptar' : 'rechazar'} la reserva.`);
    } finally {
      setActionLoading(false);
      setConfirmModalOpen(false);
      setSelectedReservation(null);
      setConfirmAction(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };


  if (isLoading) {
    return (
      <Card title="Gestionar Reservas de Clientes (Pendientes de Confirmación)">
        <LoadingSpinner text="Cargando reservas pendientes..." />
      </Card>
    );
  }

  return (
    <Card title="Gestionar Reservas de Clientes (Pendientes de Confirmación)">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      
      <Button onClick={() => fetchPendingReservations(true)} variant="ghost" size="sm" isLoading={isLoading} className="mb-4">
          Refrescar Lista
      </Button>

      {!isLoading && pendingReservations.length === 0 && (
        <p className="text-center text-gray-500 py-4">No hay reservas de clientes pendientes de confirmación en este momento.</p>
      )}

      {!isLoading && pendingReservations.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Espacio #</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patente Cliente</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reservado Hasta</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Cliente</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingReservations.map((res) => (
                <tr key={res.id}>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {res.number} {res.isVip ? <span className="text-xs text-amber-600">(VIP)</span> : ''}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">{res.reservedVehiclePlate}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(res.reservedUntil)}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs" title={res.reservedForPlateOrUserId || ''}>{res.reservedForPlateOrUserId?.substring(0,15) + '...'}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button
                      onClick={() => handleOpenConfirmModal(res, 'accept')}
                      variant="success"
                      size="sm"
                      disabled={actionLoading}
                    >
                      Aceptar
                    </Button>
                    <Button
                      onClick={() => handleOpenConfirmModal(res, 'reject')}
                      variant="danger"
                      size="sm"
                      disabled={actionLoading}
                    >
                      Rechazar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <Modal 
        isOpen={confirmModalOpen} 
        onClose={() => setConfirmModalOpen(false)}
        title={`Confirmar ${confirmAction === 'accept' ? 'Aceptación' : 'Rechazo'} de Reserva`}
      >
        <p className="mb-6">
            ¿Está seguro de que desea <span className="font-semibold">{confirmAction === 'accept' ? 'ACEPTAR' : 'RECHAZAR Y CANCELAR'}</span> la reserva para el vehículo 
            <span className="font-semibold"> {selectedReservation?.reservedVehiclePlate}</span> en el espacio 
            <span className="font-semibold"> #{selectedReservation?.number}</span>?
        </p>
        <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)} disabled={actionLoading}>No</Button>
            <Button 
                onClick={executeConfirmedAction} 
                isLoading={actionLoading} 
                variant={confirmAction === 'accept' ? 'success' : 'danger'}
            >
                Sí, {confirmAction === 'accept' ? 'Aceptar' : 'Rechazar'}
            </Button>
        </div>
      </Modal>
    </Card>
  );
};