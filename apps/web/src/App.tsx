import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app.router';
import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './store/auth.store';
import { ToastContainer } from './components/common/ToastContainer';
import { CallProvider, useCall } from './features/calls/CallProvider';
import { IncomingCallScreen } from './features/calls/components/IncomingCallScreen';
import { ActiveCallScreen } from './features/calls/components/ActiveCallScreen';
import { MicrophonePermissionModal } from './features/calls/components/MicrophonePermissionModal';

const CallScreens: React.FC = () => {
  const { incomingCall, activeCall, callState, acceptCall, declineCall, endCall, isMuted, toggleMute } = useCall();
  const { user } = useAuthStore();

  // Incoming call
  if (incomingCall && user) {
    return (
      <IncomingCallScreen
        call={incomingCall}
        callerName="Incoming Call"
        callerAvatar={null}
        onAccept={acceptCall}
        onDecline={declineCall}
      />
    );
  }

  // Active call (calling, connecting, connected)
  if (activeCall) {
    return (
      <ActiveCallScreen
        userName="Voice Call"
        userAvatar={null}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onEndCall={endCall}
        callState={callState}
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

