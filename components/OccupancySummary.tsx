
import React from 'react';
import { ParkingSpace, SpaceStatus } from '../types';
import { Card } from './ui/Card';

interface OccupancySummaryProps {
  spaces: ParkingSpace[];
}

interface SummaryItemProps {
  label: string;
  value: number;
  colorClass: string;
  icon?: React.ReactNode;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, colorClass, icon }) => (
  <div className={`p-4 rounded-lg shadow-md flex items-center space-x-3 ${colorClass}`}>
    {icon && <div className="p-2 rounded-full bg-white bg-opacity-30">{icon}</div>}
    <div>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const TotalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>;
const FreeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
const OccupiedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>; // X Mark
const ReservedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


export const OccupancySummary: React.FC<OccupancySummaryProps> = ({ spaces }) => {
  const totalSpaces = spaces.length;
  const freeSpaces = spaces.filter(s => s.status === SpaceStatus.FREE).length;
  const occupiedSpaces = spaces.filter(s => s.status === SpaceStatus.OCCUPIED).length;
  const reservedSpaces = spaces.filter(s => s.status === SpaceStatus.RESERVED).length; // Future use

  return (
    <Card title="Ocupación en Tiempo Real">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryItem label="Total Espacios" value={totalSpaces} colorClass="bg-slate-200 text-slate-800" icon={<TotalIcon />}/>
        <SummaryItem label="Libres" value={freeSpaces} colorClass="bg-emerald-200 text-emerald-800" icon={<FreeIcon />} />
        <SummaryItem label="Ocupados" value={occupiedSpaces} colorClass="bg-red-200 text-red-800" icon={<OccupiedIcon />} />
        <SummaryItem label="Reservados" value={reservedSpaces} colorClass="bg-amber-200 text-amber-800" icon={<ReservedIcon />}/>
      </div>
    </Card>
  );
};
    