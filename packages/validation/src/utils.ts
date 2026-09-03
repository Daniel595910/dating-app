/**
 * Validation Utilities
 * Common validation helpers and type inference
 */

import { z } from 'zod';

// Common validation patterns
export const phoneRegex = /^\+?[1-9]\d{1,14}$/;
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const hexColorRegex = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;

// Common validation helpers
export const isValidPhone = (phone: string): boolean => phoneRegex.test(phone);
export const isValidEmail = (email: string): boolean => emailRegex.test(email);
export const isValidUrl = (url: string): boolean => urlRegex.test(url);
export const isValidSlug = (slug: string): boolean => slugRegex.test(slug);
export const isValidHexColor = (color: string): boolean => hexColorRegex.test(color);

// Type inference helper
export type InferSchema<T extends z.ZodType<any, any, any>> = z.infer<T>;

// Common error messages
export const ValidationMessages = {
  required: 'This field is required',
  email: 'Invalid email address',
  phone: 'Invalid phone number',
  url: 'Invalid URL',
  slug: 'Invalid slug format',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be at most ${max} characters`,
  min: (min: number) => `Must be at least ${min}`,
  max: (max: number) => `Must be at most ${max}`,
  positive: 'Must be a positive number',
  nonNegative: 'Must be a non-negative number',
  integer: 'Must be an integer',
  date: 'Invalid date',
  future: 'Must be in the future',
  past: 'Must be in the past',
  uuid: 'Invalid UUID',
  boolean: 'Must be a boolean',
  array: 'Must be an array',
  object: 'Must be an object',
  string: 'Must be a string',
  number: 'Must be a number',
} as const;

// Validation result type
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
  formattedErrors?: Record<string, string[]>;
}

// Helper to format Zod errors into a simple object
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.') || 'root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path]!.push(err.message);
  });
  
  return formatted;
}

// Helper to validate and format
export function validateWithSchema<T extends z.ZodType<any, any, any>>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error,
        formattedErrors: formatZodErrors(error),
      };
    }
    throw error;
  }
}

// Helper to safely validate
export function safeValidate<T extends z.ZodType<any, any, any>>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  return {
    success: false,
    errors: result.error,
    formattedErrors: formatZodErrors(result.error),
  };
}