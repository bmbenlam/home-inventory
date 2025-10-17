# Home Inventory Dashboard

## Project Overview

A web-based inventory management dashboard designed for iPad that displays home food and cooking ingredient inventory with intelligent rotation based on expiry dates. Items closer to expiry are shown more frequently to help reduce food waste.

**Live URL**: `https://bmbenlam.github.io/home-inventory/`

---

## Table of Contents

1. [Purpose & Features](#purpose--features)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Setup & Configuration](#setup--configuration)
5. [Data Structure](#data-structure)
6. [Naming Conventions](#naming-conventions)
7. [Key Functions & Logic](#key-functions--logic)
8. [Design System](#design-system)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance Guide](#maintenance-guide)

---

## Purpose & Features

### What This Dashboard Does

- **Displays inventory items one at a time** in a rotating carousel
- **Prioritizes expired/expiring items** - shows them more frequently
- **Quick quantity updates** via +/- buttons for Storage and Kitchen quantities
- **Auto-syncs with Google Sheets** - bidirectional data flow
- **Color-coded expiry status** - background changes based on how soon items expire
- **Automatic last update tracking** - records date when quantities change

### Target Use Case

- Mounted iPad dashboard in kitchen/pantry
- Quick glance to see what needs to be used soon
- Easy one-tap inventory updates
- No need to open spreadsheet manually

---

## Architecture

### Technology Stack

```
Frontend:
- React 18 (via CDN)
- Vanilla CSS
- Babel Standalone (for JSX transformation)

Backend/Data:
- Google Sheets (as database)
- Google Sheets API v4 (OAuth 2.0)

Hosting:
- GitHub Pages (free static hosting)
```

### Data Flow

```
┌─────────────────┐
│  Google Sheets  │ ◄──────┐
│  (Master tab)   │        │
└────────┬────────┘        │
         │                 │
         │ OAuth 2.0       │ PUT Request
         │ GET Request     │ (Update quantities)
         │                 │
         ▼                 │
┌─────────────────────────┴──┐
│   React Dashboard (iPad)   │
│                            │
│  - Display items           │
│  - Rotate based on expiry  │
│  - Handle +/- buttons      │
│  - Update last date        │
└────────────────────────────┘
```

---

## File Structure

```
home-inventory/
├── index.html              # Main HTML entry point
├── styles.css              # All CSS styling
├── config.js               # Configuration & utility functions
├── app.js                  # Main React application logic
└── README.md               # This file
```

### Why Split Into 4 Files?

**Problem**: Original single HTML file (1000+ lines) was too large for mobile Safari on iPad to handle reliably.

**Solution**: Split into modular files for better:
- Performance on mobile devices
- Code maintainability
- Debugging capability
- Future feature additions

---

## Setup & Configuration

### Prerequisites

1. Google Account with Google Sheets access
2. iPad with Safari browser
3. Stable internet connection
4. GitHub account (for hosting)

### Google Cloud Console Setup

#### 1. Create Project
- Go to: https://console.cloud.google.com
- Create project: `home-inventory-dashboard`

#### 2. Enable Google Sheets API
- Navigate to: APIs & Services → Library
- Search: "Google Sheets API"
- Click: Enable

#### 3. Configure OAuth Consent Screen
- Navigate to: APIs & Services → OAuth consent screen
- User Type: External
- App name: `Home Inventory Dashboard`
- Add scope: `https://www.googleapis.com/auth/spreadsheets`
- Add test user: Your email address

#### 4. Create OAuth Client ID
- Navigate to: APIs & Services → Credentials
- Create Credentials → OAuth client ID
- Application type: Web application
- Authorized JavaScript origins: `https://bmbenlam.github.io`
- Authorized redirect URIs: 
  - `https://bmbenlam.github.io/home-inventory/`
  - `https://bmbenlam.github.io/home-inventory/index.html`

#### 5. Copy Client ID
Format: `123456789-abc123def.apps.googleusercontent.com`

### Google Sheets Setup

**Spreadsheet ID**: `1-WloJiiTvfgqO4DaeMcXLNBER5oWJa23uLMu8IqXC1U`

**Sheet Name**: `Master`

**Sharing**: Anyone with the link can edit

### Dashboard Configuration

1. Open: `https://bmbenlam.github.io/home-inventory/`
2. Click: ⚙️ Settings button
3. Enter:
   - **OAuth Client ID**: From Google Cloud Console
   - **Spreadsheet ID**: From Google Sheets URL
   - **Sheet Name**: `Master`
   - **Rotation Interval**: 60 seconds (default)
   - **Frequency Weights**: Default values
4. Save Settings
5. Sign in with Google
6. Grant permissions

---

## Data Structure

### Google Sheets Columns

| Column | Name | Data Type | Description | Example |
|--------|------|-----------|-------------|---------|
| A | Category | String | Item category | "Snacks", "Canned Food" |
| B | Item name | String | Product name | "Potato Chips" |
| C | Size | String | Package size/weight | "150g", "500ml" |
| D | Quantity \| Storage | Number | Amount in storage | 2, 5 |
| E | Quantity \| Kitchen | Number | Amount in kitchen | 1, 3 |
| F | Expiry (dd/mm/yyyy) | Date String | Expiration date | "15/12/2025" |
| G | Last Update | Date String | Last stock-taking | "17/10/2025" |

### JavaScript Data Model

```javascript
{
  category: string,           // "Snacks"
  itemName: string,          // "Potato Chips"
  size: string,              // "150g"
  quantityStorage: number,   // 2
  quantityKitchen: number,   // 1
  expiryDate: Date,          // Date object
  lastUpdate: string,        // "17/10/2025"
  rowIndex: number          // Sheet row number (for updates)
}
```

---

## Naming Conventions

### File Naming
- **lowercase with hyphens**: `index.html`, `styles.css`, `app.js`, `config.js`

### JavaScript

#### Variables & Functions
- **camelCase**: `itemName`, `expiryDate`, `quantityStorage`
- **Function names**: `fetchData()`, `updateQuantity()`, `handleSignIn()`

#### Constants
- **SCREAMING_SNAKE_CASE**: `DEFAULT_CONFIG`, `DISCOVERY_DOC`, `SCOPES`

#### React Components
- **PascalCase**: `App`, `SettingsModal`

### CSS

#### Class Names
- **kebab-case**: `.inventory-card`, `.quantity-button`, `.expiry-section`

#### BEM-style Modifiers
- **Status modifiers**: `.expiry-section.expired`, `.expiry-section.warning`

#### Background Classes
- **Prefixed with bg-**: `.bg-expired`, `.bg-warning`, `.bg-caution`, `.bg-good`, `.bg-fresh`

---

## Key Functions & Logic

### Core Functions (config.js)

#### `loadConfig()`
**Purpose**: Load user settings from browser localStorage  
**Returns**: Configuration object with defaults  
**Usage**: Called on app initialization

#### `saveConfig(config)`
**Purpose**: Save user settings to localStorage  
**Parameters**: 
- `config` (object) - Configuration to save

#### `parseDate(dateStr)`
**Purpose**: Convert dd/mm/yyyy string to Date object  
**Parameters**: 
- `dateStr` (string) - Date in "dd/mm/yyyy" format  
**Returns**: Date object or null  
**Example**: `"17/10/2025"` → `Date(2025, 9, 17)`

#### `formatDate(date)`
**Purpose**: Convert Date object to dd/mm/yyyy string  
**Parameters**: 
- `date` (Date) - Date object  
**Returns**: Formatted string  
**Example**: `Date(2025, 9, 17)` → `"17/10/2025"`

#### `getDaysUntilExpiry(expiryDate)`
**Purpose**: Calculate days remaining until expiry  
**Parameters**: 
- `expiryDate` (Date) - Expiration date  
**Returns**: Number of days (negative if expired)  
**Logic**: 
- Compares expiry date to today (midnight)
- Returns `Infinity` if no date provided

#### `getExpiryStatus(daysUntilExpiry)`
**Purpose**: Determine visual status based on days until expiry  
**Parameters**: 
- `daysUntilExpiry` (number) - Days remaining  
**Returns**: Object with `status` and `label`

**Status Mapping**:
```javascript
{
  daysUntilExpiry <= 7:   { status: 'expired', label: 'EXPIRED / EXPIRING SOON' },
  daysUntilExpiry <= 30:  { status: 'warning', label: 'EXPIRING WITHIN 1 MONTH' },
  daysUntilExpiry <= 90:  { status: 'caution', label: 'EXPIRING WITHIN 3 MONTHS' },
  daysUntilExpiry <= 180: { status: 'good', label: 'EXPIRING WITHIN 6 MONTHS' },
  daysUntilExpiry > 180:  { status: 'fresh', label: 'FRESH' }
}
```

#### `getExpiryCategory(daysUntilExpiry)`
**Purpose**: Categorize item for weighted rotation  
**Parameters**: 
- `daysUntilExpiry` (number) - Days remaining  
**Returns**: Category string (`'expired'`, `'soon'`, `'medium'`, `'later'`, `'fresh'`)

#### `weightedRandomSelect(items, weights)`
**Purpose**: Select next item to display based on expiry weights  
**Parameters**: 
- `items` (array) - All inventory items
- `weights` (object) - Weight percentages for each category

**Algorithm**:
1. Categorize all items by expiry status
2. Create weighted pool (repeat items based on weight)
3. Randomly select from pool
4. Result: Expired items appear ~50% of time (default)

**Example**:
```javascript
weights = {
  expired: 50,  // 50% of rotation time
  soon: 25,     // 25% of rotation time
  medium: 15,   // 15% of rotation time
  later: 7,     // 7% of rotation time
  fresh: 3      // 3% of rotation time
}
```

---

### Core Functions (app.js)

#### `App()`
**Purpose**: Main React component  
**State Management**:
- `config` - User settings
- `items` - Array of all inventory items
- `currentItem` - Currently displayed item
- `loading` - Loading state
- `error` - Error message
- `showSettings` - Settings modal visibility
- `isSignedIn` - OAuth authentication status
- `progress` - Rotation progress bar (0-100)

#### `fetchData()`
**Purpose**: Retrieve inventory data from Google Sheets  
**Process**:
1. Validate access token and spreadsheet ID
2. Make GET request to Google Sheets API
3. Parse CSV-like response into JavaScript objects
4. Filter out empty rows
5. Select initial item using weighted random
6. Update state

**API Endpoint**:
```
GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{sheetName}
Authorization: Bearer {access_token}
```

**Error Handling**:
- No access token → Don't fetch
- API error → Display error message
- Empty sheet → Show "No data found"

#### `updateQuantity(location, delta)`
**Purpose**: Update item quantity in Google Sheets  
**Parameters**:
- `location` (string) - `'storage'` or `'kitchen'`
- `delta` (number) - Change amount (usually +1 or -1)

**Process**:
1. Calculate new quantity (minimum 0)
2. Update current item in state (optimistic update)
3. Generate today's date in dd/mm/yyyy format
4. Make PUT request to Google Sheets API
5. Show success confirmation

**API Endpoint**:
```
PUT https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{sheetName}!D{row}:G{row}?valueInputOption=RAW
Authorization: Bearer {access_token}
Body: {
  "values": [[quantityStorage, quantityKitchen, expiryDate, lastUpdate]]
}
```

**Why Optimistic Update?**
- UI updates immediately (no lag)
- If API fails, error shown but UI already updated
- Better UX on slow connections

#### `handleSignIn()`
**Purpose**: Initiate Google OAuth flow  
**Process**:
1. Validate client ID and spreadsheet ID configured
2. Request access token via popup
3. On success: Store token, set signed in state, fetch data

#### `handleSignOut()`
**Purpose**: Sign out user and clear session  
**Process**:
1. Clear access token
2. Revoke OAuth token with Google
3. Reset all state (items, currentItem, etc.)

#### Rotation Effect (useEffect)
**Purpose**: Auto-rotate displayed item  
**Trigger**: Every `rotationInterval` seconds  
**Process**:
1. Select new item using `weightedRandomSelect()`
2. Update `currentItem` state
3. Reset progress bar to 0

**Cleanup**: Clears interval on unmount

#### Progress Bar Effect (useEffect)
**Purpose**: Animate progress bar  
**Trigger**: Every 100ms  
**Process**:
- Increment progress by `100 / (rotationInterval * 10)`
- Reset to 0 when reaches 100

#### Background Color Effect (useEffect)
**Purpose**: Change body background based on expiry status  
**Trigger**: When `currentItem` changes  
**Process**:
1. Calculate days until expiry
2. Get status (`expired`, `warning`, etc.)
3. Apply CSS class to body: `bg-{status}`

---

### Settings Modal

#### `SettingsModal({ config, onSave, onClose })`
**Purpose**: Allow user to configure dashboard  
**Props**:
- `config` - Current configuration
- `onSave` - Callback when settings saved
- `onClose` - Callback to close modal

**Configurable Settings**:
1. **OAuth Client ID** - Google Cloud Console credential
2. **Spreadsheet ID** - Target Google Sheet
3. **Sheet Name** - Specific tab name
4. **Rotation Interval** - Seconds between item changes (5-300)
5. **Frequency Weights** - Percentage for each expiry category

**Validation**:
- Warns if weights don't sum to 100
- Allows saving anyway (weights normalized internally)

---

## Design System

### Color Palette (Pantone-inspired)

Based on the color reference image provided by user:

| Status | Pantone Color | Hex Code | Usage |
|--------|---------------|----------|-------|
| Expired | Red | `#DD6E67` | Items ≤7 days to expiry |
| Warning | Coral | `#E87461` | Items 8-30 days to expiry |
| Caution | Beige | `#C9AF98` | Items 31-90 days to expiry |
| Good | Green | `#88B0A4` | Items 91-180 days to expiry |
| Fresh | Dark Teal | `#194A52` | Items 180+ days to expiry |

### Color Application

#### Background Colors
```css
body.bg-expired { background: #DD6E67; }
body.bg-warning { background: #E87461; }
body.bg-caution { background: #C9AF98; }
body.bg-good { background: #88B0A4; }
body.bg-fresh { background: #194A52; }
```

**Behavior**: Body background smoothly transitions (0.5s) when item rotates

#### Expiry Section Colors
```css
.expiry-section.expired {
  background: rgba(221, 110, 103, 0.3);
  border: 3px solid #DD6E67;
}
```

**Pattern**: 30% opacity background + solid border for each status

#### UI Element Colors
- **Buttons**: Beige `#C9AF98`
- **Success notifications**: Green `#88B0A4`
- **Progress bar**: Beige `#C9AF98`
- **Sign-in button**: Green `#88B0A4`

### Layout

#### Card Structure
```
┌─────────────────────────────────┐
│  ⚙️ Settings                     │  ← Top-right corner
├─────────────────────────────────┤
│                                 │
│      [Inventory Card]           │  ← White card, centered
│      500px min-height           │
│      40px padding               │
│      20px border-radius         │
│                                 │
│  [Progress Bar]                 │  ← Bottom of card
└─────────────────────────────────┘
```

#### Item Display
```
Item Name (36px, bold)
Category (18px, uppercase)
Size (16px, gray)

┌─────────────────────────┐
│   EXPIRY STATUS         │  ← Color-coded section
│   dd/mm/yyyy            │
│   (X days remaining)    │
└─────────────────────────┘

┌──────────┬──────────┐
│ STORAGE  │ KITCHEN  │  ← Two-column grid
│    5     │    2     │
│  [-] [+] │  [-] [+] │
└──────────┴──────────┘

Last updated: dd/mm/yyyy
```

### Typography

- **Font Family**: System fonts (`-apple-system`, `BlinkMacSystemFont`, etc.)
- **Item Name**: 36px, bold
- **Category**: 18px, uppercase, letter-spacing 1px
- **Quantity Display**: 48px, bold
- **Body Text**: 14-16px

### Animations

#### Slide In/Out (Confirmation)
```css
@keyframes slideIn {
  from { transform: translateX(400px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

#### Spinner
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

#### Transitions
- Background color change: 0.5s ease
- Button hover: 0.2s
- Border color: 0.3s

---

## Troubleshooting

### Common Issues

#### Issue: "Access blocked: Authorisation error 403"
**Cause**: Email not added to OAuth test users  
**Fix**: 
1. Go to Google Cloud Console → OAuth consent screen
2. Add your email under "Test users"
3. Wait 2-3 minutes
4. Try signing in again

#### Issue: Purple screen, no items showing
**Cause**: Multiple possibilities - check console logs  
**Fix**:
1. Open Safari Developer Tools (if on desktop)
2. Check console for error messages
3. Look for red "❌" emoji in logs
4. Common causes:
   - Wrong sheet name (check it's exactly "Master")
   - No data in sheet
   - Sheet not shared properly

#### Issue: Items show but +/- buttons don't work
**Cause**: Write permissions issue  
**Fix**:
1. Verify Google Sheet is set to "Anyone with the link can **edit**"
2. Check OAuth scope includes: `https://www.googleapis.com/auth/spreadsheets`
3. Sign out and sign in again

#### Issue: Items not rotating
**Cause**: Rotation effect not triggering  
**Fix**:
1. Check console for "🔄 Rotation effect" logs
2. Verify `items.length > 0`
3. Check rotation interval in settings (minimum 5 seconds)

#### Issue: Wrong dates displayed
**Cause**: Date parsing issue  
**Fix**:
1. Verify dates in Google Sheet are in dd/mm/yyyy format
2. Check for extra spaces in date cells
3. Ensure consistent date format across all rows

### Debug Mode

**How to Enable**:
1. Debug mode activates automatically when:
   - Not signed in, OR
   - No items loaded after signing in

**What It Shows**:
- Signed in status
- Loading status
- Number of items loaded
- Current item exists
- Error messages
- Configuration status

**Debug Screen Features**:
- Large, visible text
- Red border around card
- "Retry Loading Data" button
- "Sign Out" button

### Console Logging

The app includes extensive console logging with emojis for easy scanning:

- 🚀 App initialization
- 📱 Component renders
- 📊 State changes
- 🔧 API initialization
- 🔐 Authentication events
- 📥 Data fetching
- 🔄 Rotation events
- ❌ Errors
- ✅ Success events

**How to View Logs**:

**Desktop Safari**:
1. Develop → Show JavaScript Console

**iPad Safari** (requires Mac):
1. Enable Web Inspector on iPad: Settings → Safari → Advanced → Web Inspector
2. Connect iPad to Mac via cable
3. Open Safari on Mac
4. Develop → [iPad Name] → [Page URL]

---

## Maintenance Guide

### Updating Item Data

**Method 1: Directly in Google Sheets**
1. Open the Google Sheet
2. Edit values in any column
3. Dashboard auto-refreshes every 5 minutes
4. Or click "Retry Loading Data" for immediate refresh

**Method 2: Via Dashboard**
1. View item on screen
2. Click +/- buttons
3. Last Update automatically recorded

### Modifying Rotation Behavior

**Change Frequency Weights**:
1. Click ⚙️ Settings
2. Adjust "Display Frequency Weights"
3. Ensure total = 100%
4. Save Settings

**Example Adjustments**:
- More expired items: Increase "Expired" weight to 70%
- Even distribution: Set all weights to 20%
- Ignore fresh items: Set "Fresh" weight to 0%

**Change Rotation Speed**:
1. Click ⚙️ Settings
2. Adjust "Rotation Interval (seconds)"
3. Range: 5-300 seconds
4. Save Settings

### Updating Design Colors

**Location**: `styles.css`

**To Change Expiry Colors**:
```css
/* Find these sections and update hex codes */
body.bg-expired { background: #YOUR_COLOR; }
.expiry-section.expired { 
  background: rgba(YOUR_R, YOUR_G, YOUR_B, 0.3);
  border: 3px solid #YOUR_COLOR;
}
```

**To Change Button Colors**:
```css
.quantity-button {
  background: #YOUR_COLOR;
}
.quantity-button:hover {
  background: #YOUR_DARKER_COLOR;
}
```

### Adding New Columns to Google Sheet

**Current Process**:
1. Add column in Google Sheet
2. Update `fetchData()` in `app.js`:
```javascript
const parsedItems = rows.slice(1).map((row, index) => ({
  // ... existing fields ...
  newField: row[7] || '',  // Column H
  rowIndex: index + 2
}));
```
3. Update `updateQuantity()` if new field should be writable
4. Update display in JSX if should be visible

### Changing Sheet Structure

**If Sheet Name Changes**:
1. Update default in `config.js`:
```javascript
const DEFAULT_CONFIG = {
  sheetName: 'NewSheetName',  // Change here
  // ...
};
```
2. Users can also change via Settings

**If Column Order Changes**:
Update indices in `fetchData()`:
```javascript
category: row[0],        // Column A
itemName: row[1],        // Column B
// ... update as needed
```

### Performance Optimization

**If Dashboard Feels Slow**:
1. Increase rotation interval (reduce frequency)
2. Reduce auto-refresh frequency (currently 5 min)
3. Check network connection
4. Clear browser cache

**If Google Sheets API Quota Exceeded**:
- Free tier: 100 requests per 100 seconds
- Current usage: ~1-2 requests per minute
- If exceeded: Reduce auto-refresh frequency

### Backup & Recovery

**Backup Configuration**:
- Settings stored in browser localStorage
- Key: `inventoryDashboardSettings`
- Export: Open browser console, run:
```javascript
console.log(localStorage.getItem('inventoryDashboardSettings'));
```

**Restore Configuration**:
```javascript
localStorage.setItem('inventoryDashboardSettings', '{...copied JSON...}');
```

**Backup Data**:
- Primary data lives in Google Sheet
- Use Google Sheets version history
- Or: File → Download → CSV

---

## Future Enhancement Ideas

### Potential Features
- [ ] Search/filter functionality
- [ ] Statistics view (most used items, waste metrics)
- [ ] Shopping list generation from low stock
- [ ] Barcode scanning for quick updates
- [ ] Multiple language support
- [ ] Dark mode toggle
- [ ] Push notifications for expired items
- [ ] Historical tracking and analytics
- [ ] Multi-user support with user-specific views
- [ ] Voice control integration
- [ ] Recipes based on available ingredients

### Technical Improvements
- [ ] Progressive Web App (PWA) for offline support
- [ ] Service worker for background sync
- [ ] Better mobile optimization
- [ ] Tablet landscape mode optimization
- [ ] Accessibility improvements (WCAG compliance)
- [ ] Unit tests for utility functions
- [ ] Integration tests for API calls
- [ ] Performance monitoring

---

## Development Notes

### Why These Choices Were Made

**React without Build Tools**:
- Pros: Simple deployment, no build step, easy maintenance
- Cons: Larger bundle size, slower initial load
- Decision: Worth it for ease of maintenance and updates

**OAuth 2.0 vs API Key**:
- API keys can only READ Google Sheets
- OAuth required for WRITE operations
- Trade-off: More setup complexity for essential functionality

**localStorage for Settings**:
- Pros: Persists across sessions, no backend needed
- Cons: Can be cleared by user, per-browser
- Decision: Acceptable for single-user dashboard

**Weighted Random Selection**:
- Alternative: Strict rotation through expired first
- Decision: Random feels more natural, prevents pattern recognition
- Benefit: User doesn't learn to ignore specific times

**File Split (4 files vs 1)**:
- Original: Single HTML file (1000+ lines)
- Problem: Too large for mobile Safari to parse reliably
- Solution: Split into logical modules
- Result: More maintainable and performant

### Known Limitations

1. **Single User**: No authentication beyond OAuth (anyone with link can use)
2. **No Offline Mode**: Requires internet connection
3. **Browser Dependency**: Settings stored per browser
4. **API Rate Limits**: 100 requests per 100 seconds (free tier)
5. **No Real-time Sync**: 5-minute auto-refresh interval
6. **iPad Specific**: Optimized for iPad, may need tweaks for other devices

---

## Changelog

### Version 1.0 (October 2025)
- ✅ Initial release
- ✅ OAuth 2.0 authentication
- ✅ Read/write Google Sheets integration
- ✅ Weighted rotation algorithm
- ✅ Pantone color scheme
- ✅ Responsive iPad layout
- ✅ Settings persistence
- ✅ Debug mode with extensive logging
- ✅ Split into modular file structure

---

## Support & Contact

**For Issues**:
1. Check console logs (look for ❌ emoji)
2. Review Troubleshooting section
3. Check Google Cloud Console for API quota/errors
4. Verify Google Sheet permissions

**For Future AI Agents**:
This README contains complete documentation for maintaining and extending this project. Key files to understand:
- `config.js` - All utility functions and data transformations
- `app.js` - React components and business logic
- `styles.css` - All styling and color scheme

**Debugging Tips**:
- Console logs are extensive - use emoji filters
- Debug mode activates automatically on errors
- Test with console open for immediate feedback

---

## License & Credits

- **Created**: October 2025
- **Purpose**: Personal home inventory management
- **Technology**: React, Google Sheets API, GitHub Pages
- **License**: Personal use

---

**Last Updated**: October 17, 2025  
**Project Status**: ✅ Production Ready  
**Live URL**: https://bmbenlam.github.io/home-inventory/
