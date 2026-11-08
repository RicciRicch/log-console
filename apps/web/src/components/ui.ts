// Privremene Tailwind klase dok Dule ne napravi komponente iz DESIGN.md (Impeccable).
export const ui = {
  input:
    'w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none',
  label: 'block text-sm font-medium text-neutral-800',
  button:
    'rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50',
  buttonSecondary:
    'rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50',
  buttonDanger:
    'rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50',
  card: 'rounded border border-neutral-200 bg-white p-6',
  h1: 'text-xl font-semibold text-neutral-900',
  h2: 'text-base font-semibold text-neutral-900',
  muted: 'text-sm text-neutral-600',
  table: 'w-full border-collapse text-sm',
  th: 'border-b border-neutral-200 py-2 pr-4 text-left font-medium text-neutral-600',
  td: 'border-b border-neutral-100 py-2 pr-4 align-middle',
} as const;
