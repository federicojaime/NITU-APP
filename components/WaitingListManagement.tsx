
import React, { useState, useEffect, useCallback } from 'react';
import { WaitingListEntry, WaitingListStatus, VehicleType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Alert } from './ui/Alert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Modal } from './ui/Modal';
import { AddEditWaitingListEntryModal } from './AddEditWaitingListEntryModal';
import * as firebaseService from '../services/firebaseService';
import { formatDate } from '../utils/helpers';
import { WaitingListStatusOptions } from '../constants'; // For Select dropdown

interface WaitingListManagementProps {
  parkingLotId: string;
  employeeId: string; // Current employee ID for logging actions
}

export const WaitingListManagement: React.FC<WaitingListManagementProps> = ({ parkingLotId, employeeId }) => {
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<WaitingListEntry | null>(null);

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<WaitingListEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchWaitingList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await firebaseService.getWaitingList(parkingLotId);
      setWaitingList(list);
    } catch (e: any) {
      setError(e.message || 'Error al cargar la lista de espera.');
    } finally {
      setIsLoading(false);
    }
  }, [parkingLotId]);

  useEffect(() => {
    if (parkingLotId) {
      fetchWaitingList();
    }
  }, [fetchWaitingList, parkingLotId]);

  const handleOpenCreateModal = () => {
    setEntryToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (entry: WaitingListEntry) => {
    setEntryToEdit(entry);
    setIsModalOpen(true);
  };

  const handleEntrySaved = (savedEntry: WaitingListEntry) => {
    setGlobalSuccessMessage(`Entrada para "${savedEntry.vehiclePlate}" ${entryToEdit ? 'actualizada' : 'añadida'} con éxito.`);
    fetchWaitingList(); 
    setIsModalOpen(false);
    setEntryToEdit(null);
    setTimeout(() => setGlobalSuccessMessage(null), 3000);
  };

  const handleUpdateStatus = async (entry: WaitingListEntry, newStatus: WaitingListStatus) => {
    setError(null);
    setGlobalSuccessMessage(null);
    try {
      await firebaseService.updateWaitingListEntry(parkingLotId, entry.id, { 
        status: newStatus,
        resolvedByEmployeeId: (newStatus !== WaitingListStatus.WAITING && newStatus !== WaitingListStatus.NOTIFIED) ? employeeId : entry.resolvedByEmployeeId,
        notifiedAt: newStatus === WaitingListStatus.NOTIFIED && !entry.notifiedAt ? Date.now() : entry.notifiedAt,
      });
      setGlobalSuccessMessage(`Estado de "${entry.vehiclePlate}" actualizado a ${newStatus}.`);
      fetchWaitingList();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar estado.');
    }
  };

  const openDeleteConfirmModal = (entry: WaitingListEntry) => {
    setEntryToDelete(entry);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    setError(null);
    setGlobalSuccessMessage(null);
    setDeleteLoading(true);
    try {
      await firebaseService.deleteWaitingListEntry(parkingLotId, entryToDelete.id);
      setGlobalSuccessMessage(`Entrada para "${entryToDelete.vehiclePlate}" eliminada.`);
      fetchWaitingList();
      setIsConfirmDeleteModalOpen(false);
      setEntryToDelete(null);
    } catch (e: any) {
      setError(e.message || 'Error al eliminar entrada.');
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const getStatusColor = (status: WaitingListStatus) => {
    switch (status) {
      case WaitingListStatus.WAITING: return 'bg-amber-100 text-amber-800';
      case WaitingListStatus.NOTIFIED: return 'bg-sky-100 text-sky-800';
      case WaitingListStatus.PARKED: return 'bg-emerald-100 text-emerald-800';
      case WaitingListStatus.CANCELLED:
      case WaitingListStatus.EXPIRED: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  return (
    <Card title="Lista de Espera de Vehículos">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {globalSuccessMessage && <Alert type="success" message={globalSuccessMessage} onClose={() => setGlobalSuccessMessage(null)} />}

      <div className="mb-6 flex justify-between items-center">
        <Button onClick={handleOpenCreateModal}>+ Añadir a Lista de Espera</Button>
        <Button onClick={fetchWaitingList} variant="ghost" size="sm" isLoading={isLoading}>Refrescar Lista</Button>
      </div>

      {isLoading && <LoadingSpinner text="Cargando lista de espera..." />}
      {!isLoading && waitingList.length === 0 && (
        <p className="text-center text-gray-500 py-4">No hay vehículos en la lista de espera.</p>
      )}
      {!isLoading && waitingList.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patente</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Añadido</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones Rápidas</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Otras Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {waitingList.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.vehiclePlate}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{entry.vehicleType}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 truncate" title={entry.customerName}>{entry.customerName || 'N/A'}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 truncate" title={entry.contactInfo}>{entry.contactInfo || 'N/A'}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(entry.addedAt)}</td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium space-x-1 space-y-1">
                    {entry.status === WaitingListStatus.WAITING && (
                        <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(entry, WaitingListStatus.NOTIFIED)}>Notificar</Button>
                    )}
                    {(entry.status === WaitingListStatus.WAITING || entry.status === WaitingListStatus.NOTIFIED) && (
                        <Button variant="success" size="sm" onClick={() => handleUpdateStatus(entry, WaitingListStatus.PARKED)}>Estacionar</Button>
                    )}
                     {(entry.status === WaitingListStatus.WAITING || entry.status === WaitingListStatus.NOTIFIED) && (
                        <Button variant="warning" size="sm" onClick={() => handleUpdateStatus(entry, WaitingListStatus.CANCELLED)}>Cancelar</Button>
                    )}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(entry)}>Editar/Notas</Button>
                    <Button variant="danger" size="sm" onClick={() => openDeleteConfirmModal(entry)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <AddEditWaitingListEntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleEntrySaved}
          existingEntry={entryToEdit}
          parkingLotId={parkingLotId}
          employeeId={employeeId}
        />
      )}

      {isConfirmDeleteModalOpen && entryToDelete && (
        <Modal
          isOpen={isConfirmDeleteModalOpen}
          onClose={() => setIsConfirmDeleteModalOpen(false)}
          title="Confirmar Eliminación"
        >
          <p className="text-gray-700 mb-6">¿Está seguro de que desea eliminar la entrada para "{entryToDelete.vehiclePlate}" de la lista de espera?</p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsConfirmDeleteModalOpen(false)} disabled={deleteLoading}>Cancelar</Button>
            <Button onClick={handleDeleteEntry} isLoading={deleteLoading} variant="danger">Confirmar Eliminación</Button>
          </div>
        </Modal>
      )}
    </Card>
  );
};
