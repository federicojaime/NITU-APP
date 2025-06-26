
import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Alert } from './ui/Alert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { downloadCsv, formatDate, formatCurrency, calculateParkingDuration } from '../utils/helpers';
import * as firebaseService from '../services/databaseService';

interface BillingExportProps {
  parkingLotId: string;
}

export const BillingExport: React.FC<BillingExportProps> = ({ parkingLotId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [reportText, setReportText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilterRange, setCurrentFilterRange] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    const initialEndDate = today.toISOString().split('T')[0];
    const initialStartDate = lastWeek.toISOString().split('T')[0];
    
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [parkingLotId]);


  const handleFilterSubmit = async () => {
    setError(null);
    setReportText('');
    setFilteredTransactions([]);
    
    if (!startDate || !endDate) {
      setError('Por favor, seleccione un rango de fechas completo.');
      return;
    }

    const localStartDateString = `${startDate}T00:00:00`;
    const localEndDateString = `${endDate}T23:59:59.999`;

    const startTimestamp = new Date(localStartDateString).getTime();
    const endTimestamp = new Date(localEndDateString).getTime();

    if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        setError('Fechas inválidas seleccionadas. Por favor, verifique.');
        return;
    }
    
    if (startTimestamp > endTimestamp) {
        setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
        return;
    }

    setIsLoading(true);
    setCurrentFilterRange(null); 
    try {
      const fetchedTransactions = await firebaseService.getTransactions(parkingLotId, { 
        startDate: startTimestamp, 
        endDate: endTimestamp 
      });
      
      setFilteredTransactions(fetchedTransactions);
      setCurrentFilterRange(`Reporte para el período: ${formatDate(startTimestamp, {year: 'numeric', month: 'short', day:'numeric'})} - ${formatDate(endTimestamp, {year: 'numeric', month: 'short', day:'numeric'})}`);
      
      if (fetchedTransactions.length === 0) {
        setReportText("No se encontraron transacciones para el rango seleccionado.");
      } else {
        setReportText(""); 
      }
    } catch (err: any) {
      setError(err.message || 'Error al filtrar transacciones.');
      setFilteredTransactions([]);
      setReportText("");
      console.error("[BillingExport] Filtering error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = async () => {
    setStartDate('');
    setEndDate('');
    setFilteredTransactions([]);
    setReportText('');
    setError(null);
    setCurrentFilterRange(null);
    setIsLoading(true);
    try {
      const allParkingLotTransactions = await firebaseService.getTransactions(parkingLotId, {});
      setFilteredTransactions(allParkingLotTransactions);
      if(allParkingLotTransactions.length > 0) {
        setCurrentFilterRange(`Mostrando todas las ${allParkingLotTransactions.length} transacciones.`);
      } else {
         setCurrentFilterRange(`No hay transacciones registradas.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar todas las transacciones.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTextReport = () => {
    if (filteredTransactions.length === 0) {
      setReportText("No hay transacciones filtradas para generar el reporte.");
      return;
    }
    let text = `${currentFilterRange || `Reporte de Transacciones`}\n`;
    text += "======================================================================================================================\n";
    text += "ID Trans. | Patente   | Esp. | Entrada                | Salida                 | Dur.   | Tarifa Orig. | Desc. | Tarifa Final | Tipo     | VIP\n";
    text += "----------------------------------------------------------------------------------------------------------------------\n";
    
    let totalDurationMinutesSum = 0;
    let completedTransactionsCount = 0;

    filteredTransactions.forEach(t => {
      const duration = t.exitTime ? calculateParkingDuration(t.entryTime, t.exitTime) : null;
      if (duration) {
        totalDurationMinutesSum += duration.totalMinutes;
        completedTransactionsCount++;
      }
      text += `${t.id.substring(0,8).padEnd(10)}| ${(t.vehiclePlate || 'N/A').padEnd(9)} | ${(t.spaceNumber || 'N/A').padEnd(4)} | ${formatDate(t.entryTime).padEnd(22)} | ${formatDate(t.exitTime).padEnd(22)} | ${(duration ? `${duration.hours}h${duration.minutes}m` : 'N/A').padEnd(6)} | ${formatCurrency(t.originalFee).replace(/\s*ARS\s*/, '').trim().padEnd(12)} | ${(t.discountApplied || 0)+'%'.padEnd(5)} | ${formatCurrency(t.totalFee).replace(/\s*ARS\s*/, '').trim().padEnd(12)} | ${t.vehicleType.padEnd(8)} | ${(t.isVipStay ? 'Sí' : 'No')}\n`;
    });
    text += "======================================================================================================================\n";
    const totalIncome = filteredTransactions.reduce((sum, t) => sum + (t.totalFee || 0), 0);
    const averageDuration = completedTransactionsCount > 0 ? (totalDurationMinutesSum / completedTransactionsCount).toFixed(0) : 'N/A';
    
    text += `Total de Vehículos Registrados en el Periodo: ${filteredTransactions.length}\n`;
    text += `Ingresos Totales del Periodo (basado en salidas): ${formatCurrency(totalIncome)}\n`;
    text += `Duración Promedio de Estadía (vehículos salidos): ${averageDuration} minutos\n`;
    setReportText(text);
  };

  const exportToCsv = () => {
    if (filteredTransactions.length === 0) {
      setError("No hay transacciones filtradas para exportar.");
      return;
    }
    const csvHeaders = [
        'ID Transacción', 'Patente', 'Tipo Vehículo', 'Espacio', 'Cliente',
        'Entrada', 'Salida', 'Duración (min)', 'Tarifa Original', 'Descuento (%)', 'Tarifa Final', 'VIP', 'Empleado ID'
    ];
    const csvRows = filteredTransactions.map(t => [
        t.id,
        t.vehiclePlate,
        t.vehicleType,
        t.spaceNumber,
        t.customerName || 'N/A',
        formatDate(t.entryTime),
        formatDate(t.exitTime),
        t.exitTime ? calculateParkingDuration(t.entryTime, t.exitTime).totalMinutes : 'N/A',
        t.originalFee ? formatCurrency(t.originalFee).replace(/\s*ARS\s*/, '').trim() : (t.totalFee ? formatCurrency(t.totalFee).replace(/\s*ARS\s*/, '').trim() : 'N/A'),
        t.discountApplied || 0,
        t.totalFee ? formatCurrency(t.totalFee).replace(/\s*ARS\s*/, '').trim() : 'N/A',
        t.isVipStay ? 'Sí' : 'No',
        t.employeeId
    ]);

    let csvContent = csvHeaders.join(',') + '\n';
    csvRows.forEach(rowArray => {
        let row = rowArray.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',');
        csvContent += row + '\n';
    });


    const filenameStartDate = startDate ? startDate.replace(/-/g, '') : 'all';
    const filenameEndDate = endDate ? endDate.replace(/-/g, '') : 'all';
    downloadCsv(csvContent, `reporte_nitu_${parkingLotId.substring(0,5)}_${filenameStartDate}_a_${filenameEndDate}.csv`);
  };

  return (
    <Card title="Facturación y Reportes Manuales">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
        <Input
          label="Fecha de Inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          containerClassName="mb-0"
        />
        <Input
          label="Fecha de Fin"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          containerClassName="mb-0"
        />
        <Button onClick={handleFilterSubmit} isLoading={isLoading} className="w-full md:w-auto h-[42px]">
          Filtrar
        </Button>
        <Button onClick={handleClearFilters} variant="secondary" isLoading={isLoading} className="w-full md:w-auto h-[42px]">
          Limpiar Filtros / Ver Todos
        </Button>
      </div>

      {isLoading && <LoadingSpinner text="Cargando reporte..." />}

      {!isLoading && currentFilterRange && (
          <p className="text-sm text-gray-700 font-semibold mb-2">{currentFilterRange}</p>
      )}
      {!isLoading && filteredTransactions.length > 0 && (
          <p className="text-sm text-gray-600 mb-4">{filteredTransactions.length} transacciones encontradas.</p>
      )}
       {!isLoading && filteredTransactions.length === 0 && !reportText.includes("No se encontraron") && currentFilterRange && (
         <p className="text-sm text-gray-500 mb-4">No se encontraron transacciones para el rango especificado.</p>
      )}


      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
        <Button onClick={generateTextReport} variant="secondary" disabled={isLoading || filteredTransactions.length === 0} className="w-full sm:w-auto">
          Generar Reporte (Texto)
        </Button>
        <Button onClick={exportToCsv} variant="success" disabled={isLoading || filteredTransactions.length === 0} className="w-full sm:w-auto">
          Exportar a Excel (CSV)
        </Button>
      </div>

      {reportText && (
        <div>
          <h4 className="text-md font-semibold mb-2">Reporte Generado (listo para copiar):</h4>
          <textarea
            readOnly
            value={reportText}
            className="w-full h-64 p-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs whitespace-pre"
            aria-label="Reporte de texto generado"
          />
        </div>
      )}
    </Card>
  );
};