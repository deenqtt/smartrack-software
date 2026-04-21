// Menu Preset Types
export interface MenuPreset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  selectedGroups: MenuPresetGroup[];
  selectedItems: MenuPresetItem[];
  _count?: {
    selectedGroups: number;
    selectedItems: number;
  };
}

export interface MenuPresetGroup {
  id: string;
  presetId: string;
  groupId: string;
  group?: {
    id: string;
    name: string;
    label: string;
    icon?: string;
  };
}

export interface MenuPresetItem {
  id: string;
  presetId: string;
  itemId: string;
  item?: {
    id: string;
    name: string;
    label: string;
    path: string;
    icon?: string;
  };
}

export interface PresetFormData {
  name: string;
  description?: string;
  icon?: string;
  selectedGroupIds: string[];
  selectedItemIds: string[];
}

export interface MenuGroupWithItems {
  id: string;
  name: string;
  label: string;
  icon?: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  label: string;
  path: string;
  menuGroupId: string;
  icon?: string;
}
