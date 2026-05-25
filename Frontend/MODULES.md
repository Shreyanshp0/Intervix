# Frontend ES Module Architecture & Standards

## Overview

This document defines the standard import/export patterns for the Intervix frontend to prevent build failures and maintain consistent module architecture across the React + Vite codebase.

**Problem Solved:**
- Docker build failures due to Vite detecting unresolved named imports
- Inconsistent module patterns causing maintainability issues
- Missing validation during development preventing early detection

**Solution:** 
- Standardized DEFAULT exports for all React components
- Named exports only for utilities, constants, and libraries
- Automated validation script to catch issues before build
- ESLint rules to enforce patterns during development

---

## 1. Component Files (React Components)

### ✅ CORRECT PATTERN

**File: `src/components/candidate/ResumeUpload.jsx`**

```javascript
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiTrash2 } from 'react-icons/fi';
import { useResumeStore } from '../../store/resumeStore';

const ResumeUpload = () => {
  const { resume, uploadResume, deleteResume } = useResumeStore();
  
  const onDrop = useCallback(async (acceptedFiles) => {
    // Implementation
  }, [uploadResume]);

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div className="resume-upload">
      {/* JSX content */}
    </div>
  );
};

// DEFAULT EXPORT - Required for this file
export default ResumeUpload;
```

### ❌ WRONG PATTERNS

**Pattern 1: Named Export Instead of Default**
```javascript
// WRONG ❌
export { ResumeUpload };
export const ResumeUpload = () => { ... };

// CORRECT ✅
const ResumeUpload = () => { ... };
export default ResumeUpload;
```

**Pattern 2: Mixing Named and Default Exports**
```javascript
// WRONG ❌
const ResumeUpload = () => { ... };
export const ResumeUpload = ResumeUpload;
export default ResumeUpload;

// CORRECT ✅
const ResumeUpload = () => { ... };
export default ResumeUpload;
```

---

## 2. Importing Components

### ✅ CORRECT PATTERN

**File: `src/pages/candidate/CandidateProfilePage.jsx`**

```javascript
// Correct: Default import (no curly braces)
import ResumeUpload from '../../components/candidate/ResumeUpload';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

// These components are then used directly:
function CandidateProfilePage() {
  return (
    <div>
      <ResumeUpload />
      <Button>Submit</Button>
      <Input placeholder="Enter name" />
    </div>
  );
}

export default CandidateProfilePage;
```

### ❌ WRONG PATTERNS

**Pattern 1: Named Import From Component**
```javascript
// WRONG ❌ - Named import syntax
import { ResumeUpload } from '../../components/candidate/ResumeUpload';

// CORRECT ✅ - Default import syntax
import ResumeUpload from '../../components/candidate/ResumeUpload';
```

**Pattern 2: Missing File Extension**
```javascript
// ACCEPTABLE (Vite resolves it)
import ResumeUpload from '../../components/candidate/ResumeUpload';

// ALSO CORRECT (explicit extension)
import ResumeUpload from '../../components/candidate/ResumeUpload.jsx';
```

---

## 3. Library Imports (Named Exports Only)

### ✅ CORRECT PATTERNS

```javascript
// React and React libraries (named exports)
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { BriefcaseBusiness, MapPin } from 'lucide-react';
import { create } from 'zustand';
import axios from 'axios';
import { clsx } from 'clsx';

// These are correct because they're external libraries
```

### ❌ WRONG PATTERNS

```javascript
// Don't try to use default imports from libraries with named exports
import React from 'react';  // Should be: import React, { useEffect } from 'react';
import useNavigate from 'react-router-dom';  // Should be: import { useNavigate } from 'react-router-dom';
```

---

## 4. Utility Functions & Helpers

### ✅ CORRECT PATTERN - Multiple Utilities in One File

**File: `src/utils/validation.js`**

```javascript
// Can use named exports for utilities
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password) {
  return password.length >= 8;
}

export function sanitizeInput(input) {
  return input.trim().replace(/[<>]/g, '');
}

// Also export default if needed
const validators = {
  validateEmail,
  validatePassword,
  sanitizeInput,
};

export default validators;
```

### ✅ CORRECT PATTERN - Import Utilities (Named Imports)

**File: `src/pages/auth/Login.jsx`**

```javascript
// Utilities use named imports (they export multiple functions)
import { validateEmail, validatePassword } from '../../utils/validation';
import { sanitizeInput } from '../../utils/validation';

// Or import as namespace
import * as validators from '../../utils/validation';

function Login() {
  const handleValidate = (email, password) => {
    if (!validators.validateEmail(email)) {
      // Error handling
    }
  };
  
  return <form>{/* ... */}</form>;
}

export default Login;
```

---

## 5. Zustand Stores

### ✅ CORRECT PATTERN

**File: `src/store/useAuthStore.js`**

```javascript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Store using named export AND default export
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Also export as default for convenience
export default useAuthStore;
```

### ✅ CORRECT PATTERN - Importing Store

**File: `src/pages/candidate/CandidateProfilePage.jsx`**

```javascript
// Named import (preferred because it's clearly a store hook)
import { useAuthStore } from '../../store/useAuthStore';

// OR default import (also works)
import useAuthStore from '../../store/useAuthStore';

function CandidateProfilePage() {
  const { user, logout } = useAuthStore();
  
  return <div>{user?.name}</div>;
}

export default CandidateProfilePage;
```

---

## 6. Pages & Layouts

### ✅ CORRECT PATTERN

**File: `src/pages/candidate/CandidateProfilePage.jsx`**

```javascript
import React, { useEffect } from 'react';
import Button from '../../components/common/Button';
import ResumeUpload from '../../components/candidate/ResumeUpload';
import { useAuthStore } from '../../store/useAuthStore';

const CandidateProfilePage = () => {
  // Implementation
  return <div>{/* ... */}</div>;
};

export default CandidateProfilePage;
```

**File: `src/components/layout/DashboardLayout.jsx`**

```javascript
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const DashboardLayout = () => {
  return (
    <div className="layout">
      <Outlet /> {/* Render child routes */}
    </div>
  );
};

export default DashboardLayout;
```

---

## 7. Index Files (Barrel Exports)

### ✅ CORRECT PATTERN - Barrel Export

**File: `src/components/index.js`**

```javascript
// Re-export components for convenient imports
export { default as Button } from './common/Button';
export { default as Input } from './common/Input';
export { default as ResumeUpload } from './candidate/ResumeUpload';
export { default as DashboardLayout } from './layout/DashboardLayout';

// Or mix default and named exports
export { default } from './App';
```

### ✅ CORRECT PATTERN - Using Barrel Exports

**File: `src/pages/candidate/JobFeed.jsx`**

```javascript
// Option 1: Import from barrel
import { Button, Input, ResumeUpload } from '../../components';

// Option 2: Direct import (more explicit)
import Button from '../../components/common/Button';

// Both patterns are acceptable
```

---

## 8. Common Mistakes & Fixes

### Mistake 1: Named Import from Component

```javascript
// ❌ WRONG - Getting Vite error: "ResumeUpload is not exported"
import { ResumeUpload } from '../../components/candidate/ResumeUpload';

// ✅ CORRECT
import ResumeUpload from '../../components/candidate/ResumeUpload';
```

### Mistake 2: Inconsistent Export Styles

```javascript
// ❌ WRONG - Component exports as both default and named
export const MyComponent = () => { ... };
export default MyComponent;

// ✅ CORRECT - Only default export
const MyComponent = () => { ... };
export default MyComponent;

// ✅ ALSO CORRECT - Only named export (for utilities)
export const myUtility = () => { ... };
```

### Mistake 3: Forgetting Extension for Index Files

```javascript
// ❌ WRONG - Forgetting /index
import Button from '../../components/common'; // Might not resolve

// ✅ CORRECT - Vite auto-resolves index files
import Button from '../../components/common/Button'; // Direct import

// ✅ ALSO CORRECT - With barrel export
import Button from '../../components'; // From barrel index.js
```

### Mistake 4: Relative Import Going Too Far

```javascript
// ❌ WRONG - Relative import with too many ../ 
import Button from '../../../components/common/Button';

// ✅ BETTER - Use alias (if configured in vite.config.js)
import Button from '~/components/common/Button';

// ✅ ACCEPTABLE - But count your levels carefully
import Button from '../../components/common/Button';
```

---

## 9. Validation & Build

### Validate Imports Before Build

```bash
# Run validation script
npm run validate:imports

# Output example - Success:
# ✅ All imports/exports are consistent!

# Output example - Error:
# ❌ NAMED_IMPORT_NO_EXPORT
# File: src/pages/candidate/CandidateProfilePage.jsx:8
# Named import {ResumeUpload} from component file
# Suggestion: Use default import instead:
# import ResumeUpload from '../../components/candidate/ResumeUpload';
```

### Build with Validation

```bash
# Build (automatically validates first)
npm run build

# If validation fails, build stops with error
# If validation passes, Vite proceeds with build
```

---

## 10. ESLint Rules

### Enabled Rules

- ✅ `import/no-unresolved` - Catch missing exports
- ✅ `import/named` - Validate named imports match exports  
- ✅ `import/default` - Validate default imports
- ✅ `import/export` - Ensure exports are defined
- ✅ `import/no-cycle` - Detect circular dependencies
- ✅ `import/order` - Enforce import ordering
- ✅ `import/extensions` - Consistent extension handling

### Fixed Issues

- ❌ Removed `import/prefer-default-export` (too restrictive)
- ❌ Removed `import/no-default-export` (conflicts with component pattern)

---

## 11. Quick Reference Table

| Item | Pattern | Import | Export |
|------|---------|--------|--------|
| **Components** | `ResumeUpload.jsx` | `import ResumeUpload from './ResumeUpload'` | `export default ResumeUpload` |
| **Pages** | `LoginPage.jsx` | `import LoginPage from './LoginPage'` | `export default LoginPage` |
| **Layouts** | `DashboardLayout.jsx` | `import DashboardLayout from './DashboardLayout'` | `export default DashboardLayout` |
| **Utilities** | `validation.js` | `import { validate } from './validation'` | `export function validate() {}` |
| **Stores** | `useAuthStore.js` | `import { useAuthStore } from './useAuthStore'` | `export const useAuthStore = create(...)` |
| **Libraries** | `react`, `zustand` | `import { useState } from 'react'` | (external) |
| **Barrel Files** | `components/index.js` | `import { Button } from './'` | `export { default as Button }` |

---

## 12. Checklists

### Creating a New Component

- [ ] File uses `.jsx` extension
- [ ] Component is a const/function: `const MyComponent = () => { ... }`
- [ ] Exports as default: `export default MyComponent`
- [ ] Imported without curly braces: `import MyComponent from '...'`
- [ ] Uses dependencies from store/utils via named imports
- [ ] No `export { }` syntax used

### Creating a New Utility File

- [ ] File uses `.js` extension
- [ ] Exports functions as named exports: `export function myUtil() {}`
- [ ] Optionally exports a default barrel: `export default { myUtil, ... }`
- [ ] Imported with curly braces: `import { myUtil } from '...'`

### Before Building

- [ ] Run `npm run validate:imports` with zero errors
- [ ] Check ESLint: `npm run lint` with no critical issues
- [ ] Test locally: `npm run dev` works without console errors
- [ ] Verify imports are correct for all modified files

---

## 13. Troubleshooting

### Error: "X is not exported by Y"

**Cause:** Named import from a file that only has default export

**Solution:** 
```javascript
// Change this:
import { ResumeUpload } from './ResumeUpload';

// To this:
import ResumeUpload from './ResumeUpload';
```

### Error: "Cannot find module 'X'"

**Cause:** Incorrect relative path or missing file

**Solution:**
1. Check file exists at correct path
2. Verify path is relative from importing file
3. Use `npm run validate:imports` to find exact issue
4. Consider using barrel exports for easier imports

### Error: "CIRCULAR_DEPENDENCY"

**Cause:** Files import each other (A imports B, B imports A)

**Solution:**
1. Identify circular dependency from error message
2. Extract shared logic to a third file
3. Move common functions/types to utility files
4. Use late imports if necessary (import inside function)

---

## 14. Future Improvements

- [ ] Add TypeScript support for stricter type checking
- [ ] Implement pre-commit hooks to validate imports
- [ ] Add GitHub Actions workflow for CI validation
- [ ] Generate import dependency graph visualization
- [ ] Auto-fix tool for common import/export issues
- [ ] Documentation generation from code analysis

---

## 15. Migration Checklist

If converting existing files to new standards:

- [ ] Audit all existing imports and exports
- [ ] Run `npm run validate:imports` to identify mismatches
- [ ] Fix component exports (use `export default`)
- [ ] Fix component imports (remove curly braces)
- [ ] Update barrel files if they exist
- [ ] Test locally with `npm run dev`
- [ ] Run full build with `npm run build`
- [ ] Verify Docker build succeeds

---

**Last Updated:** 2024
**Owner:** DevOps/Frontend Architecture Team
**Status:** ACTIVE - All new code must follow these standards
