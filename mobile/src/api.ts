import axios, { AxiosInstance } from 'axios';
import { storage } from './storage';
import { isMockEnabled, mockApi } from './mockApi';

const BASE = 'https://market-link-express.com/.netlify/functions';

async function getAuthHeader() {
  const token = await storage.getItem('ml_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type UnauthorizedHandler = (status?: number, message?: string) => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setOnUnauthorized(handler: UnauthorizedHandler) { onUnauthorized = handler; }

class MlApi {
  private http: AxiosInstance;
  constructor() {
    this.http = axios.create({ baseURL: BASE });
    this.http.interceptors.response.use(
      (resp) => resp,
      async (error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          try { await storage.deleteItem('ml_token'); await storage.deleteItem('ml_token_payload'); } catch {}
          if (onUnauthorized) onUnauthorized(status, error?.response?.data?.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async addPackagesToShipment(shipmentId: string, trackingNumbers: string[]) {
    if (isMockEnabled()) return mockApi.addPackagesToShipment(shipmentId, trackingNumbers);
    const headers = await getAuthHeader();
    const r = await this.http.post('/transport-manage', { op: 'addPackages', shipmentId, trackingNumbers }, { headers });
    return r.data;
  }

  async createShipment(freightNo: string) {
    if (isMockEnabled()) return mockApi.createShipment(freightNo);
    const headers = await getAuthHeader();
    const r = await this.http.post('/transport-manage', { op: 'create', freightNo }, { headers });
    return r.data?.item;
  }

  async createPackage(pkg: {
    trackingNumber: string;
    sender?: string; receiver?: string;
    origin?: string; destination?: string;
    packageType?: string; weightKg?: number;
    dimensions?: { lengthCm?: number; widthCm?: number; heightCm?: number };
    fee?: number; status?: string; note?: string;
  }) {
    if (isMockEnabled()) return mockApi.createPackage(pkg);
    const headers = await getAuthHeader();
    const r = await this.http.post('/packages-manage', pkg, { headers });
    return r.data?.item;
  }
}

export const api = new MlApi();

