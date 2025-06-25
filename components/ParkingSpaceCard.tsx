
import React from 'react';
import { ParkingSpace, SpaceStatus } from '../types';
import { formatDate } from '../utils/helpers';

const CarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a2 2 0 00-2 2v1H6a2 2 0 00-2 2v5a2 2 0 002 2h1v1a2 2 0 002 2h4a2 2 0 002-2v-1h1a2 2 0 002-2V7a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H9zm-1 4h4v5H9V6z" clipRule="evenodd" />
    <path d="M4 14a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
  </svg>
);

const VipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const ReservedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6zm-1.5-1a.5.5 0 00-.5-.5h-2a.5.5 0 000 1h2a.5.5 0 00.5-.5z" clipRule="evenodd" />
  </svg>
);

const MaintenanceIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.566.379-1.566 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.566 2.6 1.566 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.566-.379 1.566-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
</svg>
);


interface ParkingSpaceCardProps {
  space: ParkingSpace;
  onClick?: (space: ParkingSpace) => void;
  isSelected?: boolean;
}

export const ParkingSpaceCard: React.FC<ParkingSpaceCardProps> = ({ space, onClick, isSelected }) => {
  const getStatusColor = () => {
    if (space.status === SpaceStatus.MAINTENANCE) {
        return 'bg-slate-200 border-slate-500 text-slate-700 hover:bg-slate-300';
    }
    if (space.isReserved && space.status === SpaceStatus.FREE) {
        if (space.clientReservationStatus === 'PENDING_CONFIRMATION') {
            return 'bg-amber-100 border-amber-500 text-amber-700 hover:bg-amber-200'; // Yellowish for pending
        }
        return 'bg-sky-100 border-sky-500 text-sky-700 hover:bg-sky-200'; // Blueish for confirmed/manual reserved
    }
    switch (space.status) {
      case SpaceStatus.FREE:
        return 'bg-emerald-100 border-emerald-500 text-emerald-700 hover:bg-emerald-200';
      case SpaceStatus.OCCUPIED:
        return 'bg-red-100 border-red-500 text-red-700 hover:bg-red-200';
      case SpaceStatus.RESERVED: // This case implies it's Reserved AND Occupied (or other non-Free status if logic allows)
        return 'bg-amber-100 border-amber-500 text-amber-700 hover:bg-amber-200'; // Kept for occupied reservations
      default:
        return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(space);
    }
  };

  const renderStatusIcon = () => {
    if (space.status === SpaceStatus.OCCUPIED) return <CarIcon />;
    if (space.status === SpaceStatus.MAINTENANCE) return <MaintenanceIcon />;
    
    let statusText: string = space.status; // Explicitly type as string
    
    if (space.isReserved && space.status === SpaceStatus.FREE) {
        if (space.clientReservationStatus === 'PENDING_CONFIRMATION') {
            statusText = "Pendiente";
        } else if (space.clientReservationStatus === 'CONFIRMED_BY_OWNER') {
            statusText = "Confirmada";
        } else {
             statusText = "Reservado"; // Manual reservation or older client reservation without specific status
        }
    }

    return (
        <div className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-gray-400 flex items-center justify-center">
            <span className="text-xs sm:text-sm">
                {statusText}
            </span>
        </div>
    );
  }

  const renderReservationDetails = () => {
    if (space.isReserved && space.status === SpaceStatus.FREE) {
        let reservedForText = space.reservedForPlateOrUserId || '';
        let statusPrefix = "";

        if (space.clientReservationStatus === 'PENDING_CONFIRMATION') {
            statusPrefix = "Cliente (Pendiente): ";
            reservedForText = space.reservedVehiclePlate || 'N/A';
        } else if (space.clientReservationStatus === 'CONFIRMED_BY_OWNER') {
            statusPrefix = "Cliente (Confirmada): ";
            reservedForText = space.reservedVehiclePlate || 'N/A';
        } else if (space.reservedForPlateOrUserId?.startsWith('client_') && space.reservedVehiclePlate) {
            // Older client reservation or one manually set to client ID without explicit status
            statusPrefix = "Cliente: ";
            reservedForText = space.reservedVehiclePlate;
        } else if (space.reservedVehiclePlate) { // Fallback, less likely
             reservedForText = `Placa: ${space.reservedVehiclePlate}`;
        }
        // For manual employee/owner reservations, reservedForText already holds the plate/text

        const textColorClass = space.clientReservationStatus === 'PENDING_CONFIRMATION' ? 'text-amber-600' : 'text-sky-600';

        return (
            <div className={`text-xs text-center ${textColorClass} mt-1`}>
                {statusPrefix && <p className="truncate" title={statusPrefix + reservedForText}>{statusPrefix}{reservedForText}</p>}
                {!statusPrefix && reservedForText && <p className="truncate" title={`Para: ${reservedForText}`}>Para: {reservedForText}</p>}
                {space.reservedUntil && <p>Hasta: {formatDate(space.reservedUntil, { month: 'short', day:'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
        );
    }
    return null;
  }


  return (
    <div
      className={`p-3 sm:p-4 rounded-lg border-2 shadow-md transition-all duration-200 ease-in-out cursor-pointer relative ${getStatusColor()} ${isSelected ? 'ring-4 ring-primary ring-offset-2' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      aria-label={`Espacio ${space.number}, estado ${space.status}${space.isVip ? ', VIP' : ''}${space.isReserved ? ', Reservado' : ''}`}
    >
      <div className="flex justify-between items-start mb-1 sm:mb-2">
        <h3 className="text-lg sm:text-xl font-bold">#{space.number}</h3>
        <div className="flex flex-col items-end space-y-1">
            {space.isVip && <VipIcon />}
            {space.isReserved && <ReservedIcon />}
        </div>
      </div>
      <div className="text-center my-2 sm:my-3">
        {renderStatusIcon()}
      </div>
      {space.status === SpaceStatus.OCCUPIED && (
        <div className="text-xs sm:text-sm text-center">
          <p className="font-semibold truncate" title={space.vehiclePlate}>{space.vehiclePlate || 'N/A'}</p>
          <p className="text-gray-600">{formatDate(space.entryTime, { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      )}
      {renderReservationDetails()}
      {space.status === SpaceStatus.MAINTENANCE && space.maintenanceNotes && (
          <p className="text-xs text-center text-slate-600 mt-1 truncate" title={space.maintenanceNotes}>Nota: {space.maintenanceNotes}</p>
      )}
    </div>
  );
};
