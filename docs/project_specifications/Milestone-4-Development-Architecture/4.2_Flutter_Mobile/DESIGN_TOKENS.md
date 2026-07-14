# PingForce – Flutter Mobile Design Token Specification

**Document:** DESIGN_TOKENS.md  
**Version:** 1.0.0  
**Status:** Approved for Implementation  
**Material Design Version:** Material 3 (Material You)

---

## 1. Purpose

This document defines the complete, concrete, implementation-ready design token system for the PingForce Flutter Mobile Application. All UI widgets, screens, and components across every feature module SHALL consume these tokens. No hardcoded color, font size, spacing, radius, shadow, or animation value is permitted outside this specification.

---

## 2. Brand Identity Context

PingForce is an enterprise-grade, mobile-first workforce management platform for field staff, technicians, sales agents, and managers. The design language must:

- Convey **trust, clarity, and reliability** (enterprise professionals)
- Be **highly readable outdoors** in direct sunlight (field workers)
- Support **multi-tenant white-label** branding via runtime token overrides
- Work **equally well in Light and Dark mode**
- Meet **WCAG 2.1 AA** contrast standards as a minimum

---

## 3. Color System

### 3.1 Brand Palette – Seed Color

The Material 3 color scheme is derived from a primary seed color.

| Token            | Value     | Notes                |
| ---------------- | --------- | -------------------- |
| `seed.primary`   | `#1B72E8` | PingForce Brand Blue |
| `seed.secondary` | `#F57C00` | Action Orange        |
| `seed.tertiary`  | `#00897B` | Status Teal          |

> **Implementation:** Use `ColorScheme.fromSeed(seedColor: Color(0xFF1B72E8))` as the base, then override secondary and tertiary with the values below.

---

### 3.2 Light Theme Color Scheme

#### Primary – Brand Blue

| Token                      | Hex       | Usage                                    |
| -------------------------- | --------- | ---------------------------------------- |
| `color.primary`            | `#1B72E8` | Primary buttons, active nav, key actions |
| `color.onPrimary`          | `#FFFFFF` | Text/icons on primary                    |
| `color.primaryContainer`   | `#D3E4FF` | Chips, highlights, selection background  |
| `color.onPrimaryContainer` | `#001D4A` | Text/icons on primaryContainer           |
| `color.primaryFixed`       | `#D3E4FF` | Fixed across themes                      |
| `color.primaryFixedDim`    | `#A3C5FF` | Dimmed fixed                             |

#### Secondary – Action Orange

| Token                        | Hex       | Usage                                      |
| ---------------------------- | --------- | ------------------------------------------ |
| `color.secondary`            | `#F57C00` | FABs, CTAs, check-in button, quick actions |
| `color.onSecondary`          | `#FFFFFF` | Text/icons on secondary                    |
| `color.secondaryContainer`   | `#FFE0B2` | Selected tabs, badge backgrounds           |
| `color.onSecondaryContainer` | `#3E1900` | Text/icons on secondaryContainer           |

#### Tertiary – Status Teal

| Token                       | Hex       | Usage                                      |
| --------------------------- | --------- | ------------------------------------------ |
| `color.tertiary`            | `#00897B` | GPS active, online status, success accents |
| `color.onTertiary`          | `#FFFFFF` | Text/icons on tertiary                     |
| `color.tertiaryContainer`   | `#B2DFDB` | Attendance summary cards                   |
| `color.onTertiaryContainer` | `#002420` | Text/icons on tertiaryContainer            |

#### Surface & Background

| Token                           | Hex       | Usage                            |
| ------------------------------- | --------- | -------------------------------- |
| `color.surface`                 | `#FAFCFF` | Main app background              |
| `color.onSurface`               | `#1A1C1E` | Primary text                     |
| `color.surfaceVariant`          | `#E1E9F4` | Card backgrounds, input fills    |
| `color.onSurfaceVariant`        | `#44474F` | Secondary text, placeholder text |
| `color.surfaceDim`              | `#D9DBE0` | Disabled surfaces                |
| `color.surfaceBright`           | `#FAFCFF` | Elevated surfaces                |
| `color.surfaceContainerLowest`  | `#FFFFFF` | Bottom sheets, cards on surface  |
| `color.surfaceContainerLow`     | `#F3F6FB` | App bar, nav bar background      |
| `color.surfaceContainer`        | `#EDF1F6` | Input backgrounds                |
| `color.surfaceContainerHigh`    | `#E7ECF1` | Modal backgrounds                |
| `color.surfaceContainerHighest` | `#E1E6EB` | Chip/badge background            |
| `color.background`              | `#FAFCFF` | Root scaffold                    |
| `color.onBackground`            | `#1A1C1E` | Root scaffold text               |

#### Outline & Divider

| Token                  | Hex       | Usage                        |
| ---------------------- | --------- | ---------------------------- |
| `color.outline`        | `#74777F` | Input borders, card outlines |
| `color.outlineVariant` | `#C4C7CF` | Dividers, subtle borders     |

#### Error

| Token                    | Hex       | Usage                            |
| ------------------------ | --------- | -------------------------------- |
| `color.error`            | `#B3261E` | Error state, validation errors   |
| `color.onError`          | `#FFFFFF` | Text on error                    |
| `color.errorContainer`   | `#F9DEDC` | Error banners, alert backgrounds |
| `color.onErrorContainer` | `#410E0B` | Text on error container          |

---

### 3.3 Dark Theme Color Scheme

| Token                                | Hex       | Notes                    |
| ------------------------------------ | --------- | ------------------------ |
| `color.dark.primary`                 | `#A3C5FF` | Lighter blue for dark bg |
| `color.dark.onPrimary`               | `#002E6E` |                          |
| `color.dark.primaryContainer`        | `#004399` |                          |
| `color.dark.onPrimaryContainer`      | `#D3E4FF` |                          |
| `color.dark.secondary`               | `#FFBA78` | Lighter orange           |
| `color.dark.onSecondary`             | `#4A2800` |                          |
| `color.dark.secondaryContainer`      | `#6B3A00` |                          |
| `color.dark.onSecondaryContainer`    | `#FFE0B2` |                          |
| `color.dark.tertiary`                | `#80CBC4` | Lighter teal             |
| `color.dark.onTertiary`              | `#00403A` |                          |
| `color.dark.tertiaryContainer`       | `#005F56` |                          |
| `color.dark.onTertiaryContainer`     | `#B2DFDB` |                          |
| `color.dark.surface`                 | `#111318` |                          |
| `color.dark.onSurface`               | `#E2E2E9` |                          |
| `color.dark.surfaceVariant`          | `#44474F` |                          |
| `color.dark.onSurfaceVariant`        | `#C4C7CF` |                          |
| `color.dark.surfaceContainerLowest`  | `#0C0F14` |                          |
| `color.dark.surfaceContainerLow`     | `#191C22` |                          |
| `color.dark.surfaceContainer`        | `#1E2026` |                          |
| `color.dark.surfaceContainerHigh`    | `#282B31` |                          |
| `color.dark.surfaceContainerHighest` | `#33363C` |                          |
| `color.dark.outline`                 | `#8E9099` |                          |
| `color.dark.outlineVariant`          | `#44474F` |                          |
| `color.dark.error`                   | `#F2B8B5` |                          |
| `color.dark.onError`                 | `#601410` |                          |
| `color.dark.errorContainer`          | `#8C1D18` |                          |
| `color.dark.onErrorContainer`        | `#F9DEDC` |                          |

---

### 3.4 Semantic Status Colors

These tokens communicate state across all modules and SHALL NOT be replaced with generic colors.

| Token                      | Light Hex | Dark Hex  | Usage                                         |
| -------------------------- | --------- | --------- | --------------------------------------------- |
| `status.success`           | `#2E7D32` | `#81C784` | Check-in success, sync complete, GPS valid    |
| `status.onSuccess`         | `#FFFFFF` | `#1B5E20` | Text on success                               |
| `status.successContainer`  | `#E8F5E9` | `#1B5E20` | Success banners, completed states             |
| `status.warning`           | `#E65100` | `#FFB74D` | SLA warning, late check-in, GPS poor accuracy |
| `status.onWarning`         | `#FFFFFF` | `#3E2723` | Text on warning                               |
| `status.warningContainer`  | `#FFF3E0` | `#4E2900` | Warning banners                               |
| `status.critical`          | `#C62828` | `#EF9A9A` | SLA breach, overdue, escalated                |
| `status.onCritical`        | `#FFFFFF` | `#7F0000` | Text on critical                              |
| `status.criticalContainer` | `#FFEBEE` | `#7F0000` | Critical alerts                               |
| `status.info`              | `#0277BD` | `#80DEEA` | Informational alerts, sync queue              |
| `status.onInfo`            | `#FFFFFF` | `#002F3A` | Text on info                                  |
| `status.infoContainer`     | `#E1F5FE` | `#00344A` | Info banners                                  |
| `status.offline`           | `#616161` | `#9E9E9E` | Offline indicator                             |
| `status.offlineContainer`  | `#F5F5F5` | `#424242` | Offline banner background                     |

---

### 3.5 SLA Traffic Light Colors

Used exclusively in Fault Management and Visit Management for SLA indication.

| Token                   | Hex       | Meaning                     |
| ----------------------- | --------- | --------------------------- |
| `sla.healthy`           | `#2E7D32` | > 50% SLA time remaining    |
| `sla.warning`           | `#F57C00` | 10–50% SLA time remaining   |
| `sla.breached`          | `#C62828` | SLA breached                |
| `sla.healthyContainer`  | `#E8F5E9` | Background for healthy SLA  |
| `sla.warningContainer`  | `#FFF3E0` | Background for warning SLA  |
| `sla.breachedContainer` | `#FFEBEE` | Background for breached SLA |

---

### 3.6 GPS Accuracy Colors

Used in GPS-related features (Check-In, Visit, Location Status).

| Token                 | Hex                   | Accuracy Range                 |
| --------------------- | --------------------- | ------------------------------ |
| `gps.excellent`       | `#2E7D32`             | < 10m accuracy                 |
| `gps.good`            | `#558B2F`             | 10–25m accuracy                |
| `gps.fair`            | `#F57C00`             | 25–50m accuracy                |
| `gps.poor`            | `#C62828`             | > 50m accuracy                 |
| `gps.unavailable`     | `#757575`             | GPS disabled or no signal      |
| `gps.geofenceInside`  | `rgba(46,125,50,0.2)` | Geofence circle fill (inside)  |
| `gps.geofenceOutside` | `rgba(198,40,40,0.2)` | Geofence circle fill (outside) |

---

## 4. Typography System

### 4.1 Font Family

| Role                 | Font                      | Fallback               |
| -------------------- | ------------------------- | ---------------------- |
| Primary (All UI)     | `Inter`                   | `Roboto`, `sans-serif` |
| Numeric / Data       | `Inter` (tabular numbers) | `Roboto Mono`          |
| Monospace (Code/IDs) | `JetBrains Mono`          | `Courier New`          |

> **Implementation:** Import `Inter` and `JetBrains Mono` from Google Fonts via the `google_fonts` package.

---

### 4.2 Type Scale — Material 3

All sizes in logical pixels (dp). Line heights are multipliers.

#### Display (Hero content, splash screens)

| Token                | Size | Weight | Line Height | Letter Spacing | Usage                |
| -------------------- | ---- | ------ | ----------- | -------------- | -------------------- |
| `type.displayLarge`  | 57dp | 400    | 1.12        | -0.25          | Splash branding only |
| `type.displayMedium` | 45dp | 400    | 1.16        | 0              | Large number KPIs    |
| `type.displaySmall`  | 36dp | 400    | 1.22        | 0              | Report totals        |

#### Headline (Section headers, screen titles)

| Token                 | Size | Weight | Line Height | Letter Spacing | Usage                      |
| --------------------- | ---- | ------ | ----------- | -------------- | -------------------------- |
| `type.headlineLarge`  | 32dp | 600    | 1.25        | 0              | Screen main titles         |
| `type.headlineMedium` | 28dp | 600    | 1.29        | 0              | Section headers            |
| `type.headlineSmall`  | 24dp | 600    | 1.33        | 0              | Card titles, dialog titles |

#### Title (Component headers, list items)

| Token              | Size | Weight | Line Height | Letter Spacing | Usage                      |
| ------------------ | ---- | ------ | ----------- | -------------- | -------------------------- |
| `type.titleLarge`  | 22dp | 600    | 1.27        | 0              | App bar title, module name |
| `type.titleMedium` | 16dp | 600    | 1.50        | 0.15           | List item primary text     |
| `type.titleSmall`  | 14dp | 600    | 1.43        | 0.1            | Card label, tab text       |

#### Body (Content, descriptions)

| Token             | Size | Weight | Line Height | Letter Spacing | Usage                         |
| ----------------- | ---- | ------ | ----------- | -------------- | ----------------------------- |
| `type.bodyLarge`  | 16dp | 400    | 1.50        | 0.5            | Primary body text, input text |
| `type.bodyMedium` | 14dp | 400    | 1.43        | 0.25           | Secondary body text           |
| `type.bodySmall`  | 12dp | 400    | 1.33        | 0.4            | Helper text, timestamps       |

#### Label (Buttons, chips, metadata)

| Token              | Size | Weight | Line Height | Letter Spacing | Usage                   |
| ------------------ | ---- | ------ | ----------- | -------------- | ----------------------- |
| `type.labelLarge`  | 14dp | 600    | 1.43        | 0.1            | Button text, nav labels |
| `type.labelMedium` | 12dp | 500    | 1.33        | 0.5            | Chip text, badge text   |
| `type.labelSmall`  | 11dp | 500    | 1.45        | 0.5            | Caption, micro-labels   |

#### Numeric (KPI displays, timers, counters)

| Token                | Size | Weight | Line Height | Feature      | Usage                        |
| -------------------- | ---- | ------ | ----------- | ------------ | ---------------------------- |
| `type.numericHero`   | 48dp | 700    | 1.0         | tabular-nums | Dashboard KPI hero number    |
| `type.numericLarge`  | 32dp | 700    | 1.1         | tabular-nums | SLA countdown, session timer |
| `type.numericMedium` | 24dp | 600    | 1.2         | tabular-nums | Card metrics                 |
| `type.numericSmall`  | 16dp | 600    | 1.3         | tabular-nums | Inline stats                 |

---

### 4.3 Font Weight Reference

| Weight Name | Value |
| ----------- | ----- |
| Regular     | 400   |
| Medium      | 500   |
| SemiBold    | 600   |
| Bold        | 700   |
| ExtraBold   | 800   |

---

## 5. Spacing System

### 5.1 Base Grid: 4dp

All spacing values are multiples of **4dp**.

| Token      | Value | CSS Equivalent | Usage                                         |
| ---------- | ----- | -------------- | --------------------------------------------- |
| `space.0`  | 0dp   | —              | Zero gap                                      |
| `space.1`  | 4dp   | 4px            | Micro gap (icon + label)                      |
| `space.2`  | 8dp   | 8px            | Tight spacing (badge padding, chip inner)     |
| `space.3`  | 12dp  | 12px           | Small component padding                       |
| `space.4`  | 16dp  | 16px           | **Default padding** (card content, list item) |
| `space.5`  | 20dp  | 20px           | Input internal vertical padding               |
| `space.6`  | 24dp  | 24px           | Section gap, card margin                      |
| `space.8`  | 32dp  | 32px           | Large section gap                             |
| `space.10` | 40dp  | 40px           | Screen horizontal margin (max)                |
| `space.12` | 48dp  | 48px           | Large vertical rhythm                         |
| `space.16` | 64dp  | 64px           | Hero sections                                 |
| `space.20` | 80dp  | 80px           | Bottom nav safe area                          |

### 5.2 Named Semantic Spacing

| Token                      | Value | Usage                            |
| -------------------------- | ----- | -------------------------------- |
| `spacing.screenHorizontal` | 16dp  | Screen edge padding (left/right) |
| `spacing.screenVertical`   | 16dp  | Screen top/bottom padding        |
| `spacing.cardPadding`      | 16dp  | Inside card padding              |
| `spacing.cardMargin`       | 12dp  | Between cards                    |
| `spacing.sectionGap`       | 24dp  | Between sections                 |
| `spacing.inputVertical`    | 16dp  | Input field vertical padding     |
| `spacing.inputHorizontal`  | 16dp  | Input field horizontal padding   |
| `spacing.buttonHorizontal` | 24dp  | Button horizontal padding        |
| `spacing.buttonVertical`   | 14dp  | Button vertical padding          |
| `spacing.chipPaddingH`     | 12dp  | Chip horizontal padding          |
| `spacing.chipPaddingV`     | 6dp   | Chip vertical padding            |
| `spacing.listItemPadding`  | 16dp  | List item padding                |
| `spacing.iconGap`          | 8dp   | Gap between icon and label       |
| `spacing.fabMargin`        | 16dp  | FAB from screen edges            |
| `spacing.bottomNavHeight`  | 80dp  | Bottom nav total height          |
| `spacing.appBarHeight`     | 64dp  | App bar height                   |
| `spacing.minTouchTarget`   | 48dp  | Minimum tappable area            |

---

## 6. Border Radius System

| Token         | Value | Usage                                |
| ------------- | ----- | ------------------------------------ |
| `radius.none` | 0dp   | Sharp corners (dividers)             |
| `radius.xs`   | 4dp   | Small chips, badges, tags            |
| `radius.sm`   | 8dp   | Input fields, small cards            |
| `radius.md`   | 12dp  | Cards, bottom sheets (inner content) |
| `radius.lg`   | 16dp  | Primary cards, dialogs               |
| `radius.xl`   | 24dp  | Large cards, containers              |
| `radius.xxl`  | 28dp  | Bottom sheet (top corners)           |
| `radius.pill` | 999dp | Buttons, FABs, status chips          |
| `radius.full` | 50%   | Avatars, circular icons              |

---

## 7. Elevation & Shadow System

Material 3 uses tonal surface elevation with optional shadows.

| Token              | Level | Shadow   | Usage                            |
| ------------------ | ----- | -------- | -------------------------------- |
| `elevation.level0` | 0dp   | None     | Flat surface (background)        |
| `elevation.level1` | 1dp   | Subtle   | Cards at rest, navigation bar    |
| `elevation.level2` | 3dp   | Light    | Raised cards, action chips       |
| `elevation.level3` | 6dp   | Medium   | FAB, dialogs, bottom sheets      |
| `elevation.level4` | 8dp   | Elevated | Modal dialogs                    |
| `elevation.level5` | 12dp  | High     | Search suggestions, date pickers |

### Shadow Definitions (Light Mode)

```
level1: BoxShadow(color: rgba(0,0,0,0.08), blurRadius: 4, offset: Offset(0,1))
level2: BoxShadow(color: rgba(0,0,0,0.10), blurRadius: 8, offset: Offset(0,2))
level3: BoxShadow(color: rgba(0,0,0,0.12), blurRadius: 16, offset: Offset(0,4))
level4: BoxShadow(color: rgba(0,0,0,0.14), blurRadius: 24, offset: Offset(0,6))
level5: BoxShadow(color: rgba(0,0,0,0.16), blurRadius: 32, offset: Offset(0,8))
```

> In Dark Mode: reduce shadow opacity by 50%.

---

## 8. Animation & Motion System

### 8.1 Duration Tokens

| Token                | Duration | Usage                                       |
| -------------------- | -------- | ------------------------------------------- |
| `animation.instant`  | 0ms      | No animation (accessibility reduced motion) |
| `animation.fast`     | 100ms    | Micro interactions (button press, checkbox) |
| `animation.normal`   | 200ms    | State changes (card expand, chip select)    |
| `animation.medium`   | 300ms    | Screen transitions, bottom sheet            |
| `animation.slow`     | 450ms    | Complex transitions, shared elements        |
| `animation.verySlow` | 600ms    | Lottie intros, splash animations            |

### 8.2 Easing Curves

| Token               | Curve                             | Usage                               |
| ------------------- | --------------------------------- | ----------------------------------- |
| `easing.standard`   | `Curves.easeInOut`                | General transitions                 |
| `easing.decelerate` | `Curves.easeOut`                  | Elements entering screen            |
| `easing.accelerate` | `Curves.easeIn`                   | Elements leaving screen             |
| `easing.emphasized` | `Curves.easeInOutCubicEmphasized` | M3 emphasized transitions           |
| `easing.spring`     | `Curves.elasticOut`               | Success animations, bouncy feedback |
| `easing.linear`     | `Curves.linear`                   | Progress bars, shimmer              |

### 8.3 Transition Specifications

| Transition          | Duration | Easing       | Notes                    |
| ------------------- | -------- | ------------ | ------------------------ |
| Page forward (push) | 300ms    | `emphasized` | Slide from right         |
| Page back (pop)     | 250ms    | `decelerate` | Slide to right           |
| Bottom sheet open   | 350ms    | `emphasized` | Slide up + fade          |
| Bottom sheet close  | 250ms    | `accelerate` | Slide down + fade        |
| Dialog open         | 200ms    | `decelerate` | Scale 0.85→1.0 + fade    |
| Dialog close        | 150ms    | `accelerate` | Scale 1.0→0.85 + fade    |
| Tab switch          | 200ms    | `standard`   | Fade cross-dissolve      |
| Card expand         | 300ms    | `emphasized` | Height animation         |
| Snackbar enter      | 200ms    | `decelerate` | Slide up                 |
| Snackbar exit       | 150ms    | `accelerate` | Slide down               |
| Check-in success    | 600ms    | `spring`     | Lottie checkmark + scale |
| Shimmer sweep       | 1200ms   | `linear`     | Repeating                |
| FAB expand          | 200ms    | `emphasized` | Scale + rotate           |

---

## 9. Icon System

### 9.1 Icon Library

**Primary:** Material Symbols (Rounded variant)  
**Package:** `material_symbols_icons` (Flutter package)  
**Style:** Rounded (friendlier for mobile workforce app)  
**Fill:** Unfilled by default; filled for active/selected state

### 9.2 Icon Sizes

| Token      | Size | Usage                                                   |
| ---------- | ---- | ------------------------------------------------------- |
| `icon.xs`  | 16dp | Inline metadata icons (timestamp, location pin in text) |
| `icon.sm`  | 20dp | Chip icons, badge icons, dense list icons               |
| `icon.md`  | 24dp | Standard list icons, nav icons, button icons            |
| `icon.lg`  | 32dp | Feature icon in cards, dialog icons                     |
| `icon.xl`  | 40dp | Empty state icons, onboarding illustrations             |
| `icon.xxl` | 64dp | Hero illustrations, large empty states                  |

### 9.3 Module Icon Map

| Module            | Icon                         | Token                    |
| ----------------- | ---------------------------- | ------------------------ |
| Dashboard         | `home_rounded`               | `icon.nav.dashboard`     |
| Attendance        | `fingerprint`                | `icon.nav.attendance`    |
| GPS/Visits        | `location_on`                | `icon.nav.gpsVisit`      |
| Fault Management  | `build_circle`               | `icon.nav.faults`        |
| Lead Management   | `person_search`              | `icon.nav.leads`         |
| Reports           | `bar_chart`                  | `icon.nav.reports`       |
| Notifications     | `notifications`              | `icon.nav.notifications` |
| Profile           | `account_circle`             | `icon.nav.profile`       |
| Settings          | `settings`                   | `icon.nav.settings`      |
| Documents         | `folder`                     | `icon.nav.documents`     |
| Check-In          | `login`                      | `icon.action.checkIn`    |
| Check-Out         | `logout`                     | `icon.action.checkOut`   |
| Break             | `coffee`                     | `icon.action.break`      |
| GPS Active        | `gps_fixed`                  | `icon.status.gpsActive`  |
| GPS Poor          | `gps_not_fixed`              | `icon.status.gpsPoor`    |
| GPS Off           | `gps_off`                    | `icon.status.gpsOff`     |
| Offline           | `cloud_off`                  | `icon.status.offline`    |
| Online            | `cloud_done`                 | `icon.status.online`     |
| Sync              | `sync`                       | `icon.status.sync`       |
| SLA OK            | `check_circle`               | `icon.sla.healthy`       |
| SLA Warning       | `warning`                    | `icon.sla.warning`       |
| SLA Breach        | `error`                      | `icon.sla.breach`        |
| Priority Critical | `priority_high`              | `icon.priority.critical` |
| Priority High     | `keyboard_double_arrow_up`   | `icon.priority.high`     |
| Priority Medium   | `remove`                     | `icon.priority.medium`   |
| Priority Low      | `keyboard_double_arrow_down` | `icon.priority.low`      |
| Camera            | `photo_camera`               | `icon.action.camera`     |
| Signature         | `draw`                       | `icon.action.signature`  |
| QR Scan           | `qr_code_scanner`            | `icon.action.qrScan`     |
| Voice Note        | `mic`                        | `icon.action.voiceNote`  |
| Attachment        | `attach_file`                | `icon.action.attachment` |
| Phone             | `call`                       | `icon.action.call`       |
| Navigate          | `navigation`                 | `icon.action.navigate`   |
| Search            | `search`                     | `icon.action.search`     |
| Filter            | `filter_list`                | `icon.action.filter`     |
| Sort              | `sort`                       | `icon.action.sort`       |
| Add               | `add`                        | `icon.action.add`        |
| Edit              | `edit`                       | `icon.action.edit`       |
| Delete            | `delete`                     | `icon.action.delete`     |
| More Options      | `more_vert`                  | `icon.action.more`       |
| Back              | `arrow_back`                 | `icon.nav.back`          |
| Forward           | `arrow_forward`              | `icon.nav.forward`       |

---

## 10. Breakpoints

| Token                 | Width     | Device                             |
| --------------------- | --------- | ---------------------------------- |
| `breakpoint.compact`  | 0–599dp   | Phones (primary target)            |
| `breakpoint.medium`   | 600–839dp | Large phones, small tablets        |
| `breakpoint.expanded` | 840dp+    | Tablets, rugged enterprise devices |

Layout behavior:

- **Compact:** Single column, bottom navigation
- **Medium:** Single column, optional rail navigation
- **Expanded:** Two-column possible, navigation rail

---

## 11. Component Token Reference

### 11.1 Button Tokens

| Token                         | Value                             |
| ----------------------------- | --------------------------------- |
| `button.filledBg`             | `color.primary`                   |
| `button.filledFg`             | `color.onPrimary`                 |
| `button.filledRadius`         | `radius.pill`                     |
| `button.filledPaddingH`       | `spacing.buttonHorizontal` (24dp) |
| `button.filledPaddingV`       | `spacing.buttonVertical` (14dp)   |
| `button.filledTextStyle`      | `type.labelLarge`                 |
| `button.filledMinHeight`      | 48dp                              |
| `button.filledMinWidth`       | 120dp                             |
| `button.filledElevation`      | `elevation.level0`                |
| `button.filledHoverElevation` | `elevation.level1`                |
| `button.tonalBg`              | `color.secondaryContainer`        |
| `button.tonalFg`              | `color.onSecondaryContainer`      |
| `button.outlinedBorder`       | `color.outline`                   |
| `button.outlinedBorderWidth`  | 1.5dp                             |
| `button.textFg`               | `color.primary`                   |
| `button.dangerBg`             | `color.error`                     |
| `button.dangerFg`             | `color.onError`                   |
| `button.disabledBg`           | `color.onSurface` 12% opacity     |
| `button.disabledFg`           | `color.onSurface` 38% opacity     |

### 11.2 Input Field Tokens

| Token                    | Value                                            |
| ------------------------ | ------------------------------------------------ |
| `input.fillColor`        | `color.surfaceContainer`                         |
| `input.borderColor`      | `color.outline`                                  |
| `input.focusBorderColor` | `color.primary`                                  |
| `input.errorBorderColor` | `color.error`                                    |
| `input.borderRadius`     | `radius.sm` (8dp)                                |
| `input.borderWidth`      | 1.5dp                                            |
| `input.focusBorderWidth` | 2dp                                              |
| `input.textStyle`        | `type.bodyLarge`                                 |
| `input.labelStyle`       | `type.bodySmall`                                 |
| `input.hintStyle`        | `type.bodyLarge` color: `color.onSurfaceVariant` |
| `input.minHeight`        | 56dp                                             |
| `input.paddingH`         | `spacing.inputHorizontal` (16dp)                 |
| `input.paddingV`         | `spacing.inputVertical` (16dp)                   |

### 11.3 Card Tokens

| Token                   | Value                          |
| ----------------------- | ------------------------------ |
| `card.bg`               | `color.surfaceContainerLowest` |
| `card.border`           | none (use elevation)           |
| `card.elevation`        | `elevation.level1`             |
| `card.radius`           | `radius.lg` (16dp)             |
| `card.padding`          | `spacing.cardPadding` (16dp)   |
| `card.margin`           | `spacing.cardMargin` (12dp)    |
| `card.pressedElevation` | `elevation.level0`             |

### 11.4 Chip Tokens

| Token               | Value                         |
| ------------------- | ----------------------------- |
| `chip.radius`       | `radius.xs` (4dp)             |
| `chip.paddingH`     | `spacing.chipPaddingH` (12dp) |
| `chip.paddingV`     | `spacing.chipPaddingV` (6dp)  |
| `chip.textStyle`    | `type.labelMedium`            |
| `chip.selectedBg`   | `color.secondaryContainer`    |
| `chip.selectedFg`   | `color.onSecondaryContainer`  |
| `chip.unselectedBg` | `color.surfaceVariant`        |
| `chip.unselectedFg` | `color.onSurfaceVariant`      |
| `chip.minHeight`    | 32dp                          |

### 11.5 Bottom Navigation Tokens

| Token                             | Value                        |
| --------------------------------- | ---------------------------- |
| `bottomNav.bg`                    | `color.surfaceContainerLow`  |
| `bottomNav.height`                | 80dp                         |
| `bottomNav.activeIconColor`       | `color.onSecondaryContainer` |
| `bottomNav.inactiveIconColor`     | `color.onSurfaceVariant`     |
| `bottomNav.activeIndicatorColor`  | `color.secondaryContainer`   |
| `bottomNav.activeIndicatorRadius` | `radius.pill`                |
| `bottomNav.labelStyle`            | `type.labelMedium`           |
| `bottomNav.elevation`             | `elevation.level2`           |
| `bottomNav.iconSize`              | `icon.md` (24dp)             |

### 11.6 App Bar Tokens

| Token               | Value                       |
| ------------------- | --------------------------- |
| `appBar.bg`         | `color.surfaceContainerLow` |
| `appBar.elevation`  | `elevation.level0`          |
| `appBar.titleStyle` | `type.titleLarge`           |
| `appBar.iconColor`  | `color.onSurface`           |
| `appBar.height`     | 64dp                        |

### 11.7 Badge & Notification Count Tokens

| Token             | Value             |
| ----------------- | ----------------- |
| `badge.bg`        | `color.error`     |
| `badge.fg`        | `color.onError`   |
| `badge.radius`    | `radius.pill`     |
| `badge.textStyle` | `type.labelSmall` |
| `badge.size`      | 20dp              |
| `badge.dotSize`   | 8dp               |

### 11.8 Skeleton / Shimmer Tokens

| Token                     | Value                                  |
| ------------------------- | -------------------------------------- |
| `skeleton.baseColor`      | `color.surfaceContainerHigh`           |
| `skeleton.highlightColor` | `color.surfaceContainerHighest`        |
| `skeleton.radius`         | `radius.sm` (8dp)                      |
| `skeleton.animDuration`   | `animation.verySlow` (600ms per sweep) |

### 11.9 Offline Banner Tokens

| Token                     | Value                 |
| ------------------------- | --------------------- |
| `offlineBanner.bg`        | `#795548`             |
| `offlineBanner.fg`        | `#FFFFFF`             |
| `offlineBanner.height`    | 40dp                  |
| `offlineBanner.textStyle` | `type.labelMedium`    |
| `offlineBanner.icon`      | `icon.status.offline` |

### 11.10 FAB Tokens

| Token           | Value               |
| --------------- | ------------------- |
| `fab.bg`        | `color.secondary`   |
| `fab.fg`        | `color.onSecondary` |
| `fab.radius`    | `radius.pill`       |
| `fab.size`      | 56dp                |
| `fab.largeSze`  | 96dp                |
| `fab.elevation` | `elevation.level3`  |
| `fab.iconSize`  | `icon.md` (24dp)    |

---

## 12. Accessibility Requirements

### 12.1 Contrast Ratios

| Level                            | Minimum Ratio  | Usage                            |
| -------------------------------- | -------------- | -------------------------------- |
| Normal text                      | 4.5:1          | Body text, labels                |
| Large text (18dp+ or bold 14dp+) | 3:1            | Headlines, large buttons         |
| Non-text UI elements             | 3:1            | Icons, borders, focus rings      |
| Disabled elements                | No requirement | Clearly communicated via opacity |

### 12.2 Touch Target Sizes

| Element                  | Minimum Size        |
| ------------------------ | ------------------- |
| All interactive elements | 48 × 48dp           |
| List items               | 48dp height minimum |
| Bottom nav items         | 60dp height         |
| FAB                      | 56 × 56dp           |
| Icon-only buttons        | 48 × 48dp           |
| Chips                    | 32dp height         |

### 12.3 Focus & Accessibility Semantics

- All interactive elements SHALL have `Semantics` labels
- Icon-only buttons SHALL have `tooltip` and `semanticLabel`
- Color SHALL NOT be the only means of communicating state
- All state changes SHALL announce to screen readers via `SemanticsService`
- Dynamic text scaling: all layouts SHALL reflow at `textScaleFactor` up to 2.0

---

## 13. White-Label Override Points

These tokens are the only ones a tenant may override at runtime:

| Token                      | Override Allowed        |
| -------------------------- | ----------------------- |
| `color.primary`            | ✅                      |
| `color.onPrimary`          | ✅                      |
| `color.primaryContainer`   | ✅                      |
| `color.secondary`          | ✅                      |
| `color.secondaryContainer` | ✅                      |
| `color.tertiary`           | ✅                      |
| `type.fontFamily`          | ✅ (custom tenant font) |
| App logo / branding assets | ✅                      |
| Splash screen image        | ✅                      |
| `color.surface`            | ⚠️ Review required      |
| Semantic status colors     | ❌ Never override       |
| SLA traffic light colors   | ❌ Never override       |
| GPS accuracy colors        | ❌ Never override       |
| Spacing system             | ❌ Never override       |
| Animation system           | ❌ Never override       |

---

## 14. Token Governance Rules

1. **No hardcoded values** — Every color, size, spacing, and timing value SHALL reference a named token.
2. **Single source of truth** — This document governs. Code tokens SHALL match exactly.
3. **Token-first changes** — Any UI change requiring a new value SHALL add a token here first.
4. **Dark mode parity** — Every light token SHALL have a corresponding dark token.
5. **Accessibility gate** — No token combination SHALL fail WCAG 2.1 AA contrast.
6. **White-label isolation** — Only approved override tokens may be tenant-customized.
7. **Semantic over literal** — Token names SHALL express purpose, not values (e.g., `color.primary` not `color.blue`).

---

## 15. Version History

| Version | Date       | Change                                      |
| ------- | ---------- | ------------------------------------------- |
| 1.0.0   | 2026-07-13 | Initial release — complete token definition |

---

_This document is the authoritative Design Token specification for the PingForce Flutter Mobile Application._
