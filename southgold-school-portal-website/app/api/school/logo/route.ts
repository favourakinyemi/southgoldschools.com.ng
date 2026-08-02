import { NextResponse } from 'next/server';
import { requireRole } from '../../../../src/server/routeAuth';
import { supabase } from '../../../../src/server/db';
import * as repo from '../../../../src/server/repo';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN');
  if (auth instanceof NextResponse) return auth;

  let uploadPath = '';
  try {
    const { logoBase64, fileName } = await request.json();
    if (!logoBase64) return NextResponse.json({ error: 'logoBase64 payload is required' }, { status: 400 });

    try {
      await supabase.storage.createBucket('school-assets', { public: true });
    } catch (_) {}

    const matches = logoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid Base64 image encoding' }, { status: 400 });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadName = `logos/${fileName || `school_logo_${Date.now()}.png`}`;
    uploadPath = uploadName;

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

    try {
      const currentConfig = await repo.Config.get();
      await repo.Config.update({ ...currentConfig, logoUrl: urlData.publicUrl });
    } catch (dbErr: any) {
      try {
        await supabase.storage.from('school-assets').remove([uploadPath]);
      } catch (rollbackErr) {
        console.error('Failed to rollback logo upload:', rollbackErr);
      }
      return NextResponse.json(
        { error: `Database failed to save logo URL. Upload rolled back. Details: ${dbErr.message}` },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, logoUrl: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: `Logo upload failed: ${e.message}` }, { status: 400 });
  }
}
