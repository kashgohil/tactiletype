import { randomBytes } from 'crypto';

interface Token {
  token: string;
  expiresAt: number;
}

const store = new Map<string, Token>();

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

  /**
   * Generate a new CSRF token
   */
  static generateToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  static generateOAuthToken(): string {
    const token = randomBytes(this.TOKEN_LENGTH).toString('hex');
    const expiresAt = Date.now() + this.TOKEN_EXPIRY;

    store.set(token, { token, expiresAt });

    return token;
  }

  /**
   * Validate a OAuth token
   * @param token The OAuth token to validate
   * @returns True if the token is valid, false otherwise
   */
  static validateOAuthToken(token: string): boolean {
    const storedToken = store.get(token);

    if (!storedToken) {
      return false;
    }

    if (storedToken.expiresAt < Date.now()) {
      store.delete(token);
      return false;
    }

    store.delete(token);

    return true;
  }
}
