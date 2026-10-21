import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedPermissions = new Set([
  'applications.review',
  'chapters.manage',
  'leadership.manage',
  'media.manage',
  'invitations.manage',
  'audit.read',
])

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

  const authorization = request.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!token || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: 'Authentication or server configuration is missing' }, { status: 401, headers: responseHeaders })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400, headers: responseHeaders })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Request body must be an object' }, { status: 400, headers: responseHeaders })
  }

  const { name, email, permissions } = body as Record<string, unknown>
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 160) {
    return Response.json({ error: 'Name must be between 2 and 160 characters' }, { status: 400, headers: responseHeaders })
  }
  if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return Response.json({ error: 'Enter a valid email address' }, { status: 400, headers: responseHeaders })
  }
  if (!Array.isArray(permissions) || permissions.length === 0 || permissions.some((permission: unknown) => typeof permission !== 'string' || !allowedPermissions.has(permission))) {
    return Response.json({ error: 'Select one or more valid subadmin permissions' }, { status: 400, headers: responseHeaders })
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
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Could not verify subadmin inviter profile:', profileError.message)
    return Response.json({ error: 'Could not verify your administrator access' }, { status: 500, headers: responseHeaders })
  }
  if (callerProfile?.role !== 'general_admin' || !callerProfile.is_active) {
    return Response.json({ error: 'Only an active general admin can invite subadmins' }, { status: 403, headers: responseHeaders })
  }

  const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: { full_name: name.trim() },
      redirectTo: new URL('/set-password', appUrl).toString(),
    },
  )

  if (inviteError || !invitation.user) {
    return Response.json({ error: inviteError?.message ?? 'Could not create the invitation' }, { status: 400, headers: responseHeaders })
  }

  const normalizedPermissions = [...new Set(permissions as string[])]
  const { error: insertError } = await adminClient.from('profiles').insert({
    id: invitation.user.id,
    full_name: name.trim(),
    role: 'subadmin',
    permissions: normalizedPermissions,
    is_active: true,
  })

  if (insertError) {
    console.error(`Auth invite ${invitation.user.id} was sent, but its profile could not be created:`, insertError.message)
    return Response.json({ error: 'The invitation email was sent, but account setup did not finish. Contact the system owner before retrying.' }, { status: 500, headers: responseHeaders })
  }

  return Response.json(
    { id: invitation.user.id, email: invitation.user.email, full_name: name.trim(), role: 'subadmin', permissions: normalizedPermissions },
    { status: 201, headers: responseHeaders },
  )
})
