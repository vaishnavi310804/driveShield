export interface VehicleData {
  _id: string;
  driverId: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vehicleType: string;
  color?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleStatus = 'LOADING' | 'AVAILABLE' | 'NOT_FOUND' | 'ERROR';

export interface VehicleContextType {
  vehicle: VehicleData | null;
  vehicleId: string | null;
  status: VehicleStatus;
  errorMessage: string | null;
  refreshVehicle: () => Promise<void>;
}
