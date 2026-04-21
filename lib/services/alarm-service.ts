// File: consolidated alarm service - MOCK MODE
import { getMockAlarmData } from "./mock-data-service";

class AlarmService {
  public async start() {}
  public async refreshConfigurations() {}
  private handleMessage(topic: string, payloadStr: string) {}
  private async checkAlarmCondition(config: any, payload: any, deviceTopic?: string) {}
  private evaluateCondition(config: any, currentValue: any): boolean { return false; }
  private evaluateAgainstConfig(config: any, targetValue: any): boolean { return false; }
  private async triggerAlarm(config: any, currentValue: any): Promise<void> {}
  private async sendNotifications(config: any, currentValue: any, alarmLog: any): Promise<void> {}
  private async sendBasicNotifications(config: any, value: any): Promise<void> {}
  private generateAlarmMessage(config: any, currentValue: any, alarmLog: any): string { return ""; }
  private async getActiveAlarmStatus(alarmConfigId: string): Promise<string> { return "CLEARED"; }
  
  async clearAlarms(): Promise<void> {}

  async getAlarmStats(): Promise<any> {
    const mock = getMockAlarmData();
    return {
      totalAlarms: 5,
      activeAlarms: mock.length,
      todayCleared: 2,
      activeAlarmDetails: mock.map(m => ({
        id: m.id,
        name: m.message,
        type: m.severity,
        triggered: "Simulation",
        timestamp: m.timestamp
      })),
    };
  }
}

export const AlarmServiceInstance = new AlarmService();
export const getAlarmService = () => AlarmServiceInstance;
export const AlarmNotificationService = {
  checkAlarmCondition: async () => {},
  clearAlarms: async () => {},
  getAlarmStats: async () => AlarmServiceInstance.getAlarmStats(),
};
