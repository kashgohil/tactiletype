import { BaseOAuthProvider, type OAuthUser } from './base';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  html_url: string;
  type: string;
}

interface GitHubEmailInfo {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility?: string;
}

export class GitHubOAuthProvider extends BaseOAuthProvider {
  name = 'github';

  getAuthUrl(state: string): string {
    const baseUrl = 'https://github.com/login/oauth/authorize';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email',
      state,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<OAuthUser> {
    console.log('OAuth state:', state);

    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = (await tokenResponse.json()) as GitHubTokenResponse;

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description}`);
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from GitHub');
    }

    const userData = (await userResponse.json()) as GitHubUserInfo;

    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails = (await emailsResponse.json()) as Array<GitHubEmailInfo>;
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        email = primaryEmail ? primaryEmail.email : emails[0]?.email;
      }
    }

    if (!email) {
      throw new Error('Could not retrieve email from GitHub');
    }

    return {
      id: userData.id.toString(),
      email,
      name: userData.name || userData.login,
      avatar: userData.avatar_url,
    };
  }
}
