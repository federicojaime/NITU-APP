
import React, { useState, useEffect, useCallback } from 'react';
import { ParkingSpace, VehicleType, SpaceStatus, Customer } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Alert } from './ui/Alert';
import { Card } from './ui/Card';
import { findCustomerByPlate } from '../services/firebaseService'; // Mocked
import { vehicleTypeOptions, slugify } from '../utils/helpers';

interface VehicleEntryFormProps {
  spaces: ParkingSpace[];
  onVehicleEntered: (space: ParkingSpace, plate: string, vehicleType: VehicleType, customerData?: { id?: string, name?: string}) => Promise<void>;
  selectedSpace?: ParkingSpace | null;
  employeeId: string;
  parkingLotId: string; // Added for context
}

export const VehicleEntryForm: React.FC<VehicleEntryFormProps> = ({ spaces, onVehicleEntered, selectedSpace, employeeId, parkingLotId }) => {
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.AUTO);
  const [manualSpaceId, setManualSpaceId] = useState('');
  const [suggestedCustomer, setSuggestedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Plate suggestions are not implemented in this version to simplify, but findCustomerByPlate is used.

  useEffect(() => {
    if (selectedSpace && selectedSpace.status === SpaceStatus.FREE) {
      setManualSpaceId(selectedSpace.number); 
      setError(null);
    } else if (selectedSpace && selectedSpace.status !== SpaceStatus.FREE) {
        setError(`El espacio ${selectedSpace.number} está ${selectedSpace.status}. Seleccione otro.`);
        setManualSpaceId('');
    }
  }, [selectedSpace]);

  const handlePlateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPlate = e.target.value.toUpperCase();
    setPlate(newPlate);
    if (newPlate.length >= 3 && parkingLotId) { 
      try {
        const customer = await findCustomerByPlate(parkingLotId, newPlate);
        setSuggestedCustomer(customer);
      } catch (err) {
        console.error("Error finding customer by plate", err);
        setSuggestedCustomer(null);
      }
    } else {
      setSuggestedCustomer(null);
    }
  };

  const resetForm = () => {
    setPlate('');
    setVehicleType(VehicleType.AUTO);
    setManualSpaceId('');
    setSuggestedCustomer(null);
    setError(null);
    // Do not reset success message here, parent component might handle global messages
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!plate.trim()) {
      setError('La patente es obligatoria.');
      return;
    }
     if (!parkingLotId) {
      setError('Error: ID de estacionamiento no definido.');
      return;
    }

    let spaceToOccupy: ParkingSpace | undefined;

    if (manualSpaceId.trim()) {
      const targetSpaceNumber = slugify(manualSpaceId.trim());
      spaceToOccupy = spaces.find(s => slugify(s.number) === targetSpaceNumber);
      if (!spaceToOccupy) {
        setError(`Espacio "${manualSpaceId}" no encontrado.`);
        return;
      }
      if (spaceToOccupy.status !== SpaceStatus.FREE) {
        setError(`El espacio ${spaceToOccupy.number} está ${spaceToOccupy.status}.`);
        return;
      }
    } else {
      setError('Debe seleccionar un espacio o usar "Asignar Siguiente Libre".');
      return;
    }

    setIsLoading(true);
    try {
      // Pass customer ID if found, otherwise the parent (EmployeeMainView) will handle name if any.
      await onVehicleEntered(spaceToOccupy, plate, vehicleType, suggestedCustomer ? { id: suggestedCustomer.id, name: suggestedCustomer.name } : undefined);
      setSuccessMessage(`Vehículo ${plate} ingresado en espacio ${spaceToOccupy.number}. (Este mensaje es local del formulario)`);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error al ingresar vehículo.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAssignNextFree = useCallback(() => {
    setError(null);
    const freeNonVipSpaces = spaces.filter(s => s.status === SpaceStatus.FREE && !s.isVip).sort((a,b) => parseInt(a.number) - parseInt(b.number));
    const freeVipSpaces = spaces.filter(s => s.status === SpaceStatus.FREE && s.isVip).sort((a,b) => parseInt(a.number) - parseInt(b.number));
    
    const targetSpace = freeNonVipSpaces.length > 0 ? freeNonVipSpaces[0] : (freeVipSpaces.length > 0 ? freeVipSpaces[0] : null);

    if (targetSpace) {
      setManualSpaceId(targetSpace.number);
    } else {
      setError('No hay espacios libres disponibles.');
    }
  }, [spaces]);


  return (
    <Card title="Registrar Ingreso de Vehículo" className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

        <Input
          label="Patente/Matrícula"
          id="plate"
          value={plate}
          onChange={handlePlateChange}
          required
          maxLength={10}
          placeholder="Ej: AA123BB"
        />
        {suggestedCustomer && (
          <p className="text-sm text-emerald-600 -mt-2 mb-3">
            Cliente Registrado: <span className="font-semibold">{suggestedCustomer.name}</span> (ID: {suggestedCustomer.id})
          </p>
        )}

        <Select
          label="Tipo de Vehículo"
          id="vehicleType"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value as VehicleType)}
          options={vehicleTypeOptions}
          required
        />

        <div className="flex items-end gap-2">
            <Input
                label="ID Espacio Manual"
                id="manualSpaceId"
                value={manualSpaceId}
                onChange={(e) => setManualSpaceId(e.target.value)}
                placeholder="Ej: 5 o A5"
                containerClassName="flex-grow"
            />
            <Button type="button" variant="secondary" onClick={handleAssignNextFree} className="mb-4 h-[42px]" isLoading={isLoading} disabled={!spaces || spaces.length === 0}>
                Asignar Siguiente Libre
            </Button>
        </div>
        {selectedSpace && <p className="text-sm text-gray-600 mb-2">Espacio seleccionado por click: <span className="font-semibold">#{selectedSpace.number}</span></p>}


        <Button type="submit" isLoading={isLoading} className="w-full">
          Registrar Ingreso
        </Button>
      </form>
    </Card>
  );
};
