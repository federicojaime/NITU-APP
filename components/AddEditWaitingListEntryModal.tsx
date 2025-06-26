
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Alert } from './ui/Alert';
import { WaitingListEntry, WaitingListStatus, VehicleType } from '../types';
import { WaitingListStatusOptions } from '../constants';
import * as firebaseService from '../services/databaseService';
import { vehicleTypeOptions } from '../utils/helpers';

interface AddEditWaitingListEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: WaitingListEntry) => void;
  existingEntry?: WaitingListEntry | null;
  parkingLotId: string;
  employeeId: string; // Employee performing the action
}

const initialEntryState: Omit<WaitingListEntry, 'id' | 'parkingLotId' | 'addedAt' | 'employeeIdAdded'> = {
  vehiclePlate: '',
  vehicleType: VehicleType.AUTO,
  customerName: '',
  contactInfo: '',
  notes: '',
  status: WaitingListStatus.WAITING,
};

export const AddEditWaitingListEntryModal: React.FC<AddEditWaitingListEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingEntry,
  parkingLotId,
  employeeId,
}) => {
  const [entryData, setEntryData] = useState(initialEntryState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingEntry) {
      setEntryData({
        vehiclePlate: existingEntry.vehiclePlate,
        vehicleType: existingEntry.vehicleType,
        customerName: existingEntry.customerName || '',
        contactInfo: existingEntry.contactInfo || '',
        notes: existingEntry.notes || '',
        status: existingEntry.status, // Allow editing status if existing
      });
    } else {
      setEntryData(initialEntryState);
    }
    setError(null);
  }, [existingEntry, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
     if (name === 'vehiclePlate') {
        setEntryData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
        setEntryData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!entryData.vehiclePlate.trim()) {
      setError('La patente del vehículo es obligatoria.');
      return;
    }
    
    setIsLoading(true);
    try {
      let savedEntry;
      if (existingEntry) {
        savedEntry = await firebaseService.updateWaitingListEntry(parkingLotId, existingEntry.id, {
            ...entryData,
            resolvedByEmployeeId: (entryData.status !== WaitingListStatus.WAITING && entryData.status !== WaitingListStatus.NOTIFIED) ? employeeId : existingEntry.resolvedByEmployeeId,
        });
      } else {
        savedEntry = await firebaseService.addToWaitingList(parkingLotId, {
            ...entryData,
            employeeIdAdded: employeeId,
        });
      }
      onSave(savedEntry);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al guardar la entrada en la lista de espera.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingEntry ? 'Editar Entrada en Lista de Espera' : 'Añadir a Lista de Espera'} size="lg">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        <Input
          label="Patente del Vehículo"
          name="vehiclePlate"
          value={entryData.vehiclePlate}
          onChange={handleChange}
          required
          maxLength={10}
        />
        <Select
          label="Tipo de Vehículo"
          name="vehicleType"
          value={entryData.vehicleType}
          onChange={handleChange}
          options={vehicleTypeOptions}
          required
        />
        <Input
          label="Nombre del Cliente (Opcional)"
          name="customerName"
          value={entryData.customerName}
          onChange={handleChange}
        />
        <Input
          label="Información de Contacto (Opcional)"
          name="contactInfo"
          value={entryData.contactInfo}
          onChange={handleChange}
          placeholder="Ej: Teléfono, Email"
        />
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notas (Opcional)</label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={entryData.notes}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
         {existingEntry && (
             <Select
                label="Estado Actual"
                name="status"
                value={entryData.status}
                onChange={handleChange}
                options={WaitingListStatusOptions}
             />
         )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {existingEntry ? 'Guardar Cambios' : 'Añadir a Lista'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
