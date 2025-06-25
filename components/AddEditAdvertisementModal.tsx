import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Alert } from './ui/Alert';
import { Advertisement, AdvertisementDisplayLocation } from '../types'; // Corrected UserRole to AdvertisementDisplayLocation
import { AdvertisementDisplayLocationOptions } from '../constants';
import * as firebaseService from '../services/firebaseService';

interface AddEditAdvertisementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ad: Advertisement) => void; // Callback after successful save
  existingAd?: Advertisement | null;
}

const initialAdState: Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  type: 'text',
  content: '',
  linkUrl: '',
  displayLocation: AdvertisementDisplayLocation.LOGIN_BANNER,
  status: 'Active',
};

export const AddEditAdvertisementModal: React.FC<AddEditAdvertisementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingAd,
}) => {
  const [adData, setAdData] = useState(initialAdState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingAd) {
      setAdData({
        title: existingAd.title,
        type: existingAd.type,
        content: existingAd.content,
        linkUrl: existingAd.linkUrl || '',
        displayLocation: existingAd.displayLocation,
        status: existingAd.status,
      });
    } else {
      setAdData(initialAdState);
    }
    setError(null);
  }, [existingAd, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setAdData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!adData.title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (!adData.content.trim()) {
      setError(adData.type === 'image' ? 'La URL de la imagen es obligatoria.' : 'El contenido del texto es obligatorio.');
      return;
    }
    if (adData.type === 'image' && adData.content && !adData.content.startsWith('http')) {
        setError('La URL de la imagen debe ser un enlace válido (http/https).');
        return;
    }
     if (adData.linkUrl && !adData.linkUrl.startsWith('http')) {
        setError('La URL de enlace debe ser un enlace válido (http/https) o dejarse vacía.');
        return;
    }

    setIsLoading(true);
    try {
      let savedAd;
      if (existingAd) {
        savedAd = await firebaseService.updateAdvertisement(existingAd.id, adData);
      } else {
        savedAd = await firebaseService.addAdvertisement(adData);
      }
      onSave(savedAd);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al guardar el anuncio.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingAd ? 'Editar Publicidad' : 'Crear Nueva Publicidad'} size="lg">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        <Input
          label="Título del Anuncio"
          name="title"
          value={adData.title}
          onChange={handleChange}
          required
        />
        <Select
          label="Tipo de Anuncio"
          name="type"
          value={adData.type}
          onChange={handleChange}
          options={[
            { value: 'text', label: 'Texto' },
            { value: 'image', label: 'Imagen (URL Externa)' },
          ]}
        />
        {adData.type === 'image' ? (
          <Input
            label="URL de la Imagen"
            name="content"
            value={adData.content}
            onChange={handleChange}
            placeholder="https://ejemplo.com/imagen.png"
            required
          />
        ) : (
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Contenido del Texto</label>
            <textarea
                id="content"
                name="content"
                rows={3}
                value={adData.content}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
            />
          </div>
        )}
        <Input
          label="URL de Enlace (Opcional)"
          name="linkUrl"
          value={adData.linkUrl}
          onChange={handleChange}
          placeholder="https://ejemplo.com/destino"
        />
        <Select
          label="Ubicación de Visualización"
          name="displayLocation"
          value={adData.displayLocation}
          onChange={handleChange}
          options={AdvertisementDisplayLocationOptions}
        />
        <Select
          label="Estado"
          name="status"
          value={adData.status}
          onChange={handleChange}
          options={[
            { value: 'Active', label: 'Activo' },
            { value: 'Inactive', label: 'Inactivo' },
          ]}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {existingAd ? 'Guardar Cambios' : 'Crear Anuncio'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
