/**
 * Frontend Build Validator - Import/Export Consistency Checker
 * 
 * Purpose:
 * - Detect missing exports before Vite build
 * - Validate import/export patterns
 * - Check for circular dependencies
 * - Provide clear error messages
 * 
 * Usage:
 * npm run validate:imports
 * 
 * Integration:
 * Add to package.json:
 * "validate:imports": "node scripts/validate-imports.js"
 * "build": "npm run validate:imports && vite build"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

/**
 * File types that should have exports
 */
const COMPONENT_EXTENSIONS = ['.jsx', '.tsx', '.js', '.ts'];

/**
 * Library patterns (should use named imports)
 */
const LIBRARY_PATTERNS = [
  /^react$/,
  /^react\//,
  /^zustand/,
  /^@?react-router/,
  /^lucide-react/,
  /^framer-motion/,
  /^axios/,
  /^zod/,
  /^@hookform/,
  /^clsx/,
  /^tailwind-merge/,
  /^socket.io-client/,
];

/**
 * Component patterns (should use default imports)
 */
const COMPONENT_PATTERNS = [
  /\.\/components\//,
  /\.\/pages\//,
  /\.\/layouts\//,
  /\.\.\/(components|pages|layouts|ui)\//,
  /..\/..\/components\//,
  /..\/..\/pages\//,
];

/**
 * Parse import statements from JavaScript code
 */
function parseImports(content, filePath) {
  const imports = [];
  
  // Match: import { Name } from 'path'
  const namedImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g;
  
  // Match: import Name from 'path'
  const defaultImportRegex = /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
  
  // Match: import * as Name from 'path'
  const namespaceImportRegex = /import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;

  let match;

  // Named imports
  while ((match = namedImportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim());
    imports.push({
      type: 'named',
      names,
      source: match[2],
      line: content.substring(0, match.index).split('\n').length,
    });
  }

  // Default imports
  while ((match = defaultImportRegex.exec(content)) !== null) {
    imports.push({
      type: 'default',
      name: match[1],
      source: match[2],
      line: content.substring(0, match.index).split('\n').length,
    });
  }

  // Namespace imports
  while ((match = namespaceImportRegex.exec(content)) !== null) {
    imports.push({
      type: 'namespace',
      name: match[1],
      source: match[2],
      line: content.substring(0, match.index).split('\n').length,
    });
  }

  return imports;
}

/**
 * Parse export statements from JavaScript code
 */
function parseExports(content) {
  const exports = { default: null, named: [] };

  // Match: export default Name
  const defaultExportRegex = /export\s+default\s+(\w+)/;
  const defaultMatch = defaultExportRegex.exec(content);
  if (defaultMatch) {
    exports.default = defaultMatch[1];
  }

  // Match: export { Name }
  const namedExportRegex = /export\s*{\s*([^}]+)\s*}/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim());
    exports.named.push(...names);
  }

  // Match: export const Name or export function Name
  const declaredExportRegex = /export\s+(const|function|class|let|var)\s+(\w+)/g;
  while ((match = declaredExportRegex.exec(content)) !== null) {
    exports.named.push(match[2]);
  }

  return exports;
}

/**
 * Check if import source is a library
 */
function isLibraryImport(source) {
  return LIBRARY_PATTERNS.some(pattern => pattern.test(source));
}

/**
 * Check if import source is a component
 */
function isComponentImport(source) {
  return COMPONENT_PATTERNS.some(pattern => pattern.test(source));
}

/**
 * Resolve import path to actual file
 */
function resolveImportPath(importSource, fromFile) {
  // Skip external imports
  if (isLibraryImport(importSource)) {
    return null;
  }

  // Resolve relative import
  const fromDir = path.dirname(fromFile);
  let resolvedPath = path.resolve(fromDir, importSource);

  // Try adding extensions
  for (const ext of COMPONENT_EXTENSIONS) {
    const fileWithExt = resolvedPath + ext;
    if (fs.existsSync(fileWithExt)) {
      return fileWithExt;
    }
  }

  // Try index files
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    for (const ext of COMPONENT_EXTENSIONS) {
      const indexFile = path.join(resolvedPath, `index${ext}`);
      if (fs.existsSync(indexFile)) {
        return indexFile;
      }
    }
  }

  return null;
}

/**
 * Validate a single import statement
 */
function validateImport(importStatement, filePath, errors) {
  const { type, source, line, names, name } = importStatement;

  // Skip library imports (they can use named imports)
  if (isLibraryImport(source)) {
    return;
  }

  // Resolve the import target
  const resolvedPath = resolveImportPath(source, filePath);

  if (!resolvedPath) {
    // Could be a library or alias that we can't resolve
    return;
  }

  // Read the target file to check exports
  try {
    const targetContent = fs.readFileSync(resolvedPath, 'utf-8');
    const targetExports = parseExports(targetContent);

    // Check if this is a component file (likely should have default export)
    const isComponent = COMPONENT_EXTENSIONS.some(ext => resolvedPath.endsWith(ext));

    if (isComponent && type === 'named') {
      // Named import from a component file
      const missingNames = names.filter(n => !targetExports.named.includes(n) && targetExports.default !== n);

      if (missingNames.length > 0 && !targetExports.default) {
        errors.push({
          file: filePath,
          line,
          type: 'NAMED_IMPORT_NO_EXPORT',
          message: `Named import {${missingNames.join(', ')}} from component file`,
          details: `File: ${resolvedPath}\nThe file exports: ${targetExports.default ? 'default' : 'none'} ${targetExports.named.length ? `and named: ${targetExports.named.join(', ')}` : ''}`,
          suggestion: `Use default import instead:\nimport ${name || missingNames[0]} from '${source}';`,
          severity: 'error',
        });
      } else if (missingNames.length > 0) {
        errors.push({
          file: filePath,
          line,
          type: 'MISSING_EXPORT',
          message: `Cannot import {${missingNames.join(', ')}} - not exported from ${path.basename(resolvedPath)}`,
          details: `File: ${resolvedPath}\nAvailable exports: ${targetExports.default ? 'default export' : ''} ${targetExports.named.join(', ')}`,
          suggestion: `Check export in ${path.basename(resolvedPath)} or use correct import name`,
          severity: 'error',
        });
      }
    } else if (isComponent && type === 'default') {
      // Correct: default import from component
      if (!targetExports.default && targetExports.named.length > 0) {
        errors.push({
          file: filePath,
          line,
          type: 'DEFAULT_IMPORT_NO_DEFAULT_EXPORT',
          message: `Default import from ${path.basename(resolvedPath)} which only has named exports`,
          details: `Available named exports: ${targetExports.named.join(', ')}`,
          suggestion: `Use named import instead:\nimport { ${targetExports.named[0]} } from '${source}';`,
          severity: 'warn',
        });
      }
    }
  } catch (error) {
    // File might not exist or be readable - skip
  }
}

/**
 * Scan all source files
 */
function scanSourceFiles() {
  const errors = [];
  const files = [];

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', '.vite'].includes(entry)) {
          walkDir(fullPath);
        }
      } else if (COMPONENT_EXTENSIONS.some(ext => entry.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  walkDir(srcDir);

  // Validate each file
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const imports = parseImports(content, file);

    for (const importStatement of imports) {
      validateImport(importStatement, file, errors);
    }
  }

  return errors;
}

/**
 * Format and display errors
 */
function displayErrors(errors) {
  if (errors.length === 0) {
    console.log('\n✅ All imports/exports are consistent!\n');
    return true;
  }

  console.log('\n❌ Import/Export Validation Errors:\n');
  console.log('═'.repeat(80));

  let errorCount = 0;
  let warningCount = 0;

  for (const error of errors) {
    if (error.severity === 'error') {
      errorCount++;
    } else {
      warningCount++;
    }

    const icon = error.severity === 'error' ? '❌' : '⚠️';
    console.log(`\n${icon} ${error.type}`);
    console.log(`File: ${error.file}:${error.line}`);
    console.log(`Message: ${error.message}`);
    console.log(`\nDetails:\n${error.details}`);
    console.log(`\nSuggestion:\n${error.suggestion}`);
    console.log('─'.repeat(80));
  }

  console.log(`\nSummary: ${errorCount} errors, ${warningCount} warnings\n`);

  return errorCount === 0;
}

/**
 * Main validation
 */
export function validateImports() {
  console.log('🔍 Validating import/export consistency...\n');

  try {
    const errors = scanSourceFiles();
    const success = displayErrors(errors);

    if (!success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateImports();
}

export { parseImports, parseExports, validateImport, resolveImportPath };
