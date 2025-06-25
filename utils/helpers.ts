
import { Transaction, VehicleType } from '../types';

export const formatDate = (timestamp?: number | null, options?: Intl.DateTimeFormatOptions): string => {
  if (!timestamp) return 'N/A';
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...options
  };
  return new Date(timestamp).toLocaleString(undefined, defaultOptions);
};

export const formatCurrency = (amount?: number | null, currency: string = 'ARS'): string => { // Changed default to ARS
  if (amount === null || typeof amount === 'undefined') return 'N/A';
  // For ARS, toLocaleString with 'es-AR' often just gives '$'. 
  // We'll keep the replace logic in case the environment outputs 'ARS' string.
  return amount.toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


export const calculateParkingDuration = (entryTime: number, exitTime: number): { totalMinutes: number, hours: number, minutes: number } => {
  const diffMs = exitTime - entryTime;
  const totalMinutes = Math.max(0, Math.ceil(diffMs / (1000 * 60))); // Round up to nearest minute
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { totalMinutes, hours, minutes };
};


export const generateCsv = (data: Transaction[]): string => {
  if (!data.length) return '';

  const headers = [
    'ID Transacción', 'Patente', 'Tipo Vehículo', 'Espacio', 'Cliente',
    'Entrada', 'Salida', 'Duración (min)', 'Tarifa', 'VIP', 'Empleado ID'
  ];
  const rows = data.map(t => [
    t.id,
    t.vehiclePlate,
    t.vehicleType,
    t.spaceNumber,
    t.customerName || 'N/A',
    formatDate(t.entryTime),
    formatDate(t.exitTime),
    t.exitTime ? calculateParkingDuration(t.entryTime, t.exitTime).totalMinutes : 'N/A',
    // formatCurrency will now default to ARS. The .replace will attempt to remove 'ARS ' if present.
    t.totalFee ? formatCurrency(t.totalFee).replace(/\s*ARS\s*/, '').trim() : 'N/A', 
    t.isVipStay ? 'Sí' : 'No',
    t.employeeId
  ]);

  let csvContent = headers.join(',') + '\n';
  rows.forEach(rowArray => {
    let row = rowArray.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','); // Escape quotes
    csvContent += row + '\n';
  });

  return csvContent;
};

export const downloadCsv = (csvString: string, filename: string): void => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const vehicleTypeOptions = Object.values(VehicleType).map(vt => ({ value: vt, label: vt }));

// Simple slugify, good enough for IDs from names/numbers
export const slugify = (text: string): string => 
  text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')       // Remove all non-word chars
    .replace(/--+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text