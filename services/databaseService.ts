// services/databaseService.ts
// Reemplaza completamente a firebaseService.ts

import {
  ParkingSpace, Transaction, PricingSettings, Employee, Customer, SpaceStatus,
  VehicleType, ParkingLot, AuthenticatedUser, UserRole,
  Advertisement, AdvertisementDisplayLocation, WaitingListEntry, WaitingListStatus,
  ParkingLotAvailability, ClientReservation
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_PRICING_SETTINGS } from '../constants';

// URL de tu API PHP
const API_BASE_URL = 'https://codeo.site/api-nitu/database.php';

// Helper para hacer requests a la API
async function apiRequest(endpoint: string, data?: any): Promise<any> {
  const url = endpoint ? `${API_BASE_URL}/${endpoint}` : API_BASE_URL;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data || {})
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return result;
}

// Helper para simular delay como Firebase
const simulateDelay = <T,>(data: T, duration: number = 300): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), duration));
};

// =============================================
// USER AUTHENTICATION
// =============================================

export const findUserByCredentials = async (
  loginIdentifier: string, 
  pass: string
): Promise<{ user: AuthenticatedUser; parkingLotId?: string } | null> => {
  try {
    const result = await apiRequest('login', {
      username: loginIdentifier,
      password: pass
    });
    
    if (result.success) {
      return simulateDelay({
        user: result.user,
        parkingLotId: result.parkingLotId
      });
    }
    
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

// =============================================
// PARKING LOTS MANAGEMENT
// =============================================

export const getParkingLots = async (): Promise<Array<ParkingLot & { ownerPassword?: string; ownerStatus?: 'Active' | 'Suspended' }>> => {
  const result = await apiRequest('parking-lots');
  return simulateDelay(result);
};

export const addParkingLot = async (name: string, ownerUsernameSeed: string, address?: string): Promise<ParkingLot> => {
  const parkingLotId = `lot_${ownerUsernameSeed}_${Date.now()}`;
  const ownerUsername = `owner_${ownerUsernameSeed}`;
  const ownerId = `user_${uuidv4()}`;

  // Crear estacionamiento
  await apiRequest('query', {
    sql: 'INSERT INTO parking_lots (id, name, address, owner_username) VALUES (?, ?, ?, ?)',
    params: [parkingLotId, name, address || `Dirección de ${name}`, ownerUsername]
  });

  // Crear usuario dueño
  await apiRequest('query', {
    sql: `INSERT INTO global_users (id, username, email, password_hash, role, name, assigned_parking_lot_id, status) 
          VALUES (?, ?, ?, ?, 'owner', ?, ?, 'active')`,
    params: [ownerId, ownerUsername, `${ownerUsername}@nitu.com`, 'password', `Owner of ${name}`, parkingLotId]
  });

  // Crear empleado inicial
  const employeeId = `emp_${parkingLotId}_001`;
  await apiRequest('query', {
    sql: 'INSERT INTO employees (id, parking_lot_id, username, name, password_hash) VALUES (?, ?, ?, ?, ?)',
    params: [employeeId, parkingLotId, 'employee', 'Default Employee', 'password']
  });

  // Crear configuración de precios
  const pricingId = `pricing_${parkingLotId}`;
  await apiRequest('query', {
    sql: 'INSERT INTO pricing_settings (id, parking_lot_id, vip_multiplier) VALUES (?, ?, 1.50)',
    params: [pricingId, parkingLotId]
  });

  // Crear tarifas por vehículo
  const vehicleRates = [
    ['auto', 0.50, 30.00],
    ['camioneta', 0.70, 42.00],
    ['moto', 0.30, 18.00]
  ];

  for (const [type, minutely, hourly] of vehicleRates) {
    await apiRequest('query', {
      sql: 'INSERT INTO vehicle_rates (id, pricing_settings_id, vehicle_type, minutely_rate, first_hour_min_fee) VALUES (?, ?, ?, ?, ?)',
      params: [`rate_${type}_${pricingId}`, pricingId, type, minutely, hourly]
    });
  }

  // Crear espacios iniciales (20 espacios, 5 VIP)
  for (let i = 1; i <= 20; i++) {
    await apiRequest('query', {
      sql: 'INSERT INTO parking_spaces (id, parking_lot_id, number, is_vip, status) VALUES (?, ?, ?, ?, ?)',
      params: [`space_${parkingLotId}_${i}`, parkingLotId, i.toString(), i <= 5, 'free']
    });
  }

  return simulateDelay({
    id: parkingLotId,
    name,
    address: address || `Dirección de ${name}`,
    ownerUsername,
    createdAt: Date.now()
  });
};

// =============================================
// PARKING SPACES
// =============================================

export const getParkingSpaces = async (parkingLotId: string): Promise<ParkingSpace[]> => {
  const result = await apiRequest('parking-spaces', { parkingLotId });
  return simulateDelay(result);
};

export const updateParkingSpace = async (parkingLotId: string, spaceId: string, updates: Partial<ParkingSpace>): Promise<ParkingSpace> => {
  const setClause = [];
  const values = [];
  
  if (updates.status !== undefined) {
    setClause.push('status = ?');
    values.push(updates.status);
  }
  if (updates.vehiclePlate !== undefined) {
    setClause.push('vehicle_plate = ?');
    values.push(updates.vehiclePlate);
  }
  if (updates.entryTime !== undefined) {
    setClause.push('entry_time = ?');
    values.push(updates.entryTime ? new Date(updates.entryTime).toISOString().slice(0, 19).replace('T', ' ') : null);
  }
  if (updates.currentTransactionId !== undefined) {
    setClause.push('current_transaction_id = ?');
    values.push(updates.currentTransactionId);
  }
  if (updates.isReserved !== undefined) {
    setClause.push('is_reserved = ?');
    values.push(updates.isReserved ? 1 : 0);
  }
  if (updates.reservedUntil !== undefined) {
    setClause.push('reserved_until = ?');
    values.push(updates.reservedUntil ? new Date(updates.reservedUntil).toISOString().slice(0, 19).replace('T', ' ') : null);
  }
  if (updates.reservedForPlateOrUserId !== undefined) {
    setClause.push('reserved_for_plate_or_user_id = ?');
    values.push(updates.reservedForPlateOrUserId);
  }
  if (updates.reservedVehiclePlate !== undefined) {
    setClause.push('reserved_vehicle_plate = ?');
    values.push(updates.reservedVehiclePlate);
  }
  if (updates.maintenanceNotes !== undefined) {
    setClause.push('maintenance_notes = ?');
    values.push(updates.maintenanceNotes);
  }
  if (updates.clientReservationStatus !== undefined) {
    setClause.push('client_reservation_status = ?');
    values.push(updates.clientReservationStatus);
  }
  
  values.push(spaceId);
  
  const sql = `UPDATE parking_spaces SET ${setClause.join(', ')} WHERE id = ?`;
  await apiRequest('query', { sql, params: values });
  
  // Obtener el espacio actualizado
  const spaces = await getParkingSpaces(parkingLotId);
  const updatedSpace = spaces.find(s => s.id === spaceId);
  
  return simulateDelay(updatedSpace!);
};

// =============================================
// TRANSACTIONS
// =============================================

export const addTransaction = async (
  parkingLotId: string,
  transactionData: Omit<Transaction, 'id' | 'entryTime' | 'isVipStay' | 'originalFee' | 'discountApplied' | 'totalFee'>
                  & { spaceIsVip: boolean; }
): Promise<Transaction> => {
  const transactionId = uuidv4();
  const entryTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  await apiRequest('query', {
    sql: `INSERT INTO transactions 
          (id, parking_lot_id, vehicle_plate, vehicle_type, space_id, space_number, 
           entry_time, employee_id, customer_id, customer_name, is_vip_stay)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      transactionId, parkingLotId, transactionData.vehiclePlate, transactionData.vehicleType,
      transactionData.spaceId, transactionData.spaceNumber, entryTime, transactionData.employeeId,
      transactionData.customerId, transactionData.customerName, transactionData.spaceIsVip ? 1 : 0
    ]
  });
  
  return simulateDelay({
    id: transactionId,
    vehiclePlate: transactionData.vehiclePlate,
    vehicleType: transactionData.vehicleType,
    spaceId: transactionData.spaceId,
    spaceNumber: transactionData.spaceNumber,
    entryTime: new Date(entryTime).getTime(),
    employeeId: transactionData.employeeId,
    customerId: transactionData.customerId,
    customerName: transactionData.customerName,
    isVipStay: transactionData.spaceIsVip,
    originalFee: null,
    discountApplied: null,
    totalFee: null
  });
};

export const updateTransaction = async (parkingLotId: string, transactionId: string, updates: Partial<Transaction>): Promise<Transaction> => {
  const setClause = [];
  const values = [];
  
  if (updates.exitTime !== undefined) {
    setClause.push('exit_time = ?');
    values.push(updates.exitTime ? new Date(updates.exitTime).toISOString().slice(0, 19).replace('T', ' ') : null);
  }
  if (updates.originalFee !== undefined) {
    setClause.push('original_fee = ?');
    values.push(updates.originalFee);
  }
  if (updates.discountApplied !== undefined) {
    setClause.push('discount_applied = ?');
    values.push(updates.discountApplied);
  }
  if (updates.totalFee !== undefined) {
    setClause.push('total_fee = ?');
    values.push(updates.totalFee);
  }
  
  values.push(transactionId);
  
  const sql = `UPDATE transactions SET ${setClause.join(', ')} WHERE id = ?`;
  await apiRequest('query', { sql, params: values });
  
  // Obtener la transacción actualizada
  const result = await apiRequest('query', {
    sql: 'SELECT * FROM transactions WHERE id = ?',
    params: [transactionId]
  });
  
  if (result.length > 0) {
    const row = result[0];
    return simulateDelay({
      id: row.id,
      vehiclePlate: row.vehicle_plate,
      vehicleType: row.vehicle_type,
      spaceId: row.space_id,
      spaceNumber: row.space_number,
      entryTime: new Date(row.entry_time).getTime(),
      exitTime: row.exit_time ? new Date(row.exit_time).getTime() : null,
      originalFee: row.original_fee,
      discountApplied: row.discount_applied,
      totalFee: row.total_fee,
      employeeId: row.employee_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      isVipStay: Boolean(row.is_vip_stay)
    });
  }
  
  throw new Error('Transaction not found after update');
};

export const getTransactions = async (parkingLotId: string, filters?: { startDate?: number, endDate?: number, employeeId?: string }): Promise<Transaction[]> => {
  const result = await apiRequest('transactions', { 
    parkingLotId, 
    ...filters 
  });
  return simulateDelay(result);
};

export const getActiveTransactions = async (parkingLotId: string): Promise<Transaction[]> => {
  const result = await apiRequest('query', {
    sql: 'SELECT * FROM transactions WHERE parking_lot_id = ? AND exit_time IS NULL ORDER BY entry_time DESC',
    params: [parkingLotId]
  });
  
  return simulateDelay(result.map((row: any) => ({
    id: row.id,
    vehiclePlate: row.vehicle_plate,
    vehicleType: row.vehicle_type,
    spaceId: row.space_id,
    spaceNumber: row.space_number,
    entryTime: new Date(row.entry_time).getTime(),
    exitTime: row.exit_time ? new Date(row.exit_time).getTime() : null,
    originalFee: row.original_fee,
    discountApplied: row.discount_applied,
    totalFee: row.total_fee,
    employeeId: row.employee_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    isVipStay: Boolean(row.is_vip_stay)
  })));
};

// =============================================
// PRICING SETTINGS
// =============================================

export const getPricingSettings = async (parkingLotId: string): Promise<PricingSettings> => {
  try {
    const result = await apiRequest('query', {
      sql: `SELECT ps.*, vr.vehicle_type, vr.minutely_rate, vr.first_hour_min_fee
            FROM pricing_settings ps
            LEFT JOIN vehicle_rates vr ON ps.id = vr.pricing_settings_id
            WHERE ps.parking_lot_id = ?`,
      params: [parkingLotId]
    });
    
    if (result.length === 0) {
      return simulateDelay(DEFAULT_PRICING_SETTINGS);
    }
    
    const pricing = {
      vipMultiplier: result[0].vip_multiplier || 1.5,
      rates: {} as any
    };
    
    result.forEach((row: any) => {
      if (row.vehicle_type) {
        pricing.rates[row.vehicle_type] = {
          minutelyRate: row.minutely_rate,
          firstHourMinFee: row.first_hour_min_fee
        };
      }
    });
    
    // Llenar con valores por defecto si faltan
    Object.values(VehicleType).forEach(vehicleType => {
      if (!pricing.rates[vehicleType]) {
        pricing.rates[vehicleType] = DEFAULT_PRICING_SETTINGS.rates[vehicleType];
      }
    });
    
    return simulateDelay(pricing);
  } catch (error) {
    console.error('Error getting pricing settings:', error);
    return simulateDelay(DEFAULT_PRICING_SETTINGS);
  }
};

export const updatePricingSettings = async (parkingLotId: string, settings: PricingSettings): Promise<PricingSettings> => {
  // Actualizar configuración general
  await apiRequest('query', {
    sql: 'UPDATE pricing_settings SET vip_multiplier = ? WHERE parking_lot_id = ?',
    params: [settings.vipMultiplier, parkingLotId]
  });
  
  // Actualizar tarifas por vehículo
  for (const [vehicleType, rates] of Object.entries(settings.rates)) {
    await apiRequest('query', {
      sql: `UPDATE vehicle_rates vr 
            JOIN pricing_settings ps ON vr.pricing_settings_id = ps.id 
            SET vr.minutely_rate = ?, vr.first_hour_min_fee = ? 
            WHERE ps.parking_lot_id = ? AND vr.vehicle_type = ?`,
      params: [rates.minutelyRate, rates.firstHourMinFee, parkingLotId, vehicleType]
    });
  }
  
  return simulateDelay(settings);
};

// =============================================
// STUBS PARA IMPLEMENTAR DESPUÉS
// =============================================

export const getEmployees = async (parkingLotId: string): Promise<Employee[]> => {
  // TODO: Implementar
  return simulateDelay([]);
};

export const addEmployee = async (parkingLotId: string, employeeData: any): Promise<Employee> => {
  throw new Error('addEmployee - Por implementar');
};

export const updateEmployee = async (parkingLotId: string, employeeId: string, updates: any): Promise<Employee> => {
  throw new Error('updateEmployee - Por implementar');
};

export const getCustomers = async (parkingLotId: string): Promise<Customer[]> => {
  return simulateDelay([]);
};

export const addCustomer = async (parkingLotId: string, customerData: any): Promise<Customer> => {
  throw new Error('addCustomer - Por implementar');
};

export const findCustomerByPlate = async (parkingLotId: string, plate: string): Promise<Customer | null> => {
  return simulateDelay(null);
};

export const getAdvertisements = async (filters?: any): Promise<Advertisement[]> => {
  return simulateDelay([]);
};

// Exportar funciones que aún no se implementan como stubs
export const updateOwnerStatus = async (): Promise<boolean> => { throw new Error('Por implementar'); };
export const registerClientUser = async (): Promise<AuthenticatedUser> => { throw new Error('Por implementar'); };
export const addClientVehicle = async (): Promise<AuthenticatedUser | null> => { throw new Error('Por implementar'); };
export const removeClientVehicle = async (): Promise<AuthenticatedUser | null> => { throw new Error('Por implementar'); };
export const setClientPrimaryVehicle = async (): Promise<AuthenticatedUser | null> => { throw new Error('Por implementar'); };
export const configureParkingSpaces = async (): Promise<ParkingSpace[]> => { throw new Error('Por implementar'); };
export const setSpaceReservation = async (): Promise<ParkingSpace> => { throw new Error('Por implementar'); };
export const setSpaceMaintenanceStatus = async (): Promise<ParkingSpace> => { throw new Error('Por implementar'); };
export const getAllTransactionsForSystem = async (): Promise<Transaction[]> => { throw new Error('Por implementar'); };
export const addAdvertisement = async (): Promise<Advertisement> => { throw new Error('Por implementar'); };
export const updateAdvertisement = async (): Promise<Advertisement> => { throw new Error('Por implementar'); };
export const deleteAdvertisement = async (): Promise<void> => { throw new Error('Por implementar'); };
export const getWaitingList = async (): Promise<WaitingListEntry[]> => { throw new Error('Por implementar'); };
export const addToWaitingList = async (): Promise<WaitingListEntry> => { throw new Error('Por implementar'); };
export const updateWaitingListEntry = async (): Promise<WaitingListEntry> => { throw new Error('Por implementar'); };
export const deleteWaitingListEntry = async (): Promise<void> => { throw new Error('Por implementar'); };
export const getParkingLotAvailability = async (): Promise<ParkingLotAvailability> => { throw new Error('Por implementar'); };
export const createClientReservation = async (): Promise<ParkingSpace> => { throw new Error('Por implementar'); };
export const getClientActiveReservations = async (): Promise<ClientReservation[]> => { throw new Error('Por implementar'); };
export const cancelClientReservation = async (): Promise<ParkingSpace> => { throw new Error('Por implementar'); };
export const getPendingClientReservationsForLot = async (): Promise<ParkingSpace[]> => { throw new Error('Por implementar'); };
export const acceptClientReservation = async (): Promise<ParkingSpace> => { throw new Error('Por implementar'); };
export const rejectClientReservation = async (): Promise<ParkingSpace> => { throw new Error('Por implementar'); };
export const updateParkingLotDetails = async (): Promise<ParkingLot> => { throw new Error('Por implementar'); };