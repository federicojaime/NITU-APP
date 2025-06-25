
import React, { useState } from 'react';
import { AuthenticatedUser } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import * as firebaseService from '../../services/firebaseService';

interface ClientVehicleManagementProps {
  currentUser: AuthenticatedUser;
  onVehiclesUpdated: (updatedUser: AuthenticatedUser) => void;
}

export const ClientVehicleManagement: React.FC<ClientVehicleManagementProps> = ({ currentUser, onVehiclesUpdated }) => {
  const [newPlate, setNewPlate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clientVehicles = currentUser.clientVehiclePlates || [];

  const handleAddVehicle = async () => {
    if (!newPlate.trim()) {
      setError('La patente no puede estar vacía.');
      return;
    }
    if (clientVehicles.includes(newPlate.toUpperCase())) {
      setError('Esta patente ya está registrada.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const updatedUser = await firebaseService.addClientVehicle(currentUser.id, newPlate);
      if (updatedUser) {
        onVehiclesUpdated(updatedUser);
        setSuccessMessage(`Vehículo ${newPlate.toUpperCase()} añadido.`);
        setNewPlate('');
      } else {
        throw new Error("No se pudo actualizar el usuario después de añadir el vehículo.");
      }
    } catch (e: any) {
      setError(e.message || 'Error al añadir vehículo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveVehicle = async (plateToRemove: string) => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const updatedUser = await firebaseService.removeClientVehicle(currentUser.id, plateToRemove);
      if (updatedUser) {
        onVehiclesUpdated(updatedUser);
        setSuccessMessage(`Vehículo ${plateToRemove} eliminado.`);
      } else {
         throw new Error("No se pudo actualizar el usuario después de eliminar el vehículo.");
      }
    } catch (e: any) {
      setError(e.message || 'Error al eliminar vehículo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (plateToMakePrimary: string) => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const updatedUser = await firebaseService.setClientPrimaryVehicle(currentUser.id, plateToMakePrimary);
      if (updatedUser) {
        onVehiclesUpdated(updatedUser);
        setSuccessMessage(`Vehículo ${plateToMakePrimary} marcado como principal.`);
      } else {
        throw new Error("No se pudo actualizar el usuario después de marcar como principal.");
      }
    } catch (e: any) {
      setError(e.message || 'Error al marcar vehículo como principal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Mis Vehículos Registrados">
      {isLoading && <LoadingSpinner text="Actualizando vehículos..." />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

      <div className="mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-end sm:space-x-3">
        <Input
          label="Añadir Nueva Patente"
          id="newPlate"
          value={newPlate}
          onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
          placeholder="Ej: AB123CD"
          maxLength={10}
          containerClassName="flex-grow mb-0"
        />
        <Button onClick={handleAddVehicle} isLoading={isLoading} className="w-full sm:w-auto">
          Añadir Vehículo
        </Button>
      </div>

      {clientVehicles.length === 0 && !isLoading && (
        <p className="text-center text-gray-500 py-4">No tienes vehículos registrados.</p>
      )}

      {clientVehicles.length > 0 && (
        <ul className="space-y-3">
          {clientVehicles.map((plate, index) => (
            <li
              key={plate}
              className="p-3 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white shadow-sm"
            >
              <div>
                <span className="font-semibold text-lg text-primary-dark">{plate}</span>
                {index === 0 && (
                  <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
                    Principal
                  </span>
                )}
              </div>
              <div className="mt-2 sm:mt-0 space-x-2 flex-shrink-0">
                {index !== 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPrimary(plate)}
                    isLoading={isLoading}
                    title="Marcar como vehículo principal para reservas rápidas"
                  >
                    Marcar Principal
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveVehicle(plate)}
                  isLoading={isLoading}
                  disabled={clientVehicles.length === 1 && index === 0} // Cannot remove if it's the only one and primary
                  title={clientVehicles.length === 1 && index === 0 ? "No se puede eliminar el único vehículo principal" : "Eliminar este vehículo"}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
