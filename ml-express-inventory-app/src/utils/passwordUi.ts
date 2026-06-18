export type PasswordStrength = {
  score: number;
  label: string;
  color: string;
  barColor: string;
};

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const len = password.length;
  if (!len) {
    return { score: 0, label: '请输入新密码', color: '#94a3b8', barColor: '#334155' };
  }
  if (len < 6) {
    return { score: 1, label: '过短，至少 6 位', color: '#f87171', barColor: '#ef4444' };
  }
  let score = 2;
  if (len >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) {
    return { score: 2, label: '强度一般', color: '#fbbf24', barColor: '#f59e0b' };
  }
  if (score === 3) {
    return { score: 3, label: '强度良好', color: '#34d399', barColor: '#10b981' };
  }
  return { score: 4, label: '强度优秀', color: '#6ee7b7', barColor: '#059669' };
}

export function generateSecurePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
