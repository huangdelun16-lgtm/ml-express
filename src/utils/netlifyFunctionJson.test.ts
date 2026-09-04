import { LOCAL_FUNCTIONS_MISSING, parseNetlifyFunctionJson } from './netlifyFunctionJson';

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

  it('rejects CRA HTML fallback as a missing-functions error', () => {
    expect(() =>
      parseNetlifyFunctionJson('<!DOCTYPE html><html></html>', {
        status: 200,
        headers: headers('text/html; charset=utf-8'),
      }),
    ).toThrow(LOCAL_FUNCTIONS_MISSING);
  });
});
