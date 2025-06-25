
import React, { useState, useEffect, useCallback } from 'react';
import { ClientReservation, SpaceStatus } from '../../types';
import * as firebaseService from '../../services/firebaseService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import { formatDate } from '../../utils/helpers';
import { Modal } from '../ui/Modal'; // For confirmation

interface ClientActiveReservationsProps {
  clientId: string;
  onReservationCancelled?: () => void; // Callback to notify parent
}

export const ClientActiveReservations: React.FC<ClientActiveReservationsProps> = ({ clientId, onReservationCancelled }) => {
  const [reservations, setReservations] = useState<ClientReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isConfirmCancelModalOpen, setIsConfirmCancelModalOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<ClientReservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchActiveReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeRes = await firebaseService.getClientActiveReservations(clientId);
      setReservations(activeRes);
    } catch (err: any) {
      setError(err.message || 'Error al cargar sus reservas activas.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchActiveReservations();
  }, [fetchActiveReservations]);

  const handleOpenCancelConfirm = (reservation: ClientReservation) => {
    setReservationToCancel(reservation);
    setIsConfirmCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!reservationToCancel) return;
    setIsCancelling(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await firebaseService.cancelClientReservation(
        reservationToCancel.parkingLotId,
        reservationToCancel.id,
        clientId
      );
      setSuccessMessage('Reserva cancelada con éxito.');
      fetchActiveReservations(); // Refresh list
      if (onReservationCancelled) {
        onReservationCancelled();
      }
    } catch (err: any) {
      setError(err.message || 'Error al cancelar la reserva.');
    } finally {
      setIsCancelling(false);
      setIsConfirmCancelModalOpen(false);
      setReservationToCancel(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };
  
  const getReservationStatusText = (reservation: ClientReservation) => {
    if (reservation.status === SpaceStatus.OCCUPIED) {
      return <span className="text-red-600 font-semibold">OCUPADO (Vehículo Ingresó)</span>;
    }
    switch (reservation.clientReservationStatus) {
      case 'PENDING_CONFIRMATION':
        return <span className="text-amber-600 font-semibold">PENDIENTE DE CONFIRMACIÓN</span>;
      case 'CONFIRMED_BY_OWNER':
        return <span className="text-emerald-600 font-semibold">RESERVA EXITOSA</span>;
      case 'REJECTED_BY_OWNER':
        return <span className="text-red-700 font-semibold">RECHAZADA POR EL ESTACIONAMIENTO</span>;
      default:
        // This case can happen if isReserved is true but clientReservationStatus is null (e.g. older data or manual override)
        // or if the reservation was rejected and clientReservationStatus was set to null by a previous logic.
        // For the client, if it's in their active list and not explicitly confirmed/pending, it's an anomaly or just a general reservation.
        if (reservation.isReserved) {
            return <span className="text-sky-600 font-semibold">RESERVADO (General)</span>;
        }
        return <span className="text-gray-500">Estado desconocido</span>;
    }
  };

  const getCardStyling = (reservation: ClientReservation) => {
    if (reservation.status === SpaceStatus.OCCUPIED) return 'bg-red-50 border-red-200';
    switch (reservation.clientReservationStatus) {
        case 'PENDING_CONFIRMATION': return 'bg-amber-50 border-amber-200';
        case 'CONFIRMED_BY_OWNER': return 'bg-emerald-50 border-emerald-200';
        case 'REJECTED_BY_OWNER': return 'bg-red-100 border-red-300'; // More prominent red for rejected
        default: 
            return reservation.isReserved ? 'bg-sky-50 border-sky-200' : 'bg-gray-50 border-gray-200';
    }
  }


  if (isLoading) {
    return (
      <Card title="Mis Reservas Activas">
        <LoadingSpinner text="Cargando reservas..." />
      </Card>
    );
  }

  return (
    <Card title="Mis Reservas Activas">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      
      {!isLoading && reservations.length === 0 && (
        <p className="text-center text-gray-500 py-4">No tienes reservas activas en este momento.</p>
      )}

      {!isLoading && reservations.length > 0 && (
        <div className="space-y-3">
          {reservations.map((res) => (
            <div key={res.id} className={`p-4 border rounded-lg shadow-sm ${getCardStyling(res)}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <h4 className="text-md font-semibold text-primary">{res.parkingLotName}</h4>
                  <p className="text-sm text-gray-700">
                    Espacio: <span className="font-medium">#{res.number}</span>
                    {res.isVip ? <span className="ml-1 text-xs text-amber-600">(VIP)</span> : ''}
                  </p>
                  <p className="text-sm text-gray-700">
                    Vehículo: <span className="font-medium">{res.reservedVehiclePlate || 'No especificado'}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Válida hasta: <span className="font-medium">{formatDate(res.reservedUntil)}</span>
                  </p>
                   <p className="text-xs mt-1">ESTADO: {getReservationStatusText(res)}</p>
                </div>
                <Button
                  onClick={() => handleOpenCancelConfirm(res)}
                  variant="danger"
                  size="sm"
                  className="mt-2 sm:mt-0"
                  disabled={
                    isCancelling || 
                    res.status === SpaceStatus.OCCUPIED || 
                    res.clientReservationStatus === 'REJECTED_BY_OWNER' ||
                    !res.isReserved // Cannot cancel if not marked as 'isReserved' (e.g. if rejected implies isReserved=false)
                    }
                  title={
                    res.status === SpaceStatus.OCCUPIED ? "No se puede cancelar una reserva de un espacio ya ocupado" :
                    res.clientReservationStatus === 'REJECTED_BY_OWNER' ? "Esta reserva fue rechazada por el estacionamiento" :
                    !res.isReserved && res.clientReservationStatus !== 'PENDING_CONFIRMATION' && res.clientReservationStatus !== 'CONFIRMED_BY_OWNER' ? "Esta reserva no se puede cancelar en su estado actual" :
                    "Cancelar Reserva"
                  }
                >
                  Cancelar Reserva
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isConfirmCancelModalOpen && reservationToCancel && (
        <Modal
          isOpen={isConfirmCancelModalOpen}
          onClose={() => setIsConfirmCancelModalOpen(false)}
          title="Confirmar Cancelación de Reserva"
        >
          <p className="mb-4">
            ¿Está seguro de que desea cancelar su reserva para el vehículo <span className="font-semibold">{reservationToCancel.reservedVehiclePlate}</span> en <span className="font-semibold">{reservationToCancel.parkingLotName}</span> (Espacio #{reservationToCancel.number})?
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsConfirmCancelModalOpen(false)} disabled={isCancelling}>No, Mantener</Button>
            <Button variant="danger" onClick={handleConfirmCancel} isLoading={isCancelling}>Sí, Cancelar</Button>
          </div>
        </Modal>
      )}
    </Card>
  );
};