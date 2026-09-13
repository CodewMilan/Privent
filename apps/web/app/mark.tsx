export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="10" fill="none" stroke="#2020df" strokeWidth="1.4" />
      <path
        d="M11 4.2v13.6M4.2 11h13.6M6.6 6.6l8.8 8.8M15.4 6.6l-8.8 8.8"
        stroke="#2020df"
        strokeWidth="1.4"
      />
    </svg>
  );
}
