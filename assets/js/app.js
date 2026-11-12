/* Vertigo — storefront application (vanilla JS, hash router, localStorage persistence). */
(() => {
  'use strict';
  const VT = window.VT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- storage ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('vt_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('vt_' + k, JSON.stringify(v)); } catch { } }
  };

  /* ---------------- regions & money ---------------- */
  const LANGS = { en: 'English', fr: 'Français', es: 'Español', ja: '日本語', zh: '中文' };
  const RATES = { EUR: 1, USD: 1.08, GBP: 0.85, CAD: 1.48, JPY: 162, CNY: 7.8, KRW: 1450 };
  const REGIONS = {
    FR: { cur: 'EUR', zone: 'eu' }, BE: { cur: 'EUR', zone: 'eu' }, DE: { cur: 'EUR', zone: 'eu' }, ES: { cur: 'EUR', zone: 'eu' }, IT: { cur: 'EUR', zone: 'eu' },
    GB: { cur: 'GBP', zone: 'intl' }, US: { cur: 'USD', zone: 'intl' }, CA: { cur: 'CAD', zone: 'intl' },
    JP: { cur: 'JPY', zone: 'asia' }, CN: { cur: 'CNY', zone: 'asia' }, KR: { cur: 'KRW', zone: 'kr' }
  };
  const ZONES = { eu: { std: 4.9, exp: 9.9, free: 60, days: [2, 4], expDays: [1, 2] }, intl: { std: 9.9, exp: 19.9, free: 90, days: [5, 8], expDays: [2, 4] }, asia: { std: 7.9, exp: 15.9, free: 70, days: [3, 6], expDays: [1, 3] }, kr: { std: 2.5, exp: 5, free: 30, days: [1, 2], expDays: [0, 1] } };
  const PROMOS = { BLACKFRIDAY: { pct: 20 }, WELCOME10: { pct: 10 }, FREESHIP: { ship: true } };
  const GIFTWRAP = 3;

  const guessRegion = () => { const l = (navigator.language || 'en-US').split('-'); const r = (l[1] || '').toUpperCase(); return REGIONS[r] ? r : ({ fr: 'FR', es: 'ES', ja: 'JP', zh: 'CN', ko: 'KR', de: 'DE', it: 'IT' }[l[0]] || 'US'); };
  const S = {
    lang: store.get('lang', 'en'),
    region: store.get('region', guessRegion()),
    theme: store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    cart: store.get('cart', []),
    favs: store.get('favs', []),
    user: store.get('user', null),
    giftwrap: store.get('giftwrap', false),
    promo: store.get('promo', null)
  };
  if (!LANGS[S.lang]) S.lang = 'en';
  if (!REGIONS[S.region]) S.region = 'US';
  const cur = () => REGIONS[S.region].cur;
  const zone = () => ZONES[REGIONS[S.region].zone];
  const conv = eur => { const c = cur(); if (c === 'EUR') return Math.round(eur * 100) / 100; const v = eur * RATES[c]; if (c === 'JPY') return Math.round(v / 10) * 10; if (c === 'KRW') return Math.round(v / 100) * 100; return Math.round(v); };
  const locale = () => ({ en: 'en', fr: 'fr-FR', es: 'es-ES', ja: 'ja-JP', zh: 'zh-CN' }[S.lang]) + '';
  const fmt = (amount, c = cur()) => { const dec = (c === 'JPY' || c === 'KRW') ? 0 : 2; try { return new Intl.NumberFormat(locale(), { style: 'currency', currency: c, minimumFractionDigits: dec, maximumFractionDigits: dec }).format(amount); } catch { return amount + ' ' + c; } };
  const money = eur => fmt(conv(eur));
  const regionName = (code, lang = S.lang) => { try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code); } catch { return code; } };
  const dateFmt = (d, opts = { dateStyle: 'long' }) => { try { return new Intl.DateTimeFormat(locale(), opts).format(new Date(d)); } catch { return new Date(d).toDateString(); } };

  /* ---------------- i18n ---------------- */
  const t = (k, vars) => {
    let s = (VT.i18n[S.lang] && VT.i18n[S.lang][k]) ?? VT.i18n.en[k] ?? k;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
    return s;
  };
  const pt = p => p.t[S.lang] || p.t.en;
  const content = k => (VT.content[S.lang] && VT.content[S.lang][k]) || VT.content.en[k];

  /* ---------------- icons ---------------- */
  const I = {
    star: (f = 1) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 6 6.5.6-4.9 4.4 1.4 6.4L12 16.9l-5.7 3.3 1.4-6.4-4.9-4.4 6.5-.6z" fill="${f ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor"/><circle cx="18.5" cy="5" r="1.2" fill="currentColor"/><circle cx="21" cy="8.5" r=".8" fill="currentColor"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.6" fill="currentColor"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7"/></g></svg>`,
    basket: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9.5h19l-2 10.2a1.6 1.6 0 0 1-1.6 1.3H6.1a1.6 1.6 0 0 1-1.6-1.3z" fill="currentColor"/><path d="M7 9.5l3.2-6M17 9.5l-3.2-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="12" cy="15" r="1.6" fill="var(--bg)"/></svg>`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    user: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 21c1-4.2 4.2-6 8-6s7 1.8 8 6" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`,
    close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    chev: `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" stroke="currentColor" fill="none" stroke-width="1.5"/></svg>`,
    menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    sparkle: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24 14c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z" fill="currentColor"/><path d="M14 4c.6 3.4 1.6 4.4 5 5-3.4.6-4.4 1.6-5 5-.6-3.4-1.6-4.4-5-5 3.4-.6 4.4-1.6 5-5zM30 2c.4 2 1 2.6 3 3-2 .4-2.6 1-3 3-.4-2-1-2.6-3-3 2-.4 2.6-1 3-3z" fill="currentColor"/></svg>`,
    truck: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>`,
    leaf: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19l8-8"/></svg>`,
    gift: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z"/></svg>`,
    return: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9h11a5 5 0 0 1 0 10H8"/><path d="M8 5L4 9l4 4"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="10" width="14" height="10"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
    flask: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7 15h10"/></svg>`,
    ig: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor"/></svg>`,
    tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.1c-1.5 0-2.8-.4-4-1.2v6.3a6 6 0 1 1-6-6v3.2a2.8 2.8 0 1 0 2.8 2.8V3z"/></svg>`,
    yt: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8zM10 15V9l5.2 3z"/></svg>`
  };
  const stars = r => `<span class="stars" aria-label="${r}/5">${[1, 2, 3, 4, 5].map(i => I.star(r >= i - .25 ? 1 : 0)).join('')}</span>`;

  /* ---------------- product helpers ---------------- */
  const products = VT.products;
  const P = slug => VT.bySlug[slug];
  const isFav = slug => S.favs.includes(slug);
  const unitEur = (p, amount) => p.amounts ? (amount || p.price) : p.price;
  const sm = src => src.replace(/(\.webp)$/, '-sm$1').replace('-md-sm', '-md');
  const catLabel = c => t('cat.' + c);
  const tagFor = p => p.flags.includes('new') ? t('badge.new') : p.flags.includes('best') ? t('badge.best') : p.compare ? t('badge.set') : '';

  const card = (p, opts = {}) => {
    const x = pt(p), tag = opts.noTag ? '' : tagFor(p);
    const alt = p.images[1] && !p.images[1].includes('heroes') ? p.images[1] : null;
    return `<article class="card reveal"><div class="mwrap">
      <a href="#/product/${p.slug}" class="media" aria-label="${esc(x.name)}">
        <img class="main" src="${sm(p.images[0])}" alt="${esc(x.name)} — ${esc(x.sub)}" loading="lazy" width="600" height="750">
        ${alt ? `<img class="alt" src="${sm(alt)}" alt="" loading="lazy">` : ''}
      </a>
      ${tag ? `<span class="tag">${tag}</span>` : ''}
      <button class="fav" data-act="fav" data-slug="${p.slug}" aria-pressed="${isFav(p.slug)}" aria-label="${t(isFav(p.slug) ? 'fav.remove' : 'fav.add')}">${I.star(isFav(p.slug))}</button>
      ${p.amounts ? '' : `<button class="quick" data-act="add" data-slug="${p.slug}">+ ${t('card.quickadd')}</button>`}
      </div><a href="#/product/${p.slug}" class="info">
        <div><div class="name">${esc(x.name)}</div>${opts.noSub ? '' : `<div class="sub">${esc(x.sub)}</div>`}</div>
        <div class="price">${p.compare ? `<s>${money(p.compare)}</s>` : ''}${p.amounts ? t('card.from', { p: money(p.amounts[0]) }) : money(p.price)}</div>
      </a>
    </article>`;
  };

  /* ---------------- cart ---------------- */
  const cartKey = (slug, amount) => slug + (amount ? ':' + amount : '');
  const saveCart = () => { store.set('cart', S.cart); updateBadges(); };
  const addToCart = (slug, qty = 1, amount = null, silent = false) => {
    const p = P(slug); if (!p) return;
    if (p.amounts && !amount) amount = p.price;
    const k = cartKey(slug, amount);
    const line = S.cart.find(l => cartKey(l.slug, l.amount) === k);
    if (line) line.qty = Math.min(line.qty + qty, 20); else S.cart.push({ slug, qty, amount });
    saveCart();
    const b = $('#cartCount'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    if (!silent) toast(t('toast.added', { n: pt(p).name }), `<a href="#" data-act="open-cart">${t('toast.view')}</a>`);
  };
  const setQty = (i, q) => { if (q <= 0) S.cart.splice(i, 1); else S.cart[i].qty = Math.min(q, 20); saveCart(); renderCart(); if (route.name === 'checkout' || route.name === 'cart') render(); };
  const cartCount = () => S.cart.reduce((a, l) => a + l.qty, 0);
  const totals = (shipMethod = 'std', promoCode = S.promo, giftcard = null) => {
    const lines = S.cart.map(l => { const p = P(l.slug); const unit = conv(unitEur(p, l.amount)); return { ...l, p, unit, total: unit * l.qty }; }).filter(l => l.p);
    const sub = lines.reduce((a, l) => a + l.total, 0);
    const physical = lines.some(l => l.p.cat !== 'gift');
    const z = zone();
    const promo = promoCode && PROMOS[promoCode] ? PROMOS[promoCode] : null;
    const discount = promo && promo.pct ? Math.round(sub * promo.pct) / 100 : 0;
    const freeAt = conv(z.free);
    let ship = 0;
    if (physical) { ship = shipMethod === 'exp' ? conv(z.exp) : (sub - discount >= freeAt || (promo && promo.ship) ? 0 : conv(z.std)); }
    const wrap = S.giftwrap && physical ? conv(GIFTWRAP) : 0;
    let total = Math.max(0, sub - discount + ship + wrap);
    let gc = 0;
    if (giftcard) { gc = Math.min(total, conv(giftcard.balance)); total -= gc; }
    const r = x => cur() === 'JPY' || cur() === 'KRW' ? Math.round(x) : Math.round(x * 100) / 100;
    return { lines, sub: r(sub), discount: r(discount), ship: r(ship), wrap: r(wrap), gc: r(gc), total: r(total), freeAt, physical, promo: promo ? promoCode : null };
  };

  /* ---------------- toasts ---------------- */
  const toast = (msg, extra = '') => {
    const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = `<span>${msg}</span>${extra}`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3800);
  };

  /* ---------------- layout chrome ---------------- */
  const topMsgs = () => [t('top.bf'), t('top.ship', { p: money(zone().free) }), t('top.samples')];
  let topTimer;
  const renderTop = () => {
    const el = $('#topbar'); const msgs = topMsgs();
    el.innerHTML = msgs.map((m, i) => `<div class="msg ${i === 0 ? 'on' : ''}"><span>${m}</span></div>`).join('');
    clearInterval(topTimer); let i = 0;
    topTimer = setInterval(() => { const ms = $$('.msg', el); if (!ms.length) return; ms[i].classList.remove('on'); i = (i + 1) % ms.length; ms[i].classList.add('on'); }, 4500);
  };

  const renderHeader = () => {
    const featured = ['red-velvet-serum', 'velvet-sun-cream'].map(P);
    $('#header').innerHTML = `
      <button class="burger icon-btn" data-act="mnav" aria-label="${t('nav.menu')}">${I.menu}</button>
      <nav class="nav" aria-label="${t('nav.main')}">
        <a href="#/shop" data-mega="1" class="${route.name === 'shop' || route.name === 'product' ? 'active' : ''}">${t('nav.products')}</a>
        <a href="#/routines" class="${route.name === 'routines' ? 'active' : ''}">${t('nav.routines')}</a>
        <a href="#/about" class="${route.name === 'about' ? 'active' : ''}">${t('nav.about')}</a>
      </nav>
      <a class="brand" href="#/" aria-label="Vertigo — ${t('nav.home')}"><span class="logo-mask"></span></a>
      <div class="tools">
        <button class="region-btn hide-sm" data-act="region" aria-haspopup="true">${esc(regionName(S.region).toUpperCase())} · ${S.lang.toUpperCase()} ${I.chev}</button>
        <a class="hlink hide-md" href="${S.user ? '#/account' : '#/login'}">${S.user ? t('nav.account') : t('nav.login')}</a>
        <button class="icon-btn" data-act="search" aria-label="${t('nav.search')}">${I.search}</button>
        <a class="icon-btn hide-sm" href="#/favorites" aria-label="${t('nav.favorites')}">${I.star(1)}<span class="badge" id="favCount"></span></a>
        <button class="icon-btn hide-sm" data-act="theme" aria-label="${t('nav.theme')}">${S.theme === 'dark' ? I.sun : I.moon}</button>
        <button class="icon-btn" data-act="open-cart" aria-label="${t('nav.cart')}">${I.basket}<span class="badge" id="cartCount"></span></button>
      </div>
      <div class="mega" id="mega" role="menu">
        <div class="mega-inner">
          <div><h4>${t('mega.category')}</h4><ul>
            <li><a href="#/shop">${t('mega.all')}</a></li>
            ${VT.categories.map(c => `<li><a href="#/shop/${c}">${catLabel(c)}</a></li>`).join('')}
          </ul></div>
          <div><h4>${t('mega.concern')}</h4><ul>
            ${VT.concerns.map(c => `<li><a href="#/shop/all/${c}">${t('concern.' + c)}</a></li>`).join('')}
            <li><a href="#/routines">${t('mega.routine')}</a></li>
          </ul></div>
          <div><h4>${t('mega.new')}</h4><div class="mega-feature">
            ${featured.map(p => `<a href="#/product/${p.slug}"><img src="${sm(p.images[0])}" alt="">${esc(pt(p).name)}</a>`).join('')}
          </div></div>
        </div>
      </div>
      <div class="pop" id="regionPop" role="dialog" aria-label="${t('region.title')}">
        <h4>${t('region.lang')}</h4>
        <div class="langs">${Object.entries(LANGS).map(([k, v]) => `<button data-act="lang" data-lang="${k}" class="${k === S.lang ? 'on' : ''}" lang="${k}">${v}</button>`).join('')}</div>
        <h4>${t('region.ship')}</h4>
        <div class="field" style="margin:0"><select id="regionSelect" aria-label="${t('region.ship')}">
          ${Object.keys(REGIONS).sort((a, b) => regionName(a).localeCompare(regionName(b))).map(r => `<option value="${r}" ${r === S.region ? 'selected' : ''}>${esc(regionName(r))} — ${REGIONS[r].cur}</option>`).join('')}
        </select></div>
      </div>`;
    updateBadges();
  };

  const renderMobileNav = () => {
    $('#mnav').innerHTML = `
      <button class="close icon-btn" data-act="mnav-close" aria-label="${t('ui.close')}">${I.close}</button>
      <a href="#/shop">${t('nav.products')}</a>
      ${VT.categories.map(c => `<a class="sub" href="#/shop/${c}">${catLabel(c)}</a>`).join('')}
      <a href="#/routines">${t('nav.routines')}</a>
      <a href="#/about">${t('nav.about')}</a>
      <a href="#/favorites">${t('nav.favorites')}</a>
      <a href="${S.user ? '#/account' : '#/login'}">${S.user ? t('nav.account') : t('nav.login')}</a>
      <div style="margin-top:28px" class="pop open" style="position:static">
      </div>
      <div style="margin-top:26px">
        <div class="eyebrow" style="margin-bottom:10px">${t('region.lang')}</div>
        <div class="chips">${Object.entries(LANGS).map(([k, v]) => `<button class="chip ${k === S.lang ? 'on' : ''}" data-act="lang" data-lang="${k}">${v}</button>`).join('')}</div>
        <div class="eyebrow" style="margin:22px 0 10px">${t('region.ship')}</div>
        <div class="field"><select data-region-select>${Object.keys(REGIONS).map(r => `<option value="${r}" ${r === S.region ? 'selected' : ''}>${esc(regionName(r))} — ${REGIONS[r].cur}</option>`).join('')}</select></div>
        <button class="chip" data-act="theme" style="margin-top:6px">${S.theme === 'dark' ? t('theme.light') : t('theme.dark')}</button>
      </div>`;
    $('#mnav .pop')?.remove();
  };

  const footerCols = () => [
    [['#/shop', 'f.products'], ['#/routines', 'f.routines'], ['#/about', 'f.about'], ['#/contact', 'f.contact'], ['#/faq', 'f.faq']],
    [['#/page/shipping', 'f.shipping'], ['#/page/payment', 'f.payment'], ['#/track', 'f.track'], ['#/page/loyalty', 'f.loyalty'], ['#/product/gift-card', 'f.giftcard']],
    [['#/page/legal', 'f.legal'], ['#/page/terms', 'f.terms'], ['#/page/privacy', 'f.privacy'], ['#/page/shipping/returns', 'f.returns'], ['#/page/cookies', 'f.cookies']],
    [['#/page/commitments/vegan', 'f.vegan'], ['#/page/commitments/manufacturing', 'f.manufacturing'], ['#/page/commitments/ingredients', 'f.ingredients'], ['#/page/commitments/tested', 'f.tested']]
  ];
  const renderFooter = () => {
    $('#footer').innerHTML = `
      <div class="footer-grid">
        ${footerCols().map(col => `<ul>${col.map(([h, k]) => `<li><a href="${h}">${t(k)}</a></li>`).join('')}</ul>`).join('')}
        <div class="nl">
          <h5>${t('nl.title')}</h5>
          <p>${t('nl.text')}</p>
          <form data-form="newsletter" novalidate><input type="email" name="email" placeholder="${t('nl.placeholder')}" aria-label="${t('nl.placeholder')}" required><button type="submit">${t('nl.btn')}</button></form>
          <div class="social"><a href="#/routines" aria-label="Instagram">${I.ig}</a><a href="#/routines" aria-label="TikTok">${I.tiktok}</a><a href="#/routines" aria-label="YouTube">${I.yt}</a></div>
        </div>
      </div>
      <div class="bottom"><span>© ${new Date().getFullYear()} Vertigo. ${t('f.rights')}</span><span>Seoul · Paris</span><span class="pay"><span>VISA</span><span>MC</span><span>AMEX</span><span>PAYPAL</span><span>APPLE PAY</span></span></div>`;
  };

  const updateBadges = () => {
    const c = $('#cartCount'), f = $('#favCount');
    if (c) c.textContent = cartCount() || '';
    if (f) f.textContent = S.favs.length || '';
  };

  /* ---------------- cart drawer ---------------- */
  const renderCart = () => {
    const T = totals();
    const recos = ['velvet-lavender-cream', 'lavender-cleansing-bar', 'rose-lip-oil', 'velvet-sun-cream', 'rice-water-essence'].filter(s => !S.cart.some(l => l.slug === s)).slice(0, 3).map(P);
    const left = T.freeAt - (T.sub - T.discount);
    $('#drawer').innerHTML = `
      <button class="x" data-act="close-cart" aria-label="${t('ui.close')}">${I.close}</button>
      <div class="drawer-head"><span>${t('cart.title')}</span>${I.basket}</div>
      <div class="drawer-body">
        ${T.lines.length ? `
          ${T.physical ? `<div class="ship-bar">${left > 0 ? t('cart.freeLeft', { p: fmt(left) }) : t('cart.freeOk')}<div class="track"><div class="fill" style="width:${Math.min(100, (T.sub - T.discount) / T.freeAt * 100)}%"></div></div></div>` : ''}
          ${T.lines.map((l, i) => lineItem(l, i)).join('')}
          ${T.physical ? `<label class="gift-wrap check"><input type="checkbox" data-act="giftwrap" ${S.giftwrap ? 'checked' : ''}> ${t('cart.giftwrap', { p: money(GIFTWRAP) })}</label>` : ''}
        ` : `<div class="drawer-empty"><div>${t('cart.empty1')}<br>${t('cart.empty2')}<br><a class="btn sm" style="margin-top:22px" href="#/shop" data-act="close-cart">${t('cart.shop')}</a></div></div>`}
      </div>
      ${T.lines.length ? `<div class="drawer-foot">
        <div class="sum-row"><span>${t('sum.subtotal')}</span><span>${fmt(T.sub)}</span></div>
        ${T.discount ? `<div class="sum-row discount"><span>${t('sum.discount')} (${T.promo})</span><span>−${fmt(T.discount)}</span></div>` : ''}
        ${T.wrap ? `<div class="sum-row"><span>${t('sum.giftwrap')}</span><span>${fmt(T.wrap)}</span></div>` : ''}
        <div class="sum-row"><span>${t('sum.shipping')}</span><span>${T.physical ? (T.ship ? fmt(T.ship) : t('sum.free')) : '—'}</span></div>
        <div class="sum-row total"><span>${t('sum.total')}</span><span>${fmt(T.total)}</span></div>
        <a class="btn block" href="#/checkout" data-act="close-cart">${t('cart.checkout')}</a>
      </div>` : ''}
      <div class="recos"><h4>${t('cart.recos')}</h4><div class="row">${recos.map(p => `<a href="#/product/${p.slug}" data-act="close-cart"><img src="${sm(p.images[0])}" alt="" loading="lazy">${esc(pt(p).name)}<br>${money(p.price)}</a>`).join('')}</div></div>`;
  };
  const lineItem = (l, i, editable = true) => {
    const x = pt(l.p);
    return `<div class="line-item">
      <a href="#/product/${l.p.slug}" ${editable ? 'data-act="close-cart"' : ''} class="${editable ? '' : 'qtyb'}"><img src="${sm(l.p.images[0])}" alt="">${editable ? '' : `<span>${l.qty}</span>`}</a>
      <div><div class="n">${esc(x.name)}</div><div class="s">${l.amount ? t('gc.value', { p: money(l.amount) }) : esc(l.p.size)}</div>
        ${editable ? `<div class="qty sm"><button data-act="qty" data-i="${i}" data-d="-1" aria-label="−">−</button><input value="${l.qty}" inputmode="numeric" data-qty-i="${i}" aria-label="${t('pdp.qty')}"><button data-act="qty" data-i="${i}" data-d="1" aria-label="+">+</button></div>` : ''}
      </div>
      <div><div class="p">${fmt(l.total)}</div>${editable ? `<button class="rm" data-act="rm" data-i="${i}">${t('cart.remove')}</button>` : ''}</div>
    </div>`;
  };
  const openCart = () => { renderCart(); $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); document.body.classList.add('locked'); $('#drawer').setAttribute('aria-hidden', 'false'); };
  const closeCart = () => { $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); document.body.classList.remove('locked'); $('#drawer').setAttribute('aria-hidden', 'true'); };

  /* ---------------- views ---------------- */
  const hero = (img, h1, p, opts = {}) => `
    <section class="hero ${opts.dark ? 'dark' : ''}">
      <picture>
        <source media="(max-width: 700px)" srcset="assets/img/heroes/${img}-mobile.webp">
        <source media="(max-width: 1400px)" srcset="assets/img/heroes/${img}-md.webp">
        <img class="bg" src="assets/img/heroes/${img}.webp" alt="" fetchpriority="high" style="${opts.pos ? 'object-position:' + opts.pos : ''}">
      </picture>
      <div class="copy">${opts.logo ? '<span class="logo-mask" role="img" aria-label="Vertigo"></span>' : `<h1>${h1}</h1><p>${p}</p>`}${opts.cta || ''}</div>
    </section>`;

  const V = {};

  V.home = () => {
    const classics = products.filter(p => p.flags.includes('classic')).slice(0, 3);
    const best = ['hydra-glow-serum', 'velvet-lavender-cream'].map(P);
    const sets = products.filter(p => p.cat === 'sets');
    const news = products.filter(p => p.flags.includes('new')).slice(0, 4);
    return { hero: true, html: `
      ${hero('hero-home', t('home.h1'), t('home.sub'))}
      <div class="container">
        <p class="values reveal"><span>${t('home.values1')}</span> ${t('home.values2')}</p>
        <hr class="rule">
        <h2 class="mega-title reveal" style="padding-left:2%;margin-top:28px">${t('home.classics')}</h2>
        <p class="lead reveal" style="padding-left:2%;margin-bottom:70px">${t('home.classicsText')}</p>
        <div class="grid g3">${classics.map(p => card(p, { noTag: true })).join('')}</div>
        <hr class="rule" style="margin-top:56px">
        <div class="cta-block reveal"><h3>${t('home.reveal')} ${I.sparkle}</h3><br><a class="btn" href="#/shop">${t('home.browse')}</a></div>
        <hr class="rule">
        <h2 class="mega-title center reveal" style="padding:56px 0 64px">${t('home.best')}</h2>
        <div class="grid g2">${best.map(p => card(p, { noTag: true })).join('')}</div>
        <hr class="rule" style="margin-top:56px">
      </div>
      <section class="section-pad container">
        <div class="reassure reveal">
          <div>${I.truck}<span><b>${t('re.ship', { p: money(zone().free) })}</b><small>${t('re.shipSub')}</small></span></div>
          <div>${I.gift}<span><b>${t('re.samples')}</b><small>${t('re.samplesSub')}</small></span></div>
          <div>${I.return}<span><b>${t('re.returns')}</b><small>${t('re.returnsSub')}</small></span></div>
          <div>${I.leaf}<span><b>${t('re.vegan')}</b><small>${t('re.veganSub')}</small></span></div>
        </div>
      </section>
      <section class="container">
        <div class="banner reveal">
          <div class="txt"><span class="eyebrow" style="color:#7a5e33">${t('home.redEyebrow')}</span><h2>${t('home.redTitle')}</h2><p>${t('home.redText')}</p><a class="btn" href="#/product/red-velvet-serum">${t('home.redCta')}</a></div>
          <img src="assets/img/heroes/hero-products-md.webp" alt="" loading="lazy">
        </div>
      </section>
      <section class="container section-pad">
        <h2 class="mega-title reveal" style="margin-bottom:18px">${t('home.new')}</h2>
        <p class="lead reveal mt0" style="margin-bottom:50px">${t('home.newText')}</p>
        <div class="grid g4">${news.map(p => card(p)).join('')}</div>
      </section>
      <section class="container section-pad">
        <hr class="rule">
        <h2 class="mega-title center reveal" style="padding:56px 0 18px">${t('home.rituals')}</h2>
        <p class="lead center reveal mt0" style="margin-bottom:56px">${t('home.ritualsText')}</p>
        <div class="rituals">${sets.map(p => card(p)).join('')}</div>
      </section>
      <section class="container section-pad">
        <hr class="rule">
        <div class="quotes reveal" style="padding-top:56px">
          ${[1, 2, 3].map(i => `<blockquote>“${t('q' + i)}”<cite>${stars(5)} &nbsp;${t('q' + i + 'by')}</cite></blockquote>`).join('')}
        </div>
      </section>
      <section class="container" style="padding-bottom:30px">
        <hr class="rule">
        <div class="split">
          <div class="big-copy reveal"><p class="eyebrow">@vertigo.seoul</p><p>${t('home.igText')}</p><a class="btn sm" href="#/routines">${t('home.igCta')}</a></div>
          <div class="ig-grid reveal" style="grid-template-columns:repeat(3,1fr)">
            ${['hero-home-md', 'products/hydra-glow-serum-detail-sm', 'hero-routines-md', 'products/velvet-lavender-cream-sm', 'hero-about-md', 'products/morning-ritual-set-sm'].map(s => `<a href="#/routines" aria-label="Instagram"><img src="assets/img/${s.startsWith('products') ? '' : 'heroes/'}${s}.webp" alt="" loading="lazy" style="object-position:70% 30%"></a>`).join('')}
          </div>
        </div>
      </section>` };
  };

  V.shop = (cat = 'all', concern = null) => {
    const sort = route.query.sort || 'featured';
    let list = products.filter(p => (cat === 'all' || p.cat === cat) && (!concern || p.concerns.includes(concern)));
    const sorters = {
      featured: (a, b) => VT.products.indexOf(a) - VT.products.indexOf(b),
      'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews, new: (a, b) => (b.flags.includes('new') - a.flags.includes('new'))
    };
    list.sort(sorters[sort] || sorters.featured);
    const grouped = cat === 'all' && !concern && sort === 'featured';
    const qs = s => `?sort=${s}`;
    const base = `#/shop/${cat}${concern ? '/' + concern : ''}`;
    return { hero: true, html: `
      ${hero('hero-products', t('shop.h1'), t('shop.sub'))}
      <div class="container">
        <p class="values center reveal"><span>${t('shop.values1')}</span> ${t('shop.values2')}</p>
        <div class="toolbar">
          <div class="chips" role="tablist">
            <a class="chip ${cat === 'all' ? 'on' : ''}" href="#/shop${concern ? '/all/' + concern : ''}">${t('mega.all')}</a>
            ${VT.categories.map(c => `<a class="chip ${cat === c ? 'on' : ''}" href="#/shop/${c}${concern ? '/' + concern : ''}">${catLabel(c)}</a>`).join('')}
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <select class="select" data-nav aria-label="${t('shop.concern')}">
              <option value="#/shop/${cat}">${t('shop.allConcerns')}</option>
              ${VT.concerns.map(c => `<option value="#/shop/${cat}/${c}" ${concern === c ? 'selected' : ''}>${t('concern.' + c)}</option>`).join('')}
            </select>
            <select class="select" data-nav aria-label="${t('shop.sort')}">
              ${['featured', 'rating', 'new', 'price-asc', 'price-desc'].map(s => `<option value="${base}${qs(s)}" ${sort === s ? 'selected' : ''}>${t('sort.' + s)}</option>`).join('')}
            </select>
          </div>
        </div>
        ${grouped ? VT.categories.map(c => {
          const items = list.filter(p => p.cat === c); if (!items.length) return '';
          return `<section class="cat-section" id="cat-${c}"><div class="cat-head"><h2 class="mega-title center reveal">${t('shopcat.' + c)}</h2><p class="lead center reveal">${t('shopcat.' + c + '.text')}</p></div>
            <div class="grid g3">${items.map(p => card(p)).join('')}</div></section><hr class="rule" style="margin-bottom:30px">`;
        }).join('') : `
          <p class="result-count">${t('shop.count', { n: list.length })}${concern ? ' · ' + t('concern.' + concern) : ''}</p>
          ${list.length ? `<div class="grid g3" style="margin-top:20px">${list.map(p => card(p)).join('')}</div>` : `<div class="empty">${t('shop.none')}<br><a class="btn" href="#/shop">${t('mega.all')}</a></div>`}
          <hr class="rule" style="margin-top:60px">`}
        <div class="cta-block reveal" style="padding:64px 0"><h3 style="font-size:clamp(34px,4vw,56px)">${t('shop.universe')}</h3><br><a class="btn" href="#/about" style="font-size:clamp(20px,2.4vw,34px)">${t('nav.aboutBtn')}</a></div>
        <hr class="rule">
      </div>` };
  };

  V.product = slug => {
    const p = P(slug); if (!p) return V.notfound();
    const x = pt(p);
    const amount = +(route.query.amount || (p.amounts ? p.price : 0));
    const related = p.pairs.map(P).filter(Boolean).slice(0, 4);
    const reviews = getReviews(p);
    document.title = `${x.name} — Vertigo`;
    return { html: `
      <div class="container">
        <nav class="breadcrumbs" aria-label="breadcrumb"><a href="#/">${t('nav.home')}</a>/<a href="#/shop/${p.cat}">${catLabel(p.cat)}</a>/<span>${esc(x.name)}</span></nav>
        <div class="pdp">
          <div class="gallery">
            <div class="main" data-act="zoom"><img id="pdpImg" src="${p.images[0]}" alt="${esc(x.name)}" style="object-position:center 40%"></div>
            ${p.images.length > 1 ? `<div class="thumbs">${p.images.map((src, i) => `<button class="${i === 0 ? 'on' : ''}" data-act="thumb" data-src="${src}" aria-label="${t('pdp.view')} ${i + 1}"><img src="${sm(src)}" alt="" style="object-position:70% 30%"></button>`).join('')}</div>` : ''}
          </div>
          <div>
            <div class="pbox">
              <div class="pbox-top"><span class="ptag">${t('tag.' + p.cat)}</span>
                <button class="fav icon-btn" data-act="fav" data-slug="${p.slug}" aria-pressed="${isFav(p.slug)}" aria-label="${t(isFav(p.slug) ? 'fav.remove' : 'fav.add')}">${I.star(isFav(p.slug))}</button></div>
              <div class="flag">${p.cat === 'gift' ? t('pdp.digital') : t('pdp.flags')} · ${p.code}</div>
              <h1>${esc(x.name)}</h1>
              <div class="psub">${esc(x.sub)}</div>
              <div class="rating">${stars(p.rating)} <span>${p.rating.toFixed(1)}</span><a href="#reviews" data-act="scroll" data-to="reviews">${t('pdp.reviews', { n: p.reviews + reviews.extra })}</a></div>
              <div class="desc">${x.desc.map(d => `<p>${esc(d)}</p>`).join('')}</div>
              <ul class="keys">${x.key.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
              <div class="pmeta"><span>${esc(p.size)}</span>${p.cat !== 'gift' ? `<span>${t('pdp.vegan')}</span><span>${t('pdp.madein')}</span>` : ''}</div>
            </div>
            <div class="buy">
              ${p.amounts ? `<div class="amounts">${p.amounts.map(a => `<a class="chip ${a === amount ? 'on' : ''}" href="#/product/${p.slug}?amount=${a}">${money(a)}</a>`).join('')}</div>` : ''}
              <div class="buy-row">
                <div class="qty"><button data-act="pqty" data-d="-1" aria-label="−">−</button><input id="pQty" value="1" inputmode="numeric" aria-label="${t('pdp.qty')}"><button data-act="pqty" data-d="1" aria-label="+">+</button></div>
                <button class="btn" data-act="add-pdp" data-slug="${p.slug}" data-amount="${amount || ''}">${t('pdp.add')} — ${money(p.amounts ? amount : p.price)}</button>
              </div>
              ${p.compare ? `<div class="perks"><div>${I.gift} ${t('pdp.save', { p: money(p.compare - p.price) })}</div></div>` : ''}
              <div class="perks">
                <div>${I.truck} ${p.cat === 'gift' ? t('pdp.email') : t('pdp.ship', { a: zone().days[0], b: zone().days[1], p: money(zone().free) })}</div>
                <div>${I.return} ${t('pdp.returns')}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="pdp-extra">
          <div class="acc">
            <details open><summary>${t('pdp.use')}</summary><div class="body">${esc(x.use)}</div></details>
            ${p.inci ? `<details><summary>${t('pdp.inci')}</summary><div class="body">${esc(p.inci)}<p class="muted" style="font-size:13px">${t('pdp.inciNote')}</p></div></details>` : ''}
            ${p.includes ? `<details open><summary>${t('pdp.includes')}</summary><div class="body">${p.includes.map(s => `<a class="link" href="#/product/${s}">${esc(pt(P(s)).name)}</a> — ${money(P(s).price)}`).join('<br>')}</div></details>` : ''}
            <details><summary>${t('pdp.shipTitle')}</summary><div class="body">${t('pdp.shipBody', { p: money(zone().free), s: money(zone().std), e: money(zone().exp) })}</div></details>
          </div>
          <div></div>
        </div>
        <hr class="rule">
        <section class="reviews" id="reviews">
          <h2 class="mega-title" style="font-size:clamp(36px,5vw,72px)">${t('pdp.reviewsTitle')}</h2>
          <div class="rev-summary"><span class="score">${p.rating.toFixed(1)}</span><div>${stars(p.rating)}<div class="muted" style="font-size:13px;margin-top:4px">${t('pdp.basedOn', { n: p.reviews + reviews.extra })}</div></div>
            <button class="btn sm ghost" data-act="rev-open" style="margin-left:auto">${t('pdp.write')}</button></div>
          <form class="rev-form" data-form="review" data-slug="${p.slug}" novalidate>
            <div class="field"><label>${t('rev.rating')}</label><div class="star-input" data-rating="5">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-act="rate" data-v="${i}" aria-label="${i}/5">${I.star(1)}</button>`).join('')}</div></div>
            <div class="row2"><div class="field"><label for="rvName">${t('form.first')}</label><input id="rvName" name="name" required value="${esc(S.user ? currentUser()?.first || '' : '')}"><span class="msg"></span></div>
            <div class="field"><label for="rvTitle">${t('rev.title')}</label><input id="rvTitle" name="title" required><span class="msg"></span></div></div>
            <div class="field"><label for="rvText">${t('rev.text')}</label><textarea id="rvText" name="text" required minlength="10"></textarea><span class="msg"></span></div>
            <button class="btn sm" type="submit">${t('rev.submit')}</button>
          </form>
          <div class="rev-list">${reviews.list.map(r => `<div class="rev">${stars(r.rating)}<h5>${esc(r.title)}</h5><p>${esc(r.text)}</p><div class="who"><b>${esc(r.name)}</b> · ${esc(r.country ? regionName(r.country) : '')} ${r.verified !== false ? `· <span class="verified">✓ ${t('rev.verified')}</span>` : ''}</div></div>`).join('')}</div>
        </section>
        <hr class="rule">
        <h2 class="mega-title center reveal" style="padding:64px 0 70px">${t('pdp.also')}</h2>
        <div class="grid g4">${related.map(r => card(r, { noTag: true })).join('')}</div>
        <hr class="rule" style="margin-top:60px">
      </div>`, title: x.name };
  };

  const hashStr = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const getReviews = p => {
    const user = (store.get('reviews', {})[p.slug] || []).map(r => ({ ...r, verified: false }));
    if (p.cat === 'gift') return { list: user, extra: user.length };
    const pool = VT.reviewPool; const h = hashStr(p.slug); const pick = [];
    for (let i = 0; pick.length < 4 && i < 40; i++) { const r = pool[(h + i * 7) % pool.length]; if (!pick.includes(r)) pick.push(r); }
    const sorted = pick.sort((a, b) => (b.lang === S.lang) - (a.lang === S.lang));
    return { list: [...user, ...sorted], extra: user.length };
  };

  V.routines = () => {
    const tab = route.query.tab || 'morning';
    const R = VT.routines[tab];
    const items = R.map(s => P(s.slug));
    const tot = items.reduce((a, p) => a + p.price, 0);
    const quiz = route.query.skin;
    return { hero: true, toolsLight: true, html: `
      ${hero('hero-routines', t('rt.h1'), t('rt.sub'))}
      <div class="container">
        <hr class="rule" style="margin-top:44px">
        <div class="split">
          <div class="big-copy reveal"><p>${t('rt.p1')}</p><p>${t('rt.p2')}</p></div>
          <img class="reveal" src="assets/img/misc/instagram.webp" alt="Instagram @vertigo.seoul" loading="lazy">
        </div>
        <hr class="rule">
        <h2 class="mega-title reveal" style="margin-top:56px">${t('rt.korean')}</h2>
        <p class="lead reveal">${t('rt.koreanText')}</p>
        <div class="tabs" role="tablist">
          ${Object.keys(VT.routines).map(k => `<a role="tab" href="#/routines?tab=${k}"><button class="${k === tab ? 'on' : ''}" tabindex="-1">${t('rt.tab.' + k)}</button></a>`).join('')}
        </div>
        <div class="steps-list">
          ${R.map((s, i) => { const p = P(s.slug); return `<div class="step reveal">
            <div class="num">${String(i + 1).padStart(2, '0')}</div>
            <div><h3>${t('rt.step.' + s.step)}</h3><p>${t('rt.' + tab + '.' + (i + 1))}</p></div>
            <a class="prod" href="#/product/${p.slug}"><img src="${sm(p.images[0])}" alt="" loading="lazy"><span>${esc(pt(p).name)}<small>${money(p.price)}</small></span></a>
          </div>`; }).join('')}
        </div>
        <div class="routine-cta">
          <div class="tot">${t('rt.total')} <s>${money(tot)}</s><b>${money(tot * .9)}</b> <span class="muted">(−10%)</span></div>
          <button class="btn" data-act="add-routine" data-tab="${tab}">${t('rt.addAll')}</button>
        </div>
        <div class="skin-quiz reveal" id="quiz">
          <h3>${t('quiz.title')}</h3><p class="muted mt0">${t('quiz.text')}</p>
          <div class="quiz-opts">${Object.keys(VT.skinMatch).map(k => `<a class="chip ${quiz === k ? 'on' : ''}" href="#/routines?tab=${tab}&skin=${k}">${t('skin.' + k)}</a>`).join('')}</div>
          ${quiz && VT.skinMatch[quiz] ? `<p style="margin:20px 0">${t('quiz.result.' + quiz)}</p><div class="grid g4">${VT.skinMatch[quiz].map(s => card(P(s), { noTag: true })).join('')}</div>` : ''}
        </div>
        <hr class="rule" style="margin-top:64px">
      </div>` };
  };

  V.about = () => ({ hero: true, heroDark: true, html: `
    ${hero('hero-about', '', '', { dark: true, logo: true, pos: '65% 50%' })}
    <div class="container">
      <hr class="rule" style="margin-top:56px">
      <h1 class="mega-title reveal" style="margin:36px 0 40px">${t('about.h1')}</h1>
      <div class="big-copy reveal">${content('about').map(p => `<p>${p}</p>`).join('')}</div>
      <hr class="rule" style="margin-top:30px">
      <h2 class="mega-title reveal" style="margin:56px 0 30px;font-size:clamp(36px,5vw,72px)">${t('about.story')}</h2>
      <div class="timeline-story">${content('timeline').map(([y, txt]) => `<div class="reveal"><b>${y}</b><p>${txt}</p></div>`).join('')}</div>
      <div class="pillars reveal">${content('pillars').map(([h, txt]) => `<div><h4>${h}</h4><p>${txt}</p></div>`).join('')}</div>
      <h2 class="mega-title reveal" style="margin:72px 0 10px;font-size:clamp(36px,5vw,72px)">${t('about.origins')}</h2>
      <p class="lead reveal">${t('about.originsText')}</p>
      <div class="origins">${content('origins').map(([place, h, txt]) => `<div class="reveal"><b>${place}</b><div><h4>${h}</h4><p>${txt}</p></div></div>`).join('')}</div>
      <hr class="rule" style="margin-top:40px">
      <div class="cta-block reveal" style="padding:64px 0"><h3>${t('home.reveal')} ${I.sparkle}</h3><br><a class="btn" href="#/shop">${t('home.browse')}</a></div>
      <hr class="rule">
    </div>` });

  V.favorites = () => {
    const list = S.favs.map(P).filter(Boolean);
    return { html: `<div class="container-wide">
      <div class="page-head"><h1 class="mega-title">${t('fav.title')}</h1><hr class="rule"></div>
      ${list.length ? `<div class="grid g4" style="padding-bottom:40px">${list.map(p => card(p, { noTag: true })).join('')}</div>
        <div style="padding-bottom:40px"><button class="btn sm" data-act="favs-to-cart">${t('fav.addAll')}</button></div>` :
        `<div class="empty">${t('fav.empty')}<br><a class="btn" href="#/shop">${t('cart.shop')}</a></div>`}
    </div>` };
  };

  V.search = () => ({ html: `<div class="container"><div class="page-head"><h1 class="mega-title">${t('nav.search')}</h1></div></div>` });

  const doSearch = q => {
    q = q.trim().toLowerCase(); if (!q) return [];
    return products.filter(p => { const all = Object.values(p.t).map(x => [x.name, x.sub, x.tagline, ...x.key].join(' ')).join(' ') + ' ' + p.inci + ' ' + p.code; return all.toLowerCase().includes(q); });
  };

  V.cart = () => { setTimeout(openCart, 50); return V.shop(); };

  V.checkout = () => {
    const ship = route.query.ship || store.get('shipMethod', 'std');
    const gcCode = store.get('gcApplied', null);
    const gcs = store.get('giftcards', {});
    const gc = gcCode && gcs[gcCode] ? { code: gcCode, balance: gcs[gcCode] } : null;
    const T = totals(ship, S.promo, gc);
    if (!T.lines.length) return { html: `<div class="container"><div class="empty" style="padding:120px 0">${t('cart.empty1')}<br>${t('cart.empty2')}<br><a class="btn" href="#/shop">${t('cart.shop')}</a></div></div>` };
    const u = currentUser(); const a = (u && u.address) || {}; const z = zone();
    const days = (d) => { const from = new Date(Date.now() + d[0] * 864e5), to = new Date(Date.now() + d[1] * 864e5); return `${dateFmt(from, { month: 'short', day: 'numeric' })} – ${dateFmt(to, { month: 'short', day: 'numeric' })}`; };
    return { html: `<div class="container">
      <form class="checkout" data-form="checkout" novalidate>
        <div>
          <div class="steps"><b>${t('co.bag')}</b> › <b>${t('co.details')}</b> › <span>${t('co.payment')}</span> › <span>${t('co.confirm')}</span></div>
          <h1 class="mega-title" style="font-size:clamp(40px,5vw,72px);margin-bottom:30px">${t('co.title')}</h1>
          ${!u ? `<p style="font-size:14px;margin:0 0 20px">${t('co.haveAccount')} <a class="link" href="#/login?next=checkout">${t('nav.login')}</a></p>` : ''}
          <section class="co-section"><h2>1. ${t('co.contact')}</h2>
            <div class="field"><label for="coEmail">Email</label><input id="coEmail" type="email" name="email" autocomplete="email" required value="${esc(u ? u.email : '')}"><span class="msg"></span></div>
            <label class="check"><input type="checkbox" name="news"> ${t('co.news')}</label><br>
          </section>
          <section class="co-section"><h2>2. ${t('co.address')}</h2>
            <div class="row2"><div class="field"><label for="coFirst">${t('form.first')}</label><input id="coFirst" name="first" autocomplete="given-name" required value="${esc(u ? u.first : '')}"><span class="msg"></span></div>
            <div class="field"><label for="coLast">${t('form.last')}</label><input id="coLast" name="last" autocomplete="family-name" required value="${esc(u ? u.last : '')}"><span class="msg"></span></div></div>
            <div class="field"><label for="coAddr">${t('form.address')}</label><input id="coAddr" name="address" autocomplete="street-address" required value="${esc(a.address || '')}"><span class="msg"></span></div>
            <div class="row3"><div class="field"><label for="coCity">${t('form.city')}</label><input id="coCity" name="city" autocomplete="address-level2" required value="${esc(a.city || '')}"><span class="msg"></span></div>
            <div class="field"><label for="coZip">${t('form.zip')}</label><input id="coZip" name="zip" autocomplete="postal-code" required value="${esc(a.zip || '')}"><span class="msg"></span></div>
            <div class="field"><label for="coCountry">${t('form.country')}</label><select id="coCountry" name="country" data-region-select>${Object.keys(REGIONS).map(r => `<option value="${r}" ${r === S.region ? 'selected' : ''}>${esc(regionName(r))}</option>`).join('')}</select></div></div>
            <div class="field"><label for="coPhone">${t('form.phone')}</label><input id="coPhone" type="tel" name="phone" autocomplete="tel" required value="${esc(a.phone || '')}"><span class="msg"></span></div>
          </section>
          ${T.physical ? `<section class="co-section"><h2>3. ${t('co.delivery')}</h2>
            <label class="opt"><input type="radio" name="ship" value="std" data-act="ship" ${ship === 'std' ? 'checked' : ''}><span class="grow">${t('co.std')}<small>${days(z.days)}</small></span><span class="pr">${totals('std').ship ? fmt(totals('std').ship) : t('sum.free')}</span></label>
            <label class="opt"><input type="radio" name="ship" value="exp" data-act="ship" ${ship === 'exp' ? 'checked' : ''}><span class="grow">${t('co.exp')}<small>${days(z.expDays)}</small></span><span class="pr">${fmt(conv(z.exp))}</span></label>
          </section>` : ''}
          <section class="co-section"><h2>${T.physical ? 4 : 3}. ${t('co.payment')} <small>${I.lock.replace('<svg', '<svg style="width:12px;height:12px"')} ${t('co.secure')}</small></h2>
            <label class="opt"><input type="radio" name="pay" value="card" checked data-act="pay"><span class="grow">${t('co.card')}</span><span class="pay-icons" style="margin:0"><span>VISA</span><span>MC</span><span>AMEX</span></span></label>
            <div class="card-fields" id="cardFields">
              <div class="field"><label for="ccNum">${t('co.ccnum')}</label><input id="ccNum" name="cc" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" maxlength="23"><span class="msg"></span></div>
              <div class="row3"><div class="field"><label for="ccName">${t('co.ccname')}</label><input id="ccName" name="ccname" autocomplete="cc-name"><span class="msg"></span></div>
              <div class="field"><label for="ccExp">${t('co.ccexp')}</label><input id="ccExp" name="ccexp" placeholder="MM/YY" autocomplete="cc-exp" maxlength="5"><span class="msg"></span></div>
              <div class="field"><label for="ccCvc">CVC</label><input id="ccCvc" name="cvc" inputmode="numeric" autocomplete="cc-csc" maxlength="4"><span class="msg"></span></div></div>
            </div>
            <label class="opt"><input type="radio" name="pay" value="paypal" data-act="pay"><span class="grow">PayPal<small>${t('co.redirect')}</small></span></label>
            <label class="opt"><input type="radio" name="pay" value="apple" data-act="pay"><span class="grow">Apple Pay / Google Pay</span></label>
            <p class="form-note">${t('co.demo')}</p>
          </section>
          <section class="co-section">
            <label class="check"><input type="checkbox" name="terms" required> <span>${t('co.terms')}</span></label><span class="msg" style="color:var(--danger);font-size:12px" id="termsMsg"></span>
            <button class="btn block" type="submit" style="margin-top:22px;text-transform:uppercase;font-size:18px">${t('co.place')} — ${fmt(T.total)}</button>
          </section>
        </div>
        <aside class="summary">
          <h3>${t('co.summary')}</h3>
          ${T.lines.map((l, i) => lineItem(l, i, false)).join('')}
          <div class="promo"><input id="promoInput" placeholder="${t('co.promo')}" aria-label="${t('co.promo')}" value="${esc(S.promo || gcCode || '')}"><button type="button" data-act="promo">${t('co.apply')}</button></div>
          ${S.promo || gc ? `<p style="font-size:12px;margin:-8px 0 12px">${t('co.applied', { c: esc(S.promo || gc.code) })} · <button type="button" class="link" data-act="promo-rm">${t('cart.remove')}</button></p>` : `<p class="muted" style="font-size:12px;margin:-8px 0 12px">${t('co.promoHint')}</p>`}
          <div class="sum-row"><span>${t('sum.subtotal')}</span><span>${fmt(T.sub)}</span></div>
          ${T.discount ? `<div class="sum-row discount"><span>${t('sum.discount')} (${T.promo})</span><span>−${fmt(T.discount)}</span></div>` : ''}
          ${T.wrap ? `<div class="sum-row"><span>${t('sum.giftwrap')}</span><span>${fmt(T.wrap)}</span></div>` : ''}
          <div class="sum-row"><span>${t('sum.shipping')}</span><span>${T.physical ? (T.ship ? fmt(T.ship) : t('sum.free')) : '—'}</span></div>
          ${T.gc ? `<div class="sum-row discount"><span>${t('sum.giftcard')}</span><span>−${fmt(T.gc)}</span></div>` : ''}
          <div class="sum-row total"><span>${t('sum.total')}</span><span>${fmt(T.total)}</span></div>
          <p class="muted" style="font-size:12px">${t('co.taxes')}</p>
          <div class="secure">${I.lock} ${t('co.ssl')}</div>
          <div class="pay-icons"><span>VISA</span><span>MASTERCARD</span><span>AMEX</span><span>PAYPAL</span><span>APPLE PAY</span><span>G PAY</span></div>
        </aside>
      </form></div>`, noFooterGap: true };
  };

  const orderStatus = o => { const h = (Date.now() - o.date) / 36e5; return h < 1 ? 0 : h < 24 ? 1 : h < 72 ? 2 : 3; };
  const statusLabel = i => t('status.' + ['confirmed', 'preparing', 'shipped', 'delivered'][i]);
  const timeline = o => { const s = orderStatus(o); return `<div class="timeline">${[0, 1, 2, 3].map(i => `<div class="${i <= s ? 'on' : ''}">${statusLabel(i)}</div>`).join('')}</div>`; };

  V.order = id => {
    const o = store.get('orders', []).find(x => x.id === id);
    if (!o) return V.notfound();
    return { html: `<div class="container"><div class="confirm">
      <span class="mark-mask"></span>
      <h1>${t('ok.title', { n: esc(o.address.first) })}</h1>
      <p class="lead center mt0">${t('ok.text', { e: esc(o.email) })}</p>
      <div class="order-card">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px"><b>${t('ok.order')} ${o.id}</b><span class="muted">${dateFmt(o.date)}</span></div>
        ${timeline(o)}
        ${o.items.map(it => { const p = P(it.slug); return `<div class="line-item" style="grid-template-columns:64px 1fr auto"><img src="${sm(p.images[0])}" alt="" style="width:64px"><div><div class="n">${esc(pt(p).name)}</div><div class="s">× ${it.qty}${it.amount ? ' · ' + fmt(it.unit, o.cur) : ''}</div></div><div class="p">${fmt(it.unit * it.qty, o.cur)}</div></div>`; }).join('')}
        ${o.giftcards && o.giftcards.length ? `<p style="margin-top:20px">${t('ok.gc')}</p>${o.giftcards.map(c => `<div class="gc-code">${c}</div>`).join(' ')}` : ''}
        <div style="margin-top:16px">
          <div class="sum-row"><span>${t('sum.subtotal')}</span><span>${fmt(o.totals.sub, o.cur)}</span></div>
          ${o.totals.discount ? `<div class="sum-row discount"><span>${t('sum.discount')}</span><span>−${fmt(o.totals.discount, o.cur)}</span></div>` : ''}
          ${o.totals.wrap ? `<div class="sum-row"><span>${t('sum.giftwrap')}</span><span>${fmt(o.totals.wrap, o.cur)}</span></div>` : ''}
          <div class="sum-row"><span>${t('sum.shipping')}</span><span>${o.totals.ship ? fmt(o.totals.ship, o.cur) : t('sum.free')}</span></div>
          ${o.totals.gc ? `<div class="sum-row discount"><span>${t('sum.giftcard')}</span><span>−${fmt(o.totals.gc, o.cur)}</span></div>` : ''}
          <div class="sum-row total"><span>${t('sum.total')}</span><span>${fmt(o.totals.total, o.cur)}</span></div>
        </div>
        <p class="muted" style="font-size:13px;margin-top:18px">${t('ok.shipTo')}: ${esc(o.address.first)} ${esc(o.address.last)}, ${esc(o.address.address)}, ${esc(o.address.zip)} ${esc(o.address.city)}, ${esc(regionName(o.address.country))}</p>
      </div>
      <a class="btn" href="#/shop">${t('ok.continue')}</a>
      ${S.user ? `<p style="margin-top:18px"><a class="link" href="#/account">${t('ok.account')}</a></p>` : `<p style="margin-top:18px;font-size:14px">${t('ok.create')} <a class="link" href="#/register">${t('auth.create')}</a></p>`}
    </div></div>` };
  };

  const currentUser = () => S.user ? (store.get('users', {})[S.user] || null) : null;
  const hashPw = s => { let h = 5381; for (const c of s + 'vertigo-salt') h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };

  V.login = () => S.user ? V.account() : ({ html: `<div class="container" style="padding:80px var(--gutter) 40px">
    <form class="form-box" data-form="login" novalidate>
      <h1>${t('auth.login')}</h1>
      <div class="alert" hidden id="authErr"></div>
      <div class="field"><label for="lgEmail">Email</label><input id="lgEmail" type="email" name="email" autocomplete="email" required><span class="msg"></span></div>
      <div class="field"><label for="lgPw">${t('auth.password')}</label><input id="lgPw" type="password" name="password" autocomplete="current-password" required><span class="msg"></span></div>
      <button class="btn block" type="submit">${t('auth.loginBtn')}</button>
      <div class="form-alt"><a href="#/register${route.query.next ? '?next=' + route.query.next : ''}">${t('auth.create')}</a></div>
      <div class="form-alt"><button type="button" class="muted" style="font-size:13px" data-act="forgot">${t('auth.forgot')}</button></div>
    </form></div>` });

  V.register = () => S.user ? V.account() : ({ html: `<div class="container" style="padding:56px var(--gutter) 40px">
    <form class="form-box" data-form="register" novalidate>
      <h1>${t('auth.create')}</h1>
      <div class="alert" hidden id="authErr"></div>
      <div class="field"><label for="rgEmail">Email</label><input id="rgEmail" type="email" name="email" autocomplete="email" required><span class="msg"></span></div>
      <div class="row2"><div class="field"><label for="rgFirst">${t('form.first')}</label><input id="rgFirst" name="first" autocomplete="given-name" required><span class="msg"></span></div>
      <div class="field"><label for="rgLast">${t('form.last')}</label><input id="rgLast" name="last" autocomplete="family-name" required><span class="msg"></span></div></div>
      <div class="row2"><div class="field"><label for="rgPw">${t('auth.password')}</label><input id="rgPw" type="password" name="password" autocomplete="new-password" required minlength="8"><span class="msg"></span></div>
      <div class="field"><label for="rgPw2">${t('auth.confirm')}</label><input id="rgPw2" type="password" name="password2" autocomplete="new-password" required><span class="msg"></span></div></div>
      <label class="check" style="margin-bottom:18px"><input type="checkbox" name="news" checked> ${t('auth.news')}</label>
      <button class="btn block" type="submit">${t('auth.registerBtn')}</button>
      <div class="form-alt" style="margin-top:24px"><a href="#/login">${t('auth.have')}</a></div>
    </form></div>` });

  V.account = () => {
    const u = currentUser(); if (!u) { location.hash = '#/login'; return { html: '' }; }
    const tab = route.query.tab || 'orders';
    const orders = store.get('orders', []).filter(o => o.email === u.email).sort((a, b) => b.date - a.date);
    const spent = orders.reduce((a, o) => a + o.eur, 0);
    const pts = Math.round(spent) + (u.bonus || 0);
    const tier = pts >= 500 ? 'gold' : pts >= 150 ? 'silver' : 'bronze';
    let body = '';
    if (tab === 'orders') body = orders.length ? `<table class="orders-table"><thead><tr><th>${t('ok.order')}</th><th class="hide-xs">${t('acc.date')}</th><th>${t('acc.status')}</th><th>${t('sum.total')}</th><th></th></tr></thead><tbody>
      ${orders.map(o => `<tr><td><b>${o.id}</b></td><td class="hide-xs">${dateFmt(o.date, { dateStyle: 'medium' })}</td><td><span class="pill">${statusLabel(orderStatus(o))}</span></td><td>${fmt(o.totals.total, o.cur)}</td><td><a class="link" href="#/order/${o.id}">${t('acc.view')}</a></td></tr>`).join('')}
      </tbody></table>` : `<div class="empty" style="text-align:left;padding:20px 0">${t('acc.noOrders')}<br><a class="btn sm" href="#/shop">${t('cart.shop')}</a></div>`;
    if (tab === 'profile') body = `<form data-form="profile" novalidate style="max-width:560px">
      <div class="row2"><div class="field"><label>${t('form.first')}</label><input name="first" value="${esc(u.first)}" required><span class="msg"></span></div><div class="field"><label>${t('form.last')}</label><input name="last" value="${esc(u.last)}" required><span class="msg"></span></div></div>
      <div class="field"><label>Email</label><input value="${esc(u.email)}" disabled></div>
      <h3 style="font-weight:500;margin:28px 0 14px">${t('acc.address')}</h3>
      <div class="field"><label>${t('form.address')}</label><input name="address" value="${esc(u.address?.address || '')}"></div>
      <div class="row2"><div class="field"><label>${t('form.city')}</label><input name="city" value="${esc(u.address?.city || '')}"></div><div class="field"><label>${t('form.zip')}</label><input name="zip" value="${esc(u.address?.zip || '')}"></div></div>
      <div class="field"><label>${t('form.phone')}</label><input name="phone" value="${esc(u.address?.phone || '')}"></div>
      <button class="btn sm" type="submit">${t('acc.save')}</button></form>`;
    if (tab === 'circle') body = `<p class="lead mt0">${t('loy.intro')}</p>
      <div class="points"><div><b>${pts}</b><span>${t('loy.points')}</span></div><div><b>${t('tier.' + tier)}</b><span>${t('loy.tier')}</span></div><div><b>${money(Math.floor(pts / 100) * 5)}</b><span>${t('loy.reward')}</span></div></div>
      <p class="muted" style="font-size:14px">${t('loy.how')}</p><a class="link" href="#/page/loyalty">${t('loy.more')}</a>`;
    return { html: `<div class="container"><div class="page-head" style="padding-bottom:0"><h1 class="mega-title" style="font-size:clamp(40px,6vw,88px)">${t('acc.hello', { n: esc(u.first) })}</h1></div>
      <div class="account">
        <nav>${['orders', 'profile', 'circle'].map(k => `<a href="#/account?tab=${k}" class="${tab === k ? 'on' : ''}">${t('acc.' + k)}</a>`).join('')}<a href="#/favorites">${t('nav.favorites')}</a><button data-act="logout">${t('acc.logout')}</button></nav>
        <div>${body}</div>
      </div></div>` };
  };

  V.track = () => {
    const id = route.query.id;
    let res = '';
    if (id) { const o = store.get('orders', []).find(x => x.id.toLowerCase() === id.toLowerCase().trim() && x.email.toLowerCase() === (route.query.email || '').toLowerCase().trim()); res = o ? `<div class="order-card"><b>${o.id}</b> · ${dateFmt(o.date)}${timeline(o)}<a class="link" href="#/order/${o.id}">${t('acc.view')}</a></div>` : `<div class="alert">${t('track.none')}</div>`; }
    return { html: `<div class="container" style="padding:80px var(--gutter) 40px"><form class="form-box" data-form="track" novalidate>
      <h1>${t('f.track')}</h1><p class="muted" style="font-size:14px">${t('track.text')}</p>
      <div class="field"><label for="trId">${t('ok.order')}</label><input id="trId" name="id" placeholder="VT-XXXXXX" required value="${esc(id || '')}"><span class="msg"></span></div>
      <div class="field"><label for="trEm">Email</label><input id="trEm" type="email" name="email" required value="${esc(route.query.email || '')}"><span class="msg"></span></div>
      <button class="btn block" type="submit">${t('track.btn')}</button>${res}
    </form></div>` };
  };

  V.contact = () => ({ html: `<div class="container"><div class="page-head"><h1 class="mega-title">${t('f.contact')}</h1><hr class="rule"></div>
    <div class="contact-grid">
      <div class="prose" style="padding:0">${content('contact')}</div>
      <form data-form="contact" novalidate>
        <div class="row2"><div class="field"><label for="ctName">${t('form.first')}</label><input id="ctName" name="name" required><span class="msg"></span></div>
        <div class="field"><label for="ctEmail">Email</label><input id="ctEmail" type="email" name="email" required value="${esc(currentUser()?.email || '')}"><span class="msg"></span></div></div>
        <div class="field"><label for="ctSub">${t('ct.subject')}</label><select id="ctSub" name="subject">${['order', 'product', 'return', 'pro', 'other'].map(s => `<option>${t('ct.s.' + s)}</option>`).join('')}</select></div>
        <div class="field"><label for="ctOrder">${t('ok.order')} (${t('ct.optional')})</label><input id="ctOrder" name="order" placeholder="VT-XXXXXX"></div>
        <div class="field"><label for="ctMsg">${t('ct.message')}</label><textarea id="ctMsg" name="message" required minlength="10"></textarea><span class="msg"></span></div>
        <button class="btn sm" type="submit">${t('ct.send')}</button>
      </form>
    </div></div>` });

  V.faq = () => ({ html: `<div class="container"><div class="page-head"><h1 class="mega-title">FAQ</h1><hr class="rule"></div>
    <div class="prose">${content('faq').map(([group, qs]) => `<div class="faq-group"><h2>${group}</h2><div class="acc">${qs.map(([q, a]) => `<details><summary>${q}</summary><div class="body">${a}</div></details>`).join('')}</div></div>`).join('')}
    <p style="margin-top:40px">${t('faq.more')} <a href="#/contact">${t('f.contact')}</a></p></div></div>` });

  V.page = (key, anchor) => {
    const pg = content('pages')[key]; if (!pg) return V.notfound();
    if (anchor) setTimeout(() => { const el = document.getElementById(anchor); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'smooth' }); }, 120);
    return { html: `<div class="container"><div class="page-head"><h1 class="mega-title" style="font-size:clamp(40px,6vw,88px)">${pg.title}</h1><hr class="rule"></div>
      <div class="prose">${pg.html.replace(/\{free\}/g, money(zone().free)).replace(/\{std\}/g, money(zone().std)).replace(/\{exp\}/g, money(zone().exp))}</div></div>`, title: pg.title };
  };

  V.notfound = () => ({ html: `<div class="container"><div class="empty" style="padding:140px 0"><h1 class="mega-title center">404</h1><p>${t('nf.text')}</p><a class="btn" href="#/">${t('nav.home')}</a></div></div>` });

  /* ---------------- router ---------------- */
  let route = { name: 'home', params: [], query: {} };
  const parse = () => {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    return { name: parts[0] || 'home', params: parts.slice(1), query };
  };
  const views = {
    home: () => V.home(), shop: (a, b) => V.shop(a || 'all', b || null), product: s => V.product(s), routines: () => V.routines(), about: () => V.about(),
    favorites: () => V.favorites(), checkout: () => V.checkout(), order: id => V.order(id), login: () => V.login(), register: () => V.register(), account: () => V.account(),
    track: () => V.track(), contact: () => V.contact(), faq: () => V.faq(), page: (k, a) => V.page(k, a), cart: () => V.cart()
  };
  let lastPath = '';
  let coDraft = null;
  const render = () => {
    const prev = route; route = parse();
    const fn = views[route.name] || V.notfound;
    const out = fn(...route.params) || {};
    const main = $('#main');
    const oldForm = $('form[data-form="checkout"]', main);
    if (oldForm) { coDraft = {}; $$('input,select', oldForm).forEach(i => { if (!i.name || i.type === 'radio') return; coDraft[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); }
    main.innerHTML = `<div class="view">${out.html || ''}</div>`;
    const newForm = $('form[data-form="checkout"]', main);
    if (newForm && coDraft) { $$('input,select', newForm).forEach(i => { if (!(i.name in coDraft) || i.type === 'radio' || i.name === 'country') return; if (i.type === 'checkbox') i.checked = coDraft[i.name]; else i.value = coDraft[i.name]; }); }
    if (route.name !== 'checkout') coDraft = null;
    document.body.classList.toggle('has-hero', !!out.hero);
    document.body.classList.toggle('hero-dark', !!out.heroDark);
    document.body.classList.toggle('tools-light', !!out.toolsLight);
    const titles = { home: t('meta.home'), shop: t('nav.products'), routines: t('nav.routines'), about: t('nav.about'), favorites: t('nav.favorites'), checkout: t('co.title'), login: t('auth.login'), register: t('auth.create'), account: t('nav.account'), contact: t('f.contact'), faq: 'FAQ', track: t('f.track') };
    document.title = (out.title || titles[route.name] || 'Vertigo') + (route.name === 'home' ? '' : ' — Vertigo');
    renderHeader();
    const path = location.hash.split('?')[0];
    if (path !== lastPath || prev.name !== route.name) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    lastPath = path;
    closeOverlays();
    onScroll(); observeReveal();
    main.focus({ preventScroll: true });
  };

  const rerenderAll = () => {
    document.documentElement.lang = S.lang;
    document.documentElement.dataset.theme = S.theme;
    renderTop(); renderFooter(); renderMobileNav(); render(); renderCart(); renderCookie();
  };

  /* ---------------- reveal on scroll ---------------- */
  let io;
  const observeReveal = () => {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(e => e.classList.add('in')); return; }
    io && io.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(e => io.observe(e));
  };
  const onScroll = () => { const h = $('#header'); if (!h) return; const lim = document.body.classList.contains('has-hero') ? 40 : 10; h.classList.toggle('solid', scrollY > lim || !document.body.classList.contains('has-hero')); };

  /* ---------------- overlays ---------------- */
  const closeOverlays = () => { $('#mega')?.classList.remove('open'); $('#regionPop')?.classList.remove('open'); $('#mnav').classList.remove('open'); closeSearch(); if ($('#drawer').classList.contains('open')) closeCart(); };
  const openSearch = () => {
    const el = $('#search');
    el.innerHTML = `<button class="icon-btn" style="position:absolute;top:30px;right:var(--gutter)" data-act="search-close" aria-label="${t('ui.close')}">${I.close}</button>
      <div class="bar">${I.search.replace('<svg', '<svg style="width:34px;height:34px"')}<input id="searchInput" placeholder="${t('search.ph')}" aria-label="${t('nav.search')}" autocomplete="off"></div>
      <div class="results"><div class="suggest">${t('search.try')} ${['serum', 'vitamin', 'centella', 'SPF', 'ginseng', 'rice'].map(s => `<button class="chip" data-act="suggest" data-q="${s}">${s}</button>`).join('')}</div><div id="searchResults"></div></div>`;
    el.classList.add('open'); document.body.classList.add('locked');
    setTimeout(() => $('#searchInput').focus(), 300);
  };
  const runSearch = q => { const r = doSearch(q); $('#searchResults').innerHTML = q.trim() ? (r.length ? `<p class="result-count">${t('shop.count', { n: r.length })}</p><div class="grid g4" style="margin-top:18px">${r.map(p => card(p)).join('')}</div>` : `<p class="empty">${t('search.none', { q: esc(q) })}</p>`) : ''; $$('#searchResults .reveal').forEach(e => e.classList.add('in')); };
  function closeSearch() { const el = $('#search'); if (el && el.classList.contains('open')) { el.classList.remove('open'); if (!$('#drawer').classList.contains('open')) document.body.classList.remove('locked'); } }

  /* ---------------- cookie banner ---------------- */
  const renderCookie = (force = false) => {
    const el = $('#cookie');
    if (store.get('cookies', null) && !force) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<h4>${t('cookie.title')}</h4><div>${t('cookie.text')} <a class="link" href="#/page/cookies">${t('cookie.more')}</a></div>
      <div class="actions"><button class="btn ghost" data-act="cookie" data-v="essential">${t('cookie.refuse')}</button><button class="btn" data-act="cookie" data-v="all">${t('cookie.accept')}</button></div>`;
  };

  /* ---------------- validation ---------------- */
  const setErr = (input, msg) => { const f = input.closest('.field'); if (!f) return; f.classList.toggle('err', !!msg); const m = $('.msg', f); if (m) m.textContent = msg || ''; };
  const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };
  const validate = form => {
    let ok = true;
    $$('input,textarea,select', form).forEach(i => {
      if (i.disabled || i.type === 'checkbox' || i.type === 'radio' || i.closest('[hidden]')) return;
      let msg = '';
      const v = i.value.trim();
      if (i.required && !v) msg = t('err.required');
      else if (i.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = t('err.email');
      else if (i.minLength > 0 && v && v.length < i.minLength) msg = t('err.min', { n: i.minLength });
      setErr(i, msg); if (msg) ok = false;
    });
    if (!ok) { const first = $('.field.err input, .field.err textarea', form); first && first.focus(); }
    return ok;
  };

  /* ---------------- form handlers ---------------- */
  const forms = {
    newsletter(f) {
      const i = f.email; const v = i.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { i.focus(); toast(t('err.email')); return; }
      const list = store.get('newsletter', []); if (!list.includes(v)) list.push(v); store.set('newsletter', list);
      f.reset(); toast(t('nl.ok'));
    },
    login(f) {
      if (!validate(f)) return;
      const users = store.get('users', {}); const email = f.email.value.trim().toLowerCase(); const u = users[email];
      const err = $('#authErr');
      if (!u || u.pw !== hashPw(f.password.value)) { err.hidden = false; err.textContent = t('auth.bad'); return; }
      S.user = email; store.set('user', email); toast(t('auth.welcome', { n: esc(u.first) }));
      location.hash = route.query.next ? '#/' + route.query.next : '#/account';
    },
    register(f) {
      if (!validate(f)) return;
      if (f.password.value.length < 8) { setErr(f.password, t('err.min', { n: 8 })); return; }
      if (f.password.value !== f.password2.value) { setErr(f.password2, t('err.match')); return; }
      const users = store.get('users', {}); const email = f.email.value.trim().toLowerCase();
      if (users[email]) { const e = $('#authErr'); e.hidden = false; e.textContent = t('auth.exists'); return; }
      users[email] = { email, first: f.first.value.trim(), last: f.last.value.trim(), pw: hashPw(f.password.value), created: Date.now(), bonus: 50 };
      store.set('users', users); S.user = email; store.set('user', email);
      if (f.news.checked) forms.newsletter({ email: { value: email, focus() { } }, reset() { } });
      toast(t('auth.created'));
      location.hash = route.query.next ? '#/' + route.query.next : '#/account?tab=circle';
    },
    profile(f) {
      if (!validate(f)) return;
      const users = store.get('users', {}); const u = users[S.user];
      u.first = f.first.value.trim(); u.last = f.last.value.trim();
      u.address = { address: f.address.value.trim(), city: f.city.value.trim(), zip: f.zip.value.trim(), phone: f.phone.value.trim() };
      store.set('users', users); toast(t('acc.saved'));
    },
    review(f) {
      if (!validate(f)) return;
      const all = store.get('reviews', {}); const slug = f.dataset.slug;
      (all[slug] = all[slug] || []).unshift({ name: f.name.value.trim(), title: f.title.value.trim(), text: f.text.value.trim(), rating: +$('.star-input', f).dataset.rating, country: S.region, lang: S.lang });
      store.set('reviews', all); toast(t('rev.thanks')); render(); setTimeout(() => document.getElementById('reviews')?.scrollIntoView(), 50);
    },
    contact(f) { if (!validate(f)) return; f.reset(); toast(t('ct.ok')); },
    track(f) { if (!validate(f)) return; location.hash = `#/track?id=${encodeURIComponent(f.id.value.trim())}&email=${encodeURIComponent(f.email.value.trim())}`; },
    checkout(f) {
      let ok = validate(f);
      const pay = f.pay.value;
      if (pay === 'card') {
        const n = f.cc.value.replace(/\s/g, ''); const exp = f.ccexp.value.trim(); const cvc = f.cvc.value.trim();
        if (!/^\d{13,19}$/.test(n) || !luhn(n)) { setErr(f.cc, t('err.card')); ok = false; } else setErr(f.cc, '');
        if (!f.ccname.value.trim()) { setErr(f.ccname, t('err.required')); ok = false; } else setErr(f.ccname, '');
        const m = exp.match(/^(\d{2})\/(\d{2})$/); const now = new Date();
        if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1]) <= now) { setErr(f.ccexp, t('err.exp')); ok = false; } else setErr(f.ccexp, '');
        if (!/^\d{3,4}$/.test(cvc)) { setErr(f.cvc, t('err.cvc')); ok = false; } else setErr(f.cvc, '');
      }
      if (!f.terms.checked) { $('#termsMsg').textContent = t('err.terms'); ok = false; } else $('#termsMsg').textContent = '';
      if (!ok) { toast(t('err.form')); return; }
      const btn = $('button[type=submit]', f); btn.disabled = true; btn.textContent = t('co.processing');
      setTimeout(() => placeOrder(f), 1100);
    }
  };

  const placeOrder = f => {
    const ship = f.ship ? f.ship.value : 'std';
    const gcCode = store.get('gcApplied', null); const gcs = store.get('giftcards', {});
    const gc = gcCode && gcs[gcCode] ? { code: gcCode, balance: gcs[gcCode] } : null;
    const T = totals(ship, S.promo, gc);
    const id = 'VT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const giftcards = [];
    T.lines.filter(l => l.p.cat === 'gift').forEach(l => { for (let i = 0; i < l.qty; i++) { const c = 'VTG-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); gcs[c] = l.amount || l.p.price; giftcards.push(c); } });
    if (gc) { gcs[gc.code] = Math.max(0, gc.balance - T.gc / RATES[cur()]); store.set('gcApplied', null); }
    store.set('giftcards', gcs);
    const order = {
      id, date: Date.now(), email: f.email.value.trim().toLowerCase(), cur: cur(), lang: S.lang, ship, pay: f.pay.value,
      eur: T.total / RATES[cur()],
      address: { first: f.first.value.trim(), last: f.last.value.trim(), address: f.address.value.trim(), city: f.city.value.trim(), zip: f.zip.value.trim(), country: f.country.value, phone: f.phone.value.trim() },
      items: T.lines.map(l => ({ slug: l.slug, qty: l.qty, amount: l.amount, unit: l.unit })),
      totals: { sub: T.sub, discount: T.discount, ship: T.ship, wrap: T.wrap, gc: T.gc, total: T.total }, giftcards
    };
    const orders = store.get('orders', []); orders.push(order); store.set('orders', orders);
    if (S.user) { const users = store.get('users', {}); if (users[S.user] && !users[S.user].address) { users[S.user].address = { address: order.address.address, city: order.address.city, zip: order.address.zip, phone: order.address.phone }; store.set('users', users); } }
    if (f.news && f.news.checked) forms.newsletter({ email: { value: order.email, focus() { } }, reset() { } });
    S.cart = []; saveCart(); S.promo = null; store.set('promo', null); S.giftwrap = false; store.set('giftwrap', false);
    location.hash = '#/order/' + id;
  };

  /* ---------------- events ---------------- */
  const actions = {
    'open-cart': e => { e.preventDefault(); closeSearch(); openCart(); },
    'close-cart': () => closeCart(),
    fav: (e, el) => {
      e.preventDefault(); const s = el.dataset.slug; const i = S.favs.indexOf(s);
      if (i > -1) S.favs.splice(i, 1); else S.favs.push(s);
      store.set('favs', S.favs);
      $$(`[data-act="fav"][data-slug="${s}"]`).forEach(b => { b.innerHTML = I.star(isFav(s)); b.setAttribute('aria-pressed', isFav(s)); b.setAttribute('aria-label', t(isFav(s) ? 'fav.remove' : 'fav.add')); });
      updateBadges(); toast(t(isFav(s) ? 'fav.added' : 'fav.removed'), isFav(s) ? `<a href="#/favorites">${t('fav.see')}</a>` : '');
      if (route.name === 'favorites') render();
    },
    add: (e, el) => { e.preventDefault(); addToCart(el.dataset.slug); renderCart(); },
    'add-pdp': (e, el) => { const q = Math.max(1, Math.min(20, parseInt($('#pQty').value) || 1)); addToCart(el.dataset.slug, q, el.dataset.amount ? +el.dataset.amount : null, true); openCart(); },
    pqty: (e, el) => { const i = $('#pQty'); i.value = Math.max(1, Math.min(20, (parseInt(i.value) || 1) + +el.dataset.d)); },
    qty: (e, el) => setQty(+el.dataset.i, S.cart[+el.dataset.i].qty + +el.dataset.d),
    rm: (e, el) => setQty(+el.dataset.i, 0),
    giftwrap: (e, el) => { S.giftwrap = el.checked; store.set('giftwrap', S.giftwrap); renderCart(); },
    theme: () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; store.set('theme', S.theme); document.documentElement.dataset.theme = S.theme; renderHeader(); renderMobileNav(); },
    region: (e) => { e.stopPropagation(); $('#mega').classList.remove('open'); $('#regionPop').classList.toggle('open'); },
    lang: (e, el) => { S.lang = el.dataset.lang; store.set('lang', S.lang); rerenderAll(); toast(t('toast.lang')); },
    search: () => openSearch(),
    'search-close': () => closeSearch(),
    suggest: (e, el) => { $('#searchInput').value = el.dataset.q; runSearch(el.dataset.q); },
    mnav: () => $('#mnav').classList.add('open'),
    'mnav-close': () => $('#mnav').classList.remove('open'),
    thumb: (e, el) => { $('#pdpImg').src = el.dataset.src; $$('.thumbs button').forEach(b => b.classList.toggle('on', b === el)); },
    zoom: (e, el) => el.classList.toggle('zoom'),
    scroll: (e, el) => { e.preventDefault(); document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: 'smooth' }); },
    'rev-open': () => { $('.rev-form').classList.toggle('open'); },
    rate: (e, el) => { const box = el.parentElement; box.dataset.rating = el.dataset.v; $$('button', box).forEach((b, i) => b.innerHTML = I.star(i < +el.dataset.v)); },
    'add-routine': (e, el) => { VT.routines[el.dataset.tab].forEach(s => addToCart(s.slug, 1, null, true)); S.promo = 'ROUTINE10'; store.set('promo', S.promo); openCart(); toast(t('rt.added')); },
    'favs-to-cart': () => { S.favs.forEach(s => P(s) && addToCart(s, 1, null, true)); openCart(); },
    ship: (e, el) => { store.set('shipMethod', el.value); render(); },
    pay: (e, el) => { $('#cardFields').hidden = el.value !== 'card'; },
    promo: () => {
      const code = $('#promoInput').value.trim().toUpperCase();
      const gcs = store.get('giftcards', {});
      if (PROMOS[code]) { S.promo = code; store.set('promo', code); toast(t('co.promoOk')); render(); }
      else if (gcs[code] > 0) { store.set('gcApplied', code); toast(t('co.gcOk', { p: money(gcs[code]) })); render(); }
      else toast(t('co.promoBad'));
    },
    'promo-rm': () => { S.promo = null; store.set('promo', null); store.set('gcApplied', null); render(); },
    logout: () => { S.user = null; store.set('user', null); toast(t('acc.bye')); location.hash = '#/'; },
    forgot: () => toast(t('auth.forgotOk')),
    cookie: (e, el) => { store.set('cookies', el.dataset.v); $('#cookie').hidden = true; }
  };
  PROMOS.ROUTINE10 = { pct: 10 };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el && actions[el.dataset.act]) { if (el.type !== 'checkbox' && el.type !== 'radio') { } actions[el.dataset.act](e, el); }
    if (!e.target.closest('#regionPop') && !e.target.closest('[data-act="region"]')) $('#regionPop')?.classList.remove('open');
    if (e.target.closest('#mnav a')) $('#mnav').classList.remove('open');
    const a = e.target.closest('a[href^="#/"]');
    if (a && a.getAttribute('href') === location.hash) { closeOverlays(); }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('#regionSelect, [data-region-select]')) { S.region = el.value; store.set('region', S.region); rerenderAll(); toast(t('toast.region', { r: esc(regionName(S.region)), c: cur() })); }
    if (el.matches('select[data-nav]')) location.hash = el.value;
    if (el.matches('[data-qty-i]')) setQty(+el.dataset.qtyI, parseInt(el.value) || 0);
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'searchInput') runSearch(e.target.value);
    if (e.target.id === 'ccNum') { const v = e.target.value.replace(/\D/g, '').slice(0, 19); e.target.value = v.replace(/(.{4})/g, '$1 ').trim(); }
    if (e.target.id === 'ccExp') { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); e.target.value = v; }
    if (e.target.closest('.field.err')) setErr(e.target, '');
  });
  document.addEventListener('submit', e => { const f = e.target; const k = f.dataset.form; if (k && forms[k]) { e.preventDefault(); forms[k](f); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });
  // mega menu hover
  let megaT;
  document.addEventListener('mouseover', e => {
    if (e.target.closest('[data-mega]') || e.target.closest('#mega')) { clearTimeout(megaT); if (matchMedia('(min-width: 901px)').matches) $('#mega')?.classList.add('open'); }
    else if ($('#mega')?.classList.contains('open') && !e.target.closest('#header')) { megaT = setTimeout(() => $('#mega')?.classList.remove('open'), 150); }
    else if (e.target.closest('#header') && !e.target.closest('.nav') && !e.target.closest('#mega')) { megaT = setTimeout(() => $('#mega')?.classList.remove('open'), 150); }
  });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('hashchange', render);
  $('#scrim').addEventListener('click', closeCart);
  addEventListener('storage', e => { if (e.key === 'vt_cart') { S.cart = store.get('cart', []); updateBadges(); renderCart(); } });

  rerenderAll();
})();
