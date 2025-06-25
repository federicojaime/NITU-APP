
import React, { useState, useEffect } from 'react';
import { PricingSettings, VehicleType, RateSettings } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Alert } from './ui/Alert';
import { Card } from './ui/Card';

interface RateSettingsFormProps {
  initialSettings: PricingSettings;
  onSave: (settings: PricingSettings) => Promise<void>;
}

export const RateSettingsForm: React.FC<RateSettingsFormProps> = ({ initialSettings, onSave }) => {
  const [settings, setSettings] = useState<PricingSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleVipMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, vipMultiplier: parseFloat(e.target.value) || 0 });
  };

  const handleRateChange = (
    vehicleType: VehicleType,
    field: keyof RateSettings,
    value: string
  ) => {
    const numericValue = parseFloat(value) || 0;
    const updatedRates = { ...settings.rates };
    
    updatedRates[vehicleType] = {
      ...updatedRates[vehicleType],
      [field]: numericValue,
    };

    // Auto-calculate minutelyRate if firstHourMinFee changes
    if (field === 'firstHourMinFee') {
      updatedRates[vehicleType].minutelyRate = parseFloat((numericValue / 60).toFixed(2));
    }

    setSettings({ ...settings, rates: updatedRates });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await onSave(settings);
      setSuccessMessage('Tarifas actualizadas correctamente.');
    } catch (err: any) {
      setError(err.message || 'Error al guardar tarifas.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Configuración de Tarifas">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

        <Input
          label="Multiplicador VIP (ej: 1.5 para 50% más)"
          id="vipMultiplier"
          type="number"
          step="0.01"
          min="1"
          value={settings.vipMultiplier.toString()}
          onChange={handleVipMultiplierChange}
          required
        />

        {Object.values(VehicleType).map((vt) => (
          <div key={vt} className="p-4 border border-gray-200 rounded-lg">
            <h4 className="text-md font-semibold text-gray-700 mb-3">Tarifas para: {vt}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tarifa Mínima Primera Hora ($)"
                id={`${vt}-firstHourMinFee`}
                type="number"
                step="0.01"
                min="0"
                value={settings.rates[vt].firstHourMinFee.toString()}
                onChange={(e) => handleRateChange(vt, 'firstHourMinFee', e.target.value)}
                required
              />
              <Input
                label="Tarifa por Minuto (después de 1ra hora) ($)"
                id={`${vt}-minutelyRate`}
                type="number"
                step="0.01"
                min="0"
                value={settings.rates[vt].minutelyRate.toString()}
                onChange={(e) => handleRateChange(vt, 'minutelyRate', e.target.value)}
                required
                containerClassName="mb-0" // Input already has mb-4
              />
            </div>
             <p className="text-xs text-gray-500 mt-1">
                La tarifa por minuto se autocompleta al cambiar la tarifa mínima, pero puede ajustarla manualmente.
            </p>
          </div>
        ))}

        <Button type="submit" isLoading={isLoading} className="w-full">
          Guardar Tarifas
        </Button>
      </form>
    </Card>
  );
};
    