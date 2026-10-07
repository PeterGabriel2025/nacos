import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

Deno.serve(async (request: Request) => {
  const appUrl = Deno.env.get('ADMIN_APP_URL')
  const origin = request.headers.get('origin')
  const responseHeaders = {
    ...corsHeaders,
    ...(origin === appUrl ? { 'Access-Control-Allow-Origin': origin } : {}),
  }

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: responseHeaders })
  }
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: responseHeaders })
  }
  if (!appUrl || origin !== appUrl) {
    return Response.json({ error: 'Request origin is not allowed' }, { status: 403, headers: responseHeaders })
  }

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: 'Authentication or server configuration is missing' }, { status: 401, headers: responseHeaders })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser(token)
  if (authError || !user) {
    return Response.json({ error: 'Your session is invalid or expired. Sign in again.' }, { status: 401, headers: responseHeaders })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: callerProfile, error: callerError } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (callerError) {
    console.error('Could not verify subadmin list access:', callerError.message)
    return Response.json({ error: 'Could not verify your administrator access' }, { status: 500, headers: responseHeaders })
  }
  if (callerProfile?.role !== 'general_admin' || !callerProfile.is_active) {
    return Response.json({ error: 'Only an active general admin can view the subadmin list' }, { status: 403, headers: responseHeaders })
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, full_name, role, permissions, is_active, created_at')
    .eq('role', 'subadmin')
    .order('created_at', { ascending: false })
  if (profilesError) {
    console.error('Could not load subadmin profiles:', profilesError.message)
    return Response.json({ error: 'Could not load the subadmin list' }, { status: 500, headers: responseHeaders })
  }

  const users = new Map<string, { email: string | undefined; invited: boolean }>()
  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) {
      console.error('Could not load Auth user details:', error.message)
      return Response.json({ error: 'Could not load subadmin email addresses' }, { status: 500, headers: responseHeaders })
    }
    for (const authUser of data.users) {
      users.set(authUser.id, {
        email: authUser.email,
        invited: !authUser.email_confirmed_at,
      })
    }
    if (data.users.length < 1000) break
  }

  const members = profiles.map((profile) => ({
    ...profile,
    email: users.get(profile.id)?.email ?? null,
    invited: users.get(profile.id)?.invited ?? false,
  }))

  return Response.json({ members }, { status: 200, headers: responseHeaders })
})
