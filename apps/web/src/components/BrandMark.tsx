/** Original Paperpiece logo mark — interlocking territory tiles. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="4" y="4" width="18" height="18" rx="4" fill="#06d6a0" />
      <rect x="26" y="4" width="18" height="18" rx="4" fill="#3a86ff" opacity="0.85" />
      <rect x="4" y="26" width="18" height="18" rx="4" fill="#3a86ff" opacity="0.85" />
      <rect x="26" y="26" width="18" height="18" rx="4" fill="#06d6a0" />
      <rect x="18" y="18" width="12" height="12" rx="3" fill="#ffd166" />
    </svg>
  );
}
