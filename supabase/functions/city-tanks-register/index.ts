// Public registration ONLY of game handles. Never accepts a real email, user ID, role,
// metadata, redirect URL or admin action from the client. Existing email auth is untouched.
const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'apikey, content-type, authorization', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Cache-Control':'no-store' };
Deno.serve(async (req: Request) => {
  const reply = (code: number, tag: string) => Response.json({result:tag},{status:code,headers:cors});
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
  if (req.method !== 'POST') return reply(405,'method');
  try {
    if (!req.headers.get('content-type')?.startsWith('application/json')) return reply(415,'format');
    if (Number(req.headers.get('content-length')) > 2048) return reply(413,'length');
    const reader = req.body?.getReader(); if (!reader) return reply(400,'format');
    let size=0, text=''; const decoder=new TextDecoder();
    for (;;) { const {done,value}=await reader.read(); if (done) break;
      size+=value.length; if (size>2048) { await reader.cancel(); return reply(413,'length'); }
      text+=decoder.decode(value,{stream:true}); }
    let input; try { input=JSON.parse(text+decoder.decode()); } catch { return reply(400,'format'); }
    const handle=input?.handle, password=input?.password, invite=input?.invite;
    if (invite !== undefined && (typeof invite !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(invite))) return reply(422,'invalid_invite');
    if (typeof handle!=='string' || !/^[a-z0-9_]{3,24}$/.test(handle) || typeof password!=='string' || password.length<8 || new TextEncoder().encode(password).length>72) return reply(400,'invalid');
    const base=Deno.env.get('SUPABASE_URL'), secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!base || !secret) return reply(503,'unavailable');
    const headers={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
    // Hourly keyed address digest. The global cap applies even without a trusted proxy address.
    const ip=req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'shared';
    const enc=new TextEncoder(), hkey=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const hash=await crypto.subtle.sign('HMAC',hkey,enc.encode(Math.floor(Date.now()/3600000)+':'+ip));
    const bucket=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    const slot=await fetch(base+'/rest/v1/rpc/city_tanks_signup_slot_v1',{method:'POST',headers,body:JSON.stringify({client_bucket:bucket})});
    if (!slot.ok) return reply(503,'unavailable'); if (await slot.json() !== true) return reply(429,'rate');
    if (invite !== undefined) {
      const offer=await fetch(base+'/rest/v1/rpc/city_tanks_invite_preview_v1',{method:'POST',headers,body:JSON.stringify({code:invite})});
      if (!offer.ok) return reply(503,'unavailable');
      if (!['resources','tanks'].includes((await offer.json()).gift)) return reply(422,'invalid_invite');
    }
    // A reserved .invalid address is only an internal login identifier, never a claim to a mailbox.
    const created=await fetch(base+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({email:handle+'@players.citytanks.invalid',password,email_confirm:true,
      ...(invite && {app_metadata:{city_tanks_invite:invite}})})});
    if (created.ok) return reply(201,invite?'referred':'created');
    const code=(await created.json()).code;
    return ['email_exists','user_already_exists'].includes(code) ? reply(409,'taken') : reply(created.status===429?429:400,'registration_failed');
  } catch { return reply(503,'unavailable'); }
});
