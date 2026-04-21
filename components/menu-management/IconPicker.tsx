'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getIcon } from '@/lib/icon-library';
import { Check, ChevronDown, Palette, Menu } from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const availableIcons = [
  'Menu', 'LayoutDashboard', 'Settings', 'Users', 'Building2', 'MapPin',
  'Wrench', 'Activity', 'Sliders', 'BarChart3', 'Shield', 'ShieldCheck',
  'Radio', 'Network', 'Server', 'Cpu', 'Globe', 'Workflow', 'FileText',
  'Archive', 'Info', 'Settings2', 'Clock', 'Calendar', 'Database', 'Zap',
  'Battery', 'Thermometer', 'Wifi', 'Bluetooth', 'GalleryVertical', 'Film',
  'Camera', 'Mic', 'Headphones', 'Phone', 'Mail', 'MessageCircle', 'Bell',
  'Eye', 'Lock', 'Key', 'Plus', 'Minus', 'Search', 'Filter', 'SortAsc',
  'SortDesc', 'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ExternalLink',
  'RotateCcw', 'RefreshCw', 'Play', 'Pause', 'Stop', 'SkipBack', 'SkipForward',
  'Volume2', 'User', 'UserCheck', 'UserPlus', 'UserMinus', 'Users',
  'LogIn', 'LogOut', 'HelpCircle', 'AlertTriangle', 'AlertCircle',
  'CheckCircle', 'XCircle', 'File', 'Folder', 'Edit', 'Save', 'Download',
  'Upload', 'Share', 'Link', 'Copy', 'Printer', 'Home', 'CreditCard',
  'Wallet', 'TrendingUp', 'TrendingDown', 'DollarSign', 'BarChart',
  'PieChart', 'GitBranch', 'GitMerge', 'Code', 'Terminal', 'Monitor',
  'Tablet', 'Smartphone', 'Mouse', 'Keyboard', 'Speaker'
];

export function IconPicker({ value, onChange, placeholder = "Select icon", disabled = false }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = availableIcons.filter(iconName =>
    iconName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleIconSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearchTerm('');
  };

  const renderIcon = (iconName: string, className: string = "h-4 w-4") => {
    const IconComponent = getIcon(iconName);
    if (IconComponent) {
      return React.createElement(IconComponent, { className });
    }
    return <Menu className={className} />;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="icon-picker">Icon *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              {renderIcon(value || 'Menu')}
              <span className="text-sm">
                {value || placeholder}
              </span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="flex items-center border-b px-3 py-2">
            <Palette className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 shadow-none focus:ring-0 p-0"
            />
          </div>
          <ScrollArea className="h-64 p-1">
            <div className="grid grid-cols-6 gap-1 p-2">
              {filteredIcons.map((iconName) => (
                <Button
                  key={iconName}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 relative hover:bg-muted"
                  onClick={() => handleIconSelect(iconName)}
                >
                  {renderIcon(iconName)}
                  {value === iconName && (
                    <div className="absolute -top-1 -right-1 rounded-full bg-primary p-0.5">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
