# One URL, two homepages (cleartax.com)

`cleartax.com` serves the **Global** homepage. Visitors whose browser timezone is
`Asia/Kolkata` / `Asia/Calcutta` see the **India** homepage instead — same URL, no redirect.

| Page | Webflow page | Retool path | Indexed |
|---|---|---|---|
| Global (`global-homepage`) | home | `cleartax.com` | yes |
| India (`india-homepage`) | slug `home-in` | `cleartax.com/home-in` | no (`noindex`) |

`/in` is untouched and free for a separate page.

## Release steps

1. `npm run build`, paste `global-homepage` and `india-homepage` embeds into their Webflow pages as usual.
2. India Webflow page: slug `home-in`. Publish.
3. Retool → map `home-in` to `cleartax.com/home-in` (Path Prefix empty, Slug `home-in`).
4. Global Webflow page → Page Settings → Custom Code → **Inside `<head>` tag**: paste the snippet below, **above** every other script (Usercentrics, GTM). Publish, then map `cleartax.com` as today.
5. Verify (below).

## Snippet (Global page, first thing in `<head>`)

```html
<script>
(function () {
  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  if (tz !== "Asia/Kolkata" && tz !== "Asia/Calcutta") return; // everyone else: Global, no delay

  var hide = document.createElement("style");
  hide.textContent = "html{visibility:hidden}";
  document.head.appendChild(hide);
  var reveal = function () { if (hide.parentNode) hide.parentNode.removeChild(hide); };
  var failsafe = setTimeout(reveal, 3000); // any failure: show Global

  var KEY = "ct-home-in", TTL = 600000; // reuse the fetched India page for 10 min
  var swap = function (html) {
    clearTimeout(failsafe);
    document.open();
    document.write(html); // same-origin, our own page; India page re-runs its own head scripts
    document.close();
  };

  try {
    var c = JSON.parse(localStorage.getItem(KEY));
    if (c && c.h && Date.now() - c.t < TTL) return setTimeout(function () { swap(c.h); }, 0); // repeat visit: no network wait
  } catch (e) {}

  fetch("/home-in", { credentials: "omit" })
    .then(function (r) {
      if (!r.ok) throw new Error("status " + r.status);
      return r.text();
    })
    .then(function (html) {
      if (html.indexOf("<body") === -1) throw new Error("bad page");
      try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), h: html })); } catch (e) {}
      swap(html);
    })
    .catch(reveal);
})();
</script>
```

Only Indian-timezone visitors pay for the extra fetch; everyone else gets the Global page untouched.
The India page is replaced wholesale (`document.write`), so its CSS, Usercentrics, GTM and HubSpot load once,
exactly as if it were the page. The snippet is not on the India page, so there is no loop.

## Verify

- Chrome DevTools → Sensors → Location/timezone **Asia/Kolkata**, hard reload `cleartax.com`: India page, URL unchanged.
- Any other timezone: Global page.
- Block `/home-in` in Network tab: Global page appears after ≤2.5 s.
- `cleartax.com/home-in` source contains `noindex`.

## Security notes

- No external call, no personal data; the timezone is read locally and never sent anywhere.
- The timezone is user-controlled. Spoofing it only changes which public marketing page that user sees.
- `/home-in` is **public**. `noindex` hides it from search, it does not protect it. Never put anything non-public there.
- `document.write` runs HTML fetched from our own origin. Anyone who can edit that Webflow page can already run scripts on the site, so no new trust is added. Never point the `fetch` at another origin or a URL taken from the query string.
- If a CSP is ever added to the site that blocks inline scripts, this snippet fails safe (Global shows).

## Limits

- Search engines only see the Global page at `cleartax.com`; the India page has no indexed URL of its own.
- Indian-timezone visitors see a blank page while the India page is fetched and re-parsed (~0.5–1 s on a first visit; the HTML is cached in `localStorage` for 10 min, so repeat visits skip the network). After you republish `/home-in`, a returning visitor can see the old copy for up to 10 min.
- India travellers abroad see Global; non-Indian-timezone users in India see Global. Timezone is a proxy for country.
