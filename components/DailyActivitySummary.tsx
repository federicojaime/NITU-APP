
import React from 'react';
import { Transaction } from '../types';
import { Card } from './ui/Card';
import { formatCurrency } from '../utils/helpers';

interface DailyActivitySummaryProps {
  dailyTransactions: Transaction[];
}

const MetricCard: React.FC<{ title: string; value: string | number; bgColorClass: string; textColorClass: string }> = ({ title, value, bgColorClass, textColorClass }) => (
  <div className={`p-4 rounded-lg shadow ${bgColorClass} ${textColorClass} text-center`}>
    <p className="text-sm font-medium opacity-90">{title}</p>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

export const DailyActivitySummary: React.FC<DailyActivitySummaryProps> = ({ dailyTransactions }) => {
  const vehiclesEnteredToday = dailyTransactions.length; // All transactions fetched for the day represent an entry
  
  const vehiclesExitedToday = dailyTransactions.filter(t => t.exitTime).length;
  
  const totalIncomeGeneratedToday = dailyTransactions.reduce((sum, t) => {
    // Only sum fees for transactions that have actually exited today
    return sum + (t.exitTime ? (t.totalFee || 0) : 0);
  }, 0);

  return (
    <Card title="Actividad del Día (Actualización Frecuente)">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard 
          title="Vehículos Ingresados Hoy" 
          value={vehiclesEnteredToday}
          bgColorClass="bg-sky-100"
          textColorClass="text-sky-800"
        />
        <MetricCard 
          title="Vehículos Salidos Hoy" 
          value={vehiclesExitedToday}
          bgColorClass="bg-emerald-100"
          textColorClass="text-emerald-800"
        />
        <MetricCard 
          title="Ingresos Generados Hoy" 
          value={formatCurrency(totalIncomeGeneratedToday)}
          bgColorClass="bg-amber-100"
          textColorClass="text-amber-800"
        />
      </div>
       <p className="text-xs text-gray-500 mt-3 text-center">
        Estas métricas se actualizan aproximadamente cada 30 segundos.
      </p>
    </Card>
  );
};
