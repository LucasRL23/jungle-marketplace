// The visual shell can render while MSW starts, but network consumers must wait.
let resolve!: () => void;
let reject!: (error: unknown) => void;
export const mocksReady = new Promise<void>((ready, fail) => {
  resolve = ready;
  reject = fail;
});
export const mockStartup = { resolve, reject };
