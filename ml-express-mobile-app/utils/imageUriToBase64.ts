/** 把本地图片 URI 转成纯 base64（无 data: 前缀）。失败返回空字符串。 */
export async function imageUriToBase64(uri: string): Promise<string> {
  if (!uri) return '';
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      const tid = setTimeout(() => reject(new Error('Timeout')), 8000);
      reader.onloadend = () => {
        clearTimeout(tid);
        const result = typeof reader.result === 'string' ? reader.result : '';
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => {
        clearTimeout(tid);
        reject(reader.error || new Error('read failed'));
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}
