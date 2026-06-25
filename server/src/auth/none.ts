import type { AuthProvider } from './types.ts';

export class NoneProvider implements AuthProvider {
  async resolve(): Promise<null> {
    return null;
  }
}
