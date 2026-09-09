import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server';
import { deleteObject } from '@/lib/r2-storage';

function getSupabase(useServiceRoleKey = false) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = useServiceRoleKey
        ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error('Missing Supabase environment variables')
    }
    return createClient(url, key, {
        auth: { persistSession: false }
    })
}

export async function GET() {
  const supabase = getSupabase(true)
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoUrl, email } = body;

    if (!videoUrl || !email) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 🛡️ Authenticate user session token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
    }

    // Verify token with anon client
    const supabaseAnon = getSupabase(false);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user || user.email !== email) {
      return NextResponse.json({ error: 'Unauthorized: session invalid' }, { status: 401 });
    }

    // Verify filename uploader key matches the user email
    const uploaderKey = email.replace(/[^a-zA-Z0-9]/g, '_');
    if (!videoUrl.includes(`-u_${uploaderKey}-`)) {
      return NextResponse.json({ error: 'Unauthorized: not owner' }, { status: 403 });
    }

    const supabaseAdmin = getSupabase(true);

    // 1. Delete from Supabase Database
    const { error: dbError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('video_url', videoUrl);

    if (dbError) throw dbError;

    // 2. Delete from R2 Storage
    // Extract storagePath from url
    const urlParts = videoUrl.split('/');
    const path = urlParts.slice(-2).join('/'); // 'videos/123-u_email-file.mp4'

    if (path && path.startsWith('videos/')) {
      await deleteObject(path);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete video error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}