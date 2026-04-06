export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  jti?: string;
  sessionId?: string;
}
