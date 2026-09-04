/**
 * Offline Cache Service
 * Uses IndexedDB to cache community feed for offline viewing
 */

interface CachedFeed {
  communityId: string;
  posts: any[];
  cachedAt: string;
}

const DB_NAME = 'dating-app-offline';
const DB_VERSION = 1;
const FEED_STORE = 'feed_cache';
const COMMUNITY_STORE = 'community_cache';

class OfflineCacheService {
  private db: IDBDatabase | null = null;

  async openDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(FEED_STORE)) {
          db.createObjectStore(FEED_STORE, { keyPath: 'communityId' });
        }

        if (!db.objectStoreNames.contains(COMMUNITY_STORE)) {
          db.createObjectStore(COMMUNITY_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async cacheFeed(communityId: string, posts: any[]): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(FEED_STORE, 'readwrite');
        const store = transaction.objectStore(FEED_STORE);
        const cacheData: CachedFeed = {
          communityId,
          posts,
          cachedAt: new Date().toISOString(),
        };
        store.put(cacheData);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (err) {
      console.error('Failed to cache feed:', err);
    }
  }

  async getCachedFeed(communityId: string): Promise<CachedFeed | null> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(FEED_STORE, 'readonly');
        const store = transaction.objectStore(FEED_STORE);
        const request = store.get(communityId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to get cached feed:', err);
      return null;
    }
  }

  async cacheCommunity(community: any): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(COMMUNITY_STORE, 'readwrite');
        const store = transaction.objectStore(COMMUNITY_STORE);
        store.put(community);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (err) {
      console.error('Failed to cache community:', err);
    }
  }

  async getCachedCommunity(communityId: string): Promise<any | null> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(COMMUNITY_STORE, 'readonly');
        const store = transaction.objectStore(COMMUNITY_STORE);
        const request = store.get(communityId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to get cached community:', err);
      return null;
    }
  }
}

export const offlineCache = new OfflineCacheService();
