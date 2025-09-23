import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface StoreAchAuthorizationRequest {
  circle_id: string;
  plaid_account_id: string;
  linked_bank_account_id?: string;
  amount: number;
  frequency: string;
  consent_text_hash: string;
  user_agent?: string;
  ip_address?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const body: StoreAchAuthorizationRequest = await req.json();
    if (!body.circle_id || !body.plaid_account_id || !body.amount || !body.frequency || !body.consent_text_hash) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { data, error } = await supabase
      .from('circle_ach_authorizations')
      .upsert({
        user_id: user.id,
        circle_id: body.circle_id,
        linked_bank_account_id: body.linked_bank_account_id || null,
        plaid_account_id: body.plaid_account_id,
        amount: body.amount,
        frequency: body.frequency,
        consent_text_hash: body.consent_text_hash,
        user_agent: body.user_agent || null,
        ip_address: body.ip_address || null,
        status: 'authorized',
        revoked_at: null,
      }, { onConflict: 'user_id, circle_id, plaid_account_id' })
      .select()
      .single();

    if (error) {
      console.error('store-ach-authorization error', error);
      return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    return new Response(JSON.stringify({ success: true, authorization: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('store-ach-authorization unexpected error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});


