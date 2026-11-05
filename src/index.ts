import { encryptActionSecret } from "./sealed-box.js";
import { pkcs8Bytes } from "./private-key.js";

interface Env {
  GITHUB_APP_ID: string;
  GITHUB_APP_SLUG: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_APP_PRIVATE_KEY: string;
  APP_SESSION_SECRET: string;
  GITHUB_SOURCE_REPOSITORY?: string;
}

type Session = {
  accessToken: string;
  login: string;
  userId: number;
  installationId?: number;
  repository?: string;
  ownerId?: number;
  dispatchedAt?: number;
};

const SOURCE_REPOSITORY = "aminsh35322088-ctrl/GitHub-runner-vault";
const SESSION_COOKIE = "__Host-vault_wizard_session";
const OAUTH_STATE_COOKIE = "__Host-vault_wizard_oauth_state";
const INSTALL_STATE_COOKIE = "__Host-vault_wizard_install_state";
const SESSION_TTL = 30 * 60;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#090d18"><title>Runner Vault · Setup</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#090d18;color:#e8edf7}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 50% -20%,#1b3157 0,transparent 55%),#090d18}
main{width:min(760px,calc(100% - 32px));margin:0 auto;padding:54px 0 72px}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:34px}.mark{width:42px;height:42px;border-radius:13px;background:linear-gradient(145deg,#6ea8ff,#6b66e8);display:grid;place-items:center;font-weight:900;color:#081225;font-size:20px}.brand small{display:block;color:#91a1ba;font-size:12px;letter-spacing:.12em;text-transform:uppercase}
h1{font-size:clamp(30px,6vw,44px);letter-spacing:-.045em;line-height:1.08;margin:0 0 14px}.lead{color:#a7b4c9;line-height:1.7;max-width:620px;margin:0 0 30px}
.panel{border:1px solid #26344c;background:rgba(17,25,42,.88);border-radius:20px;padding:24px;margin:16px 0;box-shadow:0 18px 55px #0003}
.step{display:flex;gap:14px}.num{flex:0 0 30px;height:30px;border-radius:10px;background:#1e3456;color:#8fbcff;display:grid;place-items:center;font-weight:750}.content{min-width:0;flex:1}
h2{font-size:17px;margin:3px 0 8px}.muted{color:#9eacc1;font-size:14px;line-height:1.65;margin:0 0 16px}
label{display:block;font-size:13px;color:#c8d3e4;margin:12px 0 7px}input{width:100%;background:#0b1220;border:1px solid #34445e;border-radius:11px;padding:13px 14px;color:#eef4ff;font:inherit;outline:none}input:focus{border-color:#76aaff;box-shadow:0 0 0 3px #76aaff20}
button,.button{border:0;border-radius:11px;background:#8bb8ff;color:#081426;font-weight:750;padding:12px 17px;font-size:14px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px}
button.secondary,.button.secondary{background:#202d43;color:#dbe7fb;border:1px solid #3a4c67}button:disabled{opacity:.45;cursor:not-allowed}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:15px}.status{font-size:13px;color:#aab9cf;margin-top:13px;white-space:pre-wrap;overflow-wrap:anywhere}.status.ok{color:#79dfae}.status.err{color:#ff9b9b}
.pill{display:inline-block;padding:4px 9px;border:1px solid #3b4c66;border-radius:30px;color:#b8c8de;font-size:11px;margin:0 0 10px}
.hidden{display:none!important}.fine{font-size:12px;color:#8192ac;line-height:1.6}.check{color:#77dfad}.warn{color:#f5c77b}
footer{color:#64758f;font-size:12px;text-align:center;margin-top:28px}
@media(max-width:560px){main{padding-top:30px}.panel{padding:18px}.actions>*{width:100%}}
</style></head>
<body><main>
<div class="brand"><div class="mark">V</div><div><strong>Runner Credential Vault</strong><small>Secure deployment wizard</small></div></div>
<h1>Your Vault, deployed to your Cloudflare account.</h1>
<p class="lead">Connect Cloudflare with an API Token. GitHub App handles repository access and the existing GitHub Actions workflow performs the deployment. No personal access token is needed.</p>
<section class="panel" id="github">
<div class="step"><div class="num">1</div><div class="content"><span class="pill">GitHub App · account authorization</span><h2>Connect your GitHub account</h2><p class="muted">Authorize the Runner Vault Setup App. We'll identify your account and locate your fork of the official Vault repository.</p>
<div id="gh-user" class="status"></div><div class="actions"><a id="gh-connect" class="button" href="/api/github/start">Continue with GitHub</a><button id="gh-refresh" class="secondary hidden">Check fork</button><button id="gh-switch" class="secondary hidden" type="button">Connect another GitHub account</button></div><p id="gh-switch-help" class="fine hidden">This switches the account used by the wizard. If GitHub automatically reuses the current login, first switch accounts or sign in to the other account at github.com, then continue here.</p><div id="fork-actions" class="actions hidden"></div></div></div>
</section>
<section class="panel hidden" id="cloudflare">
<div class="step"><div class="num">2</div><div class="content"><span class="pill">Cloudflare · API Token</span><h2>Connect Cloudflare</h2><p class="muted">Paste a scoped API Token. It is validated immediately and is never stored by this Worker. The token is transferred directly into your fork's encrypted GitHub Actions secret.</p>
<label for="cf-token">Cloudflare API Token</label><input id="cf-token" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your Cloudflare API Token">
<label for="cf-account">Account</label><select id="cf-account" style="width:100%;background:#0b1220;border:1px solid #34445e;border-radius:11px;padding:13px;color:#eef4ff;font:inherit"><option value="">Validate token to load accounts</option></select>
<p class="fine">Required token permissions: Workers Scripts — Edit; D1 — Edit; Account Settings — Read. The selected account must be accessible to the token.</p>
<div class="actions"><button id="cf-verify">Validate Cloudflare Token</button><button id="deploy" disabled>Deploy Vault</button></div><div id="cf-status" class="status"></div></div></div>
</section>
<section class="panel hidden" id="progress">
<div class="step"><div class="num">3</div><div class="content"><span class="pill">GitHub Actions · deployment</span><h2>Deploying your Vault</h2><p class="muted" id="deploy-message">Your token is being added as an encrypted repository secret and the official deployment workflow is being started.</p><div id="deploy-status" class="status"></div><div id="vault-result" class="actions hidden"></div></div></div>
</section>
<footer>Cloudflare credentials are passed to GitHub Actions as encrypted repository secrets. The wizard does not retain the raw token.</footer>
</main>
<script>
const $=id=>document.getElementById(id);let accountList=[];let verified=false;let deploymentTimer=null;
async function api(path,options={}){const r=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});let j={};try{j=await r.json()}catch{}if(!r.ok)throw new Error(j.error||j.message||'Request failed ('+r.status+')');return j}
function status(id,msg,type=''){const el=$(id);el.textContent=msg;el.className='status '+type}
async function checkGitHub(){try{const data=await api('/api/github/fork');$('gh-connect').classList.add('hidden');$('gh-refresh').classList.remove('hidden');$('gh-switch').classList.remove('hidden');$('gh-switch-help').classList.remove('hidden');$('cloudflare').classList.remove('hidden');status('gh-user','Connected as @'+data.login+' · GitHub ID '+data.userId,'ok');if(data.fork && data.installed){status('gh-user','Connected as @'+data.login+' · GitHub App installed on '+data.repository,'ok');$('fork-actions').innerHTML='<span class="pill check">Fork verified · App installed</span>';$('fork-actions').classList.remove('hidden');$('cloudflare').classList.remove('hidden')}else if(data.fork){status('gh-user','Connected as @'+data.login+' · Fork found: '+data.repository,'ok');$('fork-actions').innerHTML='<span class="pill check">Fork verified</span><a class="button" href="'+data.installUrl+'">Install GitHub App on this fork</a>';$('fork-actions').classList.remove('hidden');$('cloudflare').classList.add('hidden')}else{status('gh-user','Connected as @'+data.login+' · No fork found yet.','');$('fork-actions').innerHTML='<a class="button" target="_blank" rel="noopener" href="'+data.forkUrl+'">Create your Vault fork on GitHub</a><button class="secondary" id="recheck">I created the fork · Check again</button>';$('fork-actions').classList.remove('hidden');$('recheck').onclick=checkGitHub;$('cloudflare').classList.add('hidden')}}catch(e){$('gh-connect').classList.remove('hidden');status('gh-user',e.message,'err')}}
$('gh-refresh').onclick=checkGitHub;
$('gh-switch').onclick=async()=>{if(!confirm('Switch the GitHub account used by this wizard? Your current wizard session will be cleared.'))return;$('gh-switch').disabled=true;try{await api('/api/logout',{method:'POST'});location.assign('/api/github/start')}catch(e){$('gh-switch').disabled=false;status('gh-user','Could not switch GitHub account: '+e.message,'err')}};
$('cf-verify').onclick=async()=>{const token=$('cf-token').value.trim();if(!token){status('cf-status','Enter a Cloudflare API Token.','err');return}verified=false;$('deploy').disabled=true;status('cf-status','Validating token and listing accessible accounts…');try{const data=await api('/api/cloudflare/verify',{method:'POST',body:JSON.stringify({token})});accountList=data.accounts;$('cf-account').innerHTML='';for(const a of accountList){const o=document.createElement('option');o.value=a.id;o.textContent=a.name+' · '+a.id;$('cf-account').append(o)}$('cf-account').disabled=accountList.length===1;verified=true;$('deploy').disabled=false;status('cf-status','Token is active. '+accountList.length+' account(s) available.','ok')}catch(e){status('cf-status',e.message,'err')}};
$('cf-token').oninput=()=>{verified=false;$('deploy').disabled=true};
$('deploy').onclick=async()=>{if(!verified)return;const token=$('cf-token').value.trim();const accountId=$('cf-account').value;if(!token||!accountId)return; $('deploy').disabled=true;$('progress').classList.remove('hidden');status('deploy-status','Registering encrypted GitHub Actions secrets and dispatching deploy.yml…');try{const data=await api('/api/deploy',{method:'POST',body:JSON.stringify({token,accountId})});$('cf-token').value='';status('deploy-status','Workflow dispatched successfully · checking GitHub Actions status…','ok');$('deploy-message').textContent='GitHub Actions is provisioning D1, deploying the Worker and publishing deployment.json. Keep this page open while we verify the result.';pollStatus()}catch(e){status('deploy-status',e.message,'err');$('deploy').disabled=false}};
async function pollStatus(){clearTimeout(deploymentTimer);try{const s=await api('/api/deploy/status');if(s.state==='queued'||s.state==='in_progress'){status('deploy-status','GitHub Actions: '+s.state+' · '+(s.runUrl||''));deploymentTimer=setTimeout(pollStatus,7000);return}if(s.state==='success'&&s.url){status('deploy-status','Deployment verified successfully.','ok');$('vault-result').innerHTML='<a class="button" target="_blank" rel="noopener" href="'+s.url+'">Open your Vault ↗</a><a class="button secondary" target="_blank" rel="noopener" href="'+s.url+'/setup">Finish Vault setup</a>';$('vault-result').classList.remove('hidden');return}if(s.state==='failure'){status('deploy-status','GitHub Actions deployment failed. Open the workflow run to inspect the exact failing step. '+(s.runUrl||''),'err');$('vault-result').innerHTML='<a class="button secondary" target="_blank" rel="noopener" href="'+s.runUrl+'">Open workflow logs</a>';$('vault-result').classList.remove('hidden');return}status('deploy-status','Waiting for GitHub Actions to register the workflow run…');deploymentTimer=setTimeout(pollStatus,7000)}catch(e){status('deploy-status',e.message,'err');deploymentTimer=setTimeout(pollStatus,10000)}}
checkGitHub();
</script></body></html>`;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
function b64url(bytes: Uint8Array): string {
  let binary = ""; for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function unb64url(value: string): Uint8Array {
  const base = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base + "=".repeat((4 - base.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function cookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("Cookie") ?? "";
  return header.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="))?.slice(name.length + 1);
}
function setCookie(name: string, value: string, maxAge: number): string {
  return name + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + maxAge;
}
function clearCookie(name: string): string { return name + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"; }
function randomToken(bytes = 24): string { const data = crypto.getRandomValues(new Uint8Array(bytes)); return b64url(data); }
async function sessionKey(env: Env): Promise<CryptoKey> {
  if (!env.APP_SESSION_SECRET || env.APP_SESSION_SECRET.length < 32) throw new Error("APP_SESSION_SECRET must be at least 32 characters");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.APP_SESSION_SECRET));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function sealSession(env: Env, session: Session): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify({ ...session, exp: Math.floor(Date.now()/1000) + SESSION_TTL }));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sessionKey(env), data);
  return b64url(new Uint8Array([...iv, ...new Uint8Array(encrypted)]));
}
async function openSession(request: Request, env: Env): Promise<Session | null> {
  const value = cookie(request, SESSION_COOKIE); if (!value) return null;
  try {
    const bytes = unb64url(value); const iv = bytes.slice(0,12); const encrypted = bytes.slice(12);
    const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await sessionKey(env), encrypted);
    const data = JSON.parse(new TextDecoder().decode(raw));
    if (!data.exp || data.exp < Date.now()/1000 || typeof data.accessToken !== "string") return null;
    return data as Session;
  } catch { return null; }
}
async function githubRequest(path: string, token: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch("https://api.github.com" + path, {
    ...init,
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": "Bearer " + token,
      "x-github-api-version": "2022-11-28",
      "user-agent": "vault-setup-wizard",
      ...(init.headers ?? {})
    }
  });
  const body = await response.text();
  let data: any = {}; try { data = body ? JSON.parse(body) : {}; } catch { data = { message: body.slice(0,300) }; }
  if (!response.ok) throw new Error("GitHub API " + response.status + ": " + (data.message ?? "request failed"));
  return data;
}
function requireConfig(env: Env) {
  for (const key of ["GITHUB_APP_ID","GITHUB_APP_SLUG","GITHUB_CLIENT_ID","GITHUB_CLIENT_SECRET","GITHUB_APP_PRIVATE_KEY","APP_SESSION_SECRET"] as const) {
    if (!env[key]) throw new Error("Wizard is not configured: missing " + key);
  }
}
async function appJwt(env: Env): Promise<string> {
  const pem = pkcs8Bytes(env.GITHUB_APP_PRIVATE_KEY);
  const keyData = pem.buffer.slice(pem.byteOffset, pem.byteOffset + pem.byteLength) as ArrayBuffer;
  const key = await crypto.subtle.importKey("pkcs8", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now()/1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ iat: now - 30, exp: now + 8*60, iss: env.GITHUB_APP_ID })));
  const unsigned = header + "." + payload;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return unsigned + "." + b64url(new Uint8Array(signature));
}
async function installationToken(env: Env, installationId: number, repository: string): Promise<{ token: string; permissions: Record<string,string> }> {
  const jwt = await appJwt(env);
  const repositoryName = repository.split("/")[1];
  return githubRequest("/app/installations/" + installationId + "/access_tokens", jwt, {
    method: "POST", body: JSON.stringify({ repositories: [repositoryName] })
  });
}
async function saveActionSecret(repo: string, name: string, value: string, token: string): Promise<void> {
  const key = await githubRequest("/repos/" + repo + "/actions/secrets/public-key", token);
  const encrypted_value = await encryptActionSecret(key.key, value);
  await githubRequest("/repos/" + repo + "/actions/secrets/" + name, token, {
    method: "PUT", body: JSON.stringify({ encrypted_value, key_id: key.key_id })
  });
}
function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Cross-origin request rejected");
}
async function verifyCloudflareToken(token: string): Promise<{ id: string; name: string }[]> {
  if (token.length < 20 || token.length > 512) throw new Error("Cloudflare API Token format is invalid");
  const verify = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers: { authorization: "Bearer " + token } });
  const verified: any = await verify.json().catch(() => ({}));
  if (!verify.ok || verified.success !== true || verified.result?.status !== "active") throw new Error("Cloudflare API Token is invalid, expired, or inactive");
  const response = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=50", { headers: { authorization: "Bearer " + token } });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true || !Array.isArray(result.result)) throw new Error("Token is valid but cannot list Cloudflare accounts. Grant Account Settings: Read.");
  return result.result.filter((a: any) => typeof a.id === "string" && typeof a.name === "string").map((a: any) => ({ id: a.id, name: a.name }));
}
async function getFork(session: Session): Promise<any | null> {
  try {
    const repo = await githubRequest("/repos/" + encodeURIComponent(session.login) + "/GitHub-runner-vault", session.accessToken);
    if (repo.fork && repo.parent?.full_name?.toLowerCase() === SOURCE_REPOSITORY.toLowerCase()) return repo;
    return null;
  } catch (error) {
    if (String(error).includes("GitHub API 404")) return null;
    throw error;
  }
}
async function ensureInstallationRepo(env: Env, installationId: number, expectedRepo: string, expectedOwnerId: number): Promise<{ token: string; repo: any }> {
  const tokenData = await installationToken(env, installationId, expectedRepo);
  if (!tokenData.token) throw new Error("GitHub App installation token could not be created");
  const repos = await githubRequest("/installation/repositories?per_page=100", tokenData.token);
  const repo = (repos.repositories ?? []).find((r: any) => r.full_name?.toLowerCase() === expectedRepo.toLowerCase());
  if (!repo) throw new Error("Install the GitHub App with access to the selected Vault fork, then return here");
  if (repo.owner?.id !== expectedOwnerId) throw new Error("GitHub App installation owner does not match the authorized GitHub account");
  if (tokenData.permissions?.actions !== "write") throw new Error("GitHub App needs Actions: Read and write permission on this fork");
  if (!["read", "write"].includes(tokenData.permissions?.contents ?? "")) throw new Error("GitHub App needs Contents: Read-only permission on this fork");
  return { token: tokenData.token, repo };
}
async function dispatchDeployment(env: Env, session: Session, cloudflareToken: string, accountId: string): Promise<number> {
  if (!session.installationId || !session.repository || !session.ownerId) throw new Error("GitHub App is not installed on your fork");
  const { token, repo } = await ensureInstallationRepo(env, session.installationId, session.repository, session.ownerId);
  const verifiedAccounts = await verifyCloudflareToken(cloudflareToken);
  if (!verifiedAccounts.some(a => a.id === accountId)) throw new Error("Selected Cloudflare account is not accessible with this token");
  await saveActionSecret(session.repository, "CLOUDFLARE_API_TOKEN", cloudflareToken, token);
  await saveActionSecret(session.repository, "CLOUDFLARE_ACCOUNT_ID", accountId, token);
  await githubRequest("/repos/" + session.repository + "/actions/workflows/deploy.yml/dispatches", token, {
    method: "POST", body: JSON.stringify({ ref: "main" })
  });
  session.dispatchedAt = Date.now();
  return Date.now();
}
async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/") return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https://github.com" } });
  if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "vault-setup-wizard" });
  try {
    if (url.pathname.startsWith("/api/")) requireConfig(env);
    if (request.method === "GET" && url.pathname === "/api/github/start") {
      const state = randomToken();
      const target = new URL("https://github.com/login/oauth/authorize");
      target.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      target.searchParams.set("state", state);
      target.searchParams.set("allow_signup", "false");
      return new Response(null, { status: 302, headers: { location: target.toString(), "set-cookie": setCookie(OAUTH_STATE_COOKIE, state, 600), "cache-control": "no-store" } });
    }
    if (request.method === "GET" && url.pathname === "/api/github/callback") {
      const state = url.searchParams.get("state");
      if (!state || state !== cookie(request, OAUTH_STATE_COOKIE)) throw new Error("GitHub authorization state mismatch. Restart GitHub connection.");
      const code = url.searchParams.get("code");
      if (!code) throw new Error("GitHub authorization was cancelled");
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST", headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code })
      });
      const tokenData: any = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.access_token) throw new Error("GitHub authorization code exchange failed");
      const profile = await githubRequest("/user", tokenData.access_token);
      const session: Session = { accessToken: tokenData.access_token, login: profile.login, userId: profile.id };
      const headers = new Headers({ location: "/", "cache-control": "no-store" }); headers.append("set-cookie", setCookie(SESSION_COOKIE, await sealSession(env, session), SESSION_TTL)); headers.append("set-cookie", clearCookie(OAUTH_STATE_COOKIE)); return new Response(null, { status: 302, headers });
    }
    if (request.method === "GET" && url.pathname === "/api/github/fork") {
      const session = await openSession(request, env); if (!session) return json({ error: "Connect GitHub first" }, 401);
      const fork = await getFork(session);
      const installState = randomToken();
      const installUrl = "https://github.com/apps/" + encodeURIComponent(env.GITHUB_APP_SLUG) + "/installations/new?state=" + encodeURIComponent(installState);
      const headers = new Headers({ "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
      headers.append("set-cookie", setCookie(INSTALL_STATE_COOKIE, installState, 900));
      return new Response(JSON.stringify({
        login: session.login, userId: session.userId,
        fork: !!fork, repository: fork?.full_name ?? null, installed: !!(session.installationId && session.repository === fork?.full_name),
        forkUrl: "https://github.com/" + session.login + "/GitHub-runner-vault/fork",
        installUrl: fork ? installUrl : null
      }), { headers });
    }
    if (request.method === "GET" && url.pathname === "/api/github/install-url") {
      const session = await openSession(request, env); if (!session) return json({ error: "Connect GitHub first" }, 401);
      const fork = await getFork(session); if (!fork) return json({ error: "Fork not found" }, 404);
      const state = randomToken();
      return new Response(JSON.stringify({ url: "https://github.com/apps/" + encodeURIComponent(env.GITHUB_APP_SLUG) + "/installations/new?state=" + encodeURIComponent(state) }), {
        headers: { "content-type": "application/json", "set-cookie": setCookie(INSTALL_STATE_COOKIE, state, 900), "cache-control": "no-store" }
      });
    }
    if (request.method === "GET" && url.pathname === "/api/github/installed") {
      const session = await openSession(request, env); if (!session) throw new Error("GitHub session expired. Reconnect GitHub.");
      const state = url.searchParams.get("state");
      if (!state || state !== cookie(request, INSTALL_STATE_COOKIE)) throw new Error("GitHub App installation state mismatch");
      const installationId = Number(url.searchParams.get("installation_id"));
      if (!Number.isSafeInteger(installationId) || installationId < 1) throw new Error("Missing GitHub App installation ID");
      const fork = await getFork(session); if (!fork) throw new Error("Your fork was not found. Create it first, then install the App.");
      const jwt = await appJwt(env);
      const installation = await githubRequest("/app/installations/" + installationId, jwt);
      if (installation.account?.id !== session.userId) throw new Error("This GitHub App installation belongs to a different GitHub account");
      const access = await ensureInstallationRepo(env, installationId, fork.full_name, session.userId);
      session.installationId = installationId; session.repository = fork.full_name; session.ownerId = session.userId;
      const headers = new Headers({ location: "/", "cache-control": "no-store" }); headers.append("set-cookie", setCookie(SESSION_COOKIE, await sealSession(env, session), SESSION_TTL)); headers.append("set-cookie", clearCookie(INSTALL_STATE_COOKIE)); return new Response(null, { status: 302, headers });
    }
    if (request.method === "POST" && url.pathname === "/api/cloudflare/verify") {
      assertSameOrigin(request);
      const body: any = await request.json(); const token = typeof body.token === "string" ? body.token.trim() : "";
      const accounts = await verifyCloudflareToken(token);
      if (!accounts.length) throw new Error("No Cloudflare accounts are accessible with this token");
      return json({ accounts });
    }
    if (request.method === "POST" && url.pathname === "/api/deploy") {
      assertSameOrigin(request);
      const session = await openSession(request, env); if (!session) return json({ error: "Reconnect GitHub and install the App first" }, 401);
      if (!session.installationId || !session.repository) return json({ error: "Install the GitHub App on your Vault fork first" }, 409);
      const body: any = await request.json();
      const token = typeof body.token === "string" ? body.token.trim() : "";
      const accountId = typeof body.accountId === "string" ? body.accountId : "";
      if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("Invalid Cloudflare Account ID");
      const dispatchedAt = await dispatchDeployment(env, session, token, accountId);
      session.dispatchedAt = dispatchedAt;
      return new Response(JSON.stringify({ ok: true, dispatchedAt, repository: session.repository }), { headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": setCookie(SESSION_COOKIE, await sealSession(env, session), SESSION_TTL) } });
    }
    if (request.method === "GET" && url.pathname === "/api/deploy/status") {
      const session = await openSession(request, env); if (!session) return json({ error: "GitHub session expired" }, 401);
      if (!session.installationId || !session.repository) return json({ error: "GitHub App is not installed" }, 409);
      const { token } = await ensureInstallationRepo(env, session.installationId, session.repository, session.userId);
      const runs = await githubRequest("/repos/" + session.repository + "/actions/workflows/deploy.yml/runs?branch=main&per_page=5", token);
      const run = (runs.workflow_runs ?? []).find((r: any) => !session.dispatchedAt || Date.parse(r.created_at) >= session.dispatchedAt - 15000);
      if (!run) return json({ state: "queued", runUrl: null });
      const runUrl = run.html_url;
      if (run.status !== "completed") return json({ state: run.status ?? "in_progress", runUrl, runId: run.id });
      if (run.conclusion !== "success") return json({ state: "failure", runUrl, conclusion: run.conclusion });
      const deployment = await githubRequest("/repos/" + session.repository + "/contents/deployment.json?ref=main", token);
      const decoded = atob((deployment.content ?? "").replace(/\n/g, ""));
      const info = JSON.parse(decoded);
      if (typeof info.url !== "string" || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(info.url)) throw new Error("Deployment completed but deployment.json contains an unexpected Vault URL");
      return json({ state: "success", url: info.url, runUrl, deployedSha: info.sha ?? null });
    }
    if (request.method === "POST" && url.pathname === "/api/logout") {
      assertSameOrigin(request);
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": clearCookie(SESSION_COOKIE), "cache-control": "no-store" } });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 400);
  }
}

export default { fetch: handle };
