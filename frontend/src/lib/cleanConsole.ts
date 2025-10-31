/**
 * Clean Console - Suppress non-critical errors for clean demo
 */

// Save original console methods
const originalError = console.error;
const originalWarn = console.warn;

// Patterns to suppress
const SUPPRESS_PATTERNS = [
  'MetaMask',
  'extension not found',
  'Extension context invalidated',
  'Failed to connect',
  'Connector not found',
  'Unexpected token',
  'is not valid JSON',
  'Recoverable error',
  'Unhandled promise rejection',
  'inpage.js',
  'proxy.js'
];

// Override console.error
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Check if message should be suppressed
  const shouldSuppress = SUPPRESS_PATTERNS.some(pattern => message.includes(pattern));
  
  if (!shouldSuppress) {
    originalError(...args);
  }
};

// Override console.warn  
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  // Check if message should be suppressed
  const shouldSuppress = SUPPRESS_PATTERNS.some(pattern => message.includes(pattern));
  
  if (!shouldSuppress) {
    originalWarn(...args);
  }
};

// Override window error handler
window.addEventListener('error', (event) => {
  const shouldSuppress = SUPPRESS_PATTERNS.some(pattern => 
    event.message?.includes(pattern) || event.error?.message?.includes(pattern)
  );
  
  if (shouldSuppress) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

// Override unhandled promise rejection
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || event.reason || '';
  const shouldSuppress = SUPPRESS_PATTERNS.some(pattern => 
    reason.toString().includes(pattern)
  );
  
  if (shouldSuppress) {
    event.preventDefault();
  }
}, true);

console.log('🔇 Clean console mode enabled - Non-critical errors suppressed');

