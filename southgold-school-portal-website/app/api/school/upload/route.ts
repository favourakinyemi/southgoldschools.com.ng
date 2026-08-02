import { NextResponse } from 'next/server';
import { requireRole } from '../../../../src/server/routeAuth';
import { supabase } from '../../../../src/server/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN');
  if (auth instanceof NextResponse) return auth;

  try {
    const { fileBase64, fileName, folderName } = await request.json();
    if (!fileBase64) return NextResponse.json({ error: 'fileBase64 payload is required' }, { status: 400 });

    try {
      await supabase.storage.createBucket('school-assets', { public: true });
    } catch (_) {}

    const matches = fileBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid Base64 image encoding' }, { status: 400 });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const folder = folderName || 'cms';
    const uploadName = `${folder}/${Date.now()}_${fileName || 'uploaded_image.png'}`;

    const { error: uploadErr } = await supabase.storage
      .from('school-assets')
      .upload(uploadName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('school-assets')
      .getPublicUrl(uploadName);

    return NextResponse.json({ success: true, publicUrl: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
