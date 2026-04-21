// lib/types/client.ts

export enum GatewayType {
  NODE = 'NODE',
  SERVER = 'SERVER'
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status: string; // 'active', 'inactive', 'suspended'
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  notes?: string;

  // Relations included in API responses
  locations?: GatewayLocation[];
  locationCount?: number;
  activeLocations?: number;
  inactiveLocations?: number;
}

export interface GatewayDashboard {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isUse: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations included in API responses
  user?: {
    id: string;
    email: string;
  };
  locations?: GatewayLocation[];
}

export interface GatewayLocation {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  url?: string;
  topic?: string;
  description?: string;
  isActive: boolean;
  gatewayType: GatewayType; // NODE or SERVER
  clientId?: string;
  dashboardId?: string;
  createdAt: string;
  updatedAt: string;

  // Relations included in API responses
  client?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
  };
  dashboard?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface ClientFormData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status: string;
  notes?: string;
}

export interface GatewayLocationFormData {
  name: string;
  longitude: string;
  latitude: string;
  url?: string;
  topic?: string;
  description?: string;
  gatewayType: string;
  clientId?: string;
  dashboardId?: string;
  isActive?: boolean;
}
