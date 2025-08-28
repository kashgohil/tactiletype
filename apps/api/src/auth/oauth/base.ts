import { db, oauthAccounts, users } from '@tactile/database';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import { CSRFProtection } from '../../utils/csrf';

export interface OAuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthProvider {
  name: string;
  getAuthUrl(state: string): string;
  handleCallback(code: string, state: string): Promise<OAuthUser>;
  generateOAuthState(): string;
  validateOAuthState(state: string): boolean;
}

export abstract class BaseOAuthProvider implements OAuthProvider {
  abstract name: string;
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  abstract getAuthUrl(state: string): string;
  abstract handleCallback(code: string, state: string): Promise<OAuthUser>;

  protected async generateUniqueUsername(
    name: string,
    email: string
  ): Promise<string> {
    // Generate base username from name or email
    const baseUsername = name
      ? name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 20)
      : (email.split('@')[0] || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 20);

    let username = baseUsername;
    let counter = 1;

    while (true) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!existingUser) {
        return username;
      }

      username = `${baseUsername}${counter}`;
      counter++;

      if (counter > 4) {
        // Fallback to random username if we can't find a unique one
        username = `user${Date.now().toString().slice(-6)}`;
        break;
      }
    }

    return username;
  }

  /**
   * Generate a secure OAuth state parameter for CSRF protection
   */
  generateOAuthState(): string {
    return CSRFProtection.generateOAuthToken();
  }

  /**
   * Validate OAuth state parameter
   */
  validateOAuthState(state: string): boolean {
    return CSRFProtection.validateOAuthToken(state);
  }

  async findOrCreateUser(
    oauthUser: OAuthUser
  ): Promise<{ user: DatabaseUser; isNew: boolean }> {
    // Check if OAuth account already exists
    const existingOAuthAccount = await db.query.oauthAccounts.findFirst({
      where: eq(oauthAccounts.providerId, oauthUser.id),
      with: {
        user: true,
      },
    });

    if (existingOAuthAccount) {
      return { user: existingOAuthAccount.user, isNew: false };
    }

    // Check if user with this email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, oauthUser.email),
    });

    if (existingUser) {
      // Link OAuth account to existing user
      await db.insert(oauthAccounts).values({
        userId: existingUser.id,
        provider: this.name,
        providerId: oauthUser.id,
      });

      return { user: existingUser, isNew: false };
    }

    // Create new user
    const username = await this.generateUniqueUsername(
      oauthUser.name,
      oauthUser.email
    );

    const [newUser] = await db
      .insert(users)
      .values({
        email: oauthUser.email,
        username,
        avatarUrl: oauthUser.avatar,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        passwordHash: users.passwordHash,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!newUser) {
      throw new Error('Failed to create new user');
    }

    // Create OAuth account
    await db.insert(oauthAccounts).values({
      userId: newUser.id,
      provider: this.name,
      providerId: oauthUser.id,
    });

    return { user: newUser, isNew: true };
  }

  async generateJWT(user: DatabaseUser): Promise<string> {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    return await sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      },
      JWT_SECRET
    );
  }
}
