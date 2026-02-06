import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_RECORDINGS_PER_DAY = 3

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || 'unknown'

    const { action } = await req.json()
    const today = new Date().toISOString().split('T')[0]

    if (action === 'check') {
      const { data, error } = await supabase
        .from('demo_rate_limits')
        .select('recording_count')
        .eq('ip_address', ip)
        .eq('window_start', today)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      const currentCount = data?.recording_count || 0
      const remaining = Math.max(0, MAX_RECORDINGS_PER_DAY - currentCount)

      return new Response(
        JSON.stringify({ allowed: remaining > 0, remaining, limit: MAX_RECORDINGS_PER_DAY }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'increment') {
      const { data: existing } = await supabase
        .from('demo_rate_limits')
        .select('id, recording_count')
        .eq('ip_address', ip)
        .eq('window_start', today)
        .single()

      if (existing) {
        const newCount = existing.recording_count + 1
        await supabase
          .from('demo_rate_limits')
          .update({ recording_count: newCount, last_recording_at: new Date().toISOString() })
          .eq('id', existing.id)

        return new Response(
          JSON.stringify({ success: true, remaining: Math.max(0, MAX_RECORDINGS_PER_DAY - newCount) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        await supabase
          .from('demo_rate_limits')
          .insert({ ip_address: ip, recording_count: 1, window_start: today })

        return new Response(
          JSON.stringify({ success: true, remaining: MAX_RECORDINGS_PER_DAY - 1 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})