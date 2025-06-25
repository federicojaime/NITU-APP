
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select'; // Changed from Input
import { Alert } from '../ui/Alert';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ParkingLot, VehicleType, AuthenticatedUser } from '../../types';
import * as firebaseService from '../../services/firebaseService';
import { vehicleTypeOptions } from '../../utils/helpers';

interface ClientReservationModalProps {
  isOpen: boolean;
  onClose: (reservationMadeSuccessfully: boolean) => void;
  parkingLot: ParkingLot;
  currentUser: AuthenticatedUser; // No longer needs clientPrimaryPlate explicitly here
}

export const ClientReservationModal: React.FC<ClientReservationModalProps> = ({
  isOpen,
  onClose,
  parkingLot,
  currentUser,
}) => {
  const [selectedVehiclePlate, setSelectedVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.AUTO);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clientVehicles = currentUser.clientVehiclePlates || [];
  const vehiclePlateOptions = clientVehicles.map(plate => ({ value: plate, label: plate }));

  useEffect(() => {
    if (isOpen) {
      // Pre-select the first vehicle plate if available, otherwise empty
      setSelectedVehiclePlate(clientVehicles.length > 0 ? clientVehicles[0] : '');
      setVehicleType(VehicleType.AUTO); // Default vehicle type
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, clientVehicles]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!selectedVehiclePlate.trim()) {
      setError('Debe seleccionar un vehículo para la reserva.');
      return;
    }

    setIsLoading(true);
    try {
      await firebaseService.createClientReservation(
        parkingLot.id,
        currentUser.id,
        currentUser.name,
        selectedVehiclePlate,
        vehicleType
      );
      setSuccessMessage(`¡Reserva creada con éxito para ${selectedVehiclePlate} en ${parkingLot.name}! Será válida desde este momento (generalmente por el resto del día o hasta que se ocupe/cancele).`);
      setTimeout(() => {
        onClose(true); // Indicate success
      }, 3500);
    } catch (e: any) {
      setError(e.message || 'Error al crear la reserva.');
      setIsLoading(false); 
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={`Reservar en ${parkingLot.name}`} size="md">
      {isLoading && <LoadingSpinner text="Procesando reserva..." />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {!isLoading && !successMessage && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Estás reservando un espacio en <span className="font-semibold">{parkingLot.name}</span>.
            La reserva asegurará tu lugar y será válida generalmente hasta el final del día o hasta que el vehículo ingrese.
            El cobro se realizará según el tiempo real de estadía.
          </p>
          
          {clientVehicles.length > 0 ? (
            <Select
              label="Seleccionar Vehículo"
              id="selectedVehiclePlate"
              value={selectedVehiclePlate}
              onChange={(e) => setSelectedVehiclePlate(e.target.value)}
              options={vehiclePlateOptions}
              required
            />
          ) : (
            <Alert type="warning" message="No tienes vehículos registrados. Por favor, añade un vehículo desde tu panel de cliente para poder reservar." />
          )}

          <Select
            label="Tipo de Vehículo"
            id="vehicleType"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
            options={vehicleTypeOptions}
            required
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => onClose(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={clientVehicles.length === 0}>
              Confirmar Reserva
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
