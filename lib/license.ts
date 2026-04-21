/**
 * Smartrack License Utility
 * This file handles license validation and limits.
 */

export interface LicenseCheckResult {
  allowed: boolean;
  message?: string;
}

/**
 * Checks if the current license allows adding a new device.
 */
export async function canAddDevice(): Promise<LicenseCheckResult> {
  // For now, allow unlimited devices in the refactored Smartrack app
  return { allowed: true };
}

/**
 * Checks if the current license allows adding a new logging configuration.
 */
export async function canAddLoggingConfig(): Promise<LicenseCheckResult> {
  // For now, allow unlimited logging configs in the refactored Smartrack app
  return { allowed: true };
}

/**
 * Gets the current license status.
 */
export async function getLicenseStatus() {
  return {
    isActive: true,
    type: "UNLIMITED",
    expiredAt: null,
    isExpired: false
  };
}
