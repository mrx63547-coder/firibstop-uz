// FiribStop UZ: same-origin URL reputation proxy. Node.js 18+.
// Never put GOOGLE_WEBRISK_API_KEY in frontend HTML or return it to clients.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8787);
// Minimal .env loader; existing environment variables take precedence.
try { const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8'); for (const line of envText.split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !m[1].startsWith('#') && process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); } } catch (_) {}
const API_KEY = process.env.GOOGLE_WEBRISK_API_KEY || '';
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml'};
function send(res,code,obj){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));}
function readBody(req,max=4096){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>max){reject(new Error('body_too_large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch(e){reject(new Error('invalid_json'))}});req.on('error',reject)})}
function validUrl(s){if(typeof s!=='string'||s.length>2048)throw new Error('URL must be a string under 2048 characters');const u=new URL(s);if(!['http:','https:'].includes(u.protocol))throw new Error('Only http/https URLs are accepted');if(u.username||u.password)throw new Error('URLs with embedded credentials are not accepted');return u.href;}
const server=http.createServer(async(req,res)=>{
 const base='http://localhost:'+PORT;const u=new URL(req.url,base);
 if(req.method==='GET'&&u.pathname==='/api/health')return send(res,200,{ok:true,reputationConfigured:Boolean(API_KEY)});
 if(req.method==='POST'&&u.pathname==='/api/url-check'){
  let body;try{body=await readBody(req)}catch(e){return send(res,e.message==='body_too_large'?413:400,{error:'Invalid or oversized JSON body'})}
  let target;try{target=validUrl(body.url)}catch(e){return send(res,400,{error:e.message})}
  if(!API_KEY)return send(res,200,{status:'not_configured',source:'none',message:'External reputation database is not configured'});
  try{
   const api=new URL('https://webrisk.googleapis.com/v1/uris:search');api.searchParams.set('key',API_KEY);api.searchParams.set('uri',target);
   ['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE'].forEach(t=>api.searchParams.append('threatTypes',t));
   const r=await fetch(api,{headers:{'Accept':'application/json'},signal:AbortSignal.timeout(9000)});
   const payload=await r.json().catch(()=>({}));
   if(!r.ok){console.error('Web Risk response',r.status);return send(res,502,{status:'error',error:'External reputation provider unavailable'})}
   const types=Array.isArray(payload.threat?.threatTypes)?payload.threat.threatTypes:[];
   return send(res,200,{status:types.length?'threat':'not_found',source:'Google Web Risk',threatTypes:[...new Set(types.filter(Boolean))],checkedAt:new Date().toISOString(),disclaimer:'Not found means only that no match was returned for the queried threat lists; it is not a safety guarantee.'});
  }catch(e){console.error('Web Risk lookup failed',e.message);return send(res,502,{status:'error',error:'Could not check the external reputation provider'})}
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD, POST'});return res.end('Method Not Allowed')}
 let pathname;try{pathname=decodeURIComponent(u.pathname)}catch(_){res.writeHead(400);return res.end('Bad path')}
 if(pathname==='/')pathname='/index.html';
 const publicFiles=new Set(['index.html','manifest.webmanifest','icon.svg','sw.js']);
 const name=pathname.replace(/^\/+/, '');
 if(!publicFiles.has(name)){res.writeHead(404);return res.end('Not found')}
 const file=path.join(ROOT,name);
 fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found')};res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res)})
});
server.listen(PORT,()=>console.log(`FiribStop UZ available at http://localhost:${PORT}`));
