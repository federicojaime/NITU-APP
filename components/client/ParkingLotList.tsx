import React from 'react';
import { ParkingLot } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ParkingLotListProps {
  parkingLots: ParkingLot[];
  onViewDetails: (lot: ParkingLot) => void;
}

export const ParkingLotList: React.FC<ParkingLotListProps> = ({ parkingLots, onViewDetails }) => {
  if (parkingLots.length === 0) {
    return (
      <Card title="Estacionamientos Disponibles">
        <p className="text-center text-gray-500 py-4">
          No hay estacionamientos registrados en el sistema en este momento.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Estacionamientos Disponibles">
      <div className="space-y-4">
        {parkingLots.map((lot) => (
          <div key={lot.id} className="p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-primary">{lot.name}</h3>
                <p className="text-sm text-gray-600">{lot.address || 'Dirección no especificada'}</p>
              </div>
              <Button 
                onClick={() => onViewDetails(lot)} 
                variant="ghost" 
                size="sm"
                className="mt-2 sm:mt-0"
              >
                Ver Detalles y Disponibilidad
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};