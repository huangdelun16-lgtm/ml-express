/**
 * 用 PostgREST 读写 system_settings（admin-password / verify-admin 的 anon 或 service role）。
 */

function restHeaders(apiKey, extra = {}) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function fetchSettingsRows(supabaseUrl, apiKey, keys) {
  if (!supabaseUrl || !apiKey || !keys?.length) return [];
  const inList = keys.map((key) => `"${key}"`).join(',');
  const response = await fetch(
    `${supabaseUrl}/rest/v1/system_settings?settings_key=in.(${inList})&select=settings_key,settings_value,id`,
    { headers: restHeaders(apiKey) },
  );
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function upsertSettingValue(supabaseUrl, apiKey, { key, value, category, description, updatedBy }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/system_settings`, {
    method: 'POST',
    headers: restHeaders(apiKey, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({
      category: category || 'security',
      settings_key: key,
      settings_value: value,
      description: description || '',
      updated_by: updatedBy || 'system',
      updated_at: new Date().toISOString(),
    }),
  });
  return response.ok;
}

function settingMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    if (row?.settings_key) map[row.settings_key] = row.settings_value;
  });
  return map;
}

module.exports = {
  fetchSettingsRows,
  upsertSettingValue,
  settingMap,
};
