
import React, { useState, useEffect, useCallback } from 'react';
import { Advertisement, AdvertisementDisplayLocation } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Alert } from './ui/Alert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Modal } from './ui/Modal';
import { AddEditAdvertisementModal } from './AddEditAdvertisementModal';
import * as firebaseService from '../services/databaseService';
import { formatDate } from '../utils/helpers';
import { AdvertisementDisplayLocationOptions } from '../constants';

export const AdvertisementManagement: React.FC = () => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState<string | null>(null);

  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [adToEdit, setAdToEdit] = useState<Advertisement | null>(null);

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<Advertisement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ads = await firebaseService.getAdvertisements();
      setAdvertisements(ads);
    } catch (e: any) {
      setError(e.message || 'Error al cargar los anuncios.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleOpenCreateModal = () => {
    setAdToEdit(null);
    setIsAdModalOpen(true);
  };

  const handleOpenEditModal = (ad: Advertisement) => {
    setAdToEdit(ad);
    setIsAdModalOpen(true);
  };

  const handleAdSaved = (savedAd: Advertisement) => {
    setGlobalSuccessMessage(`Anuncio "${savedAd.title}" ${adToEdit ? 'actualizado' : 'creado'} con éxito.`);
    fetchAds(); // Refresh the list
    setIsAdModalOpen(false);
    setAdToEdit(null);
    setTimeout(() => setGlobalSuccessMessage(null), 3000);
  };

  const handleToggleStatus = async (ad: Advertisement) => {
    setError(null);
    setGlobalSuccessMessage(null);
    const newStatus = ad.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await firebaseService.updateAdvertisement(ad.id, { status: newStatus });
      setGlobalSuccessMessage(`Estado del anuncio "${ad.title}" actualizado a ${newStatus}.`);
      fetchAds();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar estado del anuncio.');
    }
  };

  const openDeleteConfirmModal = (ad: Advertisement) => {
    setAdToDelete(ad);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleDeleteAd = async () => {
    if (!adToDelete) return;
    setError(null);
    setGlobalSuccessMessage(null);
    setDeleteLoading(true);
    try {
      await firebaseService.deleteAdvertisement(adToDelete.id);
      setGlobalSuccessMessage(`Anuncio "${adToDelete.title}" eliminado.`);
      fetchAds();
      setIsConfirmDeleteModalOpen(false);
      setAdToDelete(null);
    } catch (e: any) {
      setError(e.message || 'Error al eliminar anuncio.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getLocationLabel = (locationValue: AdvertisementDisplayLocation) => {
    return AdvertisementDisplayLocationOptions.find(opt => opt.value === locationValue)?.label || locationValue;
  }

  return (
    <Card title="Gestión de Publicidad">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {globalSuccessMessage && <Alert type="success" message={globalSuccessMessage} onClose={() => setGlobalSuccessMessage(null)} />}

      <div className="mb-6">
        <Button onClick={handleOpenCreateModal}>+ Crear Nueva Publicidad</Button>
      </div>

      {isLoading && <LoadingSpinner text="Cargando anuncios..." />}
      {!isLoading && advertisements.length === 0 && (
        <p className="text-center text-gray-500 py-4">No hay anuncios configurados.</p>
      )}
      {!isLoading && advertisements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {advertisements.map((ad) => (
                <tr key={ad.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{ad.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{ad.type === 'image' ? 'Imagen' : 'Texto'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getLocationLabel(ad.displayLocation)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ad.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {ad.status === 'Active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(ad.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(ad)}>Editar</Button>
                    <Button
                      variant={ad.status === 'Active' ? 'warning' : 'success'}
                      size="sm"
                      onClick={() => handleToggleStatus(ad)}
                    >
                      {ad.status === 'Active' ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => openDeleteConfirmModal(ad)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdModalOpen && (
        <AddEditAdvertisementModal
          isOpen={isAdModalOpen}
          onClose={() => setIsAdModalOpen(false)}
          onSave={handleAdSaved}
          existingAd={adToEdit}
        />
      )}

      {isConfirmDeleteModalOpen && adToDelete && (
        <Modal
          isOpen={isConfirmDeleteModalOpen}
          onClose={() => setIsConfirmDeleteModalOpen(false)}
          title="Confirmar Eliminación"
        >
          <p className="text-gray-700 mb-6">¿Está seguro de que desea eliminar el anuncio "{adToDelete.title}"? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsConfirmDeleteModalOpen(false)} disabled={deleteLoading}>Cancelar</Button>
            <Button onClick={handleDeleteAd} isLoading={deleteLoading} variant="danger">Confirmar Eliminación</Button>
          </div>
        </Modal>
      )}
    </Card>
  );
};
