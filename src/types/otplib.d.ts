declare module '@otplib/preset-browser' {
  interface AuthenticatorOptions {
    token: string;
    secret: string;
  }

  interface Authenticator {
    generateSecret(): string;
    verify(options: AuthenticatorOptions): boolean;
    keyuri(email: string, service: string, secret: string): string;
  }

  export const authenticator: Authenticator;
} 