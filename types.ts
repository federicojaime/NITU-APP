
export enum UserRole {
  OWNER = 'owner',
  EMPLOYEE = 'employee',
  SUPER_ADMIN = 'super_admin',
  CLIENT = 'client', // Added client role
  NONE = 'none'
}

export enum SpaceStatus {
  FREE = 'Libre',
  OCCUPIED = 'Ocupado',
  RESERVED = 'Reservado',
  MAINTENANCE = 'Mantenimiento', 
}

export enum VehicleType {
  AUTO = 'Auto',
  CAMIONETA = 'Camioneta',
  MOTO = 'Moto',
}

export interface ParkingLot {
  id: string;
  name: string;
  ownerUsername: string; 
  createdAt: number;
  address?: string; // Nuevo campo para la dirección
}

export interface ParkingSpace {
  id: string;
  number: string;
  isVip: boolean;
  status: SpaceStatus;
  vehiclePlate?: string; // Plate of the vehicle currently occupying the space
  entryTime?: number; // Timestamp
  currentTransactionId?: string;
  isReserved?: boolean; 
  reservedUntil?: number | null; 
  reservedForPlateOrUserId?: string | null; // For employee-made reservations (plate/text) or client ID for client reservations
  reservedVehiclePlate?: string | null; // Plate specified by client for their reservation
  maintenanceNotes?: string | null;
  clientReservationStatus?: 'PENDING_CONFIRMATION' | 'CONFIRMED_BY_OWNER' | 'REJECTED_BY_OWNER' | null; // New field
}

export interface Transaction {
  id: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  spaceId: string;
  spaceNumber: string;
  entryTime: number; // Timestamp
  exitTime?: number | null; // Timestamp
  originalFee?: number | null; 
  discountApplied?: number | null; // Percentage (0-100) 
  totalFee?: number | null; // Final fee after discount
  employeeId: string; 
  customerId?: string | null;
  customerName?: string | null;
  isVipStay: boolean;
}

export interface RateSettings {
  minutelyRate: number;
  firstHourMinFee: number;
}

export interface PricingSettings {
  vipMultiplier: number;
  rates: {
    [key in VehicleType]: RateSettings;
  };
}

export interface Employee {
  id: string; 
  username: string; 
  name: string;
  password?: string;
  status: 'Active' | 'Inactive';
  parkingLotId: string; 
}

export interface Customer {
  id: string; 
  name: string;
  plate?: string; // This is a general customer, not necessarily a user account
}

export interface AuthenticatedUser {
  id: string; 
  username: string; // For employees/admins, this is their login username. For clients, this might be their email.
  role: UserRole;
  name?: string; 
  email?: string; // Added for client users primarily
  parkingLotId?: string; // For Owner and Employee roles
  clientVehiclePlates?: string[]; // For clients, their vehicle plates. First is considered primary.
}


export interface GroundingChunkWeb {
  uri?: string;
  title?: string; 
}
export interface GroundingChunk {
  web?: GroundingChunkWeb;
  retrievedContext?: unknown; 
}
export interface GroundingMetadata {
  groundingAttributionToken?: unknown; 
  webSearchQueries?: string[]; 
  groundingChunks?: GroundingChunk[];
}


export interface ChartData {
  name: string;
  value: number;
}

export enum AdvertisementDisplayLocation {
  LOGIN_BANNER = 'login_banner',
  EMPLOYEE_DASHBOARD_HEADER = 'employee_dashboard_header',
  OWNER_DASHBOARD_FOOTER = 'owner_dashboard_footer',
  SUPER_ADMIN_BANNER = 'super_admin_banner',
  CLIENT_PORTAL_MAIN = 'client_portal_main', 
  CLIENT_PARKING_LOT_DETAIL_MODAL = 'client_parking_lot_detail_modal', // Nueva ubicación
}

export interface Advertisement {
  id: string;
  title: string;
  type: 'text' | 'image'; 
  content: string; 
  linkUrl?: string; 
  displayLocation: AdvertisementDisplayLocation;
  status: 'Active' | 'Inactive';
  createdAt: number; 
  updatedAt: number; 
}

// Added for Waiting List Feature
export enum WaitingListStatus {
  WAITING = 'En Espera',
  NOTIFIED = 'Notificado',
  PARKED = 'Estacionado', // When moved from waiting list to a space
  CANCELLED = 'Cancelado', // Client decided not to wait or no-show
  EXPIRED = 'Expirado' // If there was a time limit for notification response
}

export interface WaitingListEntry {
  id: string;
  parkingLotId: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  customerName?: string;
  contactInfo?: string; // e.g., phone number
  notes?: string;
  addedAt: number; // Timestamp
  status: WaitingListStatus;
  employeeIdAdded: string; // Employee who added the entry
  notifiedAt?: number | null;
  resolvedAt?: number | null; // When parked, cancelled, or expired
  resolvedByEmployeeId?: string | null;
}

// Types for GenerateContentResponse, based on @google/genai, simplified for proxy usage
export interface ContentPart {
  text?: string;
  // inlineData?: { mimeType: string; data: string; }; // For image parts etc.
  // fileData?: { mimeType: string; fileUri: string; };
}

export interface Content {
  parts: ContentPart[];
  role?: string; // "user" or "model"
}

export interface SafetyRating {
  category: string; // e.g., HARM_CATEGORY_HARASSMENT
  probability: string; // e.g., NEGLIGIBLE, LOW, MEDIUM, HIGH
  blocked?: boolean;
}

export interface CitationSource {
  startIndex?: number;
  endIndex?: number;
  uri?: string;
  license?: string;
}

export interface CitationMetadata {
  citationSources: CitationSource[];
}

export interface Candidate {
  content?: Content;
  finishReason?: string; // e.g., "STOP", "MAX_TOKENS", "SAFETY", "RECITATION", "OTHER"
  index?: number;
  safetyRatings?: SafetyRating[];
  citationMetadata?: CitationMetadata;
  groundingMetadata?: GroundingMetadata; // Already defined
}

export interface PromptFeedback {
  blockReason?: string; // e.g., "SAFETY", "OTHER"
  safetyRatings?: SafetyRating[];
  // blockReasonMessage?: string; // If detailed message is needed
}

export interface GenerateContentResponse {
  text: string; // Convenience accessor for text from the first candidate
  candidates?: Candidate[];
  promptFeedback?: PromptFeedback;
}

// Nueva interfaz para la disponibilidad de estacionamientos
export interface ParkingLotAvailability {
  totalSpaces: number;
  freeSpaces: number;
  occupiedSpaces: number;
  reservedSpaces: number; // Spaces specifically marked as reserved (but free)
  maintenanceSpaces: number;
  vipSpaces: number;
  freeVipSpaces: number;
}

// For client reservations
export interface ClientReservation extends ParkingSpace { // Inherits clientReservationStatus
    parkingLotId: string;
    parkingLotName: string;
}
