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
          'BJf1uKQI_KjwafsJIf2UOBZ6iUKYH7MH1LLOnIHMQPbOH-_0DscclfGdawa_etmFGldXddSoreeEivWlFbEyaE0'
        ),
      });

      // Save subscription to database.
      // Conflict target is (user_id, endpoint) — matches the table's unique constraint.
      const { error: upsertError, status } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
          },
          { onConflict: 'user_id,endpoint' }
        );

      console.log('Push upsert result:', { status, error: upsertError });

      if (upsertError) {
        console.error(
          'Failed to save push subscription:',
          upsertError.message,
          '| code:', upsertError.code,
          '| details:', upsertError.details,
          '| hint:', upsertError.hint
        );
        return false;
      }

      console.log('Push subscription saved successfully.');

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
      // Insert into the notifications table. The Postgres trigger will
      // call the edge function, which sends the actual web push.
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title,
        body,
        status: 'unread',
        channels: ['in_app', 'push'],
        data: data || { source: 'test-button' },
      });

      return !error;
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
