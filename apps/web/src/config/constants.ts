export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_PHONE: '/verify-phone',
  KYC: '/kyc',
  LOCATION: '/location',
  COMMUNITY: '/community',
  SEARCH: '/search',
  CHATS: '/chats',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  PROFILE_VIP: '/profile/vip',
  SETTINGS: '/settings'
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  COMMUNITY_FEED_PAGE_SIZE: 20,
  COMMENTS_PAGE_SIZE: 30,
  MESSAGES_PAGE_SIZE: 50
} as const;

export const APP_LIMITS = {
  POST_CONTENT_MAX_LENGTH: 5000,
  COMMENT_CONTENT_MAX_LENGTH: 2000,
  MESSAGE_CONTENT_MAX_LENGTH: 10000,
  PROFILE_BIO_MAX_LENGTH: 500,
  PROFILE_DISPLAY_NAME_MIN_LENGTH: 2,
  PROFILE_DISPLAY_NAME_MAX_LENGTH: 100
} as const;

export const TIMING = {
  TOAST_DURATION_MS: 5000,
  DEBOUNCE_DEFAULT_MS: 300,
  DEBOUNCE_SEARCH_MS: 300
} as const;