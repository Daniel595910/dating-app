/**
 * Application Constants
 * Shared constants across the entire application
 */

// Application Information
export const APP_NAME = 'Dating App';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Regional Community Dating Platform';
export const APP_COPYRIGHT = `© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`;

// API Configuration
export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_SORT_ORDER = 'desc';

// Authentication
export const AUTH_TOKEN_KEY = 'dating_app_auth_token';
export const AUTH_REFRESH_TOKEN_KEY = 'dating_app_refresh_token';
export const AUTH_USER_KEY = 'dating_app_user';
export const AUTH_SESSION_DURATION_HOURS = 24;
export const AUTH_MAX_LOGIN_ATTEMPTS = 5;
export const AUTH_LOCKOUT_DURATION_MINUTES = 15;

// Password Requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIRE_UPPERCASE = true;
export const PASSWORD_REQUIRE_LOWERCASE = true;
export const PASSWORD_REQUIRE_NUMBER = true;
export const PASSWORD_REQUIRE_SPECIAL = true;

// Age Restrictions
export const MIN_AGE = 18;
export const MAX_AGE = 120;
export const AGE_VERIFICATION_REQUIRED = true;

// Community Configuration
export const DEFAULT_COMMUNITY_TYPE = 'country';
export const COMMUNITY_LEVELS = ['country', 'state', 'city'] as const;
export const MAX_COMMUNITY_MEMBERS = 1000000;
export const MAX_COMMUNITY_MODERATORS = 10;

// Content Limits
export const MAX_POST_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_BIO_LENGTH = 500;
export const MAX_MESSAGE_LENGTH = 10000;
export const MAX_TAGS_PER_POST = 20;
export const MAX_IMAGES_PER_POST = 10;
export const MAX_INTERESTS_PER_USER = 50;
export const MAX_LANGUAGES_PER_USER = 20;

// Match Configuration
export const MATCH_EXPIRY_DAYS = 30;
export const GETTING_TO_KNOW_DAYS = 7;
export const MATCH_SCORE_THRESHOLD = 60;
export const MAX_COMPATIBILITY_QUESTIONS = 30;

// VIP Configuration
export const VIP_LEVELS = ['free', 'basic', 'premium', 'vip'] as const;
export const VIP_POINT_EXPIRY_DAYS = 365;
export const MIN_VIP_POINTS = 0;
export const MAX_VIP_POINTS = 1000000;

// Rate Limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const RATE_LIMIT_AUTH_MAX = 10;
export const RATE_LIMIT_MESSAGE_MAX = 50;
export const RATE_LIMIT_POST_MAX = 20;
export const RATE_LIMIT_COMMENT_MAX = 30;

// File Upload
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// Moderation
export const MAX_REPORT_LENGTH = 1000;
export const MAX_REPORTS_PER_USER_DAY = 10;
export const AUTO_HIDE_THRESHOLD = 5;
export const AUTO_BAN_THRESHOLD = 10;

// Notification
export const NOTIFICATION_MAX_RETENTION_DAYS = 30;
export const NOTIFICATION_BATCH_SIZE = 50;
export const PUSH_NOTIFICATION_TIMEOUT_MS = 5000;

// Cache
export const CACHE_TTL_SECONDS = 300; // 5 minutes
export const CACHE_MAX_ITEMS = 10000;
export const CACHE_STALE_WHILE_REVALIDATE = 60; // 1 minute

// Realtime
export const REALTIME_EVENTS_PER_SECOND = 10;
export const REALTIME_MAX_CONNECTIONS = 10000;
export const REALTIME_CHANNEL_PREFIX = 'dating-app';

// Pagination
export const PAGINATION_DEFAULT_PAGE = 1;
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

// Search
export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 200;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MAX_RESULTS = 100;

// Date and Time
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const TIMEZONE_DEFAULT = 'UTC';
export const LOCALE_DEFAULT = 'en';

// Validation
export const VALIDATION_DEBOUNCE_MS = 300;
export const VALIDATION_MAX_ERRORS = 10;

// Feature-specific constants
export const PROFILE_INTERESTS_SUGGESTED = [
  'Music',
  'Movies',
  'Travel',
  'Food',
  'Fitness',
  'Sports',
  'Reading',
  'Art',
  'Photography',
  'Cooking',
  'Dancing',
  'Gaming',
  'Technology',
  'Nature',
  'Pets',
  'Fashion',
  'Entrepreneurship',
  'Volunteering',
  'Spirituality',
  'Education',
] as const;

export const RELATIONSHIP_INTENTS = [
  'serious_relationship',
  'marriage',
  'casual_dating',
  'friendship',
  'long_term',
  'unsure',
] as const;

export const EDUCATION_LEVELS = [
  'high_school',
  'diploma',
  'bachelors',
  'masters',
  'doctorate',
  'other',
] as const;

export const OCCUPATION_STATUSES = [
  'employed',
  'self_employed',
  'student',
  'unemployed',
  'retired',
  'other',
] as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  VALIDATION_ERROR: 'Invalid input data',
  RATE_LIMITED: 'Too many requests. Please try again later',
  SERVER_ERROR: 'An unexpected error occurred',
  NETWORK_ERROR: 'Network error. Please check your connection',
  SESSION_EXPIRED: 'Your session has expired. Please log in again',
  ACCOUNT_SUSPENDED: 'Your account has been suspended',
  ACCOUNT_BANNED: 'Your account has been banned',
  EMAIL_NOT_VERIFIED: 'Please verify your email address',
  PHONE_NOT_VERIFIED: 'Please verify your phone number',
  AGE_RESTRICTED: 'You must be at least 18 years old to use this app',
  COMMUNITY_LOCKED: 'This community is currently locked',
  CONTENT_FLAGGED: 'This content has been flagged for review',
  MESSAGE_BLOCKED: 'You cannot send messages to this user',
  MATCH_EXPIRED: 'This match has expired',
  VIP_REQUIRED: 'This feature requires VIP membership',
  INSUFFICIENT_POINTS: 'You do not have enough points for this action',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  POST_CREATED: 'Post created successfully',
  POST_UPDATED: 'Post updated successfully',
  POST_DELETED: 'Post deleted successfully',
  COMMENT_CREATED: 'Comment added successfully',
  COMMENT_DELETED: 'Comment deleted successfully',
  MATCH_CREATED: 'Match created successfully',
  MESSAGE_SENT: 'Message sent successfully',
  REPORT_SUBMITTED: 'Report submitted successfully',
  VERIFICATION_SUBMITTED: 'Verification submitted successfully',
  VIP_PURCHASED: 'VIP membership purchased successfully',
  SETTINGS_UPDATED: 'Settings updated successfully',
} as const;