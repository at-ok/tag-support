import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { sendPushNotificationBatch, type PushNotificationPayload } from '@/lib/web-push';

/**
 * POST /api/push/send
 * Send push notifications to users
 *
 * Request body:
 * {
 *   userIds: string[] | "all",    // Array of user IDs or "all" for all users
 *   roles?: string[],               // Optional: Filter by roles (runner, chaser, gamemaster)
 *   payload: {
 *     title: string,
 *     body: string,
 *     icon?: string,
 *     badge?: string,
 *     vibrate?: number[],
 *     data?: Record<string, unknown>,
 *     type?: NotificationType
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds, roles, payload } = body;

    // Validate payload
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'Payload is required' },
        { status: 400 }
      );
    }

    if (!payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Payload must include title and body' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Build query for subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh_key, auth_key, user_id, users(role)');

    if (userIds !== 'all') {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json(
          { error: 'userIds must be an array or "all"' },
          { status: 400 }
        );
      }
      query = query.in('user_id', userIds);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions found',
        sent: 0,
      });
    }

    // Filter by roles if specified
    let filteredSubscriptions = subscriptions;
    if (roles && Array.isArray(roles) && roles.length > 0) {
      filteredSubscriptions = subscriptions.filter((sub) => {
        const userRole = (sub.users as { role?: string })?.role;
        return userRole && roles.includes(userRole);
      });
    }

    if (filteredSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions match the filters',
        sent: 0,
      });
    }

    // Convert to push subscription format
    const pushSubscriptions = filteredSubscriptions.map((sub) => ({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh_key,
        auth: sub.auth_key,
      },
    }));

    // Send notifications
    const result = await sendPushNotificationBatch(
      pushSubscriptions,
      payload as PushNotificationPayload
    );

    // Clean up invalid subscriptions (e.g., expired, gone)
    if (result.errors.length > 0) {
      const invalidEndpoints = result.errors
        .filter((err) => {
          const error = err.error as { statusCode?: number };
          return error?.statusCode === 410; // Gone
        })
        .map((err) => err.subscription.endpoint);

      if (invalidEndpoints.length > 0) {
        const { error: deleteError } = await supabase
          .from('push_subscriptions')
          .delete()
          .in('endpoint', invalidEndpoints);

        if (deleteError) {
          console.error('Failed to clean up invalid subscriptions:', deleteError);
          // 削除失敗はログに記録するが、通知送信の成功には影響しない
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: result.success,
      failed: result.failed,
      total: pushSubscriptions.length,
    });
  } catch (error) {
    console.error('Error in send route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
