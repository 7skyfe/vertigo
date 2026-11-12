# Vertigo · Seoul skincare e-commerce

Static, fully functional e-commerce storefront for **Vertigo**, a premium Korean skincare brand.
No build step, no backend: plain HTML / CSS / vanilla JS, ready for **GitHub Pages**.

## Features
- **5 languages**: English (default), Français, Español, 日本語, 中文 · UI, product sheets, pages, FAQ.
- **11 shipping regions / 7 currencies** (EUR, USD, GBP, CAD, JPY, CNY, KRW) with localised price formatting and shipping rules.
- **Light / dark mode** (follows the system, toggle in the header).
- **Catalogue**: 18 products (serums, creams, SPF, cleanser, lip oil, gift sets, e-gift card), filters by category & concern, sorting, search.
- **Product pages**: gallery + zoom, key ingredients, full INCI, how-to, shipping accordion, reviews (with review form), cross-sell.
- **Bag**: drawer with quantity, free-shipping progress bar, gift wrapping, recommendations.
- **Checkout**: contact, address, delivery method, card validation (Luhn/expiry/CVC), PayPal/Apple Pay options, promo codes, gift card codes, order confirmation with tracking timeline.
- **Account**: sign-up / log-in, order history, profile & address, *Vertigo Circle* loyalty points.
- **Favourites**, order tracking, contact form, newsletter, cookie banner, legal pages.
- Routines page with Korean morning / evening / sensitive routines ("add whole routine" −10 %) and a skin-type quiz.

> All data (cart, accounts, orders) is stored in the visitor's browser (`localStorage`). No real payment is taken -
> use test card `4242 4242 4242 4242`, any future date, any CVC.

Promo codes: `BLACKFRIDAY` (−20 %), `WELCOME10` (−10 %), `FREESHIP`.

## Run locally
```bash
python3 -m http.server 8080
```
then open http://localhost:8080.

## Deploy on GitHub Pages
Settings → Pages → *Deploy from a branch* → select the branch and `/ (root)`.
Routing uses URL hashes (`#/product/...`), so no server configuration is needed.

## Structure
```
index.html                 app shell
assets/css/style.css       design system (tokens from the original mockups)
assets/js/data.js          product catalogue (5 languages)
assets/js/i18n.js          interface strings
assets/js/content.js       routines, reviews, about, FAQ, legal pages
assets/js/app.js           router, cart, checkout, account, search…
assets/img/products/       packshots (labels redesigned in English + Hangul)
assets/img/heroes/         hero visuals (desktop / tablet / mobile crops)
assets/img/brand/          vector logo, mark, favicons, social image
```

## Editing
- **Prices / products**: `assets/js/data.js` (prices are in EUR, converted automatically).
- **Texts**: `assets/js/i18n.js` and `assets/js/content.js` · English is the fallback for any missing key.
- **Colours**: CSS variables at the top of `assets/css/style.css` (`--bg`, `--ink`, `--gold`…).
