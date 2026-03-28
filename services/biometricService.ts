
import { supabase } from './supabaseClient';

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

export interface BiometricUser {
  userId: string;
  userName: string;
  cardNumber: string;
  password?: string;
  accessLevel: string;
}

class BiometricService {
  private baseUrl: string = '';
  private token: string | null = null;
  private isInitialized: boolean = false;

  async initialize() {
    if (this.isInitialized) return;
    if (!supabase) return;
    
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'biometric_api_config').maybeSingle();
      if (data?.value) {
        const config = data.value as any;
        this.baseUrl = config.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
        if (config.username && config.password) {
          await this.login(config.username, config.password);
        }
      }
      this.isInitialized = true;
    } catch (e) {
      console.error("Biometric initialization failed:", e);
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.token ? `Bearer ${this.token}` : ''
    };
  }

  private async proxyFetch(url: string, options: any = {}) {
    const response = await fetch('/api/biometric-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method: options.method || 'GET',
        headers: options.headers || this.getHeaders(),
        body: options.body // Pass the object directly
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = `Request failed with status ${response.status}`;
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData && typeof errorData === 'object') {
        errorMessage = errorData.error || JSON.stringify(errorData);
      }
      throw new Error(errorMessage);
    }
    return response;
  }

  async login(username: string, password: string) {
    if (!this.baseUrl) return;
    try {
      const response = await this.proxyFetch(`${this.baseUrl}/api/Auth/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { Username: username, Password: password }
      });
      const data = await response.json();
      if (data.Token) {
        this.token = data.Token;
      }
    } catch (e) {
      console.error("Biometric login failed:", e);
      throw e;
    }
  }

  async testConnection(deviceKey: string): Promise<boolean> {
    await this.initialize();
    if (!this.token || !this.baseUrl) return false;
    try {
      const response = await this.proxyFetch(`${this.baseUrl}/api/Device`);
      const devices = await response.json();
      return devices.some((d: any) => 
        d.DeviceKey === deviceKey || 
        d.SerialNumber === deviceKey || 
        String(d.Id) === deviceKey
      );
    } catch (e) {
      console.error("Test connection failed:", e);
      return false;
    }
  }

  async getDevices(): Promise<any[]> {
    await this.initialize();
    if (!this.token || !this.baseUrl) return [];
    try {
      const response = await this.proxyFetch(`${this.baseUrl}/api/Device`);
      const devices = await response.json();
      return Array.isArray(devices) ? devices.map((d: any) => ({
        id: String(d.Id || d.id),
        name: d.DeviceName || d.deviceName || 'Unnamed Device',
        cloud_key: d.DeviceKey || d.SerialNumber || String(d.Id),
        location: d.Location || d.location || 'Unknown',
        status: d.Status === 1 ? 'Online' : 'Offline',
        last_sync: d.LastActivityTime || d.lastActivityTime
      })) : [];
    } catch (e) {
      console.error("Fetch devices from API failed:", e);
      return [];
    }
  }

  async fetchLogs(deviceKey: string): Promise<BiometricLog[]> {
    await this.initialize();
    if (!this.token || !this.baseUrl) return [];
    
    try {
      // 1. Trigger fetch command on the cloud server
      try {
        await this.proxyFetch(`${this.baseUrl}/api/DeviceCommand?commandType=FetchAllLogs`, {
          method: 'POST',
          body: [deviceKey]
        });
      } catch (e: any) {
        if (!e.message?.includes('already in progress')) {
          console.warn("FetchAllLogs command trigger failed:", e.message);
        }
      }

      // 2. Retrieve all logs from the cloud database using a wide date range
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
          const response = await this.proxyFetch(url);
          const data = await response.json();
          
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
          if (error.message?.includes('404')) {
            console.warn(`Log endpoint ${url} not found (404), trying next fallback...`);
            continue;
          }
          throw error;
        }
      }
      
      // 3. Filter logs to only include those from the requested device
      const filteredLogs = allLogs.filter((l: any) => {
        const logDeviceKey = l.DeviceKey || l.deviceKey || l.SerialNumber || l.serialNumber;
        return logDeviceKey === deviceKey;
      });

      return filteredLogs.map((l: any) => ({
        id: l.Id || l.id,
        deviceKey: l.DeviceKey || l.deviceKey,
        deviceName: l.DeviceName || l.deviceName,
        userId: l.UserId || l.userId,
        userName: l.UserName || l.userName,
        ioTime: l.IOTime || l.ioTime,
        ioMode: l.IOMode || l.ioMode,
        verifyMode: l.VerifyMode || l.verifyMode,
        workCode: l.WorkCode || l.workCode
      }));
    } catch (e) {
      console.error("Fetch logs failed:", e);
      return [];
    }
  }

  async fetchUsersFromDevice(deviceKey: string): Promise<any[]> {
    await this.initialize();
    if (!this.token || !this.baseUrl) return [];
    
    const encodedKey = encodeURIComponent(deviceKey);
    const endpoints = [
      `${this.baseUrl}/api/Device/GetAllRegisteredUsers?deviceKey=${encodedKey}`,
      `${this.baseUrl}/api/Device/GetRegisteredUsers?deviceKey=${encodedKey}`,
      `${this.baseUrl}/api/Device/GetUsers?deviceKey=${encodedKey}`,
      `${this.baseUrl}/api/Device/GetAll?deviceKey=${encodedKey}`,
      `${this.baseUrl}/api/User/GetAllUsers?deviceKey=${encodedKey}`,
      `${this.baseUrl}/api/User/GetUsers?deviceKey=${encodedKey}`,
      `${this.baseUrl}/api/User/GetAll?deviceKey=${encodedKey}`
    ];

    let lastError: any = null;
    let users: any[] = [];

    for (const url of endpoints) {
      try {
        console.log(`Attempting to fetch users from: ${url}`);
        const response = await this.proxyFetch(url);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          users = data;
          break;
        } else if (data && typeof data === 'object') {
          const possibleList = data.data || data.items || data.users || data.results || data.Data || data.Users;
          if (Array.isArray(possibleList)) {
            users = possibleList;
            break;
          }
        }
      } catch (e: any) {
        lastError = e;
        if (e.message?.includes('404')) {
          console.warn(`User endpoint ${url} not found (404), trying next fallback...`);
          continue;
        }
        throw e;
      }
    }

    try {
      return users.map((u: any) => ({
        userId: u.UserId || u.userId,
        userName: u.UserName || u.userName,
        cardNumber: u.CardNumber || u.cardNumber,
        password: u.Password || u.password,
        accessLevel: u.AccessLevel || u.accessLevel,
        privilege: u.Privilege || u.privilege,
        isActive: u.IsActive !== undefined ? u.IsActive : u.isActive,
        fpCount: u.FPCount !== undefined ? u.FPCount : u.fpCount,
        faceCount: u.FaceCount !== undefined ? u.FaceCount : u.faceCount
      }));
    } catch (e) {
      console.error("Fetch users from device failed:", e);
      return [];
    }
  }

  async syncLogsToSupabase(logs: BiometricLog[]) {
    if (!supabase || !Array.isArray(logs) || logs.length === 0) return;
    
    const attendanceData = logs
      .filter(log => log && log.userId && log.ioTime) // Filter out invalid logs
      .map(log => ({
        student_id: log.userId,
        student_name: log.userName || 'Unknown User',
        class_name: 'Biometric Sync',
        status: 'present',
        date: log.ioTime.includes('T') ? log.ioTime.split('T')[0] : log.ioTime,
        updated_at: new Date().toISOString()
      }));

    if (attendanceData.length === 0) return;

    // Deduplicate by student_id and date to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueAttendanceData = Array.from(
      attendanceData.reduce((acc, current) => {
        const key = `${current.student_id}-${current.date}`;
        // Keep the latest one if there are multiple logs for the same day
        acc.set(key, current);
        return acc;
      }, new Map<string, any>()).values()
    );

    try {
      const { error } = await supabase.from('attendance_logs').upsert(uniqueAttendanceData, { onConflict: 'student_id,date' });
      if (error) throw error;
    } catch (e) {
      console.error("Sync to Supabase failed:", e);
    }
  }

  async uploadUser(user: BiometricUser, deviceKey: string) {
    await this.initialize();
    if (!this.token || !this.baseUrl) return;
    try {
      await this.proxyFetch(`${this.baseUrl}/api/DeviceCommand/UploadUser`, {
        method: 'POST',
        body: [{
          UserId: user.userId,
          UserName: user.userName,
          CardNumber: user.cardNumber,
          Password: user.password || "",
          AccessLevel: user.accessLevel,
          DeviceKeys: [deviceKey],
          OnlineEnrollment: false,
          UploadBiometricDataIfAvailable: true,
          FingerPrintUpload: true,
          FaceUpload: true,
          CardUpload: true,
          PasswordUpload: true
        }]
      });
    } catch (e) {
      console.error("Upload user failed:", e);
      throw e;
    }
  }

  async deleteUserFromDevice(userId: string, deviceKey: string) {
    await this.initialize();
    if (!this.token || !this.baseUrl) return;
    try {
      // Correct endpoint per OpenAPI spec: POST /api/DeviceCommand/DeleteUser
      // Takes an array of DeleteUserDTO: { UserId: string, DeviceKeys: string[] }
      await this.proxyFetch(`${this.baseUrl}/api/DeviceCommand/DeleteUser`, {
        method: 'POST',
        body: [{
          UserId: userId,
          DeviceKeys: [deviceKey]
        }]
      });
    } catch (e) {
      console.error("Delete user failed:", e);
      throw e;
    }
  }
  async fetchCommands(deviceKey: string): Promise<any[]> {
    await this.initialize();
    if (!this.token || !this.baseUrl) return [];
    try {
      const encodedKey = encodeURIComponent(deviceKey);
      const endpoints = [
        `${this.baseUrl}/api/DeviceCommand/GetAllCommands?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/DeviceCommand/GetCommands?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/DeviceCommand/GetDeviceCommands?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/DeviceCommand/GetList?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/DeviceCommand/GetAll?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/DeviceCommand/${encodedKey}`,
        `${this.baseUrl}/api/DeviceCommand?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/DeviceCommand`,
        `${this.baseUrl}/api/Command/GetAllCommands?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/Command/GetCommands?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/Command/GetList?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/Command/GetAll?deviceKey=${encodedKey}`,
        `${this.baseUrl}/api/Command/${encodedKey}`,
        `${this.baseUrl}/api/Command`
      ];

      let allCommands: any[] = [];
      let foundList = false;

      for (const url of endpoints) {
        try {
          console.log(`Attempting to fetch commands from: ${url}`);
          const response = await this.proxyFetch(url);
          const data = await response.json();
          
          if (Array.isArray(data)) {
            allCommands = data;
            if (allCommands.length > 0) {
              foundList = true;
              break;
            }
          } else if (data && typeof data === 'object' && !Array.isArray(data)) {
            // Check if it's a wrapper object with a list inside
            const possibleList = data.data || data.items || data.commands || data.results || data.Commands || data.Data;
            if (Array.isArray(possibleList)) {
              allCommands = possibleList;
              foundList = true;
              break;
            }
            
            // If it's a single object, wrap it but keep looking for a list if possible
            allCommands = [data];
            // If the URL specifically targeted this device, we might only get one
            if (url.includes(encodedKey) && !url.includes('GetAll')) {
              // We'll keep this one but continue to see if a list endpoint exists
              continue; 
            }
          }
        } catch (e: any) {
          if (e.message?.includes('404')) continue;
          console.warn(`Command fetch failed for ${url}:`, e.message);
        }
      }
      
      // Filter by device key if we fetched a global list or multiple devices
      if (allCommands.length > 0) {
          const firstCmd = allCommands[0];
          const hasKeyField = firstCmd.DeviceKey || firstCmd.deviceKey || firstCmd.SerialNumber || firstCmd.serialNumber;
          
          if (hasKeyField) {
            allCommands = allCommands.filter((c: any) => {
              const cmdKey = c.DeviceKey || c.deviceKey || c.SerialNumber || c.serialNumber || c.device_key;
              return !deviceKey || String(cmdKey) === String(deviceKey);
            });
          }
      }

      // Sort by create time descending if available
      allCommands.sort((a, b) => {
        const timeA = new Date(a.CreatedOn || a.CreateTime || a.createTime || 0).getTime();
        const timeB = new Date(b.CreatedOn || b.CreateTime || b.createTime || 0).getTime();
        return timeB - timeA;
      });

      return allCommands.map((c: any) => ({
        id: c.Id || c.id,
        commandType: c.CommandType || c.commandType,
        status: c.CommandStatus || c.Status || c.status,
        createTime: c.CreatedOn || c.CreateTime || c.createTime,
        responseTime: c.UpdatedOn || c.ResponseTime || c.responseTime,
        title: c.CommandTitle || c.title,
        executionResult: c.ExecutionResult || c.executionResult,
        createdBy: c.CreatedBy || c.createdBy
      }));
    } catch (e) {
      console.error("Fetch commands failed:", e);
      return [];
    }
  }

  async deleteCommand(commandId: number): Promise<boolean> {
    await this.initialize();
    if (!this.token || !this.baseUrl) return false;

    const endpoints = [
      { url: `${this.baseUrl}/api/DeviceCommand/Delete?id=${commandId}`, method: 'DELETE' },
      { url: `${this.baseUrl}/api/DeviceCommand/${commandId}`, method: 'DELETE' },
      { url: `${this.baseUrl}/api/DeviceCommand/Delete?id=${commandId}`, method: 'POST' },
      { url: `${this.baseUrl}/api/DeviceCommand/Delete?id=${commandId}`, method: 'GET' },
      { url: `${this.baseUrl}/api/DeviceCommand/DeleteCommand?id=${commandId}`, method: 'DELETE' },
      { url: `${this.baseUrl}/api/DeviceCommand/DeleteCommand?id=${commandId}`, method: 'POST' },
      { url: `${this.baseUrl}/api/DeviceCommand/DeleteCommand?id=${commandId}`, method: 'GET' },
      { url: `${this.baseUrl}/api/Command/Delete?id=${commandId}`, method: 'DELETE' },
      { url: `${this.baseUrl}/api/Command/Delete?id=${commandId}`, method: 'GET' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.proxyFetch(endpoint.url, {
          method: endpoint.method
        });
        if (response.ok) return true;
      } catch (e) {
        console.warn(`Delete command failed for ${endpoint.url}:`, e);
      }
    }
    return false;
  }
}

export const biometricService = new BiometricService();
