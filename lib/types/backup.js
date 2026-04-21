// JavaScript version of backup types for CommonJS compatibility
// This allows the seed scripts to require these types

const BackupType = {
  DATABASE: 'database'
};

const BackupFrequency = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  MANUAL: 'manual',
  CUSTOM: 'custom'
};

const BackupStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

module.exports = {
  BackupType,
  BackupFrequency,
  BackupStatus
};
