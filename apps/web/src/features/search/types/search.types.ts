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
}
