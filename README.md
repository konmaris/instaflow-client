# Instaflow — Client Portal

Customer-facing ordering web app. Each restaurant is served on its own subdomain
(`demoresto.instaflow.gr`) — no marketplace. Mobile-first.

- **Stack:** React + Vite + TypeScript, TailwindCSS, TanStack Query, Zustand, React Router, React-Leaflet
- **Backend:** Supabase — see the `instaflow-database` repo
- **Payments:** Stripe (card flow stubbed — see below)

## Features

- **Subdomain → restaurant** resolution via the public `get_restaurant_by_slug` RPC
  (dev fallback: `?slug=demoresto` or `VITE_DEFAULT_SLUG`)
- **Menu** browsing by category, persistent cart (localStorage)
- **Checkout** — delivery / dine-in (table pick) / pickup, gated by the restaurant's addons; cash or card
- **Live order tracking** — realtime status timeline + a Leaflet map showing the rider's live position (subscribes to `rider_current_location`), when the restaurant has live tracking enabled

## Setup

```bash
npm install
cp .env.example .env   # Supabase URL + anon key + VITE_DEFAULT_SLUG
npm run dev            # open http://localhost:5173/?slug=demoresto
```

## Stripe (TODO)

Card checkout currently records the order as `unpaid`. To complete it, add a
`create-payment-intent` Edge Function (uses the restaurant's connected Stripe
account), confirm the PaymentIntent client-side with Stripe.js, and have a
`stripe-webhook` function mark the `payments`/`orders` rows paid.

## Project layout

```
src/
  lib/         supabase client, generated types, restaurant resolver (subdomain)
  store/       restaurant context, cart (persisted)
  hooks/       useMenu, usePlaceOrder, useOrderTracking (realtime + rider GPS)
  pages/       Menu, Checkout, Track
```
