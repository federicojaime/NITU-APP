
import React from 'react';
import { ParkingSpace } from '../types';
import { ParkingSpaceCard } from './ParkingSpaceCard';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface ParkingGridProps {
  spaces: ParkingSpace[];
  onSpaceClick: (space: ParkingSpace) => void;
  selectedSpaceId?: string | null;
  isLoading?: boolean;
  title?: string;
}

export const ParkingGrid: React.FC<ParkingGridProps> = ({ spaces, onSpaceClick, selectedSpaceId, isLoading, title }) => {
  if (isLoading) {
    return <LoadingSpinner text="Cargando espacios..." />;
  }

  if (!spaces.length && !isLoading) {
    return <p className="text-center text-gray-500 py-8">No hay espacios de estacionamiento configurados.</p>;
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
      {title && <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center">{title}</h2>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {spaces.map((space) => (
          <ParkingSpaceCard
            key={space.id}
            space={space}
            onClick={onSpaceClick}
            isSelected={space.id === selectedSpaceId}
          />
        ))}
      </div>
    </div>
  );
};
    