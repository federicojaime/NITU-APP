
// MOCK Firebase Service - Refactored for Multi-Tenancy
import {
  ParkingSpace, Transaction, PricingSettings, Employee, Customer, SpaceStatus,
  VehicleType, ParkingLot, AuthenticatedUser, UserRole,
  Advertisement, AdvertisementDisplayLocation, WaitingListEntry, WaitingListStatus,
  ParkingLotAvailability, ClientReservation
} from '../types';
import {
  DEFAULT_PRICING_SETTINGS, INITIAL_PARKING_SPACES_COUNT, INITIAL_VIP_SPACES_COUNT,
  DEFAULT_SUPER_ADMIN_CREDENTIALS, NEW_LOT_INITIAL_EMPLOYEE_USERNAME,
  NEW_LOT_INITIAL_EMPLOYEE_PASSWORD, NEW_LOT_INITIAL_EMPLOYEE_NAME,
  ADVERTISEMENT_STORAGE_PATH
} from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { slugify, calculateParkingDuration } from '../utils/helpers';

interface MockParkingLotSpecificData {
  parkingSpaces: ParkingSpace[];
  transactions: Transaction[];
  pricingSettings: PricingSettings;
  employees: Employee[];
  customers: Customer[]; // These are specific customer records for a lot, not user accounts
  waitingList: WaitingListEntry[];
}

// Represents any user stored in the global system (SuperAdmin, Owner, Client)
interface GlobalUserRecord extends AuthenticatedUser {
    password?: string; // Kept for mock, real backend would hash
    // username is their login identifier. For clients, this will be their email.
    // email field from AuthenticatedUser can store the email explicitly.
    // name is their display name.
    assignedParkingLotId?: string; // Relevant for Owner
    status?: 'Active' | 'Suspended'; // Relevant for Owner
    // clientVehiclePlates is inherited from AuthenticatedUser
}

interface MockSystemData {
  parkingLots: ParkingLot[];
  globalUsers: GlobalUserRecord[]; // Stores SuperAdmins, Owners, and now Clients
  dataByParkingLotId: Record<string, MockParkingLotSpecificData>;
  advertisements: Advertisement[];
}

export let mockSystemData: MockSystemData = {
  parkingLots: [],
  globalUsers: [{ ...DEFAULT_SUPER_ADMIN_CREDENTIALS, status: 'Active' }],
  dataByParkingLotId: {},
  advertisements: [],
};

const simulateDelay = <T,>(data: T, duration?: number): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), duration || (300 + Math.random() * 200)));
};

// --- Super Admin: Parking Lot Management ---
export const getOwnerDetailsByUsername = async (username: string): Promise<GlobalUserRecord | undefined> => {
    const owner = mockSystemData.globalUsers.find(
      u => u.username === username && u.role === UserRole.OWNER
    );
    return simulateDelay(owner ? { ...owner } : undefined);
};

export const getParkingLots = async (): Promise<Array<ParkingLot & { ownerPassword?: string; ownerStatus?: 'Active' | 'Suspended' }>> => {
  const lotsWithDetails = await Promise.all(
    mockSystemData.parkingLots.map(async (lot) => {
      const ownerDetails = await getOwnerDetailsByUsername(lot.ownerUsername);
      return {
        ...lot,
        ownerPassword: ownerDetails?.password,
        ownerStatus: ownerDetails?.status,
      };
    })
  );
  return simulateDelay(lotsWithDetails);
};

export const addParkingLot = async (name: string, ownerUsernameSeed: string, address?: string): Promise<ParkingLot> => {
  const parkingLotId = `lot_${slugify(name)}_${uuidv4().substring(0, 4)}`;
  const ownerUsername = `owner_${slugify(ownerUsernameSeed || name)}`;
  const ownerPassword = "password";
  const ownerId = `user_${uuidv4()}`;

  const newParkingLot: ParkingLot = {
    id: parkingLotId,
    name,
    ownerUsername: ownerUsername,
    createdAt: Date.now(),
    address: address || `Dirección de ${name}`, // Default address
  };

  const newOwnerUser: GlobalUserRecord = {
    id: ownerId,
    username: ownerUsername, // This is the login username for the owner
    password: ownerPassword,
    role: UserRole.OWNER,
    name: `Owner of ${name}`,
    assignedParkingLotId: parkingLotId,
    status: 'Active',
  };

  const existingOwner = mockSystemData.globalUsers.find(u => u.username === ownerUsername && u.role === UserRole.OWNER);
  if (existingOwner) {
      throw new Error(`El nombre de usuario para el dueño '${ownerUsername}' ya existe. Por favor, elija un sufijo diferente.`);
  }

  mockSystemData.parkingLots.push(newParkingLot);
  mockSystemData.globalUsers.push(newOwnerUser);

  const initialSpaces = Array.from({ length: INITIAL_PARKING_SPACES_COUNT }, (_, i) => ({
    id: `space_${parkingLotId}_${i + 1}`,
    number: `${i + 1}`,
    isVip: i < INITIAL_VIP_SPACES_COUNT,
    status: SpaceStatus.FREE,
    isReserved: false,
    reservedUntil: null,
    reservedForPlateOrUserId: null,
    reservedVehiclePlate: null,
    maintenanceNotes: null,
    clientReservationStatus: null, // Initialize
  }));

  const initialEmployeeId = `emp_${parkingLotId}_${uuidv4().substring(0,4)}`;
  const initialEmployees: Employee[] = [{
    id: initialEmployeeId,
    username: NEW_LOT_INITIAL_EMPLOYEE_USERNAME,
    password: NEW_LOT_INITIAL_EMPLOYEE_PASSWORD,
    name: NEW_LOT_INITIAL_EMPLOYEE_NAME,
    status: 'Active',
    parkingLotId: parkingLotId,
  }];

  mockSystemData.dataByParkingLotId[parkingLotId] = {
    parkingSpaces: initialSpaces,
    transactions: [],
    pricingSettings: JSON.parse(JSON.stringify(DEFAULT_PRICING_SETTINGS)),
    employees: initialEmployees,
    customers: [],
    waitingList: [],
  };

  if (mockSystemData.parkingLots.length === 1 && !mockSystemData.dataByParkingLotId[parkingLotId].transactions.some(t => t.vehiclePlate === "FIRSTLOT")) {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (lotData.parkingSpaces.length > 1) {
        lotData.parkingSpaces[1].status = SpaceStatus.OCCUPIED;
        lotData.parkingSpaces[1].vehiclePlate = "FIRSTLOT";
        lotData.parkingSpaces[1].entryTime = Date.now() - (1000 * 60 * 30);
        const tx1Id = uuidv4();
        lotData.parkingSpaces[1].currentTransactionId = tx1Id;
        lotData.transactions.push({
            id: tx1Id,
            vehiclePlate: "FIRSTLOT",
            vehicleType: VehicleType.CAMIONETA,
            spaceId: lotData.parkingSpaces[1].id,
            spaceNumber: lotData.parkingSpaces[1].number,
            entryTime: lotData.parkingSpaces[1].entryTime!,
            employeeId: initialEmployeeId,
            isVipStay: lotData.parkingSpaces[1].isVip,
        });
    }
  }
  return simulateDelay(newParkingLot);
};

export const updateParkingLotDetails = async (parkingLotId: string, updates: { name?: string; address?: string }): Promise<ParkingLot> => {
  const lotIndex = mockSystemData.parkingLots.findIndex(lot => lot.id === parkingLotId);
  if (lotIndex === -1) {
    throw new Error(`Estacionamiento con ID ${parkingLotId} no encontrado.`);
  }
  if (updates.name) {
    mockSystemData.parkingLots[lotIndex].name = updates.name;
  }
  if (updates.address) {
    mockSystemData.parkingLots[lotIndex].address = updates.address;
  }
  return simulateDelay({ ...mockSystemData.parkingLots[lotIndex] });
};

// --- User Authentication (Unified) ---
export const findUserByCredentials = async (
  loginIdentifier: string, // Can be username (for admin/owner/employee) or email (for client)
  pass: string
): Promise<{ user: AuthenticatedUser; parkingLotId?: string } | null> => {
  await simulateDelay(null, 100);

  // Try finding in globalUsers (SuperAdmin, Owner, Client)
  // For clients, username field in GlobalUserRecord stores their email.
  const globalUser = mockSystemData.globalUsers.find(
    u => (u.username.toLowerCase() === loginIdentifier.toLowerCase() || (u.email && u.email.toLowerCase() === loginIdentifier.toLowerCase())) &&
         u.password === pass
  );

  if (globalUser) {
    if ((globalUser.role === UserRole.OWNER || globalUser.role === UserRole.CLIENT) && globalUser.status === 'Suspended') {
      console.warn(`Login attempt for suspended user: ${loginIdentifier}`);
      return null;
    }
    const { password, status, assignedParkingLotId, ...userWithoutSensitiveData } = globalUser;
     const authUser: AuthenticatedUser = {
        id: userWithoutSensitiveData.id,
        username: userWithoutSensitiveData.username, // For clients, this is their email
        role: userWithoutSensitiveData.role,
        name: userWithoutSensitiveData.name,
        email: userWithoutSensitiveData.email, // Explicit email field
        clientVehiclePlates: userWithoutSensitiveData.clientVehiclePlates || [], // Ensure this is populated
        ...(assignedParkingLotId && { parkingLotId: assignedParkingLotId }), // Corrected: Use destructured assignedParkingLotId
    };
    return { user: authUser, parkingLotId: assignedParkingLotId }; // Corrected: Use destructured assignedParkingLotId
  }

  // Try finding employee (uses username, not email)
  for (const lotId in mockSystemData.dataByParkingLotId) {
    const lotData = mockSystemData.dataByParkingLotId[lotId];
    const employee = lotData.employees.find(
      emp => emp.username.toLowerCase() === loginIdentifier.toLowerCase() && emp.password === pass && emp.status === 'Active'
    );
    if (employee) {
      const { password, ...employeeDetails } = employee;
      return {
        user: {
          id: employee.id,
          username: employee.username, // Employee username
          role: UserRole.EMPLOYEE,
          name: employee.name,
          parkingLotId: lotId,
        },
        parkingLotId: lotId
      };
    }
  }
  return null;
};

export const updateOwnerStatus = async (ownerUsername: string, newStatus: 'Active' | 'Suspended'): Promise<boolean> => {
    const ownerIndex = mockSystemData.globalUsers.findIndex(
      u => u.username === ownerUsername && u.role === UserRole.OWNER
    );
    if (ownerIndex === -1) {
      throw new Error(`Dueño con username '${ownerUsername}' no encontrado.`);
    }
    mockSystemData.globalUsers[ownerIndex].status = newStatus;
    return simulateDelay(true);
};

// --- Client User Management ---
export const registerClientUser = async (
  name: string,
  email: string,
  passwordVal: string,
  primaryPlate?: string
): Promise<AuthenticatedUser> => {
  const existingClient = mockSystemData.globalUsers.find(
    u => u.role === UserRole.CLIENT && (u.username.toLowerCase() === email.toLowerCase() || (u.email && u.email.toLowerCase() === email.toLowerCase()))
  );
  if (existingClient) {
    throw new Error('Ya existe un cliente registrado con este correo electrónico.');
  }

  const newClientUser: GlobalUserRecord = {
    id: `client_${uuidv4().substring(0, 8)}`,
    username: email, // Use email as username for login consistency
    email: email,    // Explicit email field
    password: passwordVal, // In a real app, hash this
    role: UserRole.CLIENT,
    name: name,
    status: 'Active',
    clientVehiclePlates: primaryPlate ? [primaryPlate.toUpperCase()] : [], // Initialize as an array
  };
  mockSystemData.globalUsers.push(newClientUser);

  // Return the AuthenticatedUser structure (without password, etc.)
  const { password, status, assignedParkingLotId, ...authenticatedClient } = newClientUser;
  return simulateDelay(authenticatedClient as AuthenticatedUser); // Cast to ensure correct type
};

export const addClientVehicle = async (clientId: string, plate: string): Promise<AuthenticatedUser | null> => {
  const userIndex = mockSystemData.globalUsers.findIndex(u => u.id === clientId && u.role === UserRole.CLIENT);
  if (userIndex === -1) {
    throw new Error("Cliente no encontrado.");
  }
  const user = mockSystemData.globalUsers[userIndex];
  if (!user.clientVehiclePlates) {
    user.clientVehiclePlates = [];
  }
  const upperPlate = plate.toUpperCase();
  if (user.clientVehiclePlates.includes(upperPlate)) {
    throw new Error("Esta patente ya está registrada para este cliente.");
  }
  user.clientVehiclePlates.push(upperPlate);

  // Update localStorage to reflect change immediately if this user is logged in
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
      let currentAuthUser: AuthenticatedUser = JSON.parse(storedUser);
      if (currentAuthUser.id === clientId) {
          currentAuthUser.clientVehiclePlates = [...user.clientVehiclePlates];
          localStorage.setItem('currentUser', JSON.stringify(currentAuthUser));
      }
  }
  const { password, status, assignedParkingLotId, ...authUser } = user;
  return simulateDelay(authUser as AuthenticatedUser);
};

export const removeClientVehicle = async (clientId: string, plateToRemove: string): Promise<AuthenticatedUser | null> => {
  const userIndex = mockSystemData.globalUsers.findIndex(u => u.id === clientId && u.role === UserRole.CLIENT);
  if (userIndex === -1) {
    throw new Error("Cliente no encontrado.");
  }
  const user = mockSystemData.globalUsers[userIndex];
  if (!user.clientVehiclePlates) {
    const { password, status, assignedParkingLotId, ...authUser } = user;
    return simulateDelay(authUser as AuthenticatedUser); // No plates to remove
  }
  const upperPlateToRemove = plateToRemove.toUpperCase();
  user.clientVehiclePlates = user.clientVehiclePlates.filter(p => p !== upperPlateToRemove);

  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
      let currentAuthUser: AuthenticatedUser = JSON.parse(storedUser);
      if (currentAuthUser.id === clientId) {
          currentAuthUser.clientVehiclePlates = [...user.clientVehiclePlates];
          localStorage.setItem('currentUser', JSON.stringify(currentAuthUser));
      }
  }
  const { password, status, assignedParkingLotId, ...authUser } = user;
  return simulateDelay(authUser as AuthenticatedUser);
};

export const setClientPrimaryVehicle = async (clientId: string, plateToMakePrimary: string): Promise<AuthenticatedUser | null> => {
  const userIndex = mockSystemData.globalUsers.findIndex(u => u.id === clientId && u.role === UserRole.CLIENT);
  if (userIndex === -1) {
    throw new Error("Cliente no encontrado.");
  }
  const user = mockSystemData.globalUsers[userIndex];
  if (!user.clientVehiclePlates || user.clientVehiclePlates.length === 0) {
    throw new Error("El cliente no tiene vehículos registrados.");
  }

  const upperPlateToMakePrimary = plateToMakePrimary.toUpperCase();
  const plateIndex = user.clientVehiclePlates.indexOf(upperPlateToMakePrimary);

  if (plateIndex === -1) {
    throw new Error("La patente especificada no se encuentra en la lista del cliente.");
  }
  if (plateIndex === 0) {
    const { password, status, assignedParkingLotId, ...authUser } = user;
    return simulateDelay(authUser as AuthenticatedUser); // Already primary
  }

  // Move to front
  user.clientVehiclePlates.splice(plateIndex, 1);
  user.clientVehiclePlates.unshift(upperPlateToMakePrimary);

  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
      let currentAuthUser: AuthenticatedUser = JSON.parse(storedUser);
      if (currentAuthUser.id === clientId) {
          currentAuthUser.clientVehiclePlates = [...user.clientVehiclePlates];
          localStorage.setItem('currentUser', JSON.stringify(currentAuthUser));
      }
  }

  const { password, status, assignedParkingLotId, ...authUser } = user;
  return simulateDelay(authUser as AuthenticatedUser);
};


// --- Parking Spaces (Per Lot) ---
export const getParkingSpaces = async (parkingLotId: string): Promise<ParkingSpace[]> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  return simulateDelay(lotData.parkingSpaces);
};

export const updateParkingSpace = async (parkingLotId: string, spaceId: string, updates: Partial<ParkingSpace>): Promise<ParkingSpace> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  const index = lotData.parkingSpaces.findIndex(s => s.id === spaceId);
  if (index === -1) throw new Error('Space not found');
  lotData.parkingSpaces[index] = { ...lotData.parkingSpaces[index], ...updates };
  return simulateDelay(lotData.parkingSpaces[index]);
};

export const configureParkingSpaces = async (parkingLotId: string, totalSpaces: number, vipSpacesList: string[]): Promise<ParkingSpace[]> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);

    lotData.parkingSpaces = Array.from({ length: totalSpaces }, (_, i) => {
        const spaceNumber = `${i + 1}`;
        return {
            id: `space_${parkingLotId}_${spaceNumber}`,
            number: spaceNumber,
            isVip: vipSpacesList.includes(spaceNumber),
            status: SpaceStatus.FREE,
            isReserved: false,
            reservedUntil: null,
            reservedForPlateOrUserId: null,
            reservedVehiclePlate: null,
            maintenanceNotes: null,
            clientReservationStatus: null, // Initialize
        };
    });
    return simulateDelay(lotData.parkingSpaces);
};

export const setSpaceReservation = async (
  parkingLotId: string,
  spaceId: string,
  isReserved: boolean,
  reservedUntil: number | null,
  reservedForInput: string | null // Value from modal input (plate, text, or client_id)
): Promise<ParkingSpace> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  const index = lotData.parkingSpaces.findIndex(s => s.id === spaceId);
  if (index === -1) throw new Error('Space not found');

  const space = lotData.parkingSpaces[index];
  if (space.status === SpaceStatus.OCCUPIED && isReserved) {
    throw new Error('No se puede reservar un espacio actualmente ocupado.');
  }
  if (space.status === SpaceStatus.MAINTENANCE && isReserved) {
      throw new Error('No se puede reservar un espacio en mantenimiento.')
  }

  space.isReserved = isReserved;
  space.reservedUntil = isReserved ? reservedUntil : null;
  space.reservedForPlateOrUserId = isReserved ? reservedForInput : null;

  if (!isReserved) {
    // If reservation is being cleared, clear client-specific plate and status too
    space.reservedVehiclePlate = null;
    space.clientReservationStatus = null;
  } else {
    // If reservation is active:
    const isNowClientReservation = space.reservedForPlateOrUserId && space.reservedForPlateOrUserId.startsWith('client_');

    if (!isNowClientReservation) {
      // It's a manual (employee/owner) reservation.
      // Clear any client-specific plate and status.
      space.reservedVehiclePlate = null;
      space.clientReservationStatus = null;
    }
    // If it *is* still a client reservation, reservedVehiclePlate and clientReservationStatus
    // should have been set by createClientReservation or acceptClientReservation and should remain.
    // This function (setSpaceReservation) generally doesn't set clientReservationStatus for client reservations,
    // only clears it if reservation type changes TO manual.
  }

  return simulateDelay({ ...space });
};

export const setSpaceMaintenanceStatus = async (
  parkingLotId: string,
  spaceId: string,
  isMaintenance: boolean,
  notes?: string
): Promise<ParkingSpace> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  const index = lotData.parkingSpaces.findIndex(s => s.id === spaceId);
  if (index === -1) throw new Error('Space not found');

  const space = lotData.parkingSpaces[index];
  if (space.status === SpaceStatus.OCCUPIED && isMaintenance) {
      throw new Error('No se puede poner en mantenimiento un espacio ocupado.');
  }

  space.status = isMaintenance ? SpaceStatus.MAINTENANCE : SpaceStatus.FREE;
  space.maintenanceNotes = isMaintenance ? notes || null : null;
  if (isMaintenance) {
    space.isReserved = false;
    space.reservedUntil = null;
    space.reservedForPlateOrUserId = null;
    space.reservedVehiclePlate = null;
    space.clientReservationStatus = null; // Clear client reservation if going into maintenance
  }

  return simulateDelay({ ...space });
};

// --- Transactions (Per Lot) ---
export const addTransaction = async (
    parkingLotId: string,
    transactionData: Omit<Transaction, 'id' | 'entryTime' | 'isVipStay' | 'originalFee' | 'discountApplied' | 'totalFee'>
                    & { spaceIsVip: boolean; }
  ): Promise<Transaction> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  const newTransaction: Transaction = {
    ...transactionData,
    id: uuidv4(),
    entryTime: Date.now(),
    isVipStay: transactionData.spaceIsVip,
    originalFee: null,
    discountApplied: null,
    totalFee: null,
  };
  lotData.transactions.push(newTransaction);
  return simulateDelay(newTransaction);
};

export const updateTransaction = async (parkingLotId: string, transactionId: string, updates: Partial<Transaction>): Promise<Transaction> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  const index = lotData.transactions.findIndex(t => t.id === transactionId);
  if (index === -1) throw new Error('Transaction not found');

  const currentTransaction = lotData.transactions[index];
  const updatedTransaction = { ...currentTransaction, ...updates };

  if (typeof updates.totalFee === 'number') {
    updatedTransaction.originalFee = updates.originalFee ?? currentTransaction.originalFee ?? updates.totalFee;
    updatedTransaction.discountApplied = updates.discountApplied ?? currentTransaction.discountApplied ?? 0;
  }

  lotData.transactions[index] = updatedTransaction;
  return simulateDelay(lotData.transactions[index]);
};

export const getTransactions = async (parkingLotId: string, filters?: { startDate?: number, endDate?: number, employeeId?: string }): Promise<Transaction[]> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) return [];

  let filteredTransactions = [...lotData.transactions];

  if (filters?.startDate || filters?.endDate) {
    const startRange = filters.startDate || 0;
    const endRange = filters.endDate || Date.now();

    filteredTransactions = filteredTransactions.filter(t => {
      const entryTs = t.entryTime;
      const exitTs = t.exitTime || Date.now();

      const startsWithin = entryTs >= startRange && entryTs <= endRange;
      const endsWithin = t.exitTime ? (exitTs >= startRange && exitTs <= endRange) : false;
      const spansPeriod = entryTs < startRange && exitTs > endRange;
      const isActiveAndRelevant = !t.exitTime && entryTs <= endRange;

      return startsWithin || endsWithin || spansPeriod || isActiveAndRelevant;
    });
  }

  if (filters?.employeeId) {
    filteredTransactions = filteredTransactions.filter(t => t.employeeId === filters.employeeId);
  }
  return simulateDelay(filteredTransactions.sort((a,b) => b.entryTime - a.entryTime));
};

export const getAllTransactionsForSystem = async (filters?: { startDate?: number, endDate?: number }): Promise<Transaction[]> => {
  let allTransactions: Transaction[] = [];
   for (const lotId in mockSystemData.dataByParkingLotId) {
    const lotTransactions = mockSystemData.dataByParkingLotId[lotId].transactions;
    let filteredLotTransactions = [...lotTransactions];

    if (filters?.startDate || filters?.endDate) {
      const startRange = filters.startDate || 0;
      const endRange = filters.endDate || Date.now();

      filteredLotTransactions = filteredLotTransactions.filter(t => {
        const entryTs = t.entryTime;
        const exitTs = t.exitTime || Date.now();
        const startsWithin = entryTs >= startRange && entryTs <= endRange;
        const endsWithin = t.exitTime ? (exitTs >= startRange && exitTs <= endRange) : false;
        const spansPeriod = entryTs < startRange && exitTs > endRange;
        const isActiveAndRelevant = !t.exitTime && entryTs <= endRange;
        return startsWithin || endsWithin || spansPeriod || isActiveAndRelevant;
      });
    }
    allTransactions = allTransactions.concat(filteredLotTransactions);
  }
  return simulateDelay(allTransactions.sort((a,b) => b.entryTime - a.entryTime));
};


export const getActiveTransactions = async (parkingLotId: string): Promise<Transaction[]> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
    const active = lotData.transactions.filter(t => {
      if (t.exitTime) return false;
      const space = lotData.parkingSpaces.find(s => s.id === t.spaceId);
      return space && space.status === SpaceStatus.OCCUPIED && space.currentTransactionId === t.id;
    });
    return simulateDelay(active);
};

// --- Settings (Per Lot) ---
export const getPricingSettings = async (parkingLotId: string): Promise<PricingSettings> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found, cannot get pricing settings`);
  return simulateDelay(lotData.pricingSettings);
};

export const updatePricingSettings = async (parkingLotId: string, settings: PricingSettings): Promise<PricingSettings> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  lotData.pricingSettings = { ...settings };
  return simulateDelay(lotData.pricingSettings);
};

// --- Employees (Per Lot) ---
export const getEmployees = async (parkingLotId: string): Promise<Employee[]> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  return simulateDelay(lotData.employees.map(e => ({...e, password: '***'})));
};

export const addEmployee = async (parkingLotId: string, employeeData: Omit<Employee, 'id' | 'parkingLotId'>): Promise<Employee> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  const newEmployee: Employee = { ...employeeData, id: `emp_${parkingLotId}_${uuidv4().substring(0,6)}`, parkingLotId };
  lotData.employees.push(newEmployee);
  return simulateDelay({ ...newEmployee, password: '***' });
};

export const updateEmployee = async (parkingLotId: string, employeeId: string, updates: Partial<Omit<Employee, 'parkingLotId'>>): Promise<Employee> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  const index = lotData.employees.findIndex(e => e.id === employeeId);
  if (index === -1) throw new Error('Employee not found');
  lotData.employees[index] = { ...lotData.employees[index], ...updates };
  return simulateDelay({ ...lotData.employees[index], password: '***' });
};

// --- Customers (Per Lot) ---
export const getCustomers = async (parkingLotId: string): Promise<Customer[]> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  return simulateDelay(lotData.customers);
};

export const addCustomer = async (parkingLotId: string, customerData: Omit<Customer, 'id'>): Promise<Customer> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
  const newCustomer: Customer = { ...customerData, id: `cust_${parkingLotId}_${uuidv4().substring(0,6)}` };
  lotData.customers.push(newCustomer);
  return simulateDelay(newCustomer);
};

export const findCustomerByPlate = async (parkingLotId: string, plate: string): Promise<Customer | null> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);
    const customer = lotData.customers.find(c => c.plate?.toLowerCase() === plate.toLowerCase());
    return simulateDelay(customer || null);
};

// --- Advertisement Management (Global) ---
export const addAdvertisement = async (
  adData: Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Advertisement> => {
  const newAd: Advertisement = {
    ...adData,
    id: `ad_${uuidv4().substring(0, 8)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  mockSystemData.advertisements.push(newAd);
  return simulateDelay({ ...newAd });
};

// Modified to filter by displayLocation and status
export const getAdvertisements = async (filters?: { displayLocation?: AdvertisementDisplayLocation, status?: 'Active' | 'Inactive' }): Promise<Advertisement[]> => {
  let ads = [...mockSystemData.advertisements];
  if (filters?.displayLocation) {
    ads = ads.filter(ad => ad.displayLocation === filters.displayLocation);
  }
  if (filters?.status) {
    ads = ads.filter(ad => ad.status === filters.status);
  }
  return simulateDelay(ads.sort((a,b) => b.createdAt - a.createdAt));
};

export const updateAdvertisement = async (
  adId: string,
  updates: Partial<Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Advertisement> => {
  const adIndex = mockSystemData.advertisements.findIndex(ad => ad.id === adId);
  if (adIndex === -1) {
    throw new Error(`Publicidad con ID ${adId} no encontrada.`);
  }
  mockSystemData.advertisements[adIndex] = {
    ...mockSystemData.advertisements[adIndex],
    ...updates,
    updatedAt: Date.now(),
  };
  return simulateDelay({ ...mockSystemData.advertisements[adIndex] });
};

export const deleteAdvertisement = async (adId: string): Promise<void> => {
  const initialLength = mockSystemData.advertisements.length;
  mockSystemData.advertisements = mockSystemData.advertisements.filter(ad => ad.id !== adId);
  if (mockSystemData.advertisements.length === initialLength) {
    throw new Error(`Publicidad con ID ${adId} no encontrada para eliminar.`);
  }
  return simulateDelay(undefined);
};

// --- Waiting List Management (Per Lot) ---
export const getWaitingList = async (parkingLotId: string): Promise<WaitingListEntry[]> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);
    return simulateDelay([...lotData.waitingList].sort((a,b) => a.addedAt - b.addedAt)); // Oldest first
};

export const addToWaitingList = async (
    parkingLotId: string,
    entryData: Omit<WaitingListEntry, 'id' | 'parkingLotId' | 'addedAt' | 'status'>
): Promise<WaitingListEntry> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);
    const newEntry: WaitingListEntry = {
        ...entryData,
        id: `wait_${parkingLotId}_${uuidv4().substring(0, 6)}`,
        parkingLotId,
        addedAt: Date.now(),
        status: WaitingListStatus.WAITING,
    };
    lotData.waitingList.push(newEntry);
    return simulateDelay(newEntry);
};

export const updateWaitingListEntry = async (
    parkingLotId: string,
    entryId: string,
    updates: Partial<Omit<WaitingListEntry, 'id' | 'parkingLotId' | 'addedAt'>>
): Promise<WaitingListEntry> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);
    const entryIndex = lotData.waitingList.findIndex(e => e.id === entryId);
    if (entryIndex === -1) throw new Error(`Entrada de lista de espera con ID ${entryId} no encontrada.`);

    const currentEntry = lotData.waitingList[entryIndex];
    const updatedEntry = { ...currentEntry, ...updates };

    if (updates.status && updates.status !== currentEntry.status) {
        if ([WaitingListStatus.PARKED, WaitingListStatus.CANCELLED, WaitingListStatus.EXPIRED].includes(updates.status)) {
            updatedEntry.resolvedAt = Date.now();
            // resolvedByEmployeeId would ideally be passed in updates if status is changed by an employee action
        }
         if (updates.status === WaitingListStatus.NOTIFIED && !currentEntry.notifiedAt) {
            updatedEntry.notifiedAt = Date.now();
        }
    }

    lotData.waitingList[entryIndex] = updatedEntry;
    return simulateDelay(updatedEntry);
};

export const deleteWaitingListEntry = async (parkingLotId: string, entryId: string): Promise<void> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);
    const initialLength = lotData.waitingList.length;
    lotData.waitingList = lotData.waitingList.filter(e => e.id !== entryId);
    if (lotData.waitingList.length === initialLength) {
        throw new Error(`Entrada de lista de espera con ID ${entryId} no encontrada para eliminar.`);
    }
    return simulateDelay(undefined);
};

// --- New: Parking Lot Availability (Per Lot) ---
export const getParkingLotAvailability = async (parkingLotId: string): Promise<ParkingLotAvailability> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Parking lot ${parkingLotId} not found`);

  const spaces = lotData.parkingSpaces;
  const totalSpaces = spaces.length;
  const freeSpaces = spaces.filter(s => s.status === SpaceStatus.FREE && !s.isReserved).length; // Truly free
  const occupiedSpaces = spaces.filter(s => s.status === SpaceStatus.OCCUPIED).length;
  const reservedSpaces = spaces.filter(s => s.isReserved && s.status === SpaceStatus.FREE).length; // Marked as reserved AND free
  const maintenanceSpaces = spaces.filter(s => s.status === SpaceStatus.MAINTENANCE).length;

  const vipSpaces = spaces.filter(s => s.isVip).length;
  const freeVipSpaces = spaces.filter(s => s.isVip && s.status === SpaceStatus.FREE && !s.isReserved).length;

  return simulateDelay({
    totalSpaces,
    freeSpaces,
    occupiedSpaces,
    reservedSpaces,
    maintenanceSpaces,
    vipSpaces,
    freeVipSpaces,
  });
};

// --- Client Reservation Specific Functions ---
export const createClientReservation = async (
  parkingLotId: string,
  clientId: string,
  clientName: string | undefined,
  vehiclePlate: string,
  vehicleType: VehicleType // For potential future use
): Promise<ParkingSpace> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);

  let spaceToReserve =
    lotData.parkingSpaces.find(s => !s.isVip && s.status === SpaceStatus.FREE && !s.isReserved && !s.clientReservationStatus) ||
    lotData.parkingSpaces.find(s => s.isVip && s.status === SpaceStatus.FREE && !s.isReserved && !s.clientReservationStatus);

  if (!spaceToReserve) {
    throw new Error('No hay espacios disponibles para reservar en este momento.');
  }

  // Set reservation to be valid until the end of the current day
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const reservationEndTime = endOfDay.getTime();

  const updates: Partial<ParkingSpace> = {
    isReserved: true,
    reservedUntil: reservationEndTime,
    reservedForPlateOrUserId: clientId,
    reservedVehiclePlate: vehiclePlate.toUpperCase(),
    status: SpaceStatus.FREE,
    clientReservationStatus: 'PENDING_CONFIRMATION',
  };

  const spaceIndex = lotData.parkingSpaces.findIndex(s => s.id === spaceToReserve!.id);
  lotData.parkingSpaces[spaceIndex] = { ...lotData.parkingSpaces[spaceIndex], ...updates };

  console.log(`Client ${clientId} (${clientName}) reserved space ${spaceToReserve.number} in lot ${parkingLotId} for plate ${vehiclePlate} until ${new Date(reservationEndTime).toLocaleString()}. Status: PENDING_CONFIRMATION`);
  return simulateDelay({ ...lotData.parkingSpaces[spaceIndex] });
};

export const getClientActiveReservations = async (clientId: string): Promise<ClientReservation[]> => {
  const activeReservations: ClientReservation[] = [];
  const now = Date.now();

  for (const lotId in mockSystemData.dataByParkingLotId) {
    const lotData = mockSystemData.dataByParkingLotId[lotId];
    const parkingLot = mockSystemData.parkingLots.find(p => p.id === lotId);
    if (!parkingLot) continue;

    lotData.parkingSpaces.forEach(space => {
      const isLogicallyReservedForClient =
        (space.isReserved && space.clientReservationStatus !== 'REJECTED_BY_OWNER') ||
        space.clientReservationStatus === 'REJECTED_BY_OWNER';

      if (
        space.reservedForPlateOrUserId === clientId &&
        isLogicallyReservedForClient &&
        space.reservedUntil &&
        space.reservedUntil > now &&
        space.status !== SpaceStatus.OCCUPIED
      ) {
        activeReservations.push({
          ...space,
          parkingLotId: lotId,
          parkingLotName: parkingLot.name,
        });
      }
    });
  }
  return simulateDelay(activeReservations.sort((a,b) => (a.reservedUntil || 0) - (b.reservedUntil || 0) ));
};

export const cancelClientReservation = async (parkingLotId: string, spaceId: string, clientId: string): Promise<ParkingSpace> => {
  const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
  if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);

  const spaceIndex = lotData.parkingSpaces.findIndex(s => s.id === spaceId);
  if (spaceIndex === -1) throw new Error(`Espacio ${spaceId} no encontrado.`);

  const space = lotData.parkingSpaces[spaceIndex];
  if (!space.isReserved || space.reservedForPlateOrUserId !== clientId) {
    if (space.clientReservationStatus === 'REJECTED_BY_OWNER') {
        throw new Error('Esta reserva ya fue rechazada y no puede ser cancelada por usted.');
    }
    throw new Error('Este espacio no está reservado por usted o la reserva no es válida.');
  }
  if (space.status === SpaceStatus.OCCUPIED) {
    throw new Error('No se puede cancelar la reserva de un espacio que ya está ocupado.');
  }

  const updates: Partial<ParkingSpace> = {
    isReserved: false,
    reservedUntil: null,
    reservedForPlateOrUserId: null,
    reservedVehiclePlate: null,
    clientReservationStatus: null, // Clear status on client cancellation
  };

  lotData.parkingSpaces[spaceIndex] = { ...lotData.parkingSpaces[spaceIndex], ...updates };
  return simulateDelay({ ...lotData.parkingSpaces[spaceIndex] });
};

// --- Owner Management of Client Reservations ---
export const getPendingClientReservationsForLot = async (parkingLotId: string): Promise<ParkingSpace[]> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);
    const now = Date.now();

    const pendingReservations = lotData.parkingSpaces.filter(space =>
        space.isReserved && // Must be marked as reserved to be pending
        space.clientReservationStatus === 'PENDING_CONFIRMATION' &&
        space.reservedUntil &&
        space.reservedUntil > now &&
        space.status === SpaceStatus.FREE // Should be free to be pending
    );
    return simulateDelay(pendingReservations.sort((a,b) => (a.reservedUntil || 0) - (b.reservedUntil || 0) ));
};

export const acceptClientReservation = async (parkingLotId: string, spaceId: string, ownerId: string): Promise<ParkingSpace> => {
    // ownerId is for logging/authorization in a real backend, not used in mock logic currently
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);

    const spaceIndex = lotData.parkingSpaces.findIndex(s => s.id === spaceId);
    if (spaceIndex === -1) throw new Error(`Espacio ${spaceId} no encontrado.`);

    const space = lotData.parkingSpaces[spaceIndex];
    if (!space.isReserved || space.clientReservationStatus !== 'PENDING_CONFIRMATION' || !space.reservedUntil || space.reservedUntil <= Date.now()) {
        throw new Error('La reserva no es válida o ya ha expirado o no está pendiente.');
    }
    if (space.status !== SpaceStatus.FREE) {
        throw new Error('Solo se pueden confirmar reservas de espacios que estén libres.');
    }

    space.clientReservationStatus = 'CONFIRMED_BY_OWNER';
    // isReserved remains true
    console.log(`Owner ${ownerId} confirmed reservation for space ${space.number} (Plate: ${space.reservedVehiclePlate})`);
    return simulateDelay({ ...space });
};

export const rejectClientReservation = async (parkingLotId: string, spaceId: string, ownerId: string): Promise<ParkingSpace> => {
    const lotData = mockSystemData.dataByParkingLotId[parkingLotId];
    if (!lotData) throw new Error(`Estacionamiento ${parkingLotId} no encontrado.`);

    const spaceIndex = lotData.parkingSpaces.findIndex(s => s.id === spaceId);
    if (spaceIndex === -1) throw new Error(`Espacio ${spaceId} no encontrado.`);

    const space = lotData.parkingSpaces[spaceIndex];
    if (!space.reservedForPlateOrUserId?.startsWith('client_')) {
        throw new Error('Esto no parece ser una reserva de cliente válida para rechazar.');
    }
     if (space.status === SpaceStatus.OCCUPIED) {
        throw new Error('No se puede rechazar la reserva de un espacio que ya está ocupado.');
    }

    const rejectedPlate = space.reservedVehiclePlate;
    // space.isReserved = false; // Don't set to false immediately, client needs to see it as rejected
    // space.reservedUntil = null; // Let it expire naturally or client sees it for a bit
    // space.reservedForPlateOrUserId = null; // Keep for client to identify their rejected reservation
    // space.reservedVehiclePlate = null; // Keep for client to identify
    space.clientReservationStatus = 'REJECTED_BY_OWNER'; // Set status to rejected

    console.log(`Owner ${ownerId} rejected reservation for space ${space.number} (was for Plate: ${rejectedPlate})`);
    return simulateDelay({ ...space });
};


// Initialize default parking lot if none exist
if (mockSystemData.parkingLots.length === 0) {
    addParkingLot("Estacionamiento Principal", "main", "Av. Siempre Viva 742, Springfield").then(lot => {
        console.log("Initialized with default parking lot:", lot.name, "ID:", lot.id, "Address:", lot.address);
        const owner = mockSystemData.globalUsers.find(u => u.username === lot.ownerUsername);
        console.log("Default owner:", owner?.username, "Password:", owner?.password, "Status:", owner?.status);
        const defaultEmployee = mockSystemData.dataByParkingLotId[lot.id].employees[0];
        console.log("Default employee for this lot:", defaultEmployee.username, "Password:", defaultEmployee.password);

        addAdvertisement({
            title: "Oferta de Apertura Login!",
            type: "text",
            content: "Visítenos esta semana y obtenga un 10% de descuento en su primera estadía.",
            displayLocation: AdvertisementDisplayLocation.LOGIN_BANNER,
            status: "Active",
            linkUrl: "#"
        }).then(ad => console.log("Added sample login advertisement:", ad.title));

        addAdvertisement({
            title: "Promo Dueños!",
            type: "image",
            content: "https://via.placeholder.com/600x100/06b6d4/ffffff?text=Anuncio+Pie+de+Pagina+Dueños",
            displayLocation: AdvertisementDisplayLocation.OWNER_DASHBOARD_FOOTER,
            status: "Active",
            linkUrl: "#promo"
        }).then(ad => console.log("Added sample owner footer advertisement:", ad.title));

        addAdvertisement({
            title: "Bienvenido al Portal de Clientes!",
            type: "text",
            content: "Encuentre estacionamientos, reserve su lugar y gestione sus vehículos fácilmente.",
            displayLocation: AdvertisementDisplayLocation.CLIENT_PORTAL_MAIN,
            status: "Active"
        }).then(ad => console.log("Added sample client portal advertisement:", ad.title));

    }).catch(console.error);
}
