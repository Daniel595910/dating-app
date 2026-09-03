/**
 * Database Types
 * Generated Supabase database types
 * Note: These types should be updated with actual Supabase schema
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          phone: string | null;
          role: string;
          status: string;
          verification_status: string;
          email_verified: boolean;
          phone_verified: boolean;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          phone?: string | null;
          role?: string;
          status?: string;
          verification_status?: string;
          email_verified?: boolean;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string | null;
          role?: string;
          status?: string;
          verification_status?: string;
          email_verified?: boolean;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          deleted_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          cover_photo_url: string | null;
          gender: string | null;
          birth_date: string | null;
          location: Record<string, any> | null;
          interests: string[];
          relationship_intent: string | null;
          education_level: string | null;
          occupation: string | null;
          occupation_status: string | null;
          height_cm: number | null;
          languages: string[];
          is_verified: boolean;
          verification_badge: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          cover_photo_url?: string | null;
          gender?: string | null;
          birth_date?: string | null;
          location?: Record<string, any> | null;
          interests?: string[];
          relationship_intent?: string | null;
          education_level?: string | null;
          occupation?: string | null;
          occupation_status?: string | null;
          height_cm?: number | null;
          languages?: string[];
          is_verified?: boolean;
          verification_badge?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          cover_photo_url?: string | null;
          gender?: string | null;
          birth_date?: string | null;
          location?: Record<string, any> | null;
          interests?: string[];
          relationship_intent?: string | null;
          education_level?: string | null;
          occupation?: string | null;
          occupation_status?: string | null;
          height_cm?: number | null;
          languages?: string[];
          is_verified?: boolean;
          verification_badge?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      communities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: string;
          status: string;
          description: string | null;
          country: string;
          country_code: string;
          state: string | null;
          city: string | null;
          parent_id: string | null;
          member_count: number;
          post_count: number;
          moderators: string[];
          rules: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          type: string;
          status?: string;
          description?: string | null;
          country: string;
          country_code: string;
          state?: string | null;
          city?: string | null;
          parent_id?: string | null;
          member_count?: number;
          post_count?: number;
          moderators?: string[];
          rules?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          type?: string;
          status?: string;
          description?: string | null;
          country?: string;
          country_code?: string;
          state?: string | null;
          city?: string | null;
          parent_id?: string | null;
          member_count?: number;
          post_count?: number;
          moderators?: string[];
          rules?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          community_id: string;
          author_id: string;
          type: string;
          content: string;
          status: string;
          images: string[] | null;
          tags: string[] | null;
          like_count: number;
          comment_count: number;
          report_count: number;
          is_edited: boolean;
          edited_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          author_id: string;
          type: string;
          content: string;
          status?: string;
          images?: string[] | null;
          tags?: string[] | null;
          like_count?: number;
          comment_count?: number;
          report_count?: number;
          is_edited?: boolean;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          author_id?: string;
          type?: string;
          content?: string;
          status?: string;
          images?: string[] | null;
          tags?: string[] | null;
          like_count?: number;
          comment_count?: number;
          report_count?: number;
          is_edited?: boolean;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          stage: string;
          status: string;
          match_score: number | null;
          compatibility_answers: Record<string, any> | null;
          matched_at: string | null;
          rejected_at: string | null;
          expired_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          stage?: string;
          status?: string;
          match_score?: number | null;
          compatibility_answers?: Record<string, any> | null;
          matched_at?: string | null;
          rejected_at?: string | null;
          expired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          stage?: string;
          status?: string;
          match_score?: number | null;
          compatibility_answers?: Record<string, any> | null;
          matched_at?: string | null;
          rejected_at?: string | null;
          expired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          match_id: string;
          participant_ids: string[];
          status: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          unread_counts: Record<string, number>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          participant_ids: string[];
          status?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          unread_counts?: Record<string, number>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          participant_ids?: string[];
          status?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          unread_counts?: Record<string, number>;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          type: string;
          content: string;
          status: string;
          media_url: string | null;
          reply_to_id: string | null;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          type: string;
          content: string;
          status?: string;
          media_url?: string | null;
          reply_to_id?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          type?: string;
          content?: string;
          status?: string;
          media_url?: string | null;
          reply_to_id?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}