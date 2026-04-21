'use client';

import { useState } from 'react';
import type { RackServer } from '@/app/rack/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Trash2, Plus, X } from 'lucide-react';

interface ServerConfigPanelProps {
  rackId: string;
  server: RackServer | null;
  onSave: (server: Omit<RackServer, 'id'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

const MONITORING_METRICS = [
  'temperature',
  'humidity',
  'power',
  'cpu_usage',
  'memory_usage',
  'disk_usage',
  'network_in',
  'network_out',
];

export default function ServerConfigPanel({
  rackId,
  server,
  onSave,
  onDelete,
  onCancel,
}: ServerConfigPanelProps) {
  const [name, setName] = useState(server?.name || '');
  const [type, setType] = useState<'server' | 'pdu' | 'blank' | 'pdu-rail' | 'pdu-side' | 'ups' | 'switch'>(
    server?.type || 'server'
  );
  const [position, setPosition] = useState(server?.position || 1);
  const [height, setHeight] = useState(server?.height || 1);
  const [status, setStatus] = useState<'online' | 'offline' | 'warning'>(
    server?.status || 'online'
  );
  const [topics, setTopics] = useState<{ [key: string]: string }>(
    server?.topics || {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const handleAddTopic = (metric: string) => {
    if (!topics[metric]) {
      setTopics({ ...topics, [metric]: '' });
    }
  };

  const handleRemoveTopic = (metric: string) => {
    const newTopics = { ...topics };
    delete newTopics[metric];
    setTopics(newTopics);
  };

  const handleTopicChange = (metric: string, value: string) => {
    setTopics({ ...topics, [metric]: value });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!name.trim()) {
        setError('Server name is required');
        return;
      }

      if (position < 1 || position > 42) {
        setError('Position must be between 1 and 42');
        return;
      }

      if (height < 1 || height > 42) {
        setError('Height must be between 1 and 42');
        return;
      }

      if (position + height - 1 > 42) {
        setError('Server extends beyond rack height (42U)');
        return;
      }

      const serverData: Omit<RackServer, 'id'> = {
        name,
        type,
        position,
        height,
        status,
        ...(Object.keys(topics).length > 0 && { topics }),
      };

      await onSave(serverData);
      onCancel();
    } catch (err) {
      console.error('[ServerConfigPanel] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    setDeleteConfirmationOpen(true);
  };

  const confirmDelete = async () => {
    if (!onDelete) return;

    setDeleteConfirmationOpen(false);
    try {
      setIsLoading(true);
      await onDelete();
      onCancel();
    } catch (err) {
      console.error('[ServerConfigPanel] Error deleting:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete server');
    } finally {
      setIsLoading(false);
    }
  };

  const configuredMetrics = Object.keys(topics);
  const availableMetrics = MONITORING_METRICS.filter(
    (m) => !configuredMetrics.includes(m)
  );

  return (
    <div className="space-y-4 flex flex-col flex-1">
      {/* Error Message */}
      {error && (
        <Card className="p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </Card>
      )}

      {/* Basic Info */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Server Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Web Server 01"
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="server">Server (1U/2U/3U/4U)</option>
            <option value="pdu">PDU</option>
            <option value="blank">Blank Panel</option>
          </select>
        </div>

        {type === 'server' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Position (U)
              </label>
              <Input
                type="number"
                min="1"
                max="42"
                value={position}
                onChange={(e) => setPosition(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Height (U)
              </label>
              <select
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="1">1U</option>
                <option value="2">2U</option>
                <option value="3">3U</option>
                <option value="4">4U</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'online' | 'offline' | 'warning')}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="warning">Warning</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Monitoring Metrics */}
      {type === 'server' && (
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
              Monitoring Metrics
            </h3>
            {availableMetrics.length > 0 && (
              <div className="relative group">
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1 h-auto"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg hidden group-hover:block z-10">
                  {availableMetrics.map((metric) => (
                    <button
                      key={metric}
                      onClick={() => handleAddTopic(metric)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      {metric.replace(/_/g, ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {configuredMetrics.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No metrics configured
            </p>
          ) : (
            <div className="space-y-2">
              {configuredMetrics.map((metric) => (
                <div key={metric} className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {metric.replace(/_/g, ' ').toUpperCase()}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={topics[metric]}
                      onChange={(e) => handleTopicChange(metric, e.target.value)}
                      placeholder="MQTT topic"
                      disabled={isLoading}
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveTopic(metric)}
                      disabled={isLoading}
                      className="p-1 h-auto"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-auto space-y-2">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>

        {onDelete && server && (
          <Button
            onClick={handleDelete}
            disabled={isLoading}
            variant="ghost"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}

        <Button
          onClick={onCancel}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          Cancel
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmationOpen}
        onOpenChange={setDeleteConfirmationOpen}
        type="destructive"
        title="Delete Server"
        description="Are you sure you want to delete this server? This action cannot be undone."
        confirmText="Yes, Delete Server"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmationOpen(false)}
      />
    </div>
  );
}
