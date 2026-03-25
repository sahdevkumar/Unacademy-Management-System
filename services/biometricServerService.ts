import { supabase } from './supabaseClient';
import axios from 'axios';

export interface BiometricLog {
  id: number;
  deviceKey: string;
  deviceName: string;
  userId: string;
  userName: string;
  ioTime: string;
  ioMode: string;
  verifyMode: string;
  workCode: string;
}

export class BiometricServerService {
  private supabase: any = supabase;
  private baseUrl: string = '';
  private token: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Shared client is already initialized
  }

  async initialize() {
    if (this.isInitialized || !this.supabase) return;
    
    try {
      const { data } = await this.supabase.from('system_config').select('value').eq('key', 'biometric_api_config').maybeSingle();
      if (data?.value) {
        const config = data.value as any;
        this.baseUrl = config.baseUrl.replace(/\/+$/, '');
        if (config.username && config.password) {
          await this.login(config.username, config.password);
        }
      }
      this.isInitialized = true;
    } catch (e) {
      console.error("Biometric server initialization failed:", e);
    }
  }

  private async login(username: string, password: string) {
    if (!this.baseUrl) return;
    try {
      const response = await axios.post(`${this.baseUrl}/api/Auth/Login`, {
        Username: username,
        Password: password
      });
      if (response.data.Token) {
        this.token = response.data.Token;
      }
    } catch (e) {
      console.error("Biometric server login failed:", e);
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.token ? `Bearer ${this.token}` : ''
    };
  }

  async fetchAndSyncLogs() {
    await this.initialize();
    if (!this.token || !this.baseUrl) {
      console.error("Biometric service not initialized or no token");
      return;
    }

    try {
      // 1. Get allowed device keys from local Supabase
      const { data: localDevices, error: localError } = await this.supabase
        .from('biometric_devices')
        .select('cloud_key');
      
      if (localError) throw localError;
      
      const allowedKeys = new Set((localDevices || []).map((d: any) => d.cloud_key));
      
      if (allowedKeys.size === 0) {
        console.log("No local devices found in Supabase. Skipping sync.");
        return;
      }

      // 2. Get all devices from Cloud API to verify they exist
      const devicesResponse = await axios.get(`${this.baseUrl}/api/Device`, { headers: this.getHeaders() });
      const apiDevices = devicesResponse.data;

      if (!Array.isArray(apiDevices)) return;

      // 3. Trigger FetchAllLogs command for each allowed device
      for (const device of apiDevices) {
        const deviceKey = device.DeviceKey || device.SerialNumber || String(device.Id);
        
        if (allowedKeys.has(deviceKey)) {
          console.log(`Triggering log fetch for device: ${deviceKey}`);
          try {
            await axios.post(`${this.baseUrl}/api/DeviceCommand?commandType=FetchAllLogs`, [deviceKey], { headers: this.getHeaders() });
          } catch (e: any) {
            if (!e.response?.data?.includes?.('already in progress')) {
              console.warn(`FetchAllLogs command failed for ${deviceKey}:`, e.message);
            }
          }
        }
      }

      // 4. Retrieve all logs from the cloud database using a wide date range
      const fromDate = '2000-01-01T00:00:00';
      const toDate = new Date().toISOString();
      
      const endpoints = [
        `${this.baseUrl}/api/DeviceLog/GetAllLogsByDate?FromDate=${fromDate}&ToDate=${toDate}`,
        `${this.baseUrl}/api/DeviceLog/GetLogsByDate?FromDate=${fromDate}&ToDate=${toDate}`,
        `${this.baseUrl}/api/DeviceLog/GetLogs?FromDate=${fromDate}&ToDate=${toDate}`,
        `${this.baseUrl}/api/DeviceLog/GetAll?FromDate=${fromDate}&ToDate=${toDate}`,
        `${this.baseUrl}/api/Log/GetLogsByDate?FromDate=${fromDate}&ToDate=${toDate}`,
        `${this.baseUrl}/api/Log/GetAllLogsByDate?FromDate=${fromDate}&ToDate=${toDate}`,
        `${this.baseUrl}/api/Log/GetLogs?FromDate=${fromDate}&ToDate=${toDate}`,
        `${this.baseUrl}/api/Log/GetAll?FromDate=${fromDate}&ToDate=${toDate}`
      ];

      let lastError: any = null;
      let allLogs: any[] = [];

      for (const url of endpoints) {
        try {
          console.log(`Attempting to fetch logs from: ${url}`);
          const response = await axios.get(url, { headers: this.getHeaders() });
          const data = response.data;
          
          if (Array.isArray(data)) {
            allLogs = data;
            break;
          } else if (data && typeof data === 'object') {
            const possibleList = data.data || data.items || data.logs || data.results || data.Data || data.Logs;
            if (Array.isArray(possibleList)) {
              allLogs = possibleList;
              break;
            }
          }
        } catch (error: any) {
          lastError = error;
          if (error.response?.status === 404) {
            console.warn(`Log endpoint ${url} not found (404), trying next fallback...`);
            continue;
          }
          throw error;
        }
      }

      if (allLogs.length > 0) {
        // 5. Filter logs to only include those from allowed devices
        const filteredLogs = allLogs.filter((l: any) => {
          const logDeviceKey = l.DeviceKey || l.deviceKey || l.SerialNumber || l.serialNumber;
          return allowedKeys.has(logDeviceKey);
        });

        if (filteredLogs.length > 0) {
          await this.syncToSupabase(filteredLogs);
        } else {
          console.log("No logs found for the allowed devices.");
        }
      }
    } catch (e) {
      console.error("Fetch and sync logs failed:", e);
    }
  }

  private async syncToSupabase(logs: any[]) {
    if (!this.supabase || !Array.isArray(logs) || logs.length === 0) return;

    const attendanceData = logs
      .filter(l => l && (l.UserId || l.userId) && (l.IOTime || l.ioTime))
      .map(l => ({
        student_id: String(l.UserId || l.userId),
        student_name: l.UserName || l.userName || 'Unknown User',
        class_name: 'Biometric Sync (Server)',
        status: 'present',
        date: (l.IOTime || l.ioTime).split('T')[0],
        updated_at: new Date().toISOString()
      }));

    if (attendanceData.length === 0) return;

    // Deduplicate
    const uniqueData = Array.from(
      attendanceData.reduce((acc, curr) => {
        const key = `${curr.student_id}-${curr.date}`;
        acc.set(key, curr);
        return acc;
      }, new Map<string, any>()).values()
    );

    try {
      const { error } = await this.supabase.from('attendance_logs').upsert(uniqueData, { onConflict: 'student_id,date' });
      if (error) throw error;
      console.log(`Synced ${uniqueData.length} logs to Supabase`);
    } catch (e) {
      console.error("Sync to Supabase failed:", e);
    }
  }
}

export const biometricServerService = new BiometricServerService();
