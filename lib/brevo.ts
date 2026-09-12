import { createAdminClient } from '@/lib/supabase-server';

export interface BrevoEvent {
  email: string;
  date: string;
  subject?: string;
  messageId?: string;
  event: 'delivered' | 'opened' | 'uniqueOpened' | 'clicks' | 'hardBounce' | 'softBounce' | 'blocked' | 'spam' | 'deferred' | string;
  reason?: string;
  tag?: string;
  ip?: string;
  link?: string;
}

export interface BrevoSyncResult {
  success: boolean;
  totalEventsProcessed?: number;
  deliveredCount?: number;
  openedCount?: number;
  bouncedCount?: number;
  error?: string;
  ipAuthRequired?: boolean;
  detectedIp?: string;
  authUrl?: string;
}

/**
 * Resolves the Brevo REST API Key (xkeysib-...) from environment or user_settings
 */
export async function getBrevoApiKey(userId?: string | null): Promise<string> {
  const envKey = process.env.BREVO_API_KEY || '';
  if (envKey && envKey.startsWith('xkeysib-')) {
    return envKey;
  }

  if (userId) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data?.brevo_api_key && data.brevo_api_key.startsWith('xkeysib-')) {
        return data.brevo_api_key;
      }
    } catch (e) {
      console.warn('Error fetching brevo_api_key from user_settings:', e);
    }
  }

  return envKey;
}

/**
 * Queries Brevo's Transactional Email Events API
 * Endpoint: GET https://api.brevo.com/v3/smtp/statistics/events
 */
export async function fetchBrevoEvents(
  apiKey: string,
  options: { days?: number; limit?: number; email?: string; event?: string } = {}
): Promise<{ events: BrevoEvent[]; error?: string; ipAuthRequired?: boolean; detectedIp?: string; authUrl?: string }> {
  const { days = 30, limit = 2500, email, event } = options;

  const queryParams = new URLSearchParams();
  queryParams.set('days', String(days));
  queryParams.set('limit', String(limit));
  queryParams.set('sort', 'desc');
  if (email) queryParams.set('email', email);
  if (event) queryParams.set('event', event);

  const url = `https://api.brevo.com/v3/smtp/statistics/events?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      // Check for Brevo IP authorization requirement
      if (data?.message && data.message.includes('unrecognised IP address')) {
        const ipMatch = data.message.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        const detectedIp = ipMatch ? ipMatch[0] : '';
        return {
          events: [],
          error: data.message,
          ipAuthRequired: true,
          detectedIp,
          authUrl: 'https://app.brevo.com/security/authorised_ips',
        };
      }

      return {
        events: [],
        error: data?.message || `Brevo API error: HTTP ${res.status}`,
      };
    }

    return { events: data.events || [] };
  } catch (err: any) {
    return { events: [], error: err?.message || 'Failed to connect to Brevo API' };
  }
}

/**
 * Synchronizes email events from Brevo into Supabase email_drafts and leads tables
 */
export async function syncBrevoDeliveryStatus(userId?: string | null): Promise<BrevoSyncResult> {
  const apiKey = await getBrevoApiKey(userId);

  if (!apiKey || !apiKey.startsWith('xkeysib-')) {
    return {
      success: false,
      error: 'Valid Brevo REST API key (xkeysib-...) is not configured.',
    };
  }

  const { events, error, ipAuthRequired, detectedIp, authUrl } = await fetchBrevoEvents(apiKey, { days: 30 });

  if (ipAuthRequired) {
    return {
      success: false,
      error: `Brevo requires IP authorization for ${detectedIp || 'your current IP'}. Please authorize it at https://app.brevo.com/security/authorised_ips`,
      ipAuthRequired: true,
      detectedIp,
      authUrl,
    };
  }

  if (error) {
    return { success: false, error };
  }

  if (!events || events.length === 0) {
    return {
      success: true,
      totalEventsProcessed: 0,
      deliveredCount: 0,
      openedCount: 0,
      bouncedCount: 0,
    };
  }

  const supabase = createAdminClient();

  // Fetch sent drafts for this user (or all if admin)
  let draftQuery = supabase
    .from('email_drafts')
    .select('id, user_id, lead_id, status, error_message, sent_at, leads(id, email, raw_data)')
    .in('status', ['sent', 'delivered', 'opened', 'bounced', 'failed', 'replied']);

  if (userId) {
    draftQuery = draftQuery.eq('user_id', userId);
  }

  const { data: drafts, error: draftsErr } = await draftQuery;
  if (draftsErr || !drafts) {
    return { success: false, error: draftsErr?.message || 'Failed to fetch existing drafts from database' };
  }

  // Create email -> draft lookup map (lowercase email)
  const draftsByEmail = new Map<string, typeof drafts[0]>();
  for (const d of drafts) {
    const leadEmail = (d.leads as any)?.email?.toLowerCase()?.trim();
    if (leadEmail) {
      draftsByEmail.set(leadEmail, d);
    }
  }

  let deliveredCount = 0;
  let openedCount = 0;
  let bouncedCount = 0;

  // Process events from oldest to newest to reflect chronological status transitions
  const chronologicalEvents = [...events].reverse();

  for (const ev of chronologicalEvents) {
    const targetEmail = ev.email?.toLowerCase()?.trim();
    if (!targetEmail) continue;

    const draft = draftsByEmail.get(targetEmail);
    if (!draft) continue;

    // Do NOT overwrite 'replied' status because a reply is the highest achievement
    if (draft.status === 'replied') continue;

    const eventName = ev.event;
    const lead = draft.leads as any;
    const currentRawData = lead?.raw_data || {};

    if (eventName === 'opened' || eventName === 'uniqueOpened') {
      if (draft.status !== 'opened') {
        await supabase
          .from('email_drafts')
          .update({
            status: 'opened',
            error_message: null,
          })
          .eq('id', draft.id);

        draft.status = 'opened';
        openedCount++;
      }

      // Record open event diagnostics in lead raw_data
      const updatedRawData = {
        ...currentRawData,
        brevo_status: 'opened',
        opened_at: ev.date || new Date().toISOString(),
        last_brevo_event: ev,
      };

      if (lead?.id) {
        await supabase.from('leads').update({ raw_data: updatedRawData }).eq('id', lead.id);
      }
    } else if (eventName === 'hardBounce' || eventName === 'softBounce' || eventName === 'blocked') {
      const bounceReason = ev.reason || `Email ${eventName}`;

      await supabase
        .from('email_drafts')
        .update({
          status: 'bounced',
          error_message: bounceReason,
        })
        .eq('id', draft.id);

      draft.status = 'bounced';
      bouncedCount++;

      // Record bounce diagnostics in lead raw_data
      const updatedRawData = {
        ...currentRawData,
        brevo_status: 'bounced',
        bounce_reason: bounceReason,
        bounced_at: ev.date || new Date().toISOString(),
        last_brevo_event: ev,
      };

      if (lead?.id) {
        await supabase.from('leads').update({ raw_data: updatedRawData }).eq('id', lead.id);
      }
    } else if (eventName === 'delivered') {
      // Only set to delivered if not already opened or bounced
      if (draft.status === 'sent') {
        await supabase
          .from('email_drafts')
          .update({
            status: 'delivered',
            error_message: null,
          })
          .eq('id', draft.id);

        draft.status = 'delivered';
        deliveredCount++;

        const updatedRawData = {
          ...currentRawData,
          brevo_status: 'delivered',
          delivered_at: ev.date || new Date().toISOString(),
          last_brevo_event: ev,
        };

        if (lead?.id) {
          await supabase.from('leads').update({ raw_data: updatedRawData }).eq('id', lead.id);
        }
      }
    }
  }

  return {
    success: true,
    totalEventsProcessed: events.length,
    deliveredCount,
    openedCount,
    bouncedCount,
  };
}
