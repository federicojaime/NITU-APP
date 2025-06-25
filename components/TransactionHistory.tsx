
import React from 'react';
import { Transaction } from '../types';
import { formatDate, formatCurrency, calculateParkingDuration } from '../utils/helpers';
import { Card } from './ui/Card';

interface TransactionHistoryProps {
  transactions: Transaction[];
  title?: string;
  maxRows?: number;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, title = "Historial de Movimientos", maxRows }) => {
  const displayedTransactions = maxRows ? transactions.slice(0, maxRows) : transactions;

  return (
    <Card title={title}>
      {transactions.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No hay transacciones registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Espacio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salida</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarifa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIP</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedTransactions.map((t) => {
                const duration = t.exitTime ? calculateParkingDuration(t.entryTime, t.exitTime) : null;
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{t.vehiclePlate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{t.spaceNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(t.entryTime)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(t.exitTime)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {duration ? `${duration.hours}h ${duration.minutes}m` : 'Estacionado'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-semibold">{formatCurrency(t.totalFee)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{t.vehicleType}</td>
                     <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{t.isVipStay ? 'Sí' : 'No'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
    