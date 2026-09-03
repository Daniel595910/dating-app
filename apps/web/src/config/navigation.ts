import { ROUTES } from './constants';

export type IconName = 'community' | 'chat' | 'profile' | 'search' | 'settings';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon ? : IconName;
  requiresAuth: boolean;
  order: number;
}

export const BOTTOM_NAVIGATION: readonly NavigationItem[] = [
{
  id: 'community',
  label: 'Community',
  path: ROUTES.COMMUNITY,
  icon: 'community',
  requiresAuth: true,
  order: 1
},
{
  id: 'chats',
  label: 'Chats',
  path: ROUTES.CHATS,
  icon: 'chat',
  requiresAuth: true,
  order: 2
},
{
  id: 'profile',
  label: 'Profile',
  path: ROUTES.PROFILE,
  icon: 'profile',
  requiresAuth: true,
  order: 3
}] as
const;