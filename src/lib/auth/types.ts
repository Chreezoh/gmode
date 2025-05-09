/**
 * Auth module type definitions
 */

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication session information
 */
export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegistrationData {
  email: string;
  password: string;
  fullName?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password update data
 */
export interface PasswordUpdateData {
  password: string;
  token: string;
}
