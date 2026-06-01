# 3D Tulip Memory Gallery - Production Specification

## Project Overview

Build an interactive 3D Tulip Memory Gallery.

The application showcases memories through a rotating 3D tulip.

The tulip contains exactly 6 petals arranged around a center core.

Each petal represents exactly one memory.

Each memory contains:

* Image
* Title
* Message
* Optional Date

The user can rotate the tulip horizontally.

As the tulip rotates:

* The petal facing the camera becomes active.
* The active memory card is enlarged.
* Nearby cards are slightly reduced.
* Distant cards become smaller and less visible.
* The experience should feel like a premium 3D carousel.

The overall design should be:

* Elegant
* Romantic
* Emotional
* Modern
* Minimal
* Mobile Friendly

---

# Technical Stack

## Frontend

* Next.js 15+
* React
* TypeScript

## 3D Rendering

* Three.js
* React Three Fiber
* Drei

## Animation

* React Spring

React Spring will handle the tulip, petal, card, drag, inertia, and carousel transitions.

## Styling

* Tailwind CSS

## Backend

* Supabase

## Hosting

* Vercel

---

# Architecture

## Frontend

Responsible for:

* Rendering 3D tulip
* Displaying memory cards
* User interactions
* Authentication UI
* Admin dashboard

## Supabase

Responsible for:

* Database
* Authentication
* Storage
* Realtime updates

## Vercel

Responsible for:

* Production deployment
* Environment variables
* Edge delivery

---

# Core Features

## Feature 1: 3D Tulip Model

### Requirements

Create a realistic stylized tulip.

Tulip contains:

* Stem
* Center Core
* 6 Independent Petals

### Important Rule

Petals MUST be independent meshes.

Do NOT create a single combined flower mesh.

Reason:

* Easier animation
* Easier highlighting
* Easier active petal detection
* Easier scaling

### Petal Rules

* Exactly 6 petals
* 60 degree spacing
* Natural overlap
* Slight curvature

### Deliverables

* Tulip Component
* Petal Component
* Stem Component
* Center Component

---

## Feature 2: Dynamic Memory System

### Requirements

Do NOT hardcode memories.

All memory content must come from Supabase.

### Memory Fields

```ts
{
  id: string;
  petal_index: number;
  title: string;
  message: string;
  image_url: string;
  memory_date?: string;
  created_at: string;
  updated_at: string;
}
```

### Rules

* Exactly 6 memories
* Exactly one memory per petal
* `petal_index` must map each memory to one of the 6 petals
* Do not build unlimited-memory support in the initial version

---

## Feature 3: Floating Memory Cards

Each petal owns one floating memory card.

### Card Content

* Image
* Title
* Message
* Optional Date

### Card Behavior

* Follows petal rotation
* Remains readable
* Faces camera

### Design

Glassmorphism style

Requirements:

* Rounded corners
* Blur background
* Soft shadows
* Semi-transparent panel

---

## Feature 4: Interactive Rotation

### Desktop

Support:

* Mouse Drag
* Click and Drag

### Mobile

Support:

* Swipe
* Touch Drag

### Rotation Behavior

Drag Left:

* Rotate clockwise

Drag Right:

* Rotate counterclockwise

### Animation

* Smooth inertia
* Spring effect
* Momentum
* No snapping glitches

---

## Feature 5: Active Petal Detection

Determine the active petal from the tulip's horizontal rotation angle.

Each petal has a fixed base angle separated by 60 degrees.

The active petal is the petal whose rotated angle is closest to the camera-facing front angle.

Use angle normalization instead of raw world-space distance so active detection remains stable across responsive camera changes.

That petal becomes active.

### Active Petal

* Scale Up
* Brighter Material
* Stronger Glow
* Larger Memory Card

### Inactive Petals

* Reduced Scale
* Lower Opacity
* Lower Emphasis

---

## Feature 6: Carousel Highlight System

### Visual Hierarchy

Active Card

Scale:

```text
1.0
```

Adjacent Cards

```text
0.8
```

Far Cards

```text
0.6
```

Back Cards

```text
0.4
```

### Transition

Smooth interpolation.

No sudden size changes.

---

## Feature 7: Camera System

### Camera Type

Perspective Camera

### Position

* Slightly elevated
* Looking downward
* Focused on tulip center

### Requirements

* Responsive
* Mobile Friendly
* Automatic scaling

---

## Feature 8: Lighting

### Lighting Setup

* Ambient Light
* Directional Light
* Rim Light

### Goals

* Soft Romantic Feel
* Visible Petal Depth
* Readable Memory Cards

---

## Feature 9: Background

Create a premium background.

### Options

* Gradient Background
* Floating Particles
* Bokeh Effect

### Avoid

* Busy backgrounds
* Distracting animations

---

## Feature 10: Supabase Authentication

### User Roles

Visitor

* View memories
* Rotate tulip

Admin

* Login
* Upload images
* Edit memories
* Delete memories
* Manage petals

### Initial User Model

The initial version supports only:

* 1 admin user
* Public visitors

There is no self-service registration for additional users in the initial version.

### Authentication

Use Supabase Auth.

Only authenticated admins can access dashboard.

Admin status is controlled by a single profile row with role `admin`.

Visitors do not need an account.

---

## Feature 11: Admin Dashboard

### Dashboard Page

Route:

```text
/admin
```

### Features

Display all petals.

Each petal shows:

* Preview image
* Title
* Message
* Edit button

### Actions

Admin can:

* Update memory
* Delete memory
* Upload image

Because the public gallery always has exactly 6 petals, the admin dashboard should keep 6 memory slots available.

If a memory is deleted, the slot remains available for a replacement memory with the same `petal_index`.

---

## Feature 12: Image Upload System

### Storage

Use Supabase Storage.

Bucket Name:

```text
tulip-images
```

### Upload Flow

Admin uploads image

↓

Image stored in bucket

↓

Public URL generated

↓

URL saved to database

↓

Frontend updates

### Requirements

Support:

* JPG
* PNG
* WEBP

---

## Feature 13: Realtime Updates

Use Supabase Realtime.

### Behavior

Admin saves changes

↓

Database updates

↓

Realtime event emitted

↓

Tulip updates automatically

No page refresh required.

---

## Feature 14: Database Design

### Table: petals

```sql
id uuid primary key default gen_random_uuid(),
petal_index integer not null unique check (petal_index between 0 and 5),
title text not null,
message text not null,
image_url text not null,
memory_date date,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Rules:

* The app expects 6 rows, one for each `petal_index` from 0 through 5.
* `updated_at` must be maintained by a database trigger on update.
* `is_active` is not stored in the database because active state is calculated in the frontend from rotation.

### Table: profiles

```sql
id uuid primary key references auth.users(id) on delete cascade,
email text not null,
role text not null check (role in ('admin')),
created_at timestamptz not null default now()
```

### Role Values

```text
admin
```

The initial version supports a single admin profile only.

---

## Feature 15: Security

Use Row Level Security (RLS).

### Public Users

Allowed:

```text
SELECT
```

### Admin Users

Allowed:

```text
SELECT
INSERT
UPDATE
DELETE
```

### Security Rules

* Never expose service role key
* Use environment variables
* Protect admin routes
* Disable public signup or prevent newly signed-up users from becoming admins
* Only the configured admin user can insert, update, or delete memories
* Visitors can only read public memory rows
* Storage uploads, updates, and deletes are admin-only

---

# Performance Requirements

Target:

* Fast loading
* Smooth animations

Optimization:

* Lazy load images
* Compress assets
* Minimize draw calls
* Memoize components
* Optimize Three.js materials

---

# Accessibility

Requirements:

* Keyboard navigation
* Screen reader labels
* Reduced motion support

### Accessibility Implementation

Accessibility is possible by pairing the 3D canvas with accessible DOM controls and readable memory content.

Requirements:

* Provide previous and next controls for keyboard users.
* Support left and right arrow keys to rotate between petals.
* Keep the active memory card available as normal HTML text outside or above the canvas layer.
* Add meaningful `alt` text for each memory image.
* Treat the canvas as decorative for screen readers when equivalent memory content is available in HTML.
* Respect `prefers-reduced-motion` by disabling inertia, particles, and large animated transitions.
* Ensure admin forms have labels, validation messages, focus states, and keyboard-submit behavior.

---

# Folder Structure

```text
src/
  app/
    page.tsx
    admin/
      page.tsx
    login/
      page.tsx
  components/
    Admin/
    MemoryCard/
    Scene/
    Tulip/
      Center.tsx
      Petal.tsx
      Stem.tsx
      Tulip.tsx
  hooks/
    useActivePetal.ts
    useMemories.ts
    useTulipRotation.ts
  lib/
    supabase/
  types/
    memory.ts
    user.ts
  utils/
    petalPosition.ts
    rotation.ts
public/
```

---

# Work Rule

Focus on one implementation task at a time.

After each task is completed, update this requirements file or a task-tracking section with the completed work before moving to the next task.

---

# Task Progress

## Completed

* Phase 1 foundation setup:
  * Added Next.js 15, React, and TypeScript project configuration.
  * Added Tailwind CSS setup.
  * Added Supabase client dependency and environment variable placeholders.
  * Added Vercel-compatible Next.js build configuration.
  * Added initial `/`, `/admin`, and `/login` routes for verification.
  * Verified `npm run typecheck`.
  * Verified `npm run build`.
* Phase 2 local schema/auth/storage scaffolding:
  * Added Supabase migration for `profiles` and `petals` tables.
  * Added `updated_at` trigger for memory updates.
  * Added RLS policies for public memory reads and admin-only writes.
  * Added `tulip-images` storage bucket configuration and storage object policies.
  * Added Supabase Auth login flow with admin profile role validation.
  * Added protected `/admin` route gate for authenticated admins.
* Phase 2 Supabase deployment:
  * Applied the schema/auth/storage migration to the connected Supabase project.
  * Added follow-up migrations for Supabase security and performance advisor findings.
  * Moved the admin-check helper into a private schema so RLS policies can use it without exposing it as a public RPC.
  * Verified `profiles` and `petals` exist with RLS enabled in Supabase.
  * Verified the `tulip-images` storage bucket exists with the expected image settings.
  * Verified Supabase performance advisors report no findings.
* Phase 2 admin bootstrap:
  * Confirmed the initial Supabase Auth admin user exists.
  * Added the matching `profiles` row with role `admin`.
* Phase 2 local runtime setup:
  * Added local Supabase environment variables in `.env.local`.
  * Started the local Next.js dev server.
  * Verified `/login` responds successfully from the local app.
  * Verified `/admin` responds from the local app before client-side auth handling.
  * Confirmed password sign-in on `/login` redirects the admin to `/admin`.
* Phase 3 admin dashboard:
  * Replaced the placeholder `/admin` page with a six-slot memory dashboard.
  * Loaded existing `petals` rows from Supabase and mapped missing rows to empty slots.
  * Added editable fields for title, message, image URL, and optional date.
  * Added per-slot save behavior using `petal_index` upserts.
  * Added per-slot delete behavior that clears the memory while preserving the slot.
  * Added image preview support for Supabase Storage public URLs.
* Phase 4 image upload implementation:
  * Added per-slot JPG, PNG, and WEBP file selection in the admin dashboard.
  * Added client-side image type and 5 MB size validation.
  * Added upload flow to the `tulip-images` Supabase Storage bucket.
  * Added public URL generation after upload.
  * Saved generated image URLs to the matching `petals` row.
  * Removed replaced or deleted Supabase Storage images when possible.
* Phase 4 runtime verification:
  * Confirmed image upload works through `/admin`.
  * Confirmed uploaded images are saved in Supabase Storage.
  * Confirmed generated public image URLs are saved in the `petals` database table.
* Supabase Auth security review:
  * Reviewed leaked password protection advisor warning.
  * Deferred leaked password protection because the project is currently on the Supabase Free plan.
* Tooling cleanup:
  * Replaced deprecated interactive `next lint` script with `eslint .`.
  * Added ESLint flat config for Next.js and TypeScript.
  * Verified `npm run lint`.
  * Verified `npm run typecheck`.
  * Verified `npm run build`.

## Current Task

* Ready for Phase 5: Build 3D Tulip.

---

# Development Phases

## Phase 1

* Next.js Setup
* Tailwind Setup
* Supabase Setup
* Vercel Setup

## Phase 2

* Database Schema
* Authentication
* Storage Bucket

## Phase 3

* Admin Dashboard

## Phase 4

* Image Upload System

## Phase 5

* Build 3D Tulip

## Phase 6

* Rotation Controls

## Phase 7

* Active Petal Detection

## Phase 8

* Carousel Highlight System

## Phase 9

* Realtime Sync

## Phase 10

* Mobile Optimization

## Phase 11

* Performance Optimization

## Phase 12

* Production Deployment

---

# Definition of Done

The project is complete when:

* 3D tulip renders correctly.
* Exactly 6 petals are displayed.
* Petals are independent meshes.
* Exactly 6 memories are loaded from Supabase.
* All memory content comes from Supabase.
* Admin dashboard functions correctly.
* Only the admin can create, update, delete, and upload memory content.
* Image uploads work through Supabase Storage.
* Authentication is secure.
* Realtime updates function correctly.
* Active petal is highlighted using angle-based detection.
* Carousel effect feels smooth.
* Works on desktop and mobile.
* Accessibility controls and reduced-motion behavior work.
* Successfully deployed on Vercel.
* Clean, reusable, production-ready codebase.
