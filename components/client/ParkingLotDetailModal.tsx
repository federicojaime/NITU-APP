import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import { ParkingLot, ParkingLotAvailability, AuthenticatedUser } from '../../types';
import * as firebaseService from '../../services/firebaseService';
import { useAuth } from '../../contexts/AuthContext';
import { ClientReservationModal } from './ClientReservationModal'; // New Import

interface ParkingLotDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  parkingLot: ParkingLot | null;
  onReservationMade?: () => void; // Callback to refresh parent data
}

export const ParkingLotDetailModal: React.FC<ParkingLotDetailModalProps> = ({ isOpen, onClose, parkingLot, onReservationMade }) => {
  const { currentUser } = useAuth();
  const [availability, setAvailability] = useState<ParkingLotAvailability | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [errorAvailability, setErrorAvailability] = useState<string | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!parkingLot) return;
    setIsLoadingAvailability(true);
    setErrorAvailability(null);
    try {
      const availData = await firebaseService.getParkingLotAvailability(parkingLot.id);
      setAvailability(availData);
    } catch (err: any) {
      setErrorAvailability(err.message || 'Error al cargar la disponibilidad.');
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [parkingLot]);

  useEffect(() => {
    if (isOpen && parkingLot && !isReservationModalOpen) { // Don't refetch if reservation modal is opening/open
      fetchAvailability();
    } else if (!isOpen) {
      setAvailability(null);
      setErrorAvailability(null);
    }
  }, [isOpen, parkingLot, fetchAvailability, isReservationModalOpen]);

  const handleOpenReservationModal = () => {
    if (!currentUser) {
        alert("Debe iniciar sesión para realizar una reserva.");
        // Potentially navigate to login or show login prompt
        return;
    }
    setIsReservationModalOpen(true);
  };
  
  const handleReservationModalClosed = (reservationSuccess: boolean) => {
    setIsReservationModalOpen(false);
    if (reservationSuccess && onReservationMade) {
        onReservationMade(); // Call parent callback
    }
    // Optionally, refresh availability here too if needed
    if (isOpen && parkingLot) { // Re-fetch availability after reservation attempt
        fetchAvailability();
    }
  };


  const handleGetDirections = () => {
    if (parkingLot?.address) {
      const query = encodeURIComponent(parkingLot.address);
      window.open(`https://maps.google.com/?q=${query}`, '_blank');
    } else {
      alert('Dirección no disponible para este estacionamiento.');
    }
  };

  if (!parkingLot) return null;

  return (
    <>
      <Modal isOpen={isOpen && !isReservationModalOpen} onClose={onClose} title={`Detalles de: ${parkingLot.name}`} size="lg">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-700">Dirección:</h4>
            <p className="text-gray-600">{parkingLot.address || 'No especificada'}</p>
          </div>

          <hr/>

          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Disponibilidad Actual:</h4>
            {isLoadingAvailability && <LoadingSpinner text="Cargando disponibilidad..." size="sm" />}
            {errorAvailability && <Alert type="error" message={errorAvailability} onClose={() => setErrorAvailability(null)} />}
            {availability && !isLoadingAvailability && !errorAvailability && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p><strong>Total de Espacios:</strong> {availability.totalSpaces}</p>
                <p className="text-emerald-600 font-semibold"><strong>Espacios Libres:</strong> {availability.freeSpaces}</p>
                <p><strong>Total VIP:</strong> {availability.vipSpaces}</p>
                <p className="text-emerald-600"><strong>VIP Libres:</strong> {availability.freeVipSpaces}</p>
                <p className="text-red-600"><strong>Ocupados:</strong> {availability.occupiedSpaces}</p>
                <p className="text-sky-600"><strong>Reservados (y libres):</strong> {availability.reservedSpaces}</p>
                <p className="text-slate-600"><strong>En Mantenimiento:</strong> {availability.maintenanceSpaces}</p>
              </div>
            )}
          </div>
          
          <hr/>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-3">
            <Button onClick={handleGetDirections} variant="secondary" disabled={!parkingLot.address}>
              Cómo Llegar
            </Button>
            <Button onClick={handleOpenReservationModal} variant="primary" disabled={isLoadingAvailability || !availability || availability.freeSpaces === 0}>
              Reservar en este Estacionamiento
            </Button>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </Modal>
      {currentUser && parkingLot && (
          <ClientReservationModal
            isOpen={isReservationModalOpen}
            onClose={handleReservationModalClosed}
            parkingLot={parkingLot}
            currentUser={currentUser as AuthenticatedUser & { clientPrimaryPlate?: string }} // Cast to include clientPrimaryPlate
           />
      )}
    </>
  );
};