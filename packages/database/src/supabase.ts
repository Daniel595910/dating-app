/**
 * Supabase Client Configuration
 * Centralized Supabase client initialization with proper typing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey ? : string;
  jwtSecret ? : string;
}

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient < Database > ;
  private adminClient: SupabaseClient < Database > | null = null;
  
  private constructor(config: SupabaseConfig) {
    this.client = createClient < Database > (config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    
    if (config.serviceRoleKey) {
      this.adminClient = createClient < Database > (config.url, config.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }
  
  public static getInstance(config ? : SupabaseConfig): SupabaseService {
    if (!SupabaseService.instance && config) {
      SupabaseService.instance = new SupabaseService(config);
    }
    if (!SupabaseService.instance) {
      throw new Error('SupabaseService must be initialized with config first');
    }
    return SupabaseService.instance;
  }
  
  public getClient(): SupabaseClient < Database > {
    return this.client;
  }
  
  public getAdminClient(): SupabaseClient < Database > {
    if (!this.adminClient) {
      throw new Error('Admin client not initialized. Service role key required.');
    }
    return this.adminClient;
  }
  
  public async healthCheck(): Promise < boolean > {
    try {
      const { error } = await this.client.from('users').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

// Helper function to create a database client
export function createDatabaseClient(config: SupabaseConfig): SupabaseService {
  return SupabaseService.getInstance(config);
}

// Type-safe database error handler
export function handleDatabaseError(error: any): never {
  if (error?.code === 'PGRST116') {
    throw new DatabaseError('Resource not found', 'NOT_FOUND', 404);
  }
  
  if (error?.code === '23505') {
    throw new DatabaseError('Duplicate entry', 'DUPLICATE_ENTRY', 409);
  }
  
  if (error?.code === '23503') {
    throw new DatabaseError('Foreign key violation', 'FOREIGN_KEY_VIOLATION', 409);
  }
  
  if (error?.code === '23514') {
    throw new DatabaseError('Check constraint violation', 'CHECK_VIOLATION', 422);
  }
  
  if (error?.code === '42501') {
    throw new DatabaseError('Permission denied', 'PERMISSION_DENIED', 403);
  }
  
  if (error?.code === '42P01') {
    throw new DatabaseError('Table not found', 'TABLE_NOT_FOUND', 500);
  }
  
  throw new DatabaseError(
    error?.message || 'Database error occurred',
    'DATABASE_ERROR',
    500
  );
}

export class DatabaseError extends Error {
  public code: string;
  public status: number;
  
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.status = status;
  }
}