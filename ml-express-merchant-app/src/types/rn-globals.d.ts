export {};

declare global {
  // React Native runtime has `global`; DOM lib alone does not.
  // eslint-disable-next-line no-var
  var global: typeof globalThis;

  namespace NodeJS {
    type Timeout = ReturnType<typeof setTimeout>;
  }
}
