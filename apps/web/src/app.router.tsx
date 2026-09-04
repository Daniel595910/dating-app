/**
 * App Router
 * Complete application routing with all pages
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './config/constants';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PhoneVerify } from './pages/auth/PhoneVerify';
import { KycPage } from './pages/auth/KycPage';
import { LocationSetup } from './pages/auth/LocationSetup';
import { CommunityAssign } from './pages/auth/CommunityAssign';
import { ConfirmEmail } from './pages/auth/ConfirmEmail';

// Community Pages
import { CommunityPage } from './pages/community/CommunityPage';
import { PostDetail } from './pages/community/PostDetail';
import { SearchPage } from './pages/community/SearchPage';

// Chat Pages
import { ChatsPage } from './pages/chat/ChatsPage';
import { ConversationPage } from './pages/chat/ConversationPage';

// Profile Pages
import { MyProfilePage } from './pages/profile/MyProfilePage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { EditProfilePage } from './pages/profile/EditProfilePage';
import { DatingPreferencesPage } from './pages/profile/DatingPreferencesPage';
import { VipPage } from './pages/profile/VipPage';
import { SettingsPage } from './pages/profile/SettingsPage';
import { BlockedUsersPage } from './pages/profile/BlockedUsersPage';

// Auth Guard Component
import { ProtectedRoute } from './components/common/ProtectedRoute';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.VERIFY_PHONE} element={<PhoneVerify />} />
      <Route path={ROUTES.KYC} element={<KycPage />} />
      <Route path={ROUTES.LOCATION} element={<LocationSetup />} />
      <Route path={ROUTES.COMMUNITY_ASSIGN} element={<CommunityAssign />} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />

      {/* Protected Routes */}
      <Route
        path={ROUTES.COMMUNITY}
        element={
          <ProtectedRoute>
            <CommunityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.COMMUNITY}/:postId`}
        element={
          <ProtectedRoute>
            <PostDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SEARCH}
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.CHATS}
        element={
          <ProtectedRoute>
            <ChatsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={`${ROUTES.CHATS}/:conversationId`}
        element={
          <ProtectedRoute>
            <ConversationPage />
          </ProtectedRoute>
        }
      />

      {/* Other user's profile */}
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* My profile */}
      <Route
        path={ROUTES.PROFILE}
        element={
          <ProtectedRoute>
            <MyProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PROFILE_EDIT}
        element={
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/preferences"
        element={
          <ProtectedRoute>
            <DatingPreferencesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PROFILE_VIP}
        element={
          <ProtectedRoute>
            <VipPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SETTINGS}
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/blocked-users"
        element={
          <ProtectedRoute>
            <BlockedUsersPage />
          </ProtectedRoute>
        }
      />

      {/* Default Routes */}
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.COMMUNITY} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.COMMUNITY} replace />} />
    </Routes>
  );
};
