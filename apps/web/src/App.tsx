import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app.router';
import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './store/auth.store';
import { supabase } from './config/supabase.client';
import { ToastContainer } from './components/common/ToastContainer';
import { CallProvider, useCall } from './features/calls/CallProvider';
import { IncomingCallScreen } from './features/calls/components/IncomingCallScreen';
import { ActiveCallScreen } from './features/calls/components/ActiveCallScreen';
import { MicrophonePermissionModal } from './features/calls/components/MicrophonePermissionModal';

const CallScreens: React.FC = () => {
  const { incomingCall, activeCall, otherUserProfile, remoteStream, callState, acceptCall, declineCall, endCall, isMuted, toggleMute } = useCall();
  const { user } = useAuthStore();

  if (incomingCall && user) {
    return (
      <IncomingCallScreen
        call={incomingCall}
        callerName={otherUserProfile?.displayName || 'User'}
        callerAvatar={otherUserProfile?.avatarUrl || null}
        onAccept={acceptCall}
        onDecline={declineCall}
      />
    );
  }

  if (activeCall) {
    return (
      <ActiveCallScreen
        userName={otherUserProfile?.displayName || 'User'}
        userAvatar={otherUserProfile?.avatarUrl || null}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onEndCall={endCall}
        callState={callState}
        remoteStream={remoteStream}
      />
    );
  }

  return null;
};

const App: React.FC = () => {
  const refreshUser = useAuthStore((state) => state.refreshUser);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    
    const setOnline = () => {
      supabase.rpc('update_presence', { p_is_online: true }).then(() => {}).catch(() => {});
    };
    
    setOnline();
    const interval = setInterval(setOnline, 30000);

    return () => {
      clearInterval(interval);
      supabase.rpc('update_presence', { p_is_online: false }).then(() => {}).catch(() => {});
    };
  }, [user]);

  return (
    <BrowserRouter>
      <CallProvider>
        <AppShell>
          <AppRouter />
        </AppShell>
        <CallScreens />
        <ToastContainer />
      </CallProvider>
    </BrowserRouter>
  );
};

export default App;
