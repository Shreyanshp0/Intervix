/**
 * Package.json Build Scripts Configuration
 * 
 * Add these scripts to Frontend/package.json under the "scripts" section
 * to enable import validation and standardized build process
 */

{
  "name": "intervix-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    // Development
    "dev": "vite",
    "preview": "vite preview",
    
    // Linting and Code Quality
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix",
    
    // Validation - NEW
    "validate:imports": "node scripts/validate-imports.js",
    "validate:all": "npm run lint && npm run validate:imports",
    
    // Building - UPDATED
    "build:validate": "npm run validate:all",
    "build": "npm run build:validate && vite build",
    "build:no-validate": "vite build",  // For emergency builds only
    
    // Testing
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    
    // Type checking (if using TypeScript)
    "type-check": "tsc --noEmit",
    
    // Docker
    "docker:build": "docker build -t intervix-frontend:latest .",
    "docker:run": "docker run -p 3000:80 intervix-frontend:latest"
  },

  "dependencies": {
    // React
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.0.0",
    
    // State Management
    "zustand": "^4.4.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^3.0.0",
    
    // UI & Icons
    "tailwindcss": "^3.0.0",
    "lucide-react": "^0.0.0",
    "react-icons": "^4.0.0",
    "framer-motion": "^10.0.0",
    "react-dropzone": "^14.0.0",
    
    // Validation
    "zod": "^3.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    
    // API & Socket
    "axios": "^1.0.0",
    "socket.io-client": "^4.0.0"
  },

  "devDependencies": {
    // Build tools
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    
    // Linting
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react": "^7.0.0",
    "eslint-plugin-import": "^2.0.0",
    "eslint-plugin-unused-imports": "^3.0.0",
    "eslint-flat-config-utils": "^0.1.0",
    
    // Testing
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    
    // Type checking (optional)
    "typescript": "^5.0.0"
  }
}

/**
 * INSTALLATION INSTRUCTIONS
 * 
 * 1. Install dependencies:
 *    npm install
 * 
 * 2. Install new linting dependencies:
 *    npm install --save-dev eslint-plugin-import eslint-plugin-unused-imports
 * 
 * 3. Update package.json scripts section with the above
 * 
 * 4. Test validation script:
 *    npm run validate:imports
 * 
 * 5. Test build process:
 *    npm run build
 * 
 * USAGE
 * 
 * Development:
 *   npm run dev          # Start development server
 *   npm run lint         # Check code quality
 *   npm run lint:fix     # Auto-fix linting issues
 * 
 * Validation:
 *   npm run validate:imports  # Check import/export consistency
 *   npm run validate:all      # Run all validations
 * 
 * Building:
 *   npm run build        # Build with full validation (recommended)
 *   npm run build:no-validate  # Skip validation (emergency only)
 * 
 * Docker:
 *   npm run docker:build # Build Docker image
 *   npm run docker:run   # Run Docker container
 */
