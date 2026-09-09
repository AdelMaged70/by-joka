// app/api/upload/route.ts
// هذا الـ API لا يستقبل الفيديو — فقط يولّد Signed URL من R2
// الفيديو يُرفع مباشرة من المتصفح إلى R2 Storage

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSignedUrl } from '@/lib/r2-storage';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error('Missing Supabase environment variables');
    }
    return createClient(url, key, {
        auth: { persistSession: false }
    });
}

export async function POST(req: NextRequest) {
    try {
        const ip =
            req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown';

        // 🚫 Rate limit
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Too many uploads, try later' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { fileName, fileType, fileSize, uploaderEmail } = body;

        if (!fileName || !fileType || !fileSize || !uploaderEmail) {
            return NextResponse.json({ error: 'Missing file/uploader info' }, { status: 400 });
        }

        // 🛡️ Authenticate user via Supabase session token
        const authHeader = req.headers.get('Authorization');
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
        }

        const supabase = getSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user || user.email !== uploaderEmail) {
            return NextResponse.json({ error: 'Unauthorized: invalid session' }, { status: 401 });
        }

        // 📏 Validate size (max 100MB)
        if (fileSize > 100 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File too large (max 100MB)' },
                { status: 400 }
            );
        }

        // 🎥 Validate type
        if (!fileType.startsWith('video/')) {
            return NextResponse.json(
                { error: 'Only video allowed' },
                { status: 400 }
            );
        }

        // Encode uploader's email in filename for tracking ownership
        const uploaderKey = uploaderEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const storagePath = `videos/${Date.now()}-u_${uploaderKey}-${fileName}`;

        // 🔑 إنشاء Signed Upload URL لمحرك R2
        const signedUrl = await getSignedUrl('PUT', storagePath, fileType);

        // 🔗 Public URL (ستُحفظ في DB بعد اكتمال الرفع)
        const publicUrlBase = process.env.R2_PUBLIC_URL || '';
        let publicUrl = '';

        if (publicUrlBase.includes('r2.dev')) {
            publicUrl = `${publicUrlBase}/${storagePath}`;
        } else {
            const bucketName = process.env.R2_BUCKET;
            publicUrl = `${publicUrlBase || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`}/${bucketName}/${storagePath}`;
        }

        return NextResponse.json({
            signedUrl,
            storagePath,
            publicUrl,
        });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}