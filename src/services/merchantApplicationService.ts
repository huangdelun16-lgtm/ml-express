import { adminAuthenticatedFetch } from './authService';

export type MerchantApplicationStatus = 'pending' | 'approved' | 'rejected';

export type MerchantApplication = {
  id: string;
  store_name: string;
  store_type: string;
  region: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string | null;
  manager_name: string;
  manager_phone: string;
  operating_hours: string;
  cod_settlement_day: string;
  facilities: string[];
  notes: string | null;
  applicant_name: string | null;
  salesperson_name: string | null;
  application_date: string | null;
  license_document_urls: string[];
  status: MerchantApplicationStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_store_id: string | null;
  provisioned_store_code: string | null;
  created_at: string;
  updated_at: string;
};

export type MerchantApplicationCredentials = {
  storeCode: string;
  password: string;
  storeName: string;
};

async function parseJsonResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `请求失败 (${response.status})`);
  }
  return payload;
}

export async function fetchMerchantApplications(
  status: MerchantApplicationStatus | 'all' = 'pending',
): Promise<{ applications: MerchantApplication[]; pendingCount: number }> {
  const response = await adminAuthenticatedFetch(
    `/.netlify/functions/merchant-admin-applications?status=${encodeURIComponent(status)}`,
    { credentials: 'include' },
  );
  const payload = await parseJsonResponse(response);
  return {
    applications: payload.applications ?? [],
    pendingCount: payload.pendingCount ?? 0,
  };
}

/** 仅拉取待审核入驻申请数量（Admin 待办 / 合伙店铺提示） */
export async function fetchPendingMerchantApplicationCount(): Promise<number> {
  try {
    const { pendingCount } = await fetchMerchantApplications('pending');
    return pendingCount;
  } catch {
    return 0;
  }
}

export async function fetchMerchantApplicationDetail(
  id: string,
): Promise<{ application: MerchantApplication; suggested_store_code: string | null }> {
  const response = await adminAuthenticatedFetch(
    `/.netlify/functions/merchant-admin-applications?id=${encodeURIComponent(id)}`,
    { credentials: 'include' },
  );
  const payload = await parseJsonResponse(response);
  return {
    application: payload.application as MerchantApplication,
    suggested_store_code: payload.suggested_store_code ?? null,
  };
}

export async function approveMerchantApplication(input: {
  applicationId: string;
  review_notes?: string;
  password?: string;
  store_code?: string;
}): Promise<{ application: MerchantApplication; credentials: MerchantApplicationCredentials }> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/merchant-admin-applications', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve', ...input }),
  });
  const payload = await parseJsonResponse(response);
  return {
    application: payload.application,
    credentials: payload.credentials,
  };
}

export async function rejectMerchantApplication(input: {
  applicationId: string;
  review_notes?: string;
}): Promise<MerchantApplication> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/merchant-admin-applications', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reject', ...input }),
  });
  const payload = await parseJsonResponse(response);
  return payload.application as MerchantApplication;
}
