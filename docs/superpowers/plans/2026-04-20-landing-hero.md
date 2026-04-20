# Landing Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** show a branded landing hero to unauthenticated users before the login form, with CTA-driven transition into the existing auth flow.

**Architecture:** Keep `AuthPage` as the unauthenticated entry point, but split its UI into two focused children: a new landing hero component and an extracted login form component. `AuthPage` owns a small view-mode state (`landing`/`login`) and continues to own the mock-auth success callback so existing app flow stays intact.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, existing shared button primitive, existing mock auth store

---

### Task 1: Extract the current login form into a focused component

**Files:**
- Create: `frontend/src/pages/auth/ui/auth-login-form.tsx`
- Modify: `frontend/src/pages/auth/ui/auth-page.tsx`
- Test: manual verification via `npm run build`

- [ ] **Step 1: Write the failing test**

There is no test harness in the current frontend. Use a compile-level red step by importing a component that does not exist yet from `auth-page.tsx`.

```tsx
import { AuthLoginForm } from './auth-login-form'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build`
Expected: FAIL with a module resolution error for `./auth-login-form`

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/pages/auth/ui/auth-login-form.tsx` and move the current login form markup and related state contract into it.

```tsx
type AuthLoginFormProps = {
  onAuthSuccess: (user: AuthUser) => void
}

export function AuthLoginForm({ onAuthSuccess }: AuthLoginFormProps) {
  // move current form state and submit logic here
  return <main>{/* existing auth form UI */}</main>
}
```

Reduce `auth-page.tsx` to a thin wrapper that renders `<AuthLoginForm onAuthSuccess={onAuthSuccess} />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/auth/ui/auth-page.tsx frontend/src/pages/auth/ui/auth-login-form.tsx
git commit -m "refactor: extract auth login form"
```

### Task 2: Add a new landing hero component for guests

**Files:**
- Create: `frontend/src/pages/auth/ui/auth-landing-hero.tsx`
- Modify: `frontend/src/pages/auth/ui/auth-page.tsx`
- Test: manual verification via `npm run build`

- [ ] **Step 1: Write the failing test**

Add a new import and render branch in `auth-page.tsx` before creating the file.

```tsx
import { AuthLandingHero } from './auth-landing-hero'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build`
Expected: FAIL with a module resolution error for `./auth-landing-hero`

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/pages/auth/ui/auth-landing-hero.tsx` with the approved structure:

```tsx
type AuthLandingHeroProps = {
  onEnterLogin: () => void
}

export function AuthLandingHero({ onEnterLogin }: AuthLandingHeroProps) {
  return (
    <main className="landing-hero-shell">
      <header>{/* logo, nav, login button */}</header>
      <section>{/* left copy, CTA, right gray placeholders */}</section>
    </main>
  )
}
```

Update `auth-page.tsx` to own:

```tsx
const [view, setView] = useState<'landing' | 'login'>('landing')
```

and branch:

```tsx
if (view === 'landing') {
  return <AuthLandingHero onEnterLogin={() => setView('login')} />
}

return <AuthLoginForm onAuthSuccess={onAuthSuccess} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/auth/ui/auth-page.tsx frontend/src/pages/auth/ui/auth-landing-hero.tsx
git commit -m "feat: add guest landing hero shell"
```

### Task 3: Match the hero layout to the approved reference direction

**Files:**
- Modify: `frontend/src/pages/auth/ui/auth-landing-hero.tsx`
- Optionally modify: `frontend/src/shared/ui/button.tsx` only if existing variants are insufficient
- Test: manual viewport verification plus `npm run build`

- [ ] **Step 1: Write the failing test**

Make the component intentionally incomplete first by rendering only structural wrappers and missing key approved sections.

```tsx
return (
  <main>
    <section>Temporary hero</section>
  </main>
)
```

Define failure as visual mismatch against the approved design spec: missing header, missing CTA row, missing right visual plane.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build`
Expected: PASS for compile, but FAIL in manual browser verification because the screen does not match the approved section layout

- [ ] **Step 3: Write minimal implementation**

Implement the approved poster-style composition in `auth-landing-hero.tsx`:

```tsx
<main className="min-h-screen bg-[#151515] text-white">
  <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col">
    <header className="flex min-h-24 items-center justify-between bg-[#202020] px-5 md:px-8">
      {/* brand, nav, login button */}
    </header>
    <section className="grid flex-1 items-stretch lg:grid-cols-[1.08fr_0.92fr]">
      <div>{/* kicker, logo, headline, rule, CTA buttons */}</div>
      <div>{/* gray media placeholders */}</div>
    </section>
  </div>
</main>
```

Use branded temporary copy for:

- project title / kicker
- 2-3 line headline
- primary CTA that opens login
- secondary CTA with safe placeholder behavior

Use explicit gray placeholder blocks on the right, not decorative gradients, so future image replacement is obvious.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run build
```

Expected: PASS

Then run the app and manually verify:

```bash
npm run dev
```

Expected:
- guest sees the dark landing hero first
- header/login CTA are visible
- left/right composition is close to the reference on desktop

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/auth/ui/auth-landing-hero.tsx frontend/src/shared/ui/button.tsx
git commit -m "feat: style landing hero first section"
```

### Task 4: Restore responsive behavior and clean mobile layout

**Files:**
- Modify: `frontend/src/pages/auth/ui/auth-landing-hero.tsx`
- Modify: `frontend/src/index.css` only if a small custom utility or keyframe is truly needed
- Test: manual viewport verification plus `npm run build`

- [ ] **Step 1: Write the failing test**

Treat the desktop-first version as the red step if it overflows or preserves the two-column layout on narrow screens.

Failure criteria:

- CTA buttons become cramped
- right visual block appears above the text
- header becomes unreadable on mobile widths

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: FAIL in manual responsive inspection at approximately `390x844` and `768x1024` if the layout is still desktop-only

- [ ] **Step 3: Write minimal implementation**

Adjust `auth-landing-hero.tsx` responsive classes so that:

```tsx
<section className="grid flex-1 lg:grid-cols-[1.08fr_0.92fr]">
```

stacks naturally below `lg`, keeps text first, and preserves large tap targets:

```tsx
<div className="grid gap-3 sm:grid-cols-2">
  <Button className="h-12 sm:h-13" />
  <button className="h-12 sm:h-13" />
</div>
```

If needed, add only small supporting CSS in `frontend/src/index.css` for placeholder aspect control.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

Then manually verify in browser:

- mobile shows text first, image second
- header remains readable
- no horizontal scroll

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/auth/ui/auth-landing-hero.tsx frontend/src/index.css
git commit -m "fix: make landing hero responsive"
```

### Task 5: Verify login transition and auth regression safety

**Files:**
- Modify: `frontend/src/pages/auth/ui/auth-page.tsx` if needed
- Modify: `frontend/src/pages/auth/ui/auth-login-form.tsx` if needed
- Test: manual auth flow verification plus `npm run build`

- [ ] **Step 1: Write the failing test**

Define the red step as any of these regressions during manual flow testing:

- landing CTA does not switch to login
- header login button does not switch to login
- after switching, mock login no longer authenticates

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run dev
```

Expected: FAIL if any transition or mock-auth behavior is broken after the refactor

- [ ] **Step 3: Write minimal implementation**

Ensure `AuthPage` remains the only owner of the unauthenticated screen mode and keeps the existing `onAuthSuccess` handoff untouched:

```tsx
export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [view, setView] = useState<'landing' | 'login'>('landing')

  if (view === 'landing') {
    return <AuthLandingHero onEnterLogin={() => setView('login')} />
  }

  return <AuthLoginForm onAuthSuccess={onAuthSuccess} />
}
```

Do not duplicate auth logic in the landing component.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

Then manually verify:

- open app as logged-out user
- click primary CTA, reach login form
- sign in with an existing demo profile
- confirm app enters the existing `HomePage`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/auth/ui/auth-page.tsx frontend/src/pages/auth/ui/auth-login-form.tsx frontend/src/pages/auth/ui/auth-landing-hero.tsx
git commit -m "test: verify landing to login auth flow"
```

### Task 6: Final cleanup and completion verification

**Files:**
- Modify: `frontend/src/pages/auth/index.ts` if exports need updating
- Modify: any touched auth UI files for naming cleanup only
- Test: `npm run build`

- [ ] **Step 1: Write the failing test**

Search for plan drift:

```bash
rg -n "Temporary hero|TODO|TBD|landing-hero-shell" frontend/src/pages/auth frontend/src/index.css
```

Expected: FAIL if any placeholders or temporary names remain

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rg -n "Temporary hero|TODO|TBD|landing-hero-shell" frontend/src/pages/auth frontend/src/index.css
```

Expected: output is non-empty if cleanup is still needed

- [ ] **Step 3: Write minimal implementation**

Remove temporary labels, finalize exports, and keep file responsibilities clear:

- `auth-page.tsx`: view-mode orchestration only
- `auth-login-form.tsx`: login UI + login state
- `auth-landing-hero.tsx`: landing hero UI only

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rg -n "Temporary hero|TODO|TBD|landing-hero-shell" frontend/src/pages/auth frontend/src/index.css
npm run build
```

Expected:
- no output from `rg`
- PASS from `npm run build`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/auth/index.ts frontend/src/pages/auth/ui/auth-page.tsx frontend/src/pages/auth/ui/auth-login-form.tsx frontend/src/pages/auth/ui/auth-landing-hero.tsx frontend/src/index.css
git commit -m "chore: finalize landing hero auth split"
```
