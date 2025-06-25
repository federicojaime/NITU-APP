
import React, { useState } from 'react';
import { Employee } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
// import { Select } from './ui/Select'; // Select for status was not used here
import { Modal } from './ui/Modal';
import { Alert } from './ui/Alert';
import { Card } from './ui/Card';

interface EmployeeManagementProps {
  employees: Employee[]; // Assumed to be for the current parking lot
  onAddEmployee: (employeeData: Omit<Employee, 'id' | 'parkingLotId'| 'status'> & {status: 'Active' | 'Inactive'}) => Promise<Employee | void>;
  onUpdateEmployeeStatus: (employeeId: string, status: 'Active' | 'Inactive') => Promise<Employee | void>;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees, onAddEmployee, onUpdateEmployeeStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewEmployee({ ...newEmployee, [e.target.name]: e.target.value });
  };

  const handleAddEmployee = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!newEmployee.name || !newEmployee.username || !newEmployee.password) {
      setError('Todos los campos son obligatorios para agregar un empleado.');
      return;
    }
    setIsLoading(true);
    try {
      // onAddEmployee is passed by OwnerDashboard, already has parkingLotId context
      await onAddEmployee({ ...newEmployee, status: 'Active' }); 
      setSuccessMessage(`Empleado ${newEmployee.username} agregado correctamente.`);
      setNewEmployee({ name: '', username: '', password: '' });
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al agregar empleado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
      // onUpdateEmployeeStatus is passed by OwnerDashboard, already has parkingLotId context for employeeId
      await onUpdateEmployeeStatus(employee.id, newStatus);
      setSuccessMessage(`Estado de ${employee.username} actualizado a ${newStatus}.`);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar estado del empleado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Gestión de Empleados">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      
      <Button onClick={() => setIsModalOpen(true)} className="mb-6">
        Añadir Nuevo Empleado
      </Button>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Empleado (interno)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    employee.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.status === 'Active' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button
                    size="sm"
                    variant={employee.status === 'Active' ? 'warning' : 'success'}
                    onClick={() => handleToggleStatus(employee)}
                    isLoading={isLoading && employee.id === employees.find(e => e.id === employee.id)?.id} // Only show spinner for the specific employee being updated
                  >
                    {employee.status === 'Active' ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{employee.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {employees.length === 0 && <p className="text-center text-gray-500 py-4">No hay empleados registrados para este estacionamiento.</p>}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Añadir Nuevo Empleado">
        <div className="space-y-4">
          <Input label="Nombre Completo" name="name" value={newEmployee.name} onChange={handleInputChange} required />
          <Input label="Nombre de Usuario" name="username" value={newEmployee.username} onChange={handleInputChange} required />
          <Input label="Contraseña" name="password" type="password" value={newEmployee.password} onChange={handleInputChange} required />
          <Button onClick={handleAddEmployee} isLoading={isLoading} className="w-full">
            Guardar Empleado
          </Button>
        </div>
      </Modal>
    </Card>
  );
};
