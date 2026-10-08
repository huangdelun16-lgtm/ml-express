import { LOCAL_FUNCTIONS_MISSING, fetchNetlifyWithRetry, parseNetlifyFunctionJson } from './netlifyFunctionJson';

function headers(contentType: string) {
  return {
    get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
  };
}

describe('parseNetlifyFunctionJson', () => {
  it('parses JSON from functions', () => {
    expect(
      parseNetlifyFunctionJson(
        '{"success":false,"error":"密码错误"}',
        { status: 401, headers: headers('application/json') },
      ),
    ).toEqual({ success: false, error: '密码错误' });
  });

  it('retries gateway failures and keeps a 401', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock
      .mockResolvedValueOnce({ status: 504 } as Response)
      .mockResolvedValueOnce({ status: 200 } as Response);
    const ok = await fetchNetlifyWithRetry('/.netlify/functions/admin-password', {}, 3);
    expect(ok.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({ status: 401 } as Response);
    const denied = await fetchNetlifyWithRetry('/.netlify/functions/admin-password', {}, 3);
    expect(denied.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });

  it('rejects CRA HTML fallback as a missing-functions error', () => {
    expect(() =>
      parseNetlifyFunctionJson('<!DOCTYPE html><html></html>', {
        status: 200,
        headers: headers('text/html; charset=utf-8'),
      }),
    ).toThrow(LOCAL_FUNCTIONS_MISSING);
  });
});
