import jwt from "jsonwebtoken";
import type { FastifyRequest } from "fastify";
import { settings } from "../core/config.js";

const ALGORITHM = settings.ALGORITHM as jwt.Algorithm;
const SECRET = settings.SECRET_KEY;
const DEFAULT_EXPIRES_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES;

/**
 * Access token payload (claims).
 * - sub: user uid (subject)
 * - role: user role
 * - username: optional, for display
 */
export interface AccessTokenPayload {
  sub: string;
  role?: string;
  username?: string;
  iat?: number;
  exp?: number;
}

/**
 * Options for signing a token.
 */
export interface SignOptions {
  /** Expiration in minutes. Default from config. */
  expiresInMinutes?: number;
  /** Issuer (optional). */
  issuer?: string;
  /** Audience (optional). */
  audience?: string;
}

/**
 * Generate an access token for a user.
 * @param payload - Claims (sub = uid, role, username)
 * @param options - Sign options
 * @returns Signed JWT string
 */
export function sign(
  payload: Omit<AccessTokenPayload, "iat" | "exp">,
  options?: SignOptions
): string {
  const expiresInMinutes = options?.expiresInMinutes ?? DEFAULT_EXPIRES_MINUTES;
  const expiresIn = `${expiresInMinutes}m`;

  const signOptions: jwt.SignOptions = {
    algorithm: ALGORITHM,
    expiresIn,
  };
  if (options?.issuer) signOptions.issuer = options.issuer;
  if (options?.audience) signOptions.audience = options.audience;

  return jwt.sign(payload, SECRET, signOptions);
}

/**
 * Verify a token and return the payload.
 * @param token - JWT string
 * @returns Payload or null if invalid/expired
 */
export function verify(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET, {
      algorithms: [ALGORITHM],
    }) as jwt.JwtPayload;

    if (typeof decoded !== "object" || decoded === null || !decoded.sub) {
      return null;
    }

    return {
      sub: decoded.sub as string,
      role: decoded.role as string | undefined,
      username: decoded.username as string | undefined,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a token or throw.
 * @param token - JWT string
 * @returns Payload
 * @throws Error when token is invalid or expired
 */
export function verifyOrThrow(token: string): AccessTokenPayload {
  const payload = verify(token);
  if (!payload) {
    throw new Error("Invalid or expired token");
  }
  return payload;
}

/**
 * Decode a token without verifying signature (for logging/debug only).
 * Do not use for authorization.
 */
export function decode(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;
    if (typeof decoded !== "object" || decoded === null || !decoded.sub) {
      return null;
    }
    return {
      sub: decoded.sub as string,
      role: decoded.role as string | undefined,
      username: decoded.username as string | undefined,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from request.
 * Checks: Authorization: Bearer <token>
 * @param request - Fastify request
 * @returns Token string or null
 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header || typeof header !== "string") {
    return null;
  }
  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }
  const token = parts[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Create payload from user record (for sign).
 */
export function payloadFromUser(user: {
  uid: string;
  role?: string;
  username?: string;
}): Omit<AccessTokenPayload, "iat" | "exp"> {
  return {
    sub: user.uid,
    role: user.role,
    username: user.username,
  };
}
