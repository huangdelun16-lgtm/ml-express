import { Platform } from 'react-native';

function rndInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const now = () => new Date().toISOString();

let mockPackages = Array.from({ length: 18 }).map((_, i) => ({
  id: `PKG${1000 + i}`,
  trackingNumber: `ML${Date.now()}${i}`,
  status: i % 4 === 0 ? '已入库' : i % 4 === 1 ? '待入库' : i % 4 === 2 ? '运输中' : '已签收',
  weightKg: Number((Math.random() * 8 + 0.5).toFixed(1)),
  createdAt: now(),
}));

let mockShipments = Array.from({ length: 4 }).map((_, i) => ({
  id: `SHP${2000 + i}`,
  freightNo: `FR${Date.now()}${i}`,
  packages: mockPackages.slice(i, i + rndInt(1, 4)).map(x => x.trackingNumber),
  createdAt: now(),
}));

export const mockApi = {
  async createPackage(pkg: { trackingNumber: string; [k: string]: any }) {
    return { ...pkg, id: `PKG${rndInt(3000, 9999)}`, createdAt: now(), status: pkg.status ?? '已入库' };
  },
  async createShipment(freightNo: string) {
    const exist = mockShipments.find(s => s.freightNo === freightNo);
    if (exist) return exist;
    const item = { id: `SHP${rndInt(4000, 9999)}`, freightNo, createdAt: now(), packages: [] as string[] };
    mockShipments = [item, ...mockShipments];
    return item;
  },
  async addPackagesToShipment(_shipmentId: string, trackingNumbers: string[]) {
    return { ok: true, added: trackingNumbers.length };
  },

  // Business lists
  async listInbound() {
    return mockPackages.filter(p => p.status === '待入库' || p.status === '已入库');
  },
  async listOutbound() {
    return mockShipments.map(s => ({ id: s.id, freightNo: s.freightNo, count: s.packages.length, createdAt: s.createdAt }));
  },
  async listFinance() {
    return [
      { id: 'FIN001', type: '收入', amount: 1280, note: '运费', date: now() },
      { id: 'FIN002', type: '支出', amount: 320, note: '仓储', date: now() },
    ];
  },
  async listReportsSummary() {
    return {
      todayInbound: rndInt(20, 60),
      todayOutbound: rndInt(10, 40),
      monthRevenue: rndInt(50000, 120000),
      monthPackages: rndInt(1200, 3500),
    };
  },
  async listCustomers() {
    return Array.from({ length: 8 }).map((_, i) => ({ id: `C${i + 1}`, name: `客户 ${i + 1}`, phone: `09${rndInt(100000000, 999999999)}` }));
  },

  // Helpers for inbound page
  async searchPackages(keyword: string) {
    const k = keyword.trim().toLowerCase();
    if (!k) return mockPackages;
    return mockPackages.filter(p => p.trackingNumber.toLowerCase().includes(k));
  },
  async markInbound(ids: string[]) {
    let changed = 0;
    mockPackages = mockPackages.map(p => {
      if (ids.includes(p.id)) { changed += 1; return { ...p, status: '已入库' }; }
      return p;
    });
    return { ok: true, changed };
  },
  async deletePackages(ids: string[]) {
    const before = mockPackages.length;
    mockPackages = mockPackages.filter(p => !ids.includes(p.id));
    return { ok: true, removed: before - mockPackages.length };
  },
};

export function isMockEnabled(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    const v = window.localStorage.getItem('ml_mock');
    // 默认开启；显式设置为 '0' 才关闭
    return v !== '0';
  } catch {
    return true;
  }
}


