# Check-In GPS Flow — Complete UI/UX Specification

**Document:** CHECKIN_FLOW_SPEC.md  
**Module:** Attendance Management  
**Platform:** Flutter Mobile (Android 10+ / iOS 16+)  
**Version:** 1.0.0  
**Status:** Approved for Implementation

---

## 1. Purpose

This document defines the **complete end-to-end UI/UX specification** for the Employee Attendance Check-In flow in the PingForce Flutter Mobile Application. It covers every screen state, layout, component, interaction, animation, error condition, and edge case that a developer needs to implement — without ambiguity.

---

## 2. Flow Overview

```
App Open / Dashboard
        │
        ▼
   [CHECK IN] Tap
        │
        ▼
  Attendance Screen (Init)
        │
   ┌────┴──────────────────────────────────┐
   │  Load: Shift + Tenant Policy + GPS    │
   └────┬──────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────┐
   │            GPS STATE CHECK                     │
   │                                                │
   │  ✗ GPS Disabled → Permission Request Screen   │
   │  ✗ Permission Denied → GPS Required Error     │
   │  ✓ GPS Enabled → Acquiring Location...        │
   └────┬──────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────┐
   │           ACCURACY CHECK                       │
   │                                                │
   │  ✗ Poor (>50m) → Warning + wait / override    │
   │  ✓ Good (≤50m) → Geofence Check               │
   └────┬──────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────┐
   │           GEOFENCE CHECK                       │
   │                                                │
   │  ✗ Outside Fence → Block / Policy override    │
   │  ✓ Inside Fence → Enable CHECK IN button      │
   └────┬──────────────────────────────────────────┘
        │
        ▼
   [CHECK IN] Tap (enabled)
        │
   ┌────▼───────────────────┐
   │  Biometric required?   │
   │  ✓ Yes → Biometric     │
   │  ✗ No  → Selfie req?   │
   └────┬───────────────────┘
        │
   ┌────▼───────────────────┐
   │  Selfie required?      │
   │  ✓ Yes → Camera        │
   │  ✗ No  → Submit        │
   └────┬───────────────────┘
        │
        ▼
   Submitting... (API)
        │
   ┌────┴──────────────┐
   │  Online → API     │
   │  Offline → Queue  │
   └────┬──────────────┘
        │
        ▼
   SUCCESS Overlay (Lottie)
        │
        ▼
   Back to Dashboard (updated state)
```

---

## 3. Screen Inventory

| #   | Screen / State                              | Trigger                          |
| --- | ------------------------------------------- | -------------------------------- |
| S1  | Attendance Main Screen — Initializing       | Open attendance                  |
| S2  | Attendance Main Screen — GPS Acquiring      | GPS enabled, waiting lock        |
| S3  | Attendance Main Screen — GPS Poor           | Accuracy > 50m                   |
| S4  | Attendance Main Screen — Ready to Check In  | All validations pass             |
| S5  | Attendance Main Screen — Outside Geofence   | GPS good but outside fence       |
| S6  | Attendance Main Screen — Already Checked In | Existing active session          |
| S7  | Attendance Main Screen — Offline Mode       | No network                       |
| S8  | GPS Permission Request Screen               | GPS disabled                     |
| S9  | Biometric Verification                      | Biometric required by policy     |
| S10 | Selfie/Photo Capture                        | Photo required by policy         |
| S11 | Submitting State                            | After tap CHECK IN               |
| S12 | Success Overlay                             | API returns success              |
| S13 | Error State                                 | API failure / validation failure |
| S14 | Mock Location Detected                      | Developer options GPS            |

---

## 4. Attendance Main Screen — Layout Specification

### 4.1 Screen Structure (Scrollable)

```
┌──────────────────────────────────────┐
│  ← Attendance        [?] [Settings]  │  ← AppBar
├──────────────────────────────────────┤
│  [Offline Banner — if offline]       │  ← Conditional
├──────────────────────────────────────┤
│                                      │
│  ┌─ SHIFT CARD ──────────────────┐  │  ← Always visible
│  │  Morning Shift  09:00–18:00   │  │
│  │  Grace: 15 min  Breaks: 3     │  │
│  │  Status: ● On Time            │  │
│  └───────────────────────────────┘  │
│                                      │
│  ┌─ GPS MAP PANEL ───────────────┐  │  ← Core UI
│  │                               │  │
│  │   [Live Map]                  │  │
│  │   Geofence circle             │  │
│  │   User location pin           │  │
│  │   Accuracy ring               │  │
│  │                               │  │
│  │  GPS: ● Excellent  12m       │  │
│  │  Inside Geofence: ✓          │  │
│  └───────────────────────────────┘  │
│                                      │
│  ┌─ METHOD SELECTOR ─────────────┐  │  ← If multiple methods
│  │  [● GPS] [QR] [NFC] [Manual]  │  │
│  └───────────────────────────────┘  │
│                                      │
│  ┌─ ATTENDANCE SUMMARY ──────────┐  │  ← If checked in today before
│  │  Last Check-In: 09:05 AM      │  │
│  │  Working: 3h 22m              │  │
│  │  Breaks: 1                    │  │
│  └───────────────────────────────┘  │
│                                      │
│  [     CHECK IN      ]              │  ← Primary Action Button
│                                      │
│  Last synced: Today 09:05 AM        │  ← Sync info
└──────────────────────────────────────┘
```

---

## 5. Component Specifications

### 5.1 Shift Card

**Dimensions:** Full width, 16dp horizontal padding, 16dp vertical padding  
**Border Radius:** `AppRadius.lg` (16dp)  
**Elevation:** `AppElevation.level1`  
**Background:** `color.surfaceContainerLowest`  
**Border:** 1px left accent border (`color.primary`, 4dp wide)

**Content layout:**

```
Row: [Shift Icon 24dp] [Column: Shift Name / Shift Time] [Status Chip →]
     ─────────────────────────────────────────────────────────────────
     Divider (outlineVariant)
     ─────────────────────────────────────────────────────────────────
Row: [Grace Period] [·] [Break Count] [·] [Required Hours]
```

**Status Chip states:**

| Status       | Color              | Label                    |
| ------------ | ------------------ | ------------------------ |
| On time      | `statusSuccess`    | ● On Time                |
| Grace period | `statusWarning`    | ● Grace Period (Xm left) |
| Late         | `statusCritical`   | ● Late (Xm)              |
| Early        | `status.info`      | ● Early (Xm early)       |
| Off shift    | `onSurfaceVariant` | ● Not In Window          |

**Animations:**

- Card slides in from top on screen load (200ms, `easing.decelerate`)
- Status chip pulses every 30s if in grace period (opacity 1.0 → 0.5 → 1.0, 800ms)

---

### 5.2 GPS Map Panel

**Dimensions:** Full width, height = 240dp (compact) / 320dp (expanded)  
**Border Radius:** `AppRadius.lg` (16dp)  
**Elevation:** `AppElevation.level1`  
**Map Provider:** Google Maps (`google_maps_flutter`)

**Map Configuration:**

- Zoom level: 17 (tight street-level) when location locked; 14 while acquiring
- Tilt: 0 (flat top-down view)
- Zoom controls: hidden
- Map type: normal
- My location button: hidden (custom implementation)
- Map toolbar: disabled
- Lite mode: false

**User Location Marker:**

```
Custom Marker:
- Outer ring: Animated pulse circle (GPS accuracy radius, color = gpsAccuracyColor)
  - Opacity: 0.25
  - Radius scales with actual accuracy in meters
- Inner ring: Solid circle, 16dp diameter
  - Color: PingForceColors.primary
  - Border: 3dp white stroke
  - Shadow: level2
```

**Geofence Overlay (Circle):**

```
GoogleMapCircle:
- Center: geofence.center (LatLng)
- Radius: geofence.radiusMeters
- strokeWidth: 2
- strokeColor: gpsGeofenceInsideBorder OR gpsGeofenceOutsideBorder
- fillColor: gpsGeofenceInside (0x33...) OR gpsGeofenceOutside (0x33...)
- Updates in real-time as user moves
```

**GPS Status Bar (inside map, bottom overlay):**

```
Container (within map, bottom-left, 8dp margin):
  Background: surfaceContainerLowest 90% opacity
  BorderRadius: AppRadius.pill
  Padding: 6dp horizontal, 4dp vertical
  Row:
    [GPS Icon 16dp, color=gpsColor]
    [" Excellent · 12m " | " Acquiring... " | " Poor · 85m "]
    [Geofence badge if applicable]
```

**Map Loading Skeleton:**

```
ShimmerBox:
  Same dimensions as map panel
  BorderRadius: AppRadius.lg
  Shows while GPS and map tiles load
```

---

### 5.3 GPS Status States (Map Panel)

#### State: GPS Acquiring

```
Map: Zoomed out (level 14), no user pin
Accuracy ring: Animated expanding pulse (indefinite)
Status bar: [Pulsing GPS icon] "Acquiring location..."
Check-In button: Disabled, opacity 0.5
Timeout: If no lock after 30s → show "GPS taking longer than usual" snackbar
Timeout: If no lock after 60s → show GPS Slow Warning dialog
```

#### State: GPS Poor Accuracy (>50m)

```
Map: Shows user pin with large red accuracy ring
Status bar: [Orange GPS icon] "Poor signal · 85m accuracy"
Map overlay: Semi-transparent amber banner at top:
  "GPS accuracy is low. Move to open area for better signal."
Check-In button: Shows "Check In Anyway" (if tenant allows low-accuracy override)
              OR Disabled with "Improve GPS signal to continue"
```

#### State: GPS Ready — Inside Geofence

```
Map: Shows user pin with green accuracy ring, green geofence circle
Status bar: [Green GPS icon] "Excellent · 12m" + [Green chip] "✓ Inside Boundary"
Check-In button: ENABLED, full primary color, no restrictions
Geofence circle: Green fill + green border
Entry animation: Geofence circle animates from gray to green (400ms)
```

#### State: GPS Ready — Outside Geofence

```
Map: Shows user pin with red geofence circle
Status bar: [Red GPS icon + Red chip] "⚠ Outside Boundary"
Map overlay: Red banner: "You are outside the designated check-in zone"
Distance badge: "[→ 250m away]" shown below geofence overlay
Check-In button: Blocked OR "Request Manual Override" (policy-driven)
Geofence circle: Red fill + red border + animated pulse (every 3s)
```

---

### 5.4 Method Selector (if tenant enables multiple methods)

```
Horizontal chip row (scrollable):
  [GPS ✓] [QR Code] [NFC] [Manual]

Active chip: secondaryContainer background, check icon
Inactive chip: surfaceVariant background

When GPS not available:
  GPS chip: gray + lock icon
  Shows tooltip: "GPS required for this method"
```

---

### 5.5 Check-In Button

**Default Size:** Full width, 56dp height  
**Border Radius:** `AppRadius.pill`  
**Typography:** `AppTypography.labelLarge` (14dp SemiBold)

**States:**

| State                    | BG Color               | FG Color               | Text                       | Icon                    |
| ------------------------ | ---------------------- | ---------------------- | -------------------------- | ----------------------- |
| Initializing             | `surfaceContainerHigh` | `onSurfaceVariant` 38% | "Checking requirements..." | `sync` (spinning)       |
| GPS Acquiring            | `surfaceContainerHigh` | `onSurfaceVariant` 38% | "Acquiring GPS..."         | `gps_not_fixed`         |
| GPS Poor (blocked)       | `surfaceContainerHigh` | `onSurfaceVariant` 38% | "Improve GPS Signal"       | `gps_not_fixed`         |
| GPS Poor (allowed)       | `statusWarning`        | `onWarning`            | "Check In Anyway"          | `warning_amber`         |
| Outside Fence (blocked)  | `surfaceContainerHigh` | `onSurfaceVariant` 38% | "Outside Boundary"         | `location_off`          |
| Outside Fence (override) | `statusWarning`        | `onWarning`            | "Request Override"         | `lock_open`             |
| Ready                    | `primary`              | `onPrimary`            | "Check In"                 | `login`                 |
| Already Checked In       | `tertiaryContainer`    | `onTertiaryContainer`  | "You're Checked In"        | `check_circle`          |
| Submitting               | `primary` 80%          | `onPrimary`            | ""                         | `CircularProgress` 20dp |
| Success                  | `statusSuccess`        | `onSuccess`            | "Checked In ✓"             | none                    |
| Error                    | `errorContainer`       | `onErrorContainer`     | "Try Again"                | `refresh`               |
| Offline                  | `secondary`            | `onSecondary`          | "Check In (Offline)"       | `cloud_off`             |

**Tap Animation:**

- Scale: 1.0 → 0.96 on press (80ms, `easing.accelerate`)
- Scale: 0.96 → 1.0 on release (120ms, `easing.decelerate`)
- Ink ripple: `InkSparkle`

---

## 6. Screen States — Full Specifications

### S1: Initializing State

```
AppBar: "Attendance" (no actions until loaded)
Shift Card: Shimmer skeleton (same dimensions)
GPS Map: Shimmer skeleton
Method Selector: Hidden
Check-In Button: Skeleton rectangle (same size)
Duration: Max 2 seconds, then transition to GPS state
```

### S2: GPS Acquiring

```
AppBar: "Attendance" + [Help icon]
Shift Card: Loaded and visible
GPS Map: Showing map, pulsing acquisition ring
Status bar: "Acquiring location..."
Check-In Button: Disabled "Acquiring GPS..."
Contextual help (after 15s): Floating info chip: "Having trouble? Try moving outdoors"
```

### S3: GPS Poor Accuracy

```
GPS Map: Large red/amber ring on user pin, accuracy in meters shown
Amber banner inside map: "GPS signal weak – move to an open area"
Check-In Button: Per policy (blocked or "Check In Anyway")
If "Check In Anyway" shown:
  → Tapping shows confirmation bottom sheet:
    Title: "Low GPS Accuracy"
    Body: "Your GPS accuracy is 85m. Attendance will be flagged for review."
    [Cancel]  [Check In Anyway]
```

### S4: Ready to Check In

```
GPS Map: Green geofence, green user pin, accurate reading
Status bar: Green indicators
Shift Card: On Time / Grace status
Check-In Button: Enabled, full primary color
→ Tapping initiates biometric or selfie check (per policy), then submit
```

### S5: Outside Geofence

```
GPS Map: Red geofence circle, user pin outside it
Red banner: "You are outside the check-in zone"
Distance info: "250m from boundary"
Check-In Button: Policy-driven:
  Policy = BLOCK: Disabled "Outside Boundary"
  Policy = WARN: Shows "Request Manual Override" (amber)
    → Tapping shows override bottom sheet with reason input
  Policy = ALLOW: Full button enabled (logs violation)
```

### S6: Already Checked In

```
AppBar: "Attendance"
Active Session Card (replaces Shift Card top section):
  - Check-in time: "Checked In at 09:05 AM"
  - Working timer: Live running "3h 22m" counter
  - Break count: "1 break taken"
  - Check-out time remaining hint
GPS Map: Smaller (180dp height), shows current location
Action buttons (replace Check-In):
  [Start Break]     [Check Out]
Break button: Secondary tonal
Check-Out button: Primary (full width if no break, half-width if break available)
```

### S7: Offline Mode

```
Top: Amber offline banner: "Offline · Attendance will sync when connected"
Shift Card: Shows cached shift data (cached badge)
GPS Map: Functional (GPS works offline, maps may be cached)
Check-In Button: "Check In (Offline)" with cloud-off icon, secondary color
→ Tapping submits to local queue, shows success overlay with "Queued for sync" message
```

### S14: Mock Location Detected

```
Full-screen warning overlay (not dismissable):
Icon: shield_alert (red, 64dp)
Title: "Location Spoofing Detected"
Body: "Your device appears to be using a simulated location.
       Attendance cannot be recorded for security reasons.
       Disable developer location and try again."
[Open Settings]  [Contact HR]
Check-In: Completely blocked
Audit log: Automatically created
```

---

## 7. GPS Permission Request Screen (S8)

### Layout

```
┌──────────────────────────────────────┐
│  ← Back                              │  ← AppBar
│                                      │
│                                      │
│     [GPS Illustration — 120dp]       │  ← Custom SVG or Lottie
│                                      │
│     Location Access Required         │  ← headlineMedium
│                                      │
│  PingForce needs your location       │
│  to verify attendance at your        │  ← bodyLarge, centered
│  designated work location.           │
│                                      │
│  ┌─ PERMISSION DETAIL BOX ────────┐ │
│  │ ✓ Only used during check-in    │ │
│  │ ✓ Not shared with third parties│ │
│  │ ✓ Required by company policy   │ │
│  └──────────────────────────────── ┘ │
│                                      │
│  [    Allow Location Access   ]      │  ← FilledButton
│  [    Not Now                 ]      │  ← TextButton
│                                      │
│  Privacy Policy  ·  Help             │  ← Footer links
└──────────────────────────────────────┘
```

**Permission flow:**

1. Tap "Allow Location Access" → System permission dialog
2. Granted → Return to Attendance Screen (S2/S4)
3. Denied → Show "Permission Required" error state
4. Permanently denied → Show "Go to Settings" CTA with `AppSettings.openAppSettings()`

---

## 8. Biometric Verification (S9)

### Trigger

Shown after user taps CHECK IN when tenant policy requires biometric.

### UI Behavior

```
Bottom Sheet (modal, not dismissable):
  Height: 280dp
  Drag handle: hidden
  Background: surfaceContainerLow

  Content:
    ┌──────────────────────────────────┐
    │                                  │
    │    [Fingerprint Icon — 64dp]     │
    │    OR [Face ID Icon — 64dp]      │
    │                                  │
    │    Verify Your Identity          │  ← titleMedium
    │    Touch the fingerprint sensor  │  ← bodyMedium, onSurfaceVariant
    │                                  │
    │    [Progress indicator — thin]   │
    │                                  │
    │    [Use PIN Instead]             │  ← TextButton fallback
    │                                  │
    └──────────────────────────────────┘
```

**Biometric states:**

- **Awaiting:** Pulsing fingerprint icon (opacity 0.6 → 1.0)
- **Success:** Icon turns green + checkmark overlay (200ms) → auto-dismiss (400ms)
- **Failed (1st/2nd):** Icon shakes (horizontal shake 4 cycles, 300ms) + "Try again (X attempts left)"
- **Failed (max attempts):** Bottom sheet closes, fallback to PIN/password
- **Not enrolled:** Skip biometric, show "Biometric not set up — using PIN"

---

## 9. Selfie / Photo Capture (S10)

### Trigger

Shown after biometric (or instead of, if selfie required without biometric).

### Layout

```
Full-screen camera view:
┌──────────────────────────────────────┐
│  [X] Cancel           [?] Help       │  ← Top overlay bar
│                                      │
│                                      │
│    ┌──────────────────────────┐     │
│    │                          │     │
│    │   [CAMERA PREVIEW]       │     │  ← Live camera feed
│    │                          │     │
│    │   Oval face guide        │     │  ← Animated oval overlay
│    │   (dash border)          │     │
│    │                          │     │
│    └──────────────────────────┘     │
│                                      │
│   Position your face in the oval    │  ← bodyMedium, white text
│                                      │
│         [● CAPTURE]                  │  ← Large 72dp FAB, white
│                                      │
│  [Retake] already taken              │  ← Conditional
└──────────────────────────────────────┘
```

**Photo states:**

- **Viewfinder:** Live camera, oval guide border animates (green when face detected)
- **Captured:** Preview shown, freeze-frame effect, confirm/retake options
- **Accepted:** Dismiss → proceed to submission
- **Front camera only:** Explicitly set, no camera flip allowed

---

## 10. Submission & Success (S11, S12)

### S11: Submitting

```
Check-In button transforms:
  - Background: primary (unchanged)
  - Content: Center CircularProgressIndicator (white, 20dp, stroke 2dp)
  - Text: hidden
  - Width: unchanged
  - Disabled: true (no tap)
  - Duration: max 10s before timeout error

Map: No change (stays visible)
Shift Card: No change
```

### S12: Success Overlay

**Appearance:** Full-screen overlay (not a separate route) that slides up from bottom.

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│   [Lottie: Checkmark animation]      │  ← 160dp, plays once
│    ~600ms                            │
│                                      │
│   You're Checked In!                 │  ← headlineMedium, onSurface
│                                      │
│   09:15 AM  ·  On Time              │  ← titleSmall, primary
│                                      │
│   Morning Shift · Branch HQ          │  ← bodyMedium, onSurfaceVariant
│                                      │
│   GPS: ✓ Verified · 12m             │  ← labelMedium, statusSuccess
│                                      │
│   [Confetti animation — subtle]      │  ← 30-particle, 1s duration
│                                      │
│   ─────────────────────────         │
│                                      │
│   [ View Attendance Details ]        │  ← TextButton
│                                      │
│   Auto-returning to dashboard...     │  ← caption, 3s countdown
│   [3] [2] [1] → auto dismiss        │
│                                      │
└──────────────────────────────────────┘
```

**Overlay animation:**

1. Overlay slides up from bottom: 350ms, `easing.emphasized`
2. Background: `surfaceContainerLowest` at 95% opacity
3. Lottie plays immediately (600ms)
4. Text fades in after lottie completes: 200ms
5. Auto-dismiss after 3s with fade-out: 300ms
6. On dismiss: Dashboard refreshes to show updated session state

**Offline variant of success overlay:**

```
Same layout, different detail row:
  [Cloud off icon] "Saved Offline · Will sync when connected"
  Color: statusInfo
```

---

## 11. Error States

### GPS Errors

| Error                | Display Pattern                                          |
| -------------------- | -------------------------------------------------------- |
| `GPS_DISABLED`       | GPS Permission Request Screen (S8)                       |
| `GPS_POOR_ACCURACY`  | Amber banner in map + conditional button text            |
| `OUTSIDE_GEOFENCE`   | Red banner + distance shown + policy action              |
| `MOCK_LOCATION`      | Full-screen block (S14)                                  |
| `GPS_TIMEOUT` (>60s) | Dialog: "GPS unavailable. Try again or contact support." |

### API / Network Errors

| Error             | Display Pattern                                                   |
| ----------------- | ----------------------------------------------------------------- |
| Network timeout   | Snackbar: "Connection lost. Please try again." + retry            |
| Server 5xx        | Snackbar: "Server error. Trying again in 10s." + auto-retry       |
| 401 Unauthorized  | Navigate to Login with session expired message                    |
| 403 Forbidden     | Snackbar: "You don't have permission to check in."                |
| Duplicate session | Bottom sheet: "You already have an active session. End it first?" |
| Shift not active  | Dialog: "Check-in is not allowed outside your shift window."      |
| License expired   | Dialog: "Service unavailable. Contact your administrator."        |

### Error Snackbar Spec

```
SnackBar:
  behavior: floating
  margin: 16dp all sides
  duration: 4s (errors) / 2s (info)
  action: "Retry" (where applicable)
  leading icon: error_outline (red) / info_outline (blue)
```

---

## 12. Offline Check-In Behavior

```
Network Detection:
  - ConnectivityPlus package
  - Check before submission attempt

Offline Flow:
  1. User taps Check In
  2. GPS validated locally (no server call)
  3. Geofence validated against cached policy
  4. Biometric validated locally
  5. Attendance record encrypted + stored in local DB (Drift)
  6. Sync queue entry created with timestamp + GPS payload
  7. Success overlay shown with offline variant
  8. When network restores → automatic background sync
  9. Conflict resolution: server record wins for duplicates

Local Storage:
  - Encrypted attendance record: {
      id: UUID,
      userId: ...,
      tenantId: ...,
      checkInTime: ISO8601,
      gpsLat, gpsLng, gpsAccuracy,
      geofenceId, geofenceValid,
      deviceId,
      biometricVerified,
      status: "PENDING_SYNC",
      createdAt
    }
```

---

## 13. Animations Reference Summary

| Event                   | Animation                       | Duration    | Easing       |
| ----------------------- | ------------------------------- | ----------- | ------------ |
| Screen entry            | Slide up                        | 300ms       | `emphasized` |
| Shift card load         | Slide in from top + fade        | 200ms       | `decelerate` |
| GPS acquiring pulse     | Expand + fade loop              | 1200ms      | `linear`     |
| Geofence color change   | Color tween (gray→green or red) | 400ms       | `standard`   |
| Button enable           | Opacity + background color      | 200ms       | `standard`   |
| Button tap              | Scale 1.0→0.96→1.0              | 200ms       | combined     |
| Biometric success       | Checkmark overlay               | 200ms       | `spring`     |
| Biometric failure       | Horizontal shake                | 300ms       | `standard`   |
| Success overlay entry   | Slide up                        | 350ms       | `emphasized` |
| Lottie checkmark        | Play once                       | 600ms       | internal     |
| Success text entry      | Fade in                         | 200ms       | `decelerate` |
| Confetti                | Particle burst                  | 1000ms      | `linear`     |
| Auto-dismiss overlay    | Fade out                        | 300ms       | `accelerate` |
| Offline banner          | Slide down                      | 200ms       | `decelerate` |
| Outside geofence pulse  | Opacity 1→0.4→1                 | 3000ms loop | `standard`   |
| Status chip grace pulse | Opacity 1→0.5→1                 | 800ms loop  | `standard`   |

---

## 14. Accessibility Requirements

| Requirement           | Implementation                                                |
| --------------------- | ------------------------------------------------------------- |
| All map elements      | `Semantics` labels: "You are inside the check-in zone"        |
| GPS status            | `LiveRegion` announcement when GPS state changes              |
| Check-In button       | `Semantics(label: "Check in for Morning Shift")`              |
| Biometric sheet       | `Semantics(label: "Biometric verification required")`         |
| Success overlay       | Announced to screen reader: "Check-in successful at 09:15 AM" |
| Color-only states     | Icon + text always paired with color (never color-only)       |
| Minimum touch targets | All buttons ≥ 48×48dp                                         |
| Focus order           | AppBar → Shift Card → GPS Panel → Method Selector → Button    |
| Error messages        | `SemanticsService.announce()` for all errors                  |

---

## 15. Tenant Policy Configuration

The Check-In screen adapts to these tenant-configurable policies:

| Policy Flag           | Values              | UI Impact                                      |
| --------------------- | ------------------- | ---------------------------------------------- |
| `gpsRequired`         | true/false          | GPS panel mandatory vs optional                |
| `geofenceEnabled`     | true/false          | Show/hide geofence circle, enable/block button |
| `geofencePolicy`      | BLOCK/WARN/ALLOW    | Button behavior when outside geofence          |
| `biometricRequired`   | true/false          | Show/skip biometric bottom sheet               |
| `selfieRequired`      | true/false          | Show/skip camera screen                        |
| `allowLowAccuracy`    | true/false          | "Check In Anyway" button when GPS poor         |
| `accuracyThreshold`   | meters (default 50) | When to show poor accuracy warning             |
| `allowOfflineCheckin` | true/false          | Enable/disable offline mode button             |
| `checkInMethods`      | GPS,QR,NFC,MANUAL   | Show method selector, highlight available      |
| `mockLocationPolicy`  | BLOCK/WARN          | Full block vs warning for mock GPS             |

---

## 16. Navigation

```dart
// Route definition (GoRouter)
GoRoute(
  path: '/attendance',
  builder: (context, state) => const AttendanceScreen(),
  routes: [
    GoRoute(
      path: 'gps-permission',
      builder: (context, state) => const GpsPermissionScreen(),
    ),
    GoRoute(
      path: 'selfie-capture',
      builder: (context, state) => const SelfieCaptureScreen(),
    ),
  ],
)

// Deep link support:
// pingforce://attendance → Open attendance screen
// pingforce://attendance/checkin → Open and auto-start check-in
```

---

## 17. Performance Targets

| Action                     | Target                     |
| -------------------------- | -------------------------- |
| Screen load to interactive | < 500ms                    |
| GPS lock (good conditions) | < 5s                       |
| Map tile load              | < 2s                       |
| Check-In API response      | < 2s                       |
| Offline save to local DB   | < 100ms                    |
| Success overlay display    | < 200ms after API response |
| Biometric prompt display   | < 150ms                    |

---

_End of Check-In GPS Flow Specification v1.0_
