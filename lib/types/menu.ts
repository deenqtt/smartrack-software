// Types untuk Dynamic Menu System

export interface MenuItemWithPermissions {
  id: string;
  name: string;
  label: string;
  path: string;
  icon?: string;
  component?: string;
  order: number;
  isActive: boolean;
  isDeveloper: boolean;
  menuGroupId: string;
  menuGroup: {
    id: string;
    name: string;
    label: string;
    icon?: string;
    order: number;
  };
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuGroupWithItems {
  id: string;
  name: string;
  label: string;
  icon?: string;
  order: number;
  isActive?: boolean;
  isDeveloper?: boolean;
  menuItems: MenuItemWithPermissions[];
  items?: MenuItemWithPermissions[]; // Added for compatibility with Prisma schema
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMenuData {
  menuGroups: MenuGroupWithItems[];
  isDeveloper?: boolean;
}

// API Response types
export interface MenuApiResponse {
  success: boolean;
  data?: MenuGroupWithItems[];
  error?: string;
}

export interface CreateMenuItemRequest {
  menuGroupId: string;
  name: string;
  label: string;
  path: string;
  icon?: string;
  component?: string;
  order?: number;
  isDeveloper?: boolean;
}

export interface UpdateMenuItemRequest extends Partial<CreateMenuItemRequest> {
  id: string;
  isActive?: boolean;
}

export interface CreateMenuGroupRequest {
  name: string;
  label: string;
  icon?: string;
  order?: number;
}

export interface UpdateMenuGroupRequest extends Partial<CreateMenuGroupRequest> {
  id: string;
  isActive?: boolean;
}

// Permission types
export interface RoleMenuPermissionData {
  roleId: string;
  menuItemId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}
