# PingForce Flutter App — Deep UI/UX Audit

> **Scope:** All mobile screens across Milestone 2 & 3 modules  
> **Target:** Flutter (Android 10+ / iOS 16+), Material Design 3  
> **Severity:** 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## Executive Summary

The PingForce specifications are architecturally strong — Clean Architecture, Riverpod, offline-first, multi-tenant — but the **UI/UX layer is underspecified**. The current documentation describes *what* screens exist but **rarely defines *how* they look, feel, or guide the user**. This audit uncovers:

- **40+ missing UX specifications** across all screens
- **Critical onboarding & error-state gaps** on every module
- **No defined design system** (tokens, spacing, typography scale)
- **No empty states, skeleton loaders, or micro-animation specs**
- **No progressive disclosure or contextual guidance patterns**
- **Accessibility is mentioned but never concretely specified**

---

## 1. Design System — Foundation Gaps 🔴

### Current State
The THEME_ENGINE.md lists *categories* (colors, typography, tokens) but no **concrete values** are defined anywhere. Every developer will invent their own.

### Missing Specifications

| Gap | Severity | Impact |
|-----|----------|--------|
| No color palette with actual hex/HSL values | 🔴 Critical | Inconsistent UI across modules |
| No typography scale (Display, H1-H6, Body, Caption sizes) | 🔴 Critical | Inconsistent readability |
| No spacing grid (4px or 8px base grid?) | 🔴 Critical | Misaligned layouts |
| No elevation/shadow definitions | 🟠 High | Depth hierarchy breaks |
| No border radius tokens (sm/md/lg/pill) | 🟠 High | Inconsistent cards & buttons |
| No animation duration tokens (fast/normal/slow) | 🟡 Medium | Jarring transitions |
| No icon style guide (outlined vs filled, size = 20/24px?) | 🟡 Medium | Mixed icon aesthetics |
| No breakpoint spec for tablet layouts | 🟡 Medium | Tablet experience undefined |
| No dark mode color mappings explicitly defined | 🔴 Critical | Dark mode may break |

### Recommendations
1. **Define a Material 3 color scheme** with seed color, primary/secondary/tertiary roles, and surface tiers
2. **Establish an 8px spacing grid** with named tokens: `space2=2`, `space4=4`, `space8=8`, `space16=16`, `space24=24`, `space32=32`
3. **Create a typography scale** with exact font sizes and line heights per Material 3 TypeScale
4. **Document component library** — every reusable widget with states (default, hover, active, disabled, error, loading)

---

## 2. Splash Screen & App Launch 🟠

### Current State
Mentioned as an asset in Theme Engine. No UX spec exists.

### Missing
- [ ] Splash duration (1.5–2.5 sec?)
- [ ] Animation: logo fade-in vs scale-up vs Lottie animation
- [ ] Tenant branding: when does logo swap happen?
- [ ] Error state: what if tenant resolution fails during splash?
- [ ] Network error during startup — user sees blank or informative screen?
- [ ] First-launch vs returning-user differentiation

### Recommendations
- Show a **branded animated splash** (logo scale + fade, 1.8s)
- Transition to **skeleton screen** while downloading tenant config, never show a plain white loading screen
- Show **inline error** on tenant resolution failure with retry CTA

---

## 3. Authentication Screens 🔴

### 3.1 Login Screen

#### Current State (from spec)
- Tenant Code → Email/Mobile/Employee ID → Password → Biometric
- Client Code based login as first step

#### Missing UX Specs 🔴

| Missing Element | Why It Matters |
|----------------|---------------|
| No screen layout defined | Developers will make ad-hoc designs |
| No multi-step flow wireframe | Tenant code → credentials is 2 steps — no transition defined |
| No field validation feedback pattern | Real-time vs on-submit validation not specified |
| No "Show/Hide Password" toggle | Basic UX standard missing |
| No "Remember this device" option | Users expect this on mobile |
| No "Forgot Password" flow defined on screen | Mentioned in docs but no screen UX |
| No keyboard avoidance specification | Form gets hidden behind keyboard |
| No loading state on login button | No spinner/disabled state spec |
| No error banner design | AUTH-001 through AUTH-008 — where do they display? |
| No biometric prompt UI guidance | When to show fingerprint/face option |
| No landscape mode handling | Form layout on rotated phone |
| No tenant branding application timing | When does logo appear? Before or after tenant code entry? |

#### Recommendations
- **Step 1 (Tenant Code):** Large center-aligned input, prominent brand logo, helper text "Enter the code provided by your company"
- **Step 2 (Credentials):** Slide-in animation, show tenant logo/name to confirm context, username + password, biometric quick-unlock button if previously enrolled
- **Error states:** Inline field errors for format issues; toast/banner for auth errors (AUTH-001 to AUTH-008)
- **Loading button:** Replace button text with spinner on tap, re-enable on failure

### 3.2 Forgot Password Flow

#### Missing
- [ ] How is it triggered — modal or separate screen?
- [ ] OTP delivery channel selection (email vs SMS)
- [ ] OTP entry screen design (6-digit OTP keyboard)
- [ ] OTP countdown timer and resend logic display
- [ ] New password + confirm password screen
- [ ] Password strength indicator

### 3.3 Biometric Unlock Screen

#### Missing
- [ ] Biometric prompt appearance (system sheet or custom overlay?)
- [ ] Fallback to PIN/password on biometric failure
- [ ] "Use a different account" option

---

## 4. Home Dashboard 🔴

### Current State
Lists widget names across modules. No layout, no card spec, no priority ordering.

### Missing UX Specs

| Gap | Severity |
|-----|----------|
| No layout grid defined (1-col, 2-col, scrollable sections?) | 🔴 Critical |
| No widget priority order | 🔴 Critical |
| No widget size variants (small/medium/large) | 🟠 High |
| No skeleton loading states | 🔴 Critical |
| No empty state for dashboard with no data | 🟠 High |
| No pull-to-refresh UX | 🟠 High |
| No "good morning / greeting" contextual header | 🟡 Medium |
| No role-based dashboard switching animation | 🟡 Medium |
| No quick-action FAB or action bar spec | 🔴 Critical |
| No notification bell badge in app bar | 🔴 Critical |
| No sync status indicator placement | 🟠 High |
| No offline mode banner | 🔴 Critical |
| No SLA urgency visual treatment (red/orange alerts) | 🟠 High |
| No announcement/bulletin card | 🟡 Medium |
| No GPS status indicator (on/off/poor accuracy) | 🔴 Critical for field staff |
| Swipe gesture handling not specified | 🟡 Medium |

### Recommended Dashboard Layout

```
┌──────────────────────────────────────┐
│ [Avatar] Good Morning, Raheel ▾   🔔│  ← AppBar
│ [Offline Banner if applicable]       │
├──────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐   │
│ │ Check-In     │ │ GPS Status   │   │  ← Primary Action Cards
│ │ 09:00 AM     │ │ ✓ Active     │   │
│ └──────────────┘ └──────────────┘   │
├──────────────────────────────────────┤
│ Today's Summary                      │
│ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│ │Visits: 3│ │Faults:2 │ │Leads:5 │ │  ← KPI Row
│ └─────────┘ └─────────┘ └────────┘ │
├──────────────────────────────────────┤
│ ⚠ SLA Alerts (2 Critical)           │  ← Alerts Section
│ 📋 Pending Corrections (1)          │
├──────────────────────────────────────┤
│ Assigned Today                       │
│ [Visit Card] → [Navigate]           │  ← Scrollable List
│ [Fault Card] → [View]               │
│ [Lead Card] → [Follow Up]           │
├──────────────────────────────────────┤
│ 📢 Announcement: Holiday Notice     │
└──────────────────────────────────────┘
       ┌──────────── FAB ────────────┐
       │     + Quick Action          │
       └─────────────────────────────┘
```

### Recommendations
- Use **role-aware widget ordering**: field staff → check-in priority; managers → team KPIs priority
- **Skeleton loader** on every card section (shimmer animation)
- **Persistent offline banner** (amber strip at top) when network unavailable
- **GPS status chip** always visible for field roles
- **Floating Action Button (FAB)** for primary role-specific action (Check-In for employees, Create Fault for technicians)

---

## 5. Attendance Module 🔴

### 5.1 Attendance Check-In Screen

#### Missing UX Specs

| Gap | Severity |
|-----|----------|
| No map visualization for GPS/Geofence | 🔴 Critical |
| No GPS accuracy indicator (Good/Poor/No Signal) | 🔴 Critical |
| No geofence radius visual (circle on map) | 🔴 Critical |
| No selfie/photo capture UX flow | 🟠 High |
| No NFC tap animation | 🟡 Medium |
| No QR scanner UI | 🟡 Medium |
| No check-in confirmation animation (success feedback) | 🔴 Critical |
| No biometric prompt timing in flow | 🟠 High |
| No "outside geofence" warning state | 🔴 Critical |
| No estimated location accuracy display | 🟠 High |
| No shift information shown on check-in screen | 🟠 High |
| No one-tap check-in vs multi-step verification flow | 🔴 Critical |

#### Recommended Check-In Flow
```
1. Open Attendance
2. Show Shift Card (time, grace period, break schedule)
3. Show Live Map with:
   - User's location pin
   - Geofence circle (green if inside, red if outside)
   - GPS accuracy ring
4. [CHECK IN] Button
   → GPS validation (real-time)
   → If biometric required: prompt biometric
   → If selfie required: open camera
   → Show loading spinner
5. Success: Lottie animation + timestamp + confetti
6. Return to dashboard with updated status
```

### 5.2 Attendance History Screen

#### Missing UX Specs
- [ ] Calendar view — how does it look? Color coding by status?
- [ ] Color legend for status (Present/Absent/Late/Half-day/Leave)
- [ ] Day cell tap → detail sheet
- [ ] Monthly summary strip (days present/absent count)
- [ ] Export/download button
- [ ] Filter UX (status, shift, date range picker design)
- [ ] Swipe between months gesture
- [ ] Timeline view layout
- [ ] Correction request button placement and flow

### 5.3 Attendance Correction Request Screen

#### Missing
- [ ] Form layout (reason dropdown + description + date picker + attachment)
- [ ] File attachment flow (camera, gallery, document picker)
- [ ] Approval workflow status tracker UI (Submitted → Reviewed → Approved/Rejected)
- [ ] Comment thread between employee and manager

### 5.4 Break Management

#### Missing
- [ ] Break start/end UX — different from check-in?
- [ ] Break timer visible on screen/notification?
- [ ] Multiple break types (lunch, short break, prayer)?
- [ ] Auto-resume warning

---

## 6. GPS Visit Management Module 🔴

### 6.1 Visit List Screen

#### Missing UX Specs

| Gap | Severity |
|-----|----------|
| No list item card design | 🔴 Critical |
| No status badge colors (Pending/In-Progress/Completed/Cancelled) | 🔴 Critical |
| No distance/ETA shown per visit | 🔴 Critical |
| No sort options (by time, distance, priority) | 🟠 High |
| No swipe-to-action on list items | 🟡 Medium |
| No grouping by time (Morning/Afternoon) | 🟡 Medium |
| No map toggle button (list vs map view of all visits) | 🟠 High |
| No "accept/reject" inline action | 🔴 Critical |
| No SLA urgency indicator on cards | 🔴 Critical |

### 6.2 Active Visit Screen

#### Missing UX Specs
- [ ] Live map with route overlay
- [ ] Turn-by-turn navigation handoff to maps app
- [ ] ETA countdown display
- [ ] Visit progress steps (En Route → Arrived → In Progress → Completed)
- [ ] Customer contact (call/message) button
- [ ] Evidence capture panel (photos, signature, notes)
- [ ] GPS arrival auto-detection and prompt
- [ ] "I've Arrived" manual override if GPS fails
- [ ] Geofence entry confirmation animation
- [ ] Work log entry — inline or separate screen?
- [ ] Parts used entry
- [ ] Customer OTP verification screen
- [ ] Customer signature pad UI

### 6.3 Visit History with Map Replay

#### Missing
- [ ] Map replay timeline scrubber
- [ ] Speed of replay control
- [ ] Pause/play controls
- [ ] GPS track color by speed/time
- [ ] Visit markers on replay

---

## 7. Fault Management Module 🔴

### 7.1 My Faults List Screen

#### Missing UX Specs

| Gap | Severity |
|-----|----------|
| No list card design with SLA countdown | 🔴 Critical |
| No SLA traffic-light color (green/orange/red) | 🔴 Critical |
| No priority badge design (Critical/High/Medium/Low) | 🔴 Critical |
| No filter panel design (status/priority/assignment) | 🟠 High |
| No search bar UX | 🟠 High |
| No batch actions (select multiple, bulk update) | 🟡 Medium |
| No pull-to-refresh | 🟠 High |
| No group by status toggle | 🟡 Medium |

### 7.2 Fault Detail Screen

#### Missing UX Specs
- [ ] Section layout (header, timeline, attempts, attachments, SLA, comments)
- [ ] SLA countdown timer widget — how does it animate near breach?
- [ ] Assignment history timeline design
- [ ] Activity feed / audit trail list design
- [ ] "Add Attempt" button — where in the screen?
- [ ] Comment box with @mention (future)
- [ ] Attachment gallery (thumbnail grid)
- [ ] Status change button (which roles see which transitions?)
- [ ] Reassignment form

### 7.3 Create Fault Screen

#### Missing UX Specs
- [ ] Multi-section form layout
- [ ] Customer/site search with recent selections
- [ ] Photo capture inline in form
- [ ] GPS capture button and preview
- [ ] Priority selection (visual cards vs dropdown?)
- [ ] Category/subcategory hierarchical picker
- [ ] Draft auto-save indication

### 7.4 Attempt Management Screen

#### Missing UX Specs
- [ ] Attempt creation form
- [ ] Work notes rich text vs plain text
- [ ] Voice note record button and playback
- [ ] Parts used — product search picker
- [ ] Outcome selection (Resolved/Partial/Failed/Requires Revisit)
- [ ] Submit attempt confirmation dialog
- [ ] GPS capture on start/end of attempt

---

## 8. Lead Management Module 🟠

### 8.1 Lead List / Pipeline View

#### Missing UX Specs

| Gap | Severity |
|-----|----------|
| No Kanban board design spec | 🔴 Critical |
| No card design per pipeline stage | 🟠 High |
| No drag-and-drop between stages spec | 🟠 High |
| No list vs kanban toggle | 🟡 Medium |
| No lead score/rating display | 🟡 Medium |
| No "overdue follow-up" visual indicator | 🔴 Critical |
| No quick-action (call, email, schedule) from card | 🟠 High |

### 8.2 Lead Detail Screen

#### Missing UX Specs
- [ ] Contact card (phone/email with tap-to-call/email)
- [ ] Timeline / activity feed design
- [ ] Follow-up scheduling UI (date-time picker + type selection)
- [ ] Quotation mini-view embedded in lead
- [ ] GPS capture for visited location
- [ ] Document attachment inline view
- [ ] Stage progress stepper at top
- [ ] Duplicate warning banner

### 8.3 Create Lead Screen

#### Missing UX Specs
- [ ] OCR business card scanner UX (camera overlay, extraction preview)
- [ ] GPS capture auto-fill for location
- [ ] Source selection (dropdown vs chip selector)
- [ ] Campaign association picker

### 8.4 Follow-up Management

#### Missing UX Specs
- [ ] Calendar view of all follow-ups (color by type)
- [ ] Overdue follow-ups — distinct visual treatment
- [ ] Follow-up outcome capture form
- [ ] Reminder notification preview

### 8.5 Quotation in Customer Presentation Mode

#### Missing UX Specs
- [ ] Full-screen presentation layout (like a slide)
- [ ] Item-by-item swipe
- [ ] Customer signature capture at end
- [ ] Share PDF flow

---

## 9. Reports & Analytics Module 🟠

### 9.1 Dashboard Screen

#### Missing UX Specs

| Gap | Severity |
|-----|----------|
| No chart type per KPI (bar/line/donut?) | 🟠 High |
| No drill-down gesture (tap chart segment) | 🟠 High |
| No chart library selected (fl_chart? syncfusion?) | 🔴 Critical |
| No empty chart state design | 🟠 High |
| No swipe between dashboards animation | 🟡 Medium |
| No "last updated" timestamp | 🟡 Medium |
| No full-screen chart mode | 🟡 Medium |
| No threshold line on charts | 🟠 High |

### 9.2 Report Execution Screen

#### Missing UX Specs
- [ ] Parameter entry form for date range, filters
- [ ] Progress indicator for long-running reports
- [ ] Result table design (pagination vs infinite scroll)
- [ ] Sort by column gesture
- [ ] Export action in result screen

---

## 10. Notification Center 🟠

### Missing UX Specs

| Gap | Severity |
|-----|----------|
| No notification card design (icon + title + body + timestamp) | 🔴 Critical |
| No unread vs read visual distinction | 🔴 Critical |
| No category filter tabs (All/Attendance/Fault/Lead) | 🟠 High |
| No swipe-to-dismiss | 🟡 Medium |
| No deep-link navigation from notification card | 🔴 Critical |
| No bulk "Mark all as read" action | 🟡 Medium |
| No in-app notification overlay/banner design | 🔴 Critical |
| No notification grouping by date | 🟡 Medium |
| No empty state (no notifications) | 🟠 High |
| No notification badge count reset flow | 🟡 Medium |

---

## 11. Profile Screen 🟡

### Missing UX Specs
- [ ] Profile photo upload and crop UX
- [ ] Editable fields vs read-only fields distinction
- [ ] Section organization (Personal, Work, Security, Devices)
- [ ] Active session list with device icons and logout per device
- [ ] Login history table with location/device/time
- [ ] Change password flow within profile
- [ ] Biometric enrollment/removal UX
- [ ] App version + build number display
- [ ] Data usage / storage consumption display

---

## 12. Settings Screen 🟡

### Missing UX Specs
- [ ] Settings sections layout (grouped list vs accordion)
- [ ] Language picker UX (searchable list with flag icons)
- [ ] Theme toggle (System/Light/Dark) with live preview
- [ ] Notification preferences — per-channel toggle matrix
- [ ] GPS tracking mode selector (Always/While Using/Ask)
- [ ] Offline storage limit slider or selector
- [ ] Cache clear with confirmation dialog
- [ ] About / Legal section
- [ ] App update prompt UX

---

## 13. Offline Mode UX — Across All Screens 🔴

### Missing Globally

| Gap | Severity |
|-----|----------|
| No offline banner design (color, placement, animation) | 🔴 Critical |
| No sync queue progress indicator | 🔴 Critical |
| No conflict resolution dialog UX | 🟠 High |
| No "pending sync" badge on modified records | 🟠 High |
| No network recovery animation (banner dismisses with checkmark) | 🟡 Medium |
| No manual sync button placement (where in UI?) | 🟠 High |
| No "last synced at" timestamp display | 🟡 Medium |
| Which actions are disabled offline — never defined | 🔴 Critical |

### Recommendations
- **Amber offline banner** at top of every screen: "You're offline · 3 items pending sync"
- **Sync status chip** in app bar with count
- **Pendng-upload indicator** (dashed border / clock icon) on unsynced records
- **Conflict dialog** with side-by-side comparison and "Keep Mine / Keep Server" options

---

## 14. Empty States — Missing Across All Modules 🔴

Not a single module specifies empty state designs.

### Required Empty States Per Module

| Module | Empty State Needed |
|--------|-------------------|
| Dashboard | "You're all caught up today!" with quick-action CTA |
| Attendance History | "No attendance records" with start check-in CTA |
| Visits | "No visits assigned" with contact supervisor CTA |
| My Faults | "No faults assigned" with create fault CTA |
| Leads | "No leads assigned" with create lead CTA |
| Notifications | "You're all caught up 🎉" illustration |
| Reports | "No reports available" with access request CTA |
| Search Results | "No results for 'XYZ'" with suggest alternative |

### Design Pattern for Empty States
- Centered illustration (custom SVG or Lottie)
- Short headline (2–5 words)
- Subheading (1–2 sentences of context)
- Primary CTA button

---

## 15. Loading & Skeleton States — Missing Globally 🔴

### Recommendations
- **Shimmer skeleton** for every list screen on first load
- **Inline spinner** inside buttons during async operations (never block full screen unless mandatory)
- **Progress indicator** for file uploads (linear progress bar)
- **Chart loading** placeholder (grey box with pulse animation)
- **Pull-to-refresh** with branded spinner

---

## 16. Error States — Missing Globally 🔴

### Types Needed

| Error Type | UX Pattern |
|-----------|-----------|
| Network error | Full-screen error with retry button |
| 401/403 | Redirect to login with session expired message |
| 404 | In-context empty state |
| Server error (5xx) | Error card with retry + contact support link |
| GPS unavailable | Permission request overlay with settings deep-link |
| Camera/Mic denied | Permission banner with open settings CTA |
| Form validation | Inline field-level error messages |
| Sync conflict | Modal dialog with comparison |

---

## 17. Navigation & Information Architecture 🟠

### Missing UX Specs

| Gap | Severity |
|-----|----------|
| Bottom navigation vs drawer — which pattern? | 🔴 Critical |
| Bottom nav item count and labels not finalized | 🔴 Critical |
| No back navigation consistency spec | 🟠 High |
| No breadcrumb for deep nested flows | 🟡 Medium |
| No tab bar designs within modules | 🟠 High |
| No search bar placement consistency | 🟡 Medium |
| No swipe-back gesture specification | 🟡 Medium |
| No floating action button behavior during scroll | 🟡 Medium |

### Recommended Bottom Navigation Structure
```
[Home] [Attendance] [Visits/Faults] [More]
                               ↑ context by role
```
Or with a dynamic engine:
```
[Home] [Tasks] [GPS] [Reports] [Menu]
```
- Max 5 items in bottom nav
- Role-driven visibility via RBAC
- "More" drawer for secondary modules
- Badge counts on tabs for pending items

---

## 18. Micro-Animations & Transitions — Not Specified 🟡

### Required Specifications
- **Page transitions:** Slide-right for forward navigation, slide-left for back
- **Check-in success:** Lottie animation (checkmark + ripple)
- **Notification badge:** Scale animation on increment
- **Card tap:** Material ink splash + elevation change
- **FAB expand:** Radial expansion for speed dial
- **Loading shimmer:** Left-to-right gradient sweep
- **Sync complete:** Subtle tick animation on sync icon
- **Form submit:** Button shrink + spinner + expand back on result

---

## 19. Accessibility Gaps 🟠

### Missing Concretely (not just "WCAG mentioned")

| Requirement | Current State |
|------------|--------------|
| Minimum touch target: 48x48dp | Not specified |
| Color contrast ratio ≥ 4.5:1 (text) | Not specified |
| No focus indicator design for keyboard | Not specified |
| No semantic labels for icon-only buttons | Not specified |
| Screen reader announcements for state changes | Not specified |
| Dynamic font scaling — layout reflow strategy | Not specified |
| Announce live GPS status changes to screen reader | Not specified |

---

## 20. Missing Screens Not in Any Spec 🔴

These screens are implied by features but completely unspecified:

| Missing Screen | Why Critical |
|---------------|-------------|
| **Onboarding / Welcome Flow** (first launch) | Users need guidance on first use |
| **Permissions Request Flow** | GPS, Camera, Notification permissions UX |
| **Device Registration Screen** | Security flow for new device |
| **Session Expired Screen** | Clear feedback with re-login CTA |
| **Maintenance Mode Screen** | Backend downtime UX |
| **App Update Required Screen** | Force-update flow |
| **Leave Application Screen** | Mentioned in feature list, never specified |
| **Leave Balance Screen** | Leave calendar + balance breakdown |
| **Document Management Screen** | Upload/download/preview flows |
| **Sync Monitor Screen** | Detailed sync queue status |
| **Login History Screen** | Security — per session with device info |
| **Active Sessions Screen** | Manage concurrent sessions |
| **QR Scanner Screen** | Reusable across modules |
| **Signature Capture Screen** | Customer signature pad |
| **Customer OTP Verification Screen** | Delivery confirmation |
| **Announcement Detail Screen** | Full-screen announcement viewer |
| **Announcement List Screen** | Company/tenant announcements |
| **Productivity Dashboard Screen** | Daily/weekly/monthly KPIs |

---

## 21. Priority Matrix

### Critical (Must Fix Before MVP)
1. 🔴 Define concrete design tokens (colors, typography, spacing)
2. 🔴 Specify offline mode UX (banner, sync queue, conflicts)
3. 🔴 Design Check-In flow end-to-end with GPS/geofence visualization
4. 🔴 Specify all empty states and skeleton loaders
5. 🔴 Define bottom navigation structure
6. 🔴 Design error states for network, auth, and permission failures
7. 🔴 Add missing screens (Onboarding, Permissions, Session Expired, Leave, Documents)

### High Priority (Must Fix for Beta)
8. 🟠 Fault list with SLA traffic-light indicators
9. 🟠 Visit detail with active visit flow + evidence capture
10. 🟠 Lead Kanban board design
11. 🟠 Notification center with deep-link navigation
12. 🟠 Dashboard layout grid with widget priority ordering
13. 🟠 Reports dashboard with chart library selection

### Medium Priority (V1.1)
14. 🟡 Micro-animations and transitions
15. 🟡 Map replay for visit history
16. 🟡 Customer presentation mode for quotations
17. 🟡 Profile screen with session management
18. 🟡 Settings with offline storage management

---

## 22. Recommended Next Steps

| # | Action | Owner | Effort |
|---|--------|-------|--------|
| 1 | Define Material 3 design token sheet (colors, type, spacing) | Design Lead | 3 days |
| 2 | Create Figma wireframes for all Critical screens | UX Designer | 2 weeks |
| 3 | Build shared widget library (buttons, cards, inputs, empty states) | Flutter Lead | 1 week |
| 4 | Specify Check-In flow end-to-end with GPS states | UX + Flutter | 3 days |
| 5 | Define navigation architecture (bottom nav + drawer) | Architect | 1 day |
| 6 | Add missing screens to MOBILE_APP.md for each module | Tech Writer | 2 days |
| 7 | Create error + empty state design kit | Designer | 3 days |
| 8 | Select and integrate chart library for Reports | Flutter Dev | 2 days |
| 9 | Implement skeleton/shimmer loader component | Flutter Dev | 1 day |
| 10 | Define accessibility checklist per screen | QA | 3 days |

---

## Appendix: Screen Inventory

### Screens Specified (Partially)
✅ Login · ✅ Dashboard · ✅ Check-In/Out · ✅ Attendance History · ✅ Fault List · ✅ Fault Detail · ✅ Visit List · ✅ Visit Detail · ✅ Lead List · ✅ Lead Detail · ✅ Notification Center · ✅ Reports Dashboard · ✅ Profile · ✅ Settings

### Screens Missing or Unspecified 🔴
❌ Splash · ❌ Onboarding · ❌ Permissions Flow · ❌ Forgot Password · ❌ OTP Entry · ❌ Biometric Unlock · ❌ Session Expired · ❌ Device Registration · ❌ Maintenance Mode · ❌ App Update Required · ❌ Sync Monitor · ❌ Login History · ❌ Active Sessions · ❌ Leave Application · ❌ Leave Calendar · ❌ Leave Balance · ❌ Document Viewer · ❌ Document Upload · ❌ QR Scanner · ❌ Signature Pad · ❌ Customer OTP · ❌ Announcement List · ❌ Announcement Detail · ❌ Productivity KPIs · ❌ Offline Conflict Dialog · ❌ Break Management · ❌ Attendance Correction Status Tracker · ❌ Parts Used Entry · ❌ Voice Note Recorder · ❌ Customer Presentation Mode · ❌ Quotation Detail

---

*Generated: 2026-07-13 | PingForce Flutter App UI/UX Audit v1.0*
