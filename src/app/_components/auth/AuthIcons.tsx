import type { SVGProps } from "react";

export function AirtableMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true" {...props}>
      <polygon points="3,22 29,9 29,31 3,43" fill="#f82b60" />
      <polygon points="29,9 57,3 77,14 48,22" fill="#fed12f" />
      <polygon points="29,31 29,57 77,37 77,14" fill="#20c4f4" />
    </svg>
  );
}

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#EA4335" d="M12 10.2v4.22h5.88c-.26 1.37-1.84 4.02-5.88 4.02-3.54 0-6.43-2.93-6.43-6.54s2.89-6.54 6.43-6.54c2.02 0 3.37.86 4.15 1.61l2.83-2.74C17.2 2.68 14.87 1.7 12 1.7 6.34 1.7 1.75 6.36 1.75 12s4.59 10.3 10.25 10.3 9.81-3.98 9.81-9.58c0-.64-.07-1.13-.15-1.62H12z" />
      <path fill="#34A853" d="M1.75 6.03l3.28 2.41A6.55 6.55 0 0 1 12 5.46c2.02 0 3.37.86 4.15 1.61l2.83-2.74C17.2 2.68 14.87 1.7 12 1.7A10.23 10.23 0 0 0 1.75 6.03z" opacity=".01" />
      <path fill="#FBBC05" d="M1.75 12c0 1.81.48 3.51 1.33 4.98l3.82-2.95a6.41 6.41 0 0 1-.37-2.03c0-.7.13-1.38.36-2.02L3.07 7.03A10.2 10.2 0 0 0 1.75 12z" />
      <path fill="#34A853" d="M12 22.3c2.87 0 5.28-.95 7.04-2.59l-3.42-2.65c-.93.65-2.13 1.1-3.62 1.1-2.5 0-4.62-1.68-5.38-3.95L2.8 17.14A10.24 10.24 0 0 0 12 22.3z" />
      <path fill="#4285F4" d="M21.81 12.72c0-.64-.07-1.13-.15-1.62H12v4.22h5.88a5.96 5.96 0 0 1-2.27 2.84l3.42 2.65c1.99-1.83 3.14-4.54 3.14-8.09z" />
    </svg>
  );
}

export function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.37 12.95c.02 2.08 1.82 2.77 1.84 2.78-.02.05-.29 1-.95 1.98-.57.84-1.16 1.67-2.1 1.69-.92.02-1.22-.55-2.27-.55-1.06 0-1.39.53-2.24.57-.9.03-1.58-.9-2.16-1.74-1.17-1.69-2.06-4.8-.86-6.88.6-1.03 1.66-1.68 2.81-1.7.88-.02 1.7.59 2.27.59.56 0 1.6-.73 2.7-.62.46.02 1.75.19 2.58 1.39-.07.05-1.54.9-1.52 2.49Zm-2.06-5.7c.48-.58.81-1.4.72-2.2-.69.03-1.52.46-2.02 1.04-.45.52-.84 1.36-.74 2.16.77.06 1.56-.39 2.04-1Z" />
    </svg>
  );
}

export function SsoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" {...props}>
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <path d="M5 6.5h6M5 9.5h4" strokeLinecap="round" />
    </svg>
  );
}
