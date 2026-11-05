/* সার্ভিস ওয়ার্কার — অ্যাপ ক্যাশ করে, যাতে ইন্টারনেট ছাড়াও (মোবাইল অ্যাপ ও কম্পিউটার ব্রাউজারে) পুরো অ্যাপ খোলে */
const V = 'solar-v2-6';
const FALLBACK = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>অফলাইন</title><body style="font-family:sans-serif;background:#0d2438;color:#fff;text-align:center;padding:40px 20px"><h2>☀️ অফলাইন ক্যাশ এখনও তৈরি হয়নি</h2><p>একবার ইন্টারনেট চালু করে অ্যাপটি খুলুন, তারপর থেকে নেট ছাড়াই চলবে।</p><button onclick="location.reload()" style="padding:10px 20px;font-size:16px">আবার চেষ্টা</button>';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(async c => {
    await c.add(new Request('index.html', { cache: 'reload' }));                       // এটি না পেলে ইনস্টল ব্যর্থ — পুরনো ভালো সংস্করণ থেকে যাবে
    await Promise.all(['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'].map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => { })));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const wait = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Google Apps Script কল ক্যাশ হয় না
  if (r.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await Promise.race([fetch(r), wait(4000)]);
        if (res.type === 'opaqueredirect') return res;
        if (res.ok) { const c = await caches.open(V), cp = res.clone(); c.put('index.html', cp); return res; }
      } catch (er) { }
      return (await caches.match(r, { ignoreSearch: true })) || (await caches.match('index.html')) || (await caches.match('./')) || new Response(FALLBACK, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })());
    return;
  }
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || Response.error())));
});
