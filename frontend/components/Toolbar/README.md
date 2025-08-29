# Toolbar Components

This directory contains the modular toolbar components for the NextBrowse file manager.

## Components Structure

### Main Component

- **`index.tsx`** - Main toolbar wrapper that orchestrates all sub-components

### Sub-Components

- **`NavigationButtons.tsx`** - Back and Refresh buttons with responsive sizing
- **`CreateFolderButton.tsx`** - Folder creation with inline input and validation
- **`SelectionActions.tsx`** - File selection actions (Move, Copy, Delete, Clear)
- **`SearchInput.tsx`** - Search input with clear functionality
- **`ViewModeToggle.tsx`** - Grid/List view mode switcher
- **`SortControl.tsx`** - Sort dropdown with proper z-index handling
- **`HiddenFilesToggle.tsx`** - Show/Hide hidden files toggle
- **`SelectAllButton.tsx`** - Select all files button
- **`Divider.tsx`** - Responsive gradient dividers

## Key Features

### 🎯 **Fixed Sort Dropdown Issues**

- Uses `fixed` positioning with proper z-index (`z-[9999]`)
- Calculates position using `getBoundingClientRect()`
- No longer gets hidden behind page content
- Enhanced shadow and backdrop blur for better visibility

### 📱 **Mobile-First Responsive Design**

- **Icons**: `h-3 w-3` on mobile, `h-4 w-4` on larger screens
- **Padding**: `px-2 py-1.5` on mobile, `px-4 py-2.5` on desktop
- **Borders**: `rounded-md` on mobile, `rounded-lg` on desktop
- **Text**: Hidden on mobile for most buttons, visible on `sm:` and up
- **Compact layout**: Reduced gaps and spacing for mobile efficiency

### 🧩 **Modular Architecture**

- Each component handles its own state and logic
- Easy to test, maintain, and extend
- Clean separation of concerns
- Reusable components

### 🎨 **Enhanced Styling**

- Professional glass morphism design
- Smooth micro-interactions and hover effects
- Better color hierarchy and contrast
- Improved dark mode support

## Usage

```tsx
import Toolbar from "@/components/Toolbar";

// All props are the same as before
<Toolbar
  selectedCount={selectedCount}
  viewMode={viewMode}
  sortBy={sortBy}
  sortOrder={sortOrder}
  searchQuery={searchQuery}
  showHidden={showHidden}
  onViewModeChange={onViewModeChange}
  onSortChange={onSortChange}
  // ... other props
/>;
```

## Migration Note

The legacy `../Toolbar.tsx` file now simply re-exports the new modular toolbar, ensuring backward compatibility. All existing imports will continue to work without changes.
