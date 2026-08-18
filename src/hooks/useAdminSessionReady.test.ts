import { isAdminWorkspacePath } from './useAdminSessionReady';

describe('isAdminWorkspacePath', () => {
  it('excludes login and non-admin routes', () => {
    expect(isAdminWorkspacePath('/admin/login')).toBe(false);
    expect(isAdminWorkspacePath('/admin/login/')).toBe(false);
    expect(isAdminWorkspacePath('/')).toBe(false);
    expect(isAdminWorkspacePath('/login')).toBe(false);
  });

  it('includes authenticated admin modules', () => {
    expect(isAdminWorkspacePath('/admin/dashboard')).toBe(true);
    expect(isAdminWorkspacePath('/admin/proxy-purchase')).toBe(true);
    expect(isAdminWorkspacePath('/admin/metric-management')).toBe(true);
  });
});
