
import React, { useState, useEffect, useCallback } from 'react';
import { ParkingSpace, VehicleType, SpaceStatus, Transaction, PricingSettings } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Alert } from './ui/Alert';
import { Modal } from './ui/Modal';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Card } from './ui/Card';
import { getActiveTransactions } from '../services/firebaseService'; // Mocked
import { formatDate, formatCurrency, calculateParkingDuration } from '../utils/helpers';
import { MOCK_DISCOUNT_CODES } from '../constants'; // Import discount codes

interface VehicleExitFormProps {
  spaces: ParkingSpace[]; 
  pricingSettings: PricingSettings | null;
  onVehicleExited: (transaction: Transaction, space: ParkingSpace, fee: number, originalFee: number, discountApplied: number) => Promise<void>;
  selectedSpace?: ParkingSpace | null;
  employeeId: string;
  parkingLotId: string; 
}

interface ConfirmationDetails {
  plate: string;
  spaceNumber: string;
  entryTime: number;
  exitTime: number;
  duration: { hours: number; minutes: number; totalMinutes: number };
  originalFee: number;
  discountApplied: number; // Percentage
  finalFee: number;
  vehicleType: VehicleType;
  isVip: boolean;
  appliedDiscountCode?: string;
}

export const VehicleExitForm: React.FC<VehicleExitFormProps> = ({
  spaces,
  pricingSettings,
  onVehicleExited,
  selectedSpace,
  employeeId,
  parkingLotId,
}) => {
  const [searchPlate, setSearchPlate] = useState('');
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | undefined>(undefined);
  const [discountCodeError, setDiscountCodeError] = useState<string | null>(null);
  const [isDiscountPercentLocked, setIsDiscountPercentLocked] = useState(false);

  const [foundTransaction, setFoundTransaction] = useState<Transaction | null>(null);
  const [foundSpace, setFoundSpace] = useState<ParkingSpace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState<ConfirmationDetails | null>(null);
  const [activeTransactions, setActiveTransactions] = useState<Transaction[]>([]);
  const [plateSuggestions, setPlateSuggestions] = useState<Transaction[]>([]);

  const fetchActive = useCallback(async () => {
    if (!parkingLotId) return;
    try {
        const active = await getActiveTransactions(parkingLotId);
        setActiveTransactions(active);
    } catch (err: any) {
        setError(`Error cargando transacciones activas: ${err.message}`);
        setActiveTransactions([]);
    }
  }, [parkingLotId]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const prefillFromSelectedSpace = useCallback((space: ParkingSpace | null) => {
    if (space && space.status === SpaceStatus.OCCUPIED && space.vehiclePlate && space.currentTransactionId) {
      const transaction = activeTransactions.find(t => t.id === space.currentTransactionId);
      if (transaction) {
        setSearchPlate(space.vehiclePlate);
        setFoundTransaction(transaction);
        setFoundSpace(space);
        setError(null);
        resetDiscountFields();
      } else {
        console.warn(`Transaction ${space.currentTransactionId} not in local active list for space ${space.number}. List might be stale.`);
      }
    }
  }, [activeTransactions]);

  useEffect(() => {
    prefillFromSelectedSpace(selectedSpace);
  }, [selectedSpace, prefillFromSelectedSpace]);

  const resetDiscountFields = () => {
    setDiscountCodeInput('');
    setDiscountPercent('0');
    setIsDiscountPercentLocked(false);
    setDiscountCodeError(null);
    setAppliedDiscountCode(undefined);
  };

  const handleSearchPlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const plate = e.target.value.toUpperCase();
    setSearchPlate(plate);
    setFoundTransaction(null);
    setFoundSpace(null);
    setError(null);
    resetDiscountFields();

    if (plate.length >= 2) {
      setPlateSuggestions(activeTransactions.filter(t => t.vehiclePlate.toUpperCase().includes(plate)));
    } else {
      setPlateSuggestions([]);
    }
  };

  const selectSuggestedTransaction = (transaction: Transaction) => {
    setSearchPlate(transaction.vehiclePlate);
    setFoundTransaction(transaction);
    const space = spaces.find(s => s.id === transaction.spaceId);
    setFoundSpace(space || null);
    setPlateSuggestions([]);
    setError(null);
    resetDiscountFields();
  };

  const handleDiscountCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setDiscountCodeInput(code);
    setDiscountCodeError(null);

    if (code.trim() === '') {
      setIsDiscountPercentLocked(false);
      setDiscountPercent('0'); // Reset manual discount if code is cleared
      setAppliedDiscountCode(undefined);
      return;
    }

    const discountValue = MOCK_DISCOUNT_CODES[code];
    if (discountValue !== undefined) {
      setDiscountPercent(discountValue.toString());
      setIsDiscountPercentLocked(true);
      setAppliedDiscountCode(code);
    } else {
      setIsDiscountPercentLocked(false);
      // Don't reset discountPercent here, allow manual input if code is invalid
      setDiscountCodeError('Código de descuento inválido.');
      setAppliedDiscountCode(undefined);
    }
  };

  const handleSearch = async () => {
    setError(null);
    setSuccessMessage(null);
    resetDiscountFields();
    if (!searchPlate.trim()) {
      setError('Ingrese una patente para buscar.');
      return;
    }
    setIsLoading(true);
    if(parkingLotId) await fetchActive(); 

    const transaction = activeTransactions.find(t => t.vehiclePlate.toUpperCase() === searchPlate.toUpperCase());
    
    if (transaction) {
      const space = spaces.find(s => s.id === transaction.spaceId);
      setFoundTransaction(transaction);
      setFoundSpace(space || null);
      if (!space) setError('Espacio asociado a la transacción no encontrado. Contacte al administrador.');
    } else {
      setError(`Vehículo con patente ${searchPlate} no encontrado entre los actualmente estacionados.`);
      setFoundTransaction(null);
      setFoundSpace(null);
    }
    setIsLoading(false);
  };
  
  const calculateFeeDetails = (): { originalFee: number; finalFee: number; discountApplied: number, appliedCode?: string } | null => {
    if (!foundTransaction || !foundSpace || !pricingSettings) {
        setError('Faltan datos para calcular tarifa (transacción, espacio o configuración de precios).');
        return null;
    }

    const exitTime = Date.now();
    const { totalMinutes } = calculateParkingDuration(foundTransaction.entryTime, exitTime);
    
    const rateConfig = pricingSettings.rates[foundTransaction.vehicleType];
    if (!rateConfig) {
        setError(`Configuración de tarifa no encontrada para ${foundTransaction.vehicleType}.`);
        return null;
    }

    let calculatedOriginalFee: number;
    if (totalMinutes <= 60) {
      calculatedOriginalFee = rateConfig.firstHourMinFee;
    } else {
      calculatedOriginalFee = totalMinutes * rateConfig.minutelyRate;
    }

    if (foundSpace.isVip) {
      calculatedOriginalFee *= pricingSettings.vipMultiplier;
    }
    
    calculatedOriginalFee = Math.max(0, Math.round(calculatedOriginalFee * 100) / 100);

    let finalDiscountPercent = parseFloat(discountPercent) || 0;
    if (appliedDiscountCode && MOCK_DISCOUNT_CODES[appliedDiscountCode] !== undefined) {
        finalDiscountPercent = MOCK_DISCOUNT_CODES[appliedDiscountCode];
    }

    if (finalDiscountPercent < 0 || finalDiscountPercent > 100) {
        setError("El porcentaje de descuento debe estar entre 0 y 100.");
        return null;
    }
    
    const discountAmount = calculatedOriginalFee * (finalDiscountPercent / 100);
    const calculatedFinalFee = Math.max(0, Math.round((calculatedOriginalFee - discountAmount) * 100) / 100);
    
    return { 
        originalFee: calculatedOriginalFee, 
        finalFee: calculatedFinalFee, 
        discountApplied: finalDiscountPercent,
        appliedCode: appliedDiscountCode
    };
  };


  const handleProcessExit = () => {
    setError(null); 
    if (!foundTransaction || !foundSpace || !pricingSettings) {
      setError('Faltan datos para procesar la salida. Verifique que el vehículo fue encontrado y las tarifas están cargadas.');
      return;
    }
    const feeDetails = calculateFeeDetails(); 
    if (!feeDetails) {
        // error state would have been set by calculateFeeDetails
        return;
    }

    const exitTime = Date.now();
    const duration = calculateParkingDuration(foundTransaction.entryTime, exitTime);

    setConfirmationDetails({
      plate: foundTransaction.vehiclePlate,
      spaceNumber: foundSpace.number,
      entryTime: foundTransaction.entryTime,
      exitTime: exitTime,
      duration: duration,
      originalFee: feeDetails.originalFee,
      discountApplied: feeDetails.discountApplied,
      finalFee: feeDetails.finalFee,
      vehicleType: foundTransaction.vehicleType,
      isVip: foundSpace.isVip,
      appliedDiscountCode: feeDetails.appliedCode
    });
    setIsModalOpen(true);
  };

  const confirmExit = async () => {
    if (!foundTransaction || !foundSpace || !confirmationDetails) {
        setError("Error de confirmación: Datos de transacción o espacio no disponibles.");
        setIsModalOpen(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await onVehicleExited(
        foundTransaction, 
        foundSpace, 
        confirmationDetails.finalFee,
        confirmationDetails.originalFee,
        confirmationDetails.discountApplied
      );
      let successMsg = `Salida de ${foundTransaction.vehiclePlate} registrada. Tarifa: ${formatCurrency(confirmationDetails.finalFee)}.`;
      if (confirmationDetails.appliedDiscountCode) {
        successMsg += ` (Código ${confirmationDetails.appliedDiscountCode} aplicado: ${confirmationDetails.discountApplied}% desc.)`;
      } else if (confirmationDetails.discountApplied > 0) {
        successMsg += ` (${confirmationDetails.discountApplied}% desc. manual)`;
      }
      setSuccessMessage(successMsg);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error al registrar salida.');
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
      setConfirmationDetails(null);
    }
  };

  const resetForm = () => {
    setSearchPlate('');
    resetDiscountFields();
    setFoundTransaction(null);
    setFoundSpace(null);
    setError(null);
    setPlateSuggestions([]);
  };

  return (
    <Card title="Registrar Salida de Vehículo" className="max-w-lg mx-auto">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

      <div className="flex items-end gap-2 mb-2">
        <div className="flex-grow relative">
            <Input
            label="Buscar por Patente"
            id="searchPlate"
            value={searchPlate}
            onChange={handleSearchPlateChange}
            placeholder="Ej: AA123BB"
            containerClassName="mb-0"
            />
            {plateSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                {plateSuggestions.map(trans => (
                <li 
                    key={trans.id} 
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => selectSuggestedTransaction(trans)}
                >
                    {trans.vehiclePlate} (Esp: {trans.spaceNumber}, Cliente: {trans.customerName || 'N/A'})
                </li>
                ))}
            </ul>
            )}
        </div>
        <Button type="button" onClick={handleSearch} isLoading={isLoading && !foundTransaction} className="h-[42px]" disabled={!parkingLotId}>
          Buscar
        </Button>
      </div>
      {selectedSpace && selectedSpace.status === SpaceStatus.OCCUPIED && (
          <p className="text-sm text-gray-600 mb-4">
              Vehículo en espacio seleccionado por click: <span className="font-semibold">{selectedSpace.vehiclePlate}</span> (Espacio <span className="font-semibold">#{selectedSpace.number}</span>)
          </p>
      )}

      {isLoading && !foundTransaction && <LoadingSpinner size="sm" text="Buscando..." />}

      {foundTransaction && foundSpace && pricingSettings && (
        <div className="mt-6 p-4 border border-primary-light rounded-lg bg-primary-light bg-opacity-10">
          <h4 className="text-lg font-semibold text-primary-dark mb-2">Detalles del Vehículo:</h4>
          <p><strong>Patente:</strong> {foundTransaction.vehiclePlate}</p>
          <p><strong>Espacio:</strong> {foundSpace.number} {foundSpace.isVip ? '(VIP)' : ''}</p>
          <p><strong>Tipo:</strong> {foundTransaction.vehicleType}</p>
          <p><strong>Entrada:</strong> {formatDate(foundTransaction.entryTime)}</p>
          {foundTransaction.customerName && <p><strong>Cliente:</strong> {foundTransaction.customerName}</p>}
          
          <Input
            label="Código de Descuento (Opcional)"
            id="discountCode"
            type="text"
            value={discountCodeInput}
            onChange={handleDiscountCodeChange}
            placeholder="Ej: NITU10"
            containerClassName="mt-4"
            error={discountCodeError || undefined}
          />
          
          <Input
            label="Porcentaje de Descuento Manual (%)"
            id="discountPercent"
            type="number"
            min="0"
            max="100"
            step="1"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            containerClassName="mt-1"
            disabled={isDiscountPercentLocked}
            readOnly={isDiscountPercentLocked}
          />
          {isDiscountPercentLocked && appliedDiscountCode && (
            <p className="text-xs text-emerald-600 -mt-3 mb-2">
                Código <span className="font-semibold">{appliedDiscountCode}</span> aplicado: {MOCK_DISCOUNT_CODES[appliedDiscountCode]}% de descuento.
            </p>
          )}


          <Button onClick={handleProcessExit} isLoading={isLoading} className="w-full mt-4">
            Procesar Salida y Calcular Tarifa
          </Button>
        </div>
      )}
      {!pricingSettings && <Alert type="warning" message="Configuración de tarifas no cargada o inválida. No se puede calcular el costo." />}

      {isModalOpen && confirmationDetails && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Confirmar Salida y Cobro">
          <div className="space-y-3">
            <p><strong>Patente:</strong> {confirmationDetails.plate}</p>
            <p><strong>Espacio:</strong> {confirmationDetails.spaceNumber} {confirmationDetails.isVip ? <span className="text-amber-600 font-semibold">(VIP)</span> : ''}</p>
            <p><strong>Tipo Vehículo:</strong> {confirmationDetails.vehicleType}</p>
            <p><strong>Entrada:</strong> {formatDate(confirmationDetails.entryTime)}</p>
            <p><strong>Salida:</strong> {formatDate(confirmationDetails.exitTime)}</p>
            <p><strong>Duración:</strong> {confirmationDetails.duration.hours}h {confirmationDetails.duration.minutes}m ({confirmationDetails.duration.totalMinutes} min total)</p>
            <hr/>
            <p><strong>Tarifa Original:</strong> {formatCurrency(confirmationDetails.originalFee)}</p>
            {confirmationDetails.appliedDiscountCode && (
                 <p className="text-emerald-600"><strong>Código Descuento:</strong> {confirmationDetails.appliedDiscountCode} ({confirmationDetails.discountApplied}%)</p>
            )}
            {confirmationDetails.discountApplied > 0 && !confirmationDetails.appliedDiscountCode && (
                <p><strong>Descuento Manual Aplicado:</strong> {confirmationDetails.discountApplied}%</p>
            )}
             {confirmationDetails.discountApplied > 0 && (
                <p><strong>Monto Descontado:</strong> {formatCurrency(confirmationDetails.originalFee - confirmationDetails.finalFee)}</p>
            )}
            <p className="text-2xl font-bold text-primary">Total a Cobrar: {formatCurrency(confirmationDetails.finalFee)}</p>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={confirmExit} isLoading={isLoading}>Confirmar y Registrar Salida</Button>
          </div>
        </Modal>
      )}
    </Card>
  );
};