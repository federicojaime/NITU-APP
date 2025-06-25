
import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { Card } from './ui/Card';
import { TransactionHistory } from './TransactionHistory';
import { formatCurrency } from '../utils/helpers';

interface ShiftReportProps {
  employeeId: string;
  allTransactions: Transaction[]; // Transactions for the current parking lot
  parkingLotId: string; // For context, though not directly used if allTransactions is pre-filtered
}

export const ShiftReport: React.FC<ShiftReportProps> = ({ employeeId, allTransactions, parkingLotId }) => {
  const todayStartTimestamp = new Date().setHours(0, 0, 0, 0);

  // Transactions are already filtered by parkingLotId by the parent component (EmployeeDashboardPage)
  const employeeShiftTransactions = useMemo(() => {
    return allTransactions.filter(
      (t) => t.employeeId === employeeId && t.entryTime >= todayStartTimestamp
    ).sort((a,b) => b.entryTime - a.entryTime);
  }, [allTransactions, employeeId, todayStartTimestamp]);

  const vehiclesEnteredToday = employeeShiftTransactions.length;
  const vehiclesExitedToday = employeeShiftTransactions.filter(t => t.exitTime && t.exitTime >= todayStartTimestamp).length;
  const totalIncomeGenerated = employeeShiftTransactions.reduce((sum, t) => sum + (t.totalFee || 0), 0);

  return (
    <div className="space-y-6">
      <Card title="Resumen de Mi Turno (Hoy)">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-primary-light rounded-lg text-center">
            <p className="text-sm text-primary-dark font-medium">Vehículos Ingresados</p>
            <p className="text-3xl font-bold text-primary-dark">{vehiclesEnteredToday}</p>
          </div>
          <div className="p-4 bg-emerald-100 rounded-lg text-center">
            <p className="text-sm text-emerald-700 font-medium">Vehículos Salidos</p>
            <p className="text-3xl font-bold text-emerald-700">{vehiclesExitedToday}</p>
          </div>
          <div className="p-4 bg-amber-100 rounded-lg text-center">
            <p className="text-sm text-amber-700 font-medium">Ingresos Generados</p>
            <p className="text-3xl font-bold text-amber-700">{formatCurrency(totalIncomeGenerated)}</p>
          </div>
        </div>
      </Card>

      <TransactionHistory 
        transactions={employeeShiftTransactions}
        title="Mis Transacciones de Hoy"
      />
    </div>
  );
};
