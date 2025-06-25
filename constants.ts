
import { PricingSettings, VehicleType, UserRole, AdvertisementDisplayLocation, WaitingListStatus } from './types';

export const GLOBAL_APP_ID = 'nitu-parking-global'; // For system-wide data like super_admins or list of parking lots

export const FIRESTORE_PATHS = {
  // System-level paths
  SYSTEM_PARKING_LOTS: `artifacts/${GLOBAL_APP_ID}/public/data/parkingLots`, // List of all parking lots
  SYSTEM_USERS: `artifacts/${GLOBAL_APP_ID}/public/data/users`, // SuperAdmins, Owners (global user records)

  // Parking Lot specific paths (functions that take parkingLotId)
  PARKING_SPACES: (parkingLotId: string) => `artifacts/${GLOBAL_APP_ID}/public/data/lots/${parkingLotId}/parkingSpaces`,
  TRANSACTIONS: (parkingLotId: string) => `artifacts/${GLOBAL_APP_ID}/public/data/lots/${parkingLotId}/transactions`,
  SETTINGS_PRICING: (parkingLotId: string) => `artifacts/${GLOBAL_APP_ID}/public/data/lots/${parkingLotId}/settings/pricing`,
  EMPLOYEES: (parkingLotId: string) => `artifacts/${GLOBAL_APP_ID}/public/data/lots/${parkingLotId}/employees`, // Employees are specific to a lot
  CUSTOMERS: (parkingLotId: string) => `artifacts/${GLOBAL_APP_ID}/public/data/lots/${parkingLotId}/customers`, // Customers are specific to a lot
  WAITING_LIST: (parkingLotId: string) => `artifacts/${GLOBAL_APP_ID}/public/data/lots/${parkingLotId}/waitingList`, // Added
};

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  vipMultiplier: 1.5,
  rates: {
    [VehicleType.AUTO]: { minutelyRate: 0.5, firstHourMinFee: 30 },
    [VehicleType.CAMIONETA]: { minutelyRate: 0.7, firstHourMinFee: 42 },
    [VehicleType.MOTO]: { minutelyRate: 0.3, firstHourMinFee: 18 },
  },
};

export const DEFAULT_SUPER_ADMIN_CREDENTIALS = {
  id: 'superadmin001',
  username: 'superadmin',
  password: 'superpassword',
  role: UserRole.SUPER_ADMIN,
  name: 'Super Administrator'
};

// These will be used to seed a *new* parking lot
export const NEW_LOT_INITIAL_EMPLOYEE_USERNAME = 'employee';
export const NEW_LOT_INITIAL_EMPLOYEE_PASSWORD = 'password';
export const NEW_LOT_INITIAL_EMPLOYEE_NAME = 'Default Employee';

export const INITIAL_PARKING_SPACES_COUNT = 20;
export const INITIAL_VIP_SPACES_COUNT = 5;

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

// For Advertisement Feature
export const ADVERTISEMENT_STORAGE_PATH = `artifacts/${GLOBAL_APP_ID}/public/data/advertisements`;

export const AdvertisementDisplayLocationOptions = [
  { value: AdvertisementDisplayLocation.LOGIN_BANNER, label: 'Banner en Página de Login' },
  { value: AdvertisementDisplayLocation.EMPLOYEE_DASHBOARD_HEADER, label: 'Cabecera del Panel de Empleado' },
  { value: AdvertisementDisplayLocation.OWNER_DASHBOARD_FOOTER, label: 'Pie de Página del Panel de Dueño' },
  { value: AdvertisementDisplayLocation.SUPER_ADMIN_BANNER, label: 'Banner en Panel de Super Admin' },
  { value: AdvertisementDisplayLocation.CLIENT_PORTAL_MAIN, label: 'Portal Principal de Cliente' }, // Nueva opción
];

// For Waiting List Feature
export const WaitingListStatusOptions = [
    { value: WaitingListStatus.WAITING, label: 'En Espera' },
    { value: WaitingListStatus.NOTIFIED, label: 'Notificado' },
    { value: WaitingListStatus.PARKED, label: 'Estacionado' },
    { value: WaitingListStatus.CANCELLED, label: 'Cancelado' },
    { value: WaitingListStatus.EXPIRED, label: 'Expirado' },
];

// For Discount Codes Feature
export const MOCK_DISCOUNT_CODES: Record<string, number> = {
  'NITU10': 10, // 10% off
  'SAVE20': 20, // 20% off
  'PROMO50': 50, // 50% off
};