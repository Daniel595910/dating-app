import { useReducer, useCallback } from 'react';
import type { CommunityPostType, PostMedia } from '../../types/community.types';
import { canAddVideo, canAddVoice } from '../../utils/mediaValidation';

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────

export type ComposerStep = 'type' | 'compose' | 'preview';

export interface ComposerState {
  step: ComposerStep;
  postType: CommunityPostType | null;
  content: string;
  lookingFor: string;
  tags: string;
  media: PostMedia[];
  uploading: boolean;
  uploadProgress: number;
  videoUploading: boolean;
  submitting: boolean;
  error: string | null;
  success: boolean;
  isRecording: boolean;
  recordingTime: number;
  showRecordPrompt: boolean;
  audioFile: File | null;
  showTrimModal: boolean;
  trimStart: number;
  trimEnd: number;
  audioDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export const MAX_AUDIO_SECONDS = 15;

export function createInitialState(initialType?: CommunityPostType): ComposerState {
  return {
    step: 'type',
    postType: initialType || null,
    content: '',
    lookingFor: '',
    tags: '',
    media: [],
    uploading: false,
    uploadProgress: 0,
    videoUploading: false,
    submitting: false,
    error: null,
    success: false,
    isRecording: false,
    recordingTime: 0,
    showRecordPrompt: false,
    audioFile: null,
    showTrimModal: false,
    trimStart: 0,
    trimEnd: MAX_AUDIO_SECONDS,
    audioDuration: 0,
    audioBlob: null,
    audioUrl: null,
  };
}

// ─────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────

export type ComposerAction =
  | { type: 'SET_STEP'; step: ComposerStep }
  | { type: 'SET_POST_TYPE'; postType: CommunityPostType | null }
  | { type: 'SET_CONTENT'; content: string }
  | { type: 'SET_LOOKING_FOR'; lookingFor: string }
  | { type: 'SET_TAGS'; tags: string }
  | { type: 'ADD_MEDIA'; media: PostMedia }
  | { type: 'REMOVE_MEDIA'; id: string }
  | { type: 'SET_MEDIA'; media: PostMedia[] }
  | { type: 'SET_UPLOADING'; uploading: boolean }
  | { type: 'SET_UPLOAD_PROGRESS'; progress: number }
  | { type: 'SET_VIDEO_UPLOADING'; uploading: boolean }
  | { type: 'SET_SUBMITTING'; submitting: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SUCCESS'; success: boolean }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'SET_RECORDING_TIME'; time: number }
  | { type: 'SET_SHOW_RECORD_PROMPT'; show: boolean }
  | { type: 'SET_AUDIO_FILE'; file: File | null }
  | { type: 'SET_SHOW_TRIM_MODAL'; show: boolean }
  | { type: 'SET_TRIM_START'; value: number }
  | { type: 'SET_TRIM_END'; value: number }
  | { type: 'SET_AUDIO_DURATION'; duration: number }
  | { type: 'SET_AUDIO_BLOB'; blob: Blob | null; url: string | null }
  | { type: 'REMOVE_AUDIO' }
  | { type: 'RESET'; initialType?: CommunityPostType };

// ─────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────

export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };

    case 'SET_POST_TYPE':
      return { ...state, postType: action.postType };

    case 'SET_CONTENT':
      return { ...state, content: action.content };

    case 'SET_LOOKING_FOR':
      return { ...state, lookingFor: action.lookingFor };

    case 'SET_TAGS':
      return { ...state, tags: action.tags };

    case 'ADD_MEDIA': {
      // Mutex enforcement inside the reducer — even if the UI accidentally allows it.
      const hasVoice = Boolean(state.audioBlob || state.audioUrl);
      if (action.media.type === 'video') {
        const check = canAddVideo(state.media, hasVoice);
        if (!check.allowed) {
          return { ...state, error: check.reason || 'Cannot add video' };
        }
      }
      return {
        ...state,
        media: [
          ...state.media,
          { ...action.media, sortOrder: state.media.length },
        ],
      };
    }

    case 'REMOVE_MEDIA':
      return { ...state, media: state.media.filter((m) => m.id !== action.id) };

    case 'SET_MEDIA':
      return { ...state, media: action.media };

    case 'SET_UPLOADING':
      return { ...state, uploading: action.uploading };

    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.progress };

    case 'SET_VIDEO_UPLOADING':
      return { ...state, videoUploading: action.uploading };

    case 'SET_SUBMITTING':
      return { ...state, submitting: action.submitting };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'SET_SUCCESS':
      return { ...state, success: action.success };

    case 'START_RECORDING': {
      // Mutex: cannot start recording if a video is already attached
      const check = canAddVoice(state.media, Boolean(state.audioBlob || state.audioUrl));
      if (!check.allowed) {
        return { ...state, error: check.reason || 'Cannot record voice' };
      }
      return { ...state, isRecording: true };
    }

    case 'STOP_RECORDING':
      return { ...state, isRecording: false };

    case 'SET_RECORDING_TIME':
      return { ...state, recordingTime: action.time };

    case 'SET_SHOW_RECORD_PROMPT':
      return { ...state, showRecordPrompt: action.show };

    case 'SET_AUDIO_FILE':
      return { ...state, audioFile: action.file };

    case 'SET_SHOW_TRIM_MODAL':
      return { ...state, showTrimModal: action.show };

    case 'SET_TRIM_START':
      return { ...state, trimStart: action.value };

    case 'SET_TRIM_END':
      return { ...state, trimEnd: action.value };

    case 'SET_AUDIO_DURATION':
      return { ...state, audioDuration: action.duration };

    case 'SET_AUDIO_BLOB':
      return { ...state, audioBlob: action.blob, audioUrl: action.url };

    case 'REMOVE_AUDIO':
      return {
        ...state,
        audioBlob: null,
        audioUrl: null,
        recordingTime: 0,
        audioFile: null,
        showTrimModal: false,
      };

    case 'RESET':
      return createInitialState(action.initialType);

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useCreatePostForm(initialType?: CommunityPostType) {
  const [state, dispatch] = useReducer(
    composerReducer,
    initialType,
    createInitialState
  );

  // Stable setter shims — preserves the existing `setX` API so the component
  // rewrite in Checkpoint 4 can reuse the current handler code with minimal edits.
  const setStep = useCallback((step: ComposerStep) => dispatch({ type: 'SET_STEP', step }), []);
  const setPostType = useCallback((postType: CommunityPostType | null) => dispatch({ type: 'SET_POST_TYPE', postType }), []);
  const setContent = useCallback((content: string) => dispatch({ type: 'SET_CONTENT', content }), []);
  const setLookingFor = useCallback((lookingFor: string) => dispatch({ type: 'SET_LOOKING_FOR', lookingFor }), []);
  const setTags = useCallback((tags: string) => dispatch({ type: 'SET_TAGS', tags }), []);
  const addMedia = useCallback((m: PostMedia) => dispatch({ type: 'ADD_MEDIA', media: m }), []);
  const removeMedia = useCallback((id: string) => dispatch({ type: 'REMOVE_MEDIA', id }), []);
  const setUploading = useCallback((uploading: boolean) => dispatch({ type: 'SET_UPLOADING', uploading }), []);
  const setUploadProgress = useCallback((progress: number) => dispatch({ type: 'SET_UPLOAD_PROGRESS', progress }), []);
  const setVideoUploading = useCallback((uploading: boolean) => dispatch({ type: 'SET_VIDEO_UPLOADING', uploading }), []);
  const setSubmitting = useCallback((submitting: boolean) => dispatch({ type: 'SET_SUBMITTING', submitting }), []);
  const setError = useCallback((error: string | null) => dispatch({ type: 'SET_ERROR', error }), []);
  const setSuccess = useCallback((success: boolean) => dispatch({ type: 'SET_SUCCESS', success }), []);
  const startRecording = useCallback(() => dispatch({ type: 'START_RECORDING' }), []);
  const stopRecording = useCallback(() => dispatch({ type: 'STOP_RECORDING' }), []);
  const setRecordingTime = useCallback((time: number) => dispatch({ type: 'SET_RECORDING_TIME', time }), []);
  const setShowRecordPrompt = useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_RECORD_PROMPT', show }), []);
  const setAudioFile = useCallback((file: File | null) => dispatch({ type: 'SET_AUDIO_FILE', file }), []);
  const setShowTrimModal = useCallback((show: boolean) => dispatch({ type: 'SET_SHOW_TRIM_MODAL', show }), []);
  const setTrimStart = useCallback((value: number) => dispatch({ type: 'SET_TRIM_START', value }), []);
  const setTrimEnd = useCallback((value: number) => dispatch({ type: 'SET_TRIM_END', value }), []);
  const setAudioDuration = useCallback((duration: number) => dispatch({ type: 'SET_AUDIO_DURATION', duration }), []);
  const setAudioBlob = useCallback((blob: Blob | null) => {
    dispatch({ type: 'SET_AUDIO_BLOB', blob, url: blob ? URL.createObjectURL(blob) : null });
  }, []);
  const removeAudio = useCallback(() => dispatch({ type: 'REMOVE_AUDIO' }), []);
  const reset = useCallback((init?: CommunityPostType) => dispatch({ type: 'RESET', initialType: init }), []);

  // Derived values — computed on every render, not stored
  const hasPhotos = state.media.length > 0;
  const hasAudio = Boolean(state.audioBlob || state.audioUrl);

  return {
    state,
    dispatch,
    // Setters (drop-in replacements for useState)
    setStep, setPostType, setContent, setLookingFor, setTags,
    addMedia, removeMedia,
    setUploading, setUploadProgress, setVideoUploading,
    setSubmitting, setError, setSuccess,
    startRecording, stopRecording, setRecordingTime, setShowRecordPrompt,
    setAudioFile, setShowTrimModal, setTrimStart, setTrimEnd,
    setAudioDuration, setAudioBlob, removeAudio, reset,
    // Derived
    hasPhotos, hasAudio,
  };
}