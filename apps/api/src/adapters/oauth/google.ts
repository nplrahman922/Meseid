import { env } from "../../config/env";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export interface GoogleOAuthAdapter {
  getAuthorizationUrl(state: string, redirectUriOverride?: string): string;
  exchangeCode(
    code: string,
    redirectUriOverride?: string
  ): Promise<{ tokens: GoogleTokens; profile: GoogleUserProfile }>;
}

export class DefaultGoogleOAuthAdapter implements GoogleOAuthAdapter {
  getAuthorizationUrl(state: string, redirectUriOverride?: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUriOverride || env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(
    code: string,
    redirectUriOverride?: string
  ): Promise<{ tokens: GoogleTokens; profile: GoogleUserProfile }> {
    // 1. Exchange auth code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUriOverride || env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${errText}`);
    }

    const tokens = (await tokenRes.json()) as GoogleTokens;

    // 2. Fetch user profile from userinfo endpoint
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      throw new Error(`Google userinfo fetch failed: ${errText}`);
    }

    const profile = (await profileRes.json()) as GoogleUserProfile;

    return { tokens, profile };
  }
}

let activeAdapter: GoogleOAuthAdapter = new DefaultGoogleOAuthAdapter();

export function getGoogleOAuthAdapter(): GoogleOAuthAdapter {
  return activeAdapter;
}

export function setGoogleOAuthAdapter(adapter: GoogleOAuthAdapter): void {
  activeAdapter = adapter;
}

export function resetGoogleOAuthAdapter(): void {
  activeAdapter = new DefaultGoogleOAuthAdapter();
}
