# THEME_ENGINE.md

# Angular Admin - Theme Engine

## Purpose

This document defines the Theme Engine for the Angular Admin Portal. The Theme Engine provides a centralized mechanism for managing application appearance while supporting tenant-specific branding, white-label customization, accessibility, and consistent user experience.

---

# Objectives

- Dynamic theme management
- White-label support
- Light & Dark mode
- Tenant-specific branding
- Consistent UI design
- Easy customization
- Maintainable styling architecture

---

# Theme Architecture

```text
User Login
      │
Load Tenant Configuration
      │
Load Theme Settings
      │
Apply Color Palette
      │
Load Typography
      │
Apply Branding Assets
      │
Render Application
```

The theme is loaded during application initialization and updated dynamically when tenant settings change.

---

# Theme Components

The Theme Engine manages:

- Color Palette
- Typography
- Icons
- Logos
- Layout Density
- Border Radius
- Shadows
- Component Styles
- Dark Mode
- Branding Assets

---

# Theme Configuration

Each tenant can configure:

- Primary Color
- Secondary Color
- Accent Color
- Background Color
- Surface Color
- Text Colors
- Success Color
- Warning Color
- Error Color
- Information Color

Configuration should be stored in the backend and loaded during login.

---

# Branding Assets

Supported branding resources:

- Company Logo
- Compact Logo
- Login Logo
- Favicon
- Splash Image
- Background Image
- Email Header Logo

Branding assets are referenced through configuration and should never be hardcoded.

---

# Typography

Configurable options include:

- Font Family
- Base Font Size
- Heading Styles
- Line Height
- Font Weight

Typography should remain consistent across all modules.

---

# Layout Customization

Supported settings:

- Sidebar Width
- Header Height
- Navigation Style
- Card Radius
- Button Radius
- Component Spacing
- Compact Mode

---

# Light & Dark Mode

The application should support:

- Light Theme
- Dark Theme
- System Preference (optional)

User preference can override the tenant default where permitted.

---

# Theme Loading Flow

```text
Application Start
      │
Authenticate User
      │
Load Tenant Configuration
      │
Load Theme Settings
      │
Generate CSS Variables
      │
Apply Theme
      │
Render UI
```

---

# CSS Variable Strategy

Theme values should be exposed through CSS variables.

Examples:

- --primary-color
- --secondary-color
- --background-color
- --text-color
- --border-radius
- --font-family

This enables runtime theme switching without rebuilding the application.

---

# Component Styling

Shared UI components should consume theme variables rather than hardcoded values.

Applies to:

- Buttons
- Cards
- Tables
- Forms
- Dialogs
- Navigation
- Charts
- Notifications

---

# Icons

Support configurable icon sets where applicable.

Common icons include:

- Navigation
- Actions
- Status
- Notifications
- User Profile

---

# Accessibility

The Theme Engine should support:

- High contrast colors
- Accessible font sizes
- WCAG-compliant color combinations
- Keyboard-friendly focus indicators

---

# Performance

Recommendations:

- Load theme once during initialization
- Cache theme configuration
- Avoid unnecessary theme recalculation
- Use CSS variables instead of recompiling styles
- Minimize asset size

---

# Administration

Super Admin and authorized Tenant Administrators can manage:

- Brand Colors
- Logos
- Theme Mode
- Typography
- Layout Preferences
- Branding Assets

Changes should take effect without redeploying the application.

---

# Best Practices

- Keep themes configuration-driven.
- Do not hardcode colors.
- Use shared design tokens.
- Separate styling from business logic.
- Maintain consistency across all modules.
- Validate theme configuration before applying.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- WHITE_LABEL.md
- PROJECT_STRUCTURE.md
- SHARED_LIBRARY.md
- FEATURE_MODULES.md

---

# Version

Version: 1.0

Status: Approved for Implementation
