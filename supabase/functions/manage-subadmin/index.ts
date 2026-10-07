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

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
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

  const payload = body as Record<string, unknown>
  const { id, permissions, is_active: isActive } = payload
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: 'A valid subadmin account ID is required' }, { status: 400, headers: responseHeaders })
  }
  if (permissions === undefined && isActive === undefined) {
    return Response.json({ error: 'Provide permissions or an account status change' }, { status: 400, headers: responseHeaders })
  }
  if (permissions !== undefined && (
    !Array.isArray(permissions)
    || permissions.some((permission: unknown) => typeof permission !== 'string' || !allowedPermissions.has(permission))
  )) {
    return Response.json({ error: 'Permissions contain an unsupported value' }, { status: 400, headers: responseHeaders })
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return Response.json({ error: 'Account status must be true or false' }, { status: 400, headers: responseHeaders })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser(token)
  if (authError || !user) {
    return Response.json({ error: 'Your session is invalid or expired. Sign in again.' }, { status: 401, headers: responseHeaders })
  }
  if (id === user.id) {
    return Response.json({ error: 'You cannot change your own general admin access' }, { status: 400, headers: responseHeaders })
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
    console.error('Could not verify subadmin management access:', callerError.message)
    return Response.json({ error: 'Could not verify your administrator access' }, { status: 500, headers: responseHeaders })
  }
  if (callerProfile?.role !== 'general_admin' || !callerProfile.is_active) {
    return Response.json({ error: 'Only an active general admin can manage subadmins' }, { status: 403, headers: responseHeaders })
  }

  const changes: { permissions?: string[]; is_active?: boolean } = {}
  if (permissions !== undefined) changes.permissions = [...new Set(permissions as string[])]
  if (isActive !== undefined) changes.is_active = isActive

  const { data: member, error: updateError } = await adminClient
    .from('profiles')
    .update(changes)
    .eq('id', id)
    .eq('role', 'subadmin')
    .select('id, full_name, permissions, is_active')
    .maybeSingle()
  if (updateError) {
    console.error('Could not update subadmin access:', updateError.message)
    return Response.json({ error: 'Could not update the subadmin account' }, { status: 500, headers: responseHeaders })
  }
  if (!member) {
    return Response.json({ error: 'Subadmin account was not found' }, { status: 404, headers: responseHeaders })
  }

  return Response.json({ member }, { status: 200, headers: responseHeaders })
})
