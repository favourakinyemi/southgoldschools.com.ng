import { NextResponse } from 'next/server';
import { supabase } from '../../../../src/server/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { passportBase64, fileName } = await request.json();
    if (!passportBase64) return NextResponse.json({ error: 'passportBase64 payload is required' }, { status: 400 });

    try {
      await supabase.storage.createBucket('school-assets', { public: true });
    } catch (_) {}

    const matches = passportBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid Base64 image encoding' }, { status: 400 });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadName = `passports/${fileName || `passport_${Date.now()}.png`}`;

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
