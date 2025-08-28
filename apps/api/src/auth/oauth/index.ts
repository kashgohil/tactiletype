import { BaseOAuthProvider } from './base';
import { GitHubOAuthProvider } from './github';
import { GoogleOAuthProvider } from './google';

export { BaseOAuthProvider, GitHubOAuthProvider, GoogleOAuthProvider };

export class OAuthProviderFactory {
  private static providers: Map<string, BaseOAuthProvider> = new Map();

  static registerProvider(name: string, provider: BaseOAuthProvider) {
    this.providers.set(name, provider);
  }

  static getProvider(name: string): BaseOAuthProvider | undefined {
    return this.providers.get(name);
  }

  static getAllProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  static initialize() {
    // Initialize providers from environment variables
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

    if (googleClientId && googleClientSecret) {
      const googleProvider = new GoogleOAuthProvider(
        googleClientId,
        googleClientSecret,
        `${baseUrl}/api/auth/callback/google`
      );
      this.registerProvider('google', googleProvider);
    }

    if (githubClientId && githubClientSecret) {
      const githubProvider = new GitHubOAuthProvider(
        githubClientId,
        githubClientSecret,
        `${baseUrl}/api/auth/callback/github`
      );
      this.registerProvider('github', githubProvider);
    }
  }
}
