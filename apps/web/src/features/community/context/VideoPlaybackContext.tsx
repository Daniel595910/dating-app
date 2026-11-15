import { createContext, useCallback, useContext, useRef } from 'react';

interface VideoPlaybackContextValue {
  registerVideo: (id: string, pauseFn: () => void) => void;
  unregisterVideo: (id: string) => void;
  onPlay: (id: string) => void;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextValue | null>(null);

export function VideoPlaybackProvider({ children }: { children: React.ReactNode }) {
  const pauseFunctions = useRef<Map<string, () => void>>(new Map());
  const activeId = useRef<string | null>(null);

  const registerVideo = useCallback((id: string, pauseFn: () => void) => {
    pauseFunctions.current.set(id, pauseFn);
  }, []);

  const unregisterVideo = useCallback((id: string) => {
    pauseFunctions.current.delete(id);
    if (activeId.current === id) activeId.current = null;
  }, []);

  const onPlay = useCallback((id: string) => {
    pauseFunctions.current.forEach((pauseFn, otherId) => {
      if (otherId !== id) pauseFn();
    });
    activeId.current = id;
  }, []);

  return (
    <VideoPlaybackContext.Provider value={{ registerVideo, unregisterVideo, onPlay }}>
      {children}
    </VideoPlaybackContext.Provider>
  );
}

export function useVideoPlayback() {
  const ctx = useContext(VideoPlaybackContext);
  if (!ctx) throw new Error('useVideoPlayback must be used within VideoPlaybackProvider');
  return ctx;
}
