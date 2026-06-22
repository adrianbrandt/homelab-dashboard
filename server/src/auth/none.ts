import type { AuthProvider } from './types.ts';

export class NoneProvider implements AuthProvider {
  resolve(): null {
    return null;
  }
}
