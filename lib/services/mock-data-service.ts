/**
 * Mock Data Service for Smartrack Portfolio
 * Provides simulated data for dashboard widgets and system metrics.
 */

export const generateMockMetrics = () => {
  return {
    cpu: Math.floor(Math.random() * 40) + 20, // 20-60%
    ram: Math.floor(Math.random() * 30) + 40, // 40-70%
    temp: (Math.random() * 5 + 24).toFixed(1), // 24-29°C
    humidity: (Math.random() * 10 + 40).toFixed(1), // 40-50%
  };
};

export const getMockDeviceStatus = (uniqId: string) => {
  return {
    uniqId,
    status: Math.random() > 0.1 ? "INSTALLED" : "OFFLINE",
    lastUpdated: new Date().toISOString(),
  };
};

export const getMockAlarmData = () => {
  return [
    { id: 1, message: "PDU Feed 1 High Current", severity: "MAJOR", timestamp: new Date().toISOString() },
    { id: 2, message: "System Health Normal", severity: "INFO", timestamp: new Date().toISOString() },
  ];
};
