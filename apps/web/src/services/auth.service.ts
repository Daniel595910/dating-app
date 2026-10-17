/**
 * Auth Service
 *
 * Single source of truth for all authentication operations.
 * Wraps Supabase auth calls with typed return values so callers
 * never have to think about Supabase's error shapes.
 */

import { supabase } from '@/config/supabase.client';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignUpResult extends AuthResult {
  user?: User;
  needsEmailVerification?: boolean;
}

export interface OtpVerifyResult extends AuthResult {
  session?: Session;
}

class AuthService {
  /**
   * Email + password signup.
   * Names go into user_metadata so a DB trigger can populate
   * profiles.first_name / last_name automatically.
   */
  async signUpWithPassword(input: SignUpInput): Promise<SignUpResult> {
    const { email, password, firstName, lastName } = input;

    const displayName = [firstName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(' ');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          display_name: displayName,
        },
        emailRedirectTo: `${window.location.origin}/confirm-email`,
      },
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }

    const needsVerification = Boolean(data.user && !data.session);

    return {
      success: true,
      user: data.user ?? undefined,
      needsEmailVerification: needsVerification,
    };
  }

  /**
   * Email + password sign-in.
   */
  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true };
  }

  /**
   * Google OAuth. Redirects the browser to Google, then back to
   * /auth/callback where the session is picked up.
   */
  async signInWithGoogle(): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true };
  }

  /**
   * Verify a 6-digit OTP code sent to the user's email.
   * Used for signup confirmation when the user is on a different device
   * and can't click the link.
   */
  async verifySignupOtp(email: string, token: string): Promise<OtpVerifyResult> {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'signup',
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true, session: data.session ?? undefined };
  }

  /**
   * Verify a recovery OTP (password reset code).
   */
  async verifyRecoveryOtp(email: string, token: string): Promise<OtpVerifyResult> {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true, session: data.session ?? undefined };
  }

  /**
   * Resend the signup confirmation email.
   */
  async resendSignupEmail(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true };
  }

  /**
   * Request a password reset. Sends the recovery email.
   */
  async requestPasswordReset(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true };
  }

  /**
   * Change the signed-in user's password.
   * Requires an active session (user must be logged in).
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true };
  }

  /**
   * Change the signed-in user's email.
   * Supabase sends a confirmation to the new address.
   */
  async updateEmail(newEmail: string): Promise<AuthResult> {
    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true };
  }

  /**
   * Sign out the current session.
   */
  // ---------- Login device trust ----------

  /**
   * Asks the server whether the current device is already trusted.
   * Reads the device_token from localStorage; if none, returns false.
   */
  async checkDeviceTrust(userId: string): Promise<boolean> {
    let deviceToken: string | null = null;
    try {
      deviceToken = localStorage.getItem('device_token');
    } catch {
      deviceToken = null;
    }
    if (!deviceToken || !userId) return false;

    try {
      const { data, error } = await supabase.functions.invoke('check-device-trust', {
        body: { device_token: deviceToken, user_id: userId },
      });
      if (error) return false;
      return Boolean((data as any)?.trusted);
    } catch {
      return false;
    }
  }

  /**
   * Triggers the Supabase magic-link email for a new device login.
   * The email goes through the project's configured SMTP.
   */
  async sendNewDeviceMagicLink(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/new-device`,
      },
    });

    if (error) {
      return { success: false, error: this.translateError(error.message) };
    }
    return { success: true };
  }

  /**
   * Called on /auth/new-device after the magic-link lands.
   * Trusts this device for 30 days and stores the token locally.
   * Returns true on success.
   */
  async trustCurrentDevice(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('trust-device', {
        body: {},
      });
      if (error) {
        console.error('trust-device failed:', error);
        return false;
      }
      const token = (data as any)?.device_token;
      if (!token) return false;
      try {
        localStorage.setItem('device_token', token);
      } catch {
        return false;
      }
      return true;
    } catch (err) {
      console.error('trust-device exception:', err);
      return false;
    }
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  /**
   * Get the current session, if any.
   */
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  /**
   * Get the current user, if any.
   */
  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  /**
   * Subscribe to auth state changes. Returns an unsubscribe function.
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session);
    });
    return () => subscription.unsubscribe();
  }

  /**
   * Turn Supabase's raw error strings into user-facing text.
   */
  private translateError(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('user already registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (lower.includes('invalid login credentials')) {
      return 'Incorrect email or password.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Please verify your email before signing in.';
    }
    if (lower.includes('password should be at least')) {
      return 'Password must be at least 8 characters.';
    }
    if (lower.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (lower.includes('token has expired') || lower.includes('invalid token')) {
      return 'That code has expired or is invalid. Request a new one.';
    }

    return message;
  }
}

export const authService = new AuthService();