# Dashboard / Home Screen — Complete UI/UX Specification

**Document:** DASHBOARD_SPEC.md  
**Module:** Core Platform — Home  
**Platform:** Flutter Mobile (Android 10+ / iOS 16+)  
**Version:** 1.0.0  
**Status:** Approved for Implementation

---

## 1. Purpose

This document defines the complete UI/UX specification for the PingForce Flutter Mobile **Dashboard (Home Screen)** — the first screen employees, field staff, and managers see after login. The dashboard is the operational command center of the application; everything visible must be immediately actionable, role-aware, and tenant-configurable.

---

## 2. Design Principles for the Dashboard

- **Context-first:** Show the most critical information for today, right now
- **Role-aware:** Every card, KPI, and action reflects the logged-in user's RBAC role
- **Module-driven:** Sections appear only if the tenant has the module licensed
- **Offline-resilient:** All sections work with cached data; degraded gracefully
- **Live data:** Attendance timer, sync badges, and notification counts update in real time
- **One thumb reach:** All primary actions within bottom half of screen

---

## 3. Screen Layout Overview

```
┌──────────────────────────────────────────┐
│  [Avatar] Good Morning, Ahmed 👋   [🔔3] │  ← Header
│  Monday, 13 July 2026                    │
│  ─────────────────────────────────────── │
│  [Offline banner — if offline]           │  ← Conditional
├──────────────────────────────────────────┤
│                                          │
│  ┌─ ATTENDANCE HERO CARD ─────────────┐ │  ← Always shown (if module on)
│  │  ● Checked In · 09:05 AM           │ │
│  │  ████████████████░░░░  3h 22m      │ │
│  │  [Start Break]     [Check Out]     │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ KPI SCROLL ROW ───────────────────┐ │  ← Horizontal scroll
│  │  [Attendance] [GPS] [Faults] [Leads]│ │  ← RBAC + module gated
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ QUICK ACTIONS GRID ───────────────┐ │  ← 2×N grid, RBAC gated
│  │  [Check In] [Report Fault]         │ │
│  │  [New Lead]  [View Team]           │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ TODAY'S ACTIVITY FEED ────────────┐ │  ← Recent events
│  │  • Fault #1032 assigned            │ │
│  │  • Lead "ACME Corp" updated        │ │
│  │  • Break ended at 12:45 PM         │ │
│  └─────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
│ [Home]  [Attendance] [GPS]  [More]  [☰] │  ← Bottom Nav (dynamic)
└──────────────────────────────────────────┘
```

---

## 4. Section Specifications

### 4.1 Header Section

**Layout:** Full-width, non-scrollable, part of SliverAppBar

```
Row:
  Left: [CircleAvatar 40dp] → opens Profile on tap
  Center (Expanded):
    Line 1: "Good [Morning/Afternoon/Evening], [FirstName] [Wave emoji]"
             Style: titleMedium, onSurface
    Line 2: "[Weekday], [D Month YYYY]"
             Style: bodySmall, onSurfaceVariant
  Right: [NotificationBell] with badge count
```

**Avatar states:**
- Has photo → network image with circular clip
- No photo → initials (first letter of first + last name), primary container background
- Loading → shimmer circle

**Greeting logic:**
| Time | Greeting |
|------|---------|
| 05:00 – 11:59 | Good Morning 🌅 |
| 12:00 – 16:59 | Good Afternoon ☀️ |
| 17:00 – 20:59 | Good Evening 🌆 |
| 21:00 – 04:59 | Good Night 🌙 |

**Notification Bell:**
- No unread: outline bell icon, no badge
- Unread > 0: filled bell, red badge with count (capped at "99+")
- Tap → navigates to Notifications screen

---

### 4.2 Attendance Hero Card

**Visibility:** Shown if `attendanceModule.enabled` AND user has `attendance.view` permission.

**States:**

#### State A — Not Checked In (default start of day)
```
┌──────────────────────────────────────────┐
│  ○ Not Checked In                        │  ← labelMedium, onSurfaceVariant
│                                          │
│  Morning Shift  09:00 – 18:00           │  ← titleSmall
│  Starts in: 01:23:45                    │  ← numericSmall countdown
│                                          │
│  [        Check In Now        ]         │  ← FilledButton, primary
└──────────────────────────────────────────┘
```

#### State B — Checked In / Working
```
┌──────────────────────────────────────────┐
│  ● Working                      On Time │  ← status + shift status chip
│                                          │
│  Checked In:  09:05 AM                  │  ← bodySmall + timestamp
│  Working:     3:22:15 ↑ (live)         │  ← numericMedium, live timer
│                                          │
│  ██████████████████░░░░░░░░░░░          │  ← shift progress bar
│  09:00               18:00             │  ← start / end labels
│                                          │
│  [  Start Break  ]    [  Check Out  ]  │  ← tonal + filled buttons
└──────────────────────────────────────────┘
```

#### State C — On Break
```
│  ☕ On Break                   On Time  │
│  Break started: 12:30 PM               │
│  Break duration: 00:12:05 ↑ (live)    │  ← numericMedium, amber color
│  [        Resume Work        ]         │  ← secondary button
```

#### State D — Checked Out
```
│  ✓ Checked Out             Completed   │
│  09:05 AM → 18:02 PM                  │
│  Total: 8h 57m  |  Breaks: 2         │
│  Overtime: 0h                          │
│  [    View Full Attendance    ]        │  ← TextButton
```

#### State E — Absent / Not Required
```
│  ✗ No Attendance Today                 │
│  (Leave / Holiday / Day Off)           │
│  [    Request Correction    ]          │  ← if policy allows
```

**Card design:**
- Background: gradient from `primaryContainer` (left) to `surfaceContainerLowest` (right)
- Border: none
- Radius: `AppRadius.lg` (16dp)
- Elevation: `AppElevation.level1`
- Padding: `AppSpacing.cardPadding` (16dp)
- Left accent: 4dp primary color bar

**Progress bar spec:**
- Height: 6dp
- Radius: `AppRadius.pill`
- Track: `primaryContainer`
- Fill: `primary`
- Fill fraction: `elapsedMinutes / totalShiftMinutes`
- Animated: smooth update every 60s

---

### 4.3 KPI Cards Row (Horizontal Scroll)

**Layout:** Horizontal `ListView`, `scrollDirection: Axis.horizontal`, no padding ends  
**Visibility:** Each card shown only if corresponding module is enabled and user has view permission  
**Height:** 120dp per card  
**Width:** 150dp per card  
**Gap between cards:** `AppSpacing.cardMargin` (12dp)

**Generic KPI Card structure:**
```
┌────────────────────┐
│  [Icon 24dp]  [→] │  ← icon left, arrow right
│                    │
│  42                │  ← numericMedium (value)
│  Faults Open       │  ← labelMedium (label)
│                    │
│  ▲ 3 today         │  ← bodySmall (delta/trend)
└────────────────────┘
```

**Module KPI cards:**

| Module | Card Title | Primary Metric | Secondary Metric | Icon | Trend Color |
|--------|-----------|----------------|-----------------|------|------------|
| Attendance (Employee) | Today's Attendance | Status badge (Present/Absent/Late) | Hours worked | `fingerprint` | N/A |
| Attendance (Manager) | Team Attendance | `24/30` Present | `3 Late · 3 Absent` | `groups` | statusSuccess/Critical |
| GPS/Visits | Visits Today | Count of visits | Next visit time | `location_on` | primary |
| Faults | Open Faults | Count | Overdue count (red) | `build_circle` | statusCritical |
| Leads | Active Leads | Count | Follow-ups due | `person_search` | primary |
| Reports | Pending Reports | Count of drafts | Last generated | `bar_chart` | onSurfaceVariant |
| Notifications | Unread | Count | Today's alerts | `notifications` | error |

**KPI Card color states:**

| Value condition | Background | Value color |
|----------------|-----------|-------------|
| Zero / All good | `surfaceContainerLowest` | `onSurface` |
| Has items | `surfaceContainerLowest` | `primary` |
| Warning (e.g. overdue > 0) | `statusWarningContainer` | `statusWarning` |
| Critical | `statusCriticalContainer` | `statusCritical` |
| Loading | Shimmer | — |

**Tap action:** Each card navigates to the relevant module list screen.

---

### 4.4 Quick Actions Grid

**Layout:** 2-column grid, each cell 80dp tall  
**Visibility:** Each action shown only if user has required permission  
**Max items:** 8 (scrollable down if more)

**Action definitions:**

| Action | Icon | Label | Required Permission | Navigate to |
|--------|------|-------|--------------------|-----------  |
| Check In | `login` | Check In | `attendance.checkin` | `/attendance` |
| Check Out | `logout` | Check Out | `attendance.checkout` (active session) | `/attendance` |
| Start Break | `coffee` | Start Break | `attendance.break` (active session) | `/attendance` |
| Report Fault | `report_problem` | Report Fault | `faults.create` | `/faults/new` |
| New Lead | `person_add` | New Lead | `leads.create` | `/leads/new` |
| View Team | `groups` | View Team | `team.view` | `/team` |
| GPS Visit | `map` | Log Visit | `visits.create` | `/visits/new` |
| Request Leave | `event_busy` | Request Leave | `leave.create` | `/leave/new` |
| My Reports | `bar_chart` | Reports | `reports.view` | `/reports` |
| Documents | `folder` | Documents | `documents.view` | `/documents` |

**Action cell design:**
```
Container: surfaceContainerLow bg, lgAll radius, 1px outlineVariant border
Tap effect: Scale 0.96 → ripple → navigate
  ┌─────────────────┐
  │                 │
  │  [Icon 28dp]    │  ← Centered, primary color
  │  Label          │  ← labelMedium, centered, onSurface
  │                 │
  └─────────────────┘
```

**Highlight states:**
- If `Check In` is most urgent (not yet checked in, shift starting soon): primary container bg + bold label
- If `Check Out` (active session, shift ending in < 30min): secondary container bg
- Active session actions (Break/Out): available, prominent

---

### 4.5 Today's Activity Feed

**Layout:** Vertical list, max 8 items shown on dashboard, "View All" link at bottom  
**Visibility:** Shown if any of: attendance events, fault events, lead events exist for today  
**Data source:** Aggregated from all enabled modules, sorted by timestamp DESC

**Feed item types:**

| Type | Icon | Color | Format |
|------|------|-------|--------|
| Check-In | `login` | primary | "Checked in at 09:05 AM" |
| Check-Out | `logout` | onSurfaceVariant | "Checked out at 06:02 PM" |
| Break Start | `coffee` | statusWarning | "Break started at 12:30 PM" |
| Break End | `coffee` | statusSuccess | "Break ended at 01:00 PM" |
| Fault Created | `report_problem` | statusWarning | "Fault #1032 reported" |
| Fault Assigned | `build_circle` | primary | "Fault #1032 assigned to you" |
| Fault Resolved | `check_circle` | statusSuccess | "Fault #1029 resolved" |
| Fault Overdue | `error` | statusCritical | "Fault #1028 is overdue" |
| Lead Created | `person_add` | primary | "New lead: ACME Corp" |
| Lead Updated | `person_search` | onSurfaceVariant | "Lead updated: ACME Corp" |
| Lead Won | `emoji_events` | statusSuccess | "Lead won: ACME Corp" |
| Visit Logged | `location_on` | tertiary | "Visit logged at Client HQ" |
| Sync Completed | `cloud_done` | statusSuccess | "X records synced" |
| Notification | `notifications` | primary | Notification title |

**Feed item layout:**
```
Row:
  [Icon 20dp in colored circle 36dp] | [Column: title (bodyMedium) / timestamp (labelSmall, onSurfaceVariant)]
  Separated by thin Divider
```

**Empty state:**
```
Center column:
  Icon: `inbox` (48dp, onSurfaceVariant)
  Text: "No activity today"
  SubText: "Your actions will appear here"
```

---

### 4.6 Sync Status Row

**Visibility:** Show only when there are pending sync items  
**Layout:** Full-width row just above the activity feed

```
Container (infoContainer bg, 8dp radius):
  Row:
    [sync_rounded icon, rotating animation if syncing]
    "3 records pending sync"  OR  "Syncing..."  OR  "All synced"
    [spacer]
    [Sync Now] TextButton — only if offline records pending
```

---

## 5. Bottom Navigation Bar

**Spec:** Material 3 NavigationBar, RBAC + module driven

**Default destination order:**
1. Home (always visible)
2. Attendance (if module enabled)
3. GPS / Visits (if module enabled) OR Faults (if visits disabled)
4. More / Menu (always — overflow for other modules)

**If user has ≥ 5 modules:** Show 4 icons + "More" drawer  
**If user has ≤ 4 modules:** Show all icons, no "More"

**"More" bottom sheet:**
- Title: "More"
- Grid of remaining module tiles (same style as quick actions)
- My Profile, Settings, Help, Logout at bottom

---

## 6. Loading States — Dashboard

| Section | Loading Pattern | Duration |
|---------|----------------|---------|
| Header | Skeleton: 40dp circle + 2 lines | Until auth data loads |
| Attendance Hero | Full-card shimmer skeleton | Until attendance API |
| KPI Row | 3× shimmer cards | Until metrics API |
| Quick Actions | 4× grey rectangle cells | Until permissions load |
| Activity Feed | 5× row shimmer skeletons | Until feed API |

**Staggered loading strategy:**
1. Header renders immediately (from cached auth)
2. Attendance card renders (from cached session)
3. KPI cards stream in L→R as data arrives
4. Quick actions render from RBAC (instant after auth)
5. Activity feed loads last (heaviest query)

---

## 7. Empty States

| Section | Empty Condition | Message |
|---------|----------------|---------|
| KPI row | No modules enabled | "No modules configured. Contact your admin." |
| Quick Actions | No permissions | "No actions available for your role." |
| Activity Feed | No events today | "No activity today" |
| Attendance (no shift) | No shift assigned | "No shift assigned. Contact your manager." |

---

## 8. Refresh

- **Pull to refresh:** `RefreshIndicator` wrapping the scroll view
- **Interval auto-refresh:** Every 5 minutes in foreground
- **App resume refresh:** On `AppLifecycleState.resumed`
- **Refresh animation:** `CircularProgressIndicator` (primary color, 20dp)

---

## 9. Notification Badge Rules

| Badge | Source | Update |
|-------|--------|--------|
| Bell in header | Unread notification count | Real-time (SSE/WebSocket) or 5-min poll |
| Attendance KPI | Late count | Per attendance sync |
| Faults KPI | Overdue count | Per fault sync |
| Bottom nav icons | Module-specific | From respective module sync |

---

## 10. Scroll Behavior

- **SliverAppBar:** Pinned app bar (does not scroll away), collapsing header
- **Header collapses on scroll:** Greeting shrinks to just name + bell
- **Scroll snap:** None (free scroll)
- **Over-scroll bounce:** iOS: natural; Android: glow effect
- **Scroll restoration:** Position preserved on tab switch

---

## 11. Manager-Specific Dashboard Additions

If role is Manager or above, add after Attendance Hero:

**Team Status Summary Card:**
```
┌─────────────────────────────────────────┐
│  Team (12 members)          View All →  │
│                                         │
│  ●●●●●●●●●●●●  Present  9              │
│  ○○            Absent   2              │
│  ◐◐            Late     1              │
└─────────────────────────────────────────┘
```

- Dots are colored avatars (or initials circles) of team members
- Present: green dot, Absent: red dot, Late: amber dot
- Tap → Team Attendance screen

---

## 12. Animations Reference

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Screen entry | Fade + slide from bottom | 300ms | `emphasized` |
| Header greeting | Fade in | 200ms | `decelerate` |
| Attendance card | Slide in from top | 250ms | `decelerate` |
| KPI cards | Staggered slide in L→R | 150ms each, 50ms delay | `decelerate` |
| Quick action cells | Staggered fade in | 100ms each, 30ms delay | `decelerate` |
| Activity items | Staggered slide from right | 80ms each, 20ms delay | `decelerate` |
| Shift progress bar | Animate fill width on load | 800ms | `standard` |
| Attendance timer | Tick update | 1s | immediate |
| Pull-to-refresh | Native RefreshIndicator | — | — |
| Notification badge | Scale pop on increment | 200ms | `spring` |
| Action cell tap | Scale 1.0 → 0.95 → 1.0 | 180ms | combined |
| Shimmer sweep | Continuous | 1200ms | `linear` |

---

## 13. Accessibility

| Requirement | Implementation |
|------------|---------------|
| Greeting | `Semantics(header: true, label: "Good morning Ahmed")` |
| Attendance card | `liveRegion: true` for the timer text |
| KPI cards | Semantic label includes trend: "42 open faults, 3 overdue today" |
| Quick actions | `tooltip` + `semanticLabel` on every cell |
| Activity feed | Each item has full descriptive label |
| Notification bell | "Notifications, 3 unread" |
| Bottom nav | Existing NavigationBar semantics |

---

## 14. Performance Targets

| Target | Value |
|--------|-------|
| Screen interactive (from cache) | < 400ms |
| Screen interactive (fresh load) | < 1200ms |
| Scroll frame rate | 60fps (no jank) |
| KPI card count that triggers pagination | 6+ |
| Activity feed initial page size | 8 items |
| Background refresh interval | 5 minutes |

---

*End of Dashboard Specification v1.0*
