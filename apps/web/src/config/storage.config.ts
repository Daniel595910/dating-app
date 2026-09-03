export type UploadPurpose = 'avatar' | 'cover_photo' | 'post_image' | 'verification_document' | 'message_media';

export interface UploadPurposeConfig {
  purpose: UploadPurpose;
  maxSizeBytes: number;
  allowedTypes: readonly string[];
  maxCount: number;
  description: string;
}

export const UPLOAD_PURPOSES: Record<UploadPurpose, UploadPurposeConfig> = {
  avatar: {
    purpose: 'avatar',
    maxSizeBytes: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxCount: 1,
    description: 'Profile avatar image'
  },
  cover_photo: {
    purpose: 'cover_photo',
    maxSizeBytes: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxCount: 1,
    description: 'Profile cover photo'
  },
  post_image: {
    purpose: 'post_image',
    maxSizeBytes: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxCount: 10,
    description: 'Post images'
  },
  verification_document: {
    purpose: 'verification_document',
    maxSizeBytes: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxCount: 3,
    description: 'KYC verification documents'
  },
  message_media: {
    purpose: 'message_media',
    maxSizeBytes: 50 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'],
    maxCount: 1,
    description: 'Message media attachments'
  }
} as const;

export function getUploadConfig(purpose: UploadPurpose): UploadPurposeConfig {
  return UPLOAD_PURPOSES[purpose];
}

export function isFileTypeAllowed(purpose: UploadPurpose, fileType: string): boolean {
  const config = UPLOAD_PURPOSES[purpose];
  return config.allowedTypes.includes(fileType);
}

export function isFileSizeAllowed(purpose: UploadPurpose, fileSize: number): boolean {
  const config = UPLOAD_PURPOSES[purpose];
  return fileSize <= config.maxSizeBytes;
}
