import { supabase } from '@/config/supabase.client';

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  async init(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return false;
      }

      this.swRegistration = await navigator.serviceWorker.ready;
      return true;
    } catch (err) {
      console.error('Failed to init push notifications:', err);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Failed to request permission:', err);
      return false;
    }
  }

  async subscribeUser(userId: string): Promise<boolean> {
    try {
      if (!this.swRegistration) {
        await this.init();
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      const subscription = await this.swRegistration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEgUCgKSrXBAvymB4NIxB-mfQkkvxbucYeK1uUH4ljnSUbmd2FPxFpDe-fgi7rLza05ZxJHcxOk6e1U5sniXD54'
        ),
      });

      // Save subscription to database
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        created_at: new Date().toISOString(),
      });

      return true;
    } catch (err) {
      console.error('Failed to subscribe:', err);
      return false;
    }
  }

  async unsubscribeUser(userId: string): Promise<boolean> {
    try {
      if (!this.swRegistration) return false;

      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      return false;
    }
  }

  async sendNotification(userId: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    try {
      // Get user's subscription
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!subscription) return false;

      // In production, this would be sent from a server
      // For now, we use the Notification API
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          data,
        });

        notification.onclick = () => {
          window.focus();
          if (data?.conversationId) {
            window.location.href = '/chats/' + data.conversationId;
          } else if (data?.postId) {
            window.location.href = '/community/' + data.postId;
          }
        };

        return true;
      }

      return false;
    } catch (err) {
      console.error('Failed to send notification:', err);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return window.btoa(binary);
  }
}

export const pushNotificationService = new PushNotificationService();
