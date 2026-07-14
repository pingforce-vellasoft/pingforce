# Implementation Plan: Fault Management Module (Priority 8)

## Goal
Implement the **Fault Management Module** UI/UX as defined in sections 7.3 and 7.4 of the audit. This includes building a robust **Create Fault Screen** and an **Attempt Management Form** using Riverpod state management.

## User Review Required
> [!IMPORTANT]  
> Please review the open questions regarding GPS and Voice Notes in the Attempt Management screen before we proceed.

## Open Questions
1. **Voice Notes:** For the Attempt Management screen, should we implement a mock voice recording UI for now, or do you have a specific audio package (e.g., `record` or `flutter_sound`) you want me to configure?
2. **Offline Drafts:** Should the Create Fault form auto-save drafts to local storage (Hive) so users don't lose data if the app is closed mid-entry?

## Proposed Changes

### Feature: Faults (Core Models & State)
#### [MODIFY] `apps/mobile/lib/features/faults/presentation/fault_state.dart`
- Extend state to support Draft Fault saving, and Attempt submission progress.

### Feature: Create Fault Screen (7.3)
#### [NEW] `apps/mobile/lib/features/faults/presentation/create_fault_screen.dart`
- **Multi-section Form:** Stepper or scrollable layout (Customer Details, Fault Details, Media).
- **Customer/Site Search:** Searchable dropdown with "Recent" suggestions.
- **Priority Selection:** Visual radio cards (Critical (Red), High (Orange), Medium (Yellow), Low (Green)) instead of a generic dropdown.
- **Category Picker:** Hierarchical selection (Category → Subcategory).
- **Media Capture:** Inline photo grid UI and GPS capture button.
- **Draft Auto-save:** "Draft saved at 10:42 AM" indicator.

### Feature: Attempt Management (7.4)
#### [NEW] `apps/mobile/lib/features/faults/presentation/create_attempt_screen.dart`
- **GPS Verification:** Auto-capture GPS on start and end of attempt.
- **Work Notes:** Multi-line text field with a voice note recording button.
- **Parts Used:** Product search picker UI (allows selecting multiple parts and quantities).
- **Outcome Selection:** Chip selector for Resolved / Partial / Failed / Requires Revisit.
- **Confirmation Dialog:** Summary popup before final submission.

### Routing
#### [MODIFY] `apps/mobile/lib/core/navigation/app_router.dart`
- Add `/faults/create` and `/faults/:id/attempt` routes.

## Verification Plan

### Automated Tests
- Run `flutter analyze` specifically on `apps/mobile/lib/features/faults/` to ensure no syntax or import errors.

### Manual Verification
- We will review the visual cards for Priority Selection.
- Verify the Parts Used selector allows adding/removing items dynamically.
- Test the draft auto-save UI indicator.
