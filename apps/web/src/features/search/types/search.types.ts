export interface SearchResult {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  age: number | null;
  location: string | null;
  lookingFor: string | null;
  interests: string[];
  bio: string | null;
  occupation: string | null;
  languages: string[];
  gender: string | null;
}

export interface CommunitySearchResult {
  id: string;
  name: string;
  description: string | null;
  country: string;
  state: string | null;
  city: string | null;
  memberCount: number;
}
