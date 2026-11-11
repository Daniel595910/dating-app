// Media validation rules for the community CreatePostForm.
// Extracted from inline logic in CreatePostForm.tsx + media.service.ts so that:
//   1. Validation happens BEFORE upload starts (faster failure, better UX)
//   2. Rules are unit-testable in isolation
//   3. The 10-minute video duration cap has a single home
//   4. The voice/video mutex rules live next to the media constraints

import type { PostMedia } from '../types/community.types';

// ─────────────────────────────────────────────────────────────
// Constants — kept in sync with media.service.ts
// ─────────────────────────────────────────────────────────────

export const MAX_AUDIO_SECONDS = 15;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;

export const MAX_VIDEO_DURATION_SECONDS = 10 * 60;

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v'] as const;

export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'webm', 'ogg', 'm4a'] as const;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// Image validation
// ─────────────────────────────────────────────────────────────

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_IMAGE_MIMES.includes(file.type as any)) {
    return { valid: false, error: 'Please upload a JPG, PNG, WebP, or GIF image' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: `Image "${file.name}" exceeds the 10MB limit` };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────
// Video validation
// ─────────────────────────────────────────────────────────────

export function getVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = video.duration;
      resolve(Number.isFinite(d) ? d : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

export async function validateVideoFile(file: File): Promise<ValidationResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeOk = ALLOWED_VIDEO_MIMES.includes(file.type as any);
  const extOk = ALLOWED_VIDEO_EXTENSIONS.includes(ext as any);
  if (!mimeOk && !extOk) {
    return { valid: false, error: `Video format .${ext || 'unknown'} not supported (use MP4, WebM, MOV, or M4V)` };
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return { valid: false, error: `Video "${file.name}" exceeds the 100MB limit` };
  }
  const duration = await getVideoDuration(file);
  if (duration === null) {
    return { valid: false, error: `Could not read video duration for "${file.name}". Please try a different file.` };
  }
  if (duration > MAX_VIDEO_DURATION_SECONDS) {
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return { valid: false, error: `Video "${file.name}" is ${mins}m ${secs}s long. Maximum allowed is 10 minutes.` };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────
// Audio validation
// ─────────────────────────────────────────────────────────────

export function validateAudioFile(file: File): ValidationResult {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext as any)) {
    return { valid: false, error: 'Please select a valid audio file (MP3, WAV, WebM, OGG, M4A)' };
  }
  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return { valid: false, error: 'Audio file is too large. Max 10MB.' };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────
// Voice / video mutex rules
// ─────────────────────────────────────────────────────────────

export interface MutexCheck {
  allowed: boolean;
  reason?: string;
}

export function canAddVideo(media: PostMedia[], hasVoice: boolean): MutexCheck {
  if (hasVoice) {
    return { allowed: false, reason: 'Remove the voice note before adding a video' };
  }
  return { allowed: true };
}

export function canAddVoice(media: PostMedia[], hasVoice: boolean): MutexCheck {
  const hasVideo = media.some((m) => m.type === 'video');
  if (hasVideo) {
    return { allowed: false, reason: 'Remove the video before recording a voice note' };
  }
  return { allowed: true };
}
