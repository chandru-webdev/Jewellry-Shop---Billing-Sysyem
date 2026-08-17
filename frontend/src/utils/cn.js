// Tiny helper that joins class names, skipping falsy values.
// Usage: cn('px-2', isActive && 'bg-royal-600')
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
