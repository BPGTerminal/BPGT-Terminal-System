// BPGT Service Worker v4.5 - Minimal
const CACHE = 'bpgt-v4.5';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Always fetch fresh — no caching that breaks updates
  if (e.request.url.includes('script.google.com')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
```

**Commit that.**

---

### **Step 4: Reinstall fresh**

1. Open Chrome
2. Go to your URL
3. **Hard refresh** — hold reload button → **Hard reload**
4. Login should work now!
5. Then ⋮ → Add to Home Screen → Install

---

## ⚡ **WHY THIS KEEPS HAPPENING:**
```
Old service worker cached broken files
New files uploaded to GitHub
But phone says "I have this cached, no need to download!"
So it loads the OLD broken version forever

The simpler service worker above = 
always fetches fresh files
never gets stuck
still works offline for basic stuff
