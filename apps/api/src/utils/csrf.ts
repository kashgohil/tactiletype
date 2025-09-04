import { randomBytes } from 'crypto';

interface Token {
  token: string;
  expiresAt: number;
}

const store = new Map<string, Token>();

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
  private static readonly DEVELOPMENT_MODE =
    process.env.NODE_ENV !== 'production';

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
      console.error(
        'OAuth state validation failed - token not found in store:',
        {
          token: token.substring(0, 8) + '...',
          storeSize: store.size,
          allTokens: Array.from(store.keys()).map(
            (t) => t.substring(0, 8) + '...'
          ),
        }
      );
      return false;
    }

    if (storedToken.expiresAt < Date.now()) {
      console.error('OAuth state validation failed - token expired:', {
        token: token.substring(0, 8) + '...',
        expiredAt: new Date(storedToken.expiresAt).toISOString(),
        now: new Date().toISOString(),
      });
      store.delete(token);
      return false;
    }

    console.log(
      'OAuth state validation successful for token:',
      token.substring(0, 8) + '...'
    );
    store.delete(token);
    return true;
  }
}
