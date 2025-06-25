
import React from 'react';
import { Transaction, VehicleType, ChartData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from './ui/Card';
import { formatCurrency } from '../utils/helpers';

interface AnalyticsChartsProps {
  transactions: Transaction[];
}

const COLORS = ['#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#6366f1']; // primary, accent, success, danger, indigo

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ transactions }) => {
  const dailyIncomeData = transactions
    .filter(t => t.exitTime && t.totalFee)
    .reduce((acc, t) => {
      const date = new Date(t.exitTime!).toLocaleDateString();
      acc[date] = (acc[date] || 0) + t.totalFee!;
      return acc;
    }, {} as Record<string, number>);

  const dailyIncomeChartData: ChartData[] = Object.entries(dailyIncomeData)
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()) // Sort by date
    .slice(-30); // Last 30 days

  const incomeByVehicleTypeData = transactions
    .filter(t => t.totalFee)
    .reduce((acc, t) => {
      acc[t.vehicleType] = (acc[t.vehicleType] || 0) + t.totalFee!;
      return acc;
    }, {} as Record<VehicleType, number>);

  const incomeByVehicleTypeChartData: ChartData[] = Object.entries(incomeByVehicleTypeData)
    .map(([name, value]) => ({ name: name as VehicleType, value }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
          <p className="label font-semibold">{`${label}`}</p>
          <p className="intro text-primary">{`Ingresos: ${formatCurrency(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };
  
  const PieCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0];
      const originalItem = dataPoint.payload; // This is the item from your incomeByVehicleTypeChartData

      if (dataPoint && originalItem) {
        let percentageString = '';
        if (typeof originalItem.percent === 'number') {
          percentageString = `(${(originalItem.percent * 100).toFixed(0)}%)`;
        } else if (typeof dataPoint.percent === 'number') { // Fallback if recharts puts percent directly on dataPoint
           percentageString = `(${(dataPoint.percent * 100).toFixed(0)}%)`;
        }
        
        return (
          <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
            <p className="label font-semibold">{`${dataPoint.name} : ${formatCurrency(dataPoint.value)} ${percentageString}`}</p>
          </div>
        );
      }
    }
    return null;
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Ingresos Diarios (Últimos 30 días)">
        {dailyIncomeChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyIncomeChartData} margin={{ top: 5, right: 0, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(value) => formatCurrency(value, 'ARS').replace(/\s*ARS\s*/,'').trim()} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }} />
              <Legend wrapperStyle={{fontSize: "12px"}}/>
              <Bar dataKey="value" fill="#06b6d4" name="Ingresos" barSize={20} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-10">No hay suficientes datos para mostrar el gráfico de ingresos diarios.</p>
        )}
      </Card>

      <Card title="Distribución de Ingresos por Tipo de Vehículo">
         {incomeByVehicleTypeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                data={incomeByVehicleTypeChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent, value }) => {
                  if (typeof percent === 'number') {
                    return `${name} ${(percent * 100).toFixed(0)}%`;
                  }
                  return name || (typeof value !== 'undefined' ? formatCurrency(value) : '');
                }}
                legendType="circle"
                >
                {incomeByVehicleTypeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
                <Tooltip content={<PieCustomTooltip />} />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
            </PieChart>
            </ResponsiveContainer>
         ) : (
            <p className="text-center text-gray-500 py-10">No hay suficientes datos para mostrar el gráfico de distribución de ingresos.</p>
         )}
      </Card>
    </div>
  );
};
