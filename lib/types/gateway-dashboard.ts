export interface GatewayDashboard {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isUse: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  locations?: GatewayLocation[];
  _count?: {
    locations: number;
  };
}

export interface GatewayDashboardFormData {
  name: string;
  description?: string;
  isUse?: boolean;
  isActive?: boolean;
}

export interface GatewayLocation {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  url?: string;
  topic?: string;
  description?: string;
  status: boolean;
  gatewayType: GatewayType;
  clientId?: string;
  dashboardId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;

  // Relations
  client?: {
    id: string;
    name: string;
    company?: string;
    email: string;
  };
  dashboard?: {
    id: string;
    name: string;
    description?: string;
  };
}

export enum GatewayType {
  NODE = 'NODE',
  SERVER = 'SERVER'
}

export interface GatewayLocationFormData {
  name: string;
  longitude: number;
  latitude: number;
  url?: string;
  topic?: string;
  description?: string;
  status: boolean;
  gatewayType: string;
  clientId?: string;
  dashboardId?: string;
}
