
import React, { useState } from 'react';
import { Customer } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Alert } from './ui/Alert';
import { Card } from './ui/Card';

interface CustomerManagementProps {
  customers: Customer[]; // Assumed to be for the current parking lot
  onAddCustomer: (customerData: Omit<Customer, 'id'>) => Promise<Customer | void>;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, onAddCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', plate: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'plate') {
        setNewCustomer({ ...newCustomer, [name]: value.toUpperCase() });
    } else {
        setNewCustomer({ ...newCustomer, [name]: value });
    }
  };

  const handleAddCustomer = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!newCustomer.name) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    setIsLoading(true);
    try {
      await onAddCustomer(newCustomer); // onAddCustomer is passed by OwnerDashboard, already has parkingLotId context
      setSuccessMessage(`Cliente ${newCustomer.name} agregado correctamente.`);
      setNewCustomer({ name: '', plate: '' });
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al agregar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Gestión de Clientes">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

      <Button onClick={() => setIsModalOpen(true)} className="mb-6">
        Añadir Nuevo Cliente
      </Button>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patente (Opcional)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Cliente (interno)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.plate || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{customer.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {customers.length === 0 && <p className="text-center text-gray-500 py-4">No hay clientes registrados para este estacionamiento.</p>}


      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Añadir Nuevo Cliente">
        <div className="space-y-4">
          <Input label="Nombre Completo" name="name" value={newCustomer.name} onChange={handleInputChange} required />
          <Input label="Patente (Opcional)" name="plate" value={newCustomer.plate} onChange={handleInputChange} placeholder="Ej: AA123BB" />
          <Button onClick={handleAddCustomer} isLoading={isLoading} className="w-full">
            Guardar Cliente
          </Button>
        </div>
      </Modal>
    </Card>
  );
};
