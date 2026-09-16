import React, { useId } from 'react';

export interface StructraLogoProps {
  layout?: 'horizontal' | 'stacked' | 'icon' | 'text';
  variant?: 'full' | 'icon' | 'text'; // Official 2-version support: full vs icon
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  onClick?: () => void;
  className?: string;
  showTagline?: boolean;
  isDarkBackground?: boolean;
}

export const StructraLogo: React.FC<StructraLogoProps> = ({
  layout,
  variant,
  size = 'md',
  onClick,
  className = '',
  showTagline = false,
  isDarkBackground = false,
}) => {
  // Generate unique base ID for SVG gradients to prevent duplicate DOM ID collisions
  const rawId = useId();
  const baseId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const ribbonGradId = `structra-ribbon-${baseId}`;
  const docGradId = `structra-doc-${baseId}`;
  const docShadowId = `structra-shadow-${baseId}`;

  // Determine effective layout: 'icon' (Icon Only) or 'horizontal' / 'full' (Full Logo)
  const effectiveLayout = layout || (variant === 'icon' ? 'icon' : variant === 'text' ? 'text' : 'horizontal');

  // Dimension mapping for Icon (height driven to maintain exact tight aspect ratio)
  const iconDimensions = {
    sm: 'h-7 sm:h-8 w-auto',
    md: 'h-9 sm:h-10 md:h-11 w-auto',
    lg: 'h-12 sm:h-14 w-auto',
    xl: 'h-16 sm:h-20 w-auto',
    auto: 'h-full w-auto',
  }[size];

  // Font size mapping for Wordmark (Matching heavy bold geometric weight in reference)
  const textSizeClasses = {
    sm: 'text-2xl sm:text-2xl',
    md: 'text-3xl sm:text-3.5xl md:text-4xl',
    lg: 'text-4xl sm:text-5xl',
    xl: 'text-5xl sm:text-6xl',
    auto: 'text-3xl',
  }[size];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  // Modern Structra S Symbol matching reference image
  const IconSVG = (
    <div className={`relative shrink-0 flex items-center justify-center ${iconDimensions}`}>
      <svg
        className="w-full h-full object-contain pointer-events-none transition-transform duration-200 group-hover:scale-[1.02]"
        viewBox="0 0 210 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Structra S Icon"
        role="img"
      >
        <defs>
          {/* S Ribbon Gradient: Bright Purple #A855F7 -> #7C3AED -> #3B82F6 -> Deep Blue #1D4ED8 */}
          <linearGradient id={ribbonGradId} x1="30" y1="20" x2="180" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="28%" stopColor="#8B5CF6" />
            <stop offset="55%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Document Fill Gradient */}
          <linearGradient id={docGradId} x1="80" y1="40" x2="140" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          {/* Drop shadow for embedded document card */}
          <filter id={docShadowId} x="65" y="30" width="80" height="98" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* --- Floating AI Particles (Left side indexing effect) --- */}
        <g>
          {/* Top-right particle */}
          <rect x="28" y="94" width="10" height="10" rx="3" fill="#8B5CF6" />
          {/* Top-left particle */}
          <rect x="14" y="104" width="8" height="8" rx="2.5" fill="#A855F7" opacity="0.9" />
          {/* Bottom-right particle */}
          <rect x="32" y="118" width="12" height="12" rx="3.5" fill="#7C3AED" />
          {/* Bottom-left particle */}
          <rect x="8" y="126" width="7" height="7" rx="2" fill="#9333EA" opacity="0.8" />
        </g>

        {/* --- Embedded Document Card inside Upper Loop --- */}
        <g filter={`url(#${docShadowId})`}>
          {/* Main Card with clipped fold corner */}
          <path
            d="M 82 52 C 82 46 87 41 93 41 H 122 L 136 55 V 105 C 136 111 131 116 125 116 H 93 C 87 116 82 111 82 105 Z"
            fill={`url(#${docGradId})`}
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />

          {/* Folded Top-Right Corner */}
          <path
            d="M 122 41 V 55 H 136 Z"
            fill="#CBD5E1"
          />
          <path
            d="M 122 41 L 136 55 H 125 C 123.3 55 122 53.7 122 52 Z"
            fill="#F1F5F9"
          />

          {/* Document Lines */}
          <line x1="92" y1="65" x2="118" y2="65" stroke="#7C3AED" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="92" y1="78" x2="125" y2="78" stroke="#8B5CF6" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="92" y1="91" x2="112" y2="91" stroke="#3B82F6" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="120" cy="91" r="2.2" fill="#3B82F6" />
        </g>

        {/* --- Bold Smooth S Ribbon Loop --- */}
        <path
          d="M 152 54 C 152 30 118 18 88 28 C 56 38 46 72 62 102 C 78 132 148 128 158 158 C 168 188 140 216 100 216 C 66 216 48 196 52 178"
          stroke={`url(#${ribbonGradId})`}
          strokeWidth="36"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  // Modern Bold Wordmark "tructra" (or "Structra" if text-only)
  const Wordmark = (
    <div className={`flex flex-col ${effectiveLayout === 'stacked' ? 'items-center text-center' : 'justify-center'}`}>
      <span
        className={`font-black tracking-tighter leading-none ${textSizeClasses} ${
          isDarkBackground ? 'text-white' : 'text-slate-900 dark:text-slate-100'
        }`}
        style={{
          fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: 850,
          letterSpacing: '-0.03em',
        }}
      >
        {effectiveLayout === 'text' ? 'Structra' : 'tructra'}
      </span>

      {showTagline && (
        <span
          className={`text-[11px] font-medium tracking-normal mt-1.5 ${
            isDarkBackground ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Turn Scattered Business Documents Into Instant Answers in Seconds.
        </span>
      )}
    </div>
  );

  // Layout Container: Full Logo (horizontal / stacked) or Icon Only
  let layoutContent;
  if (effectiveLayout === 'icon') {
    layoutContent = IconSVG;
  } else if (effectiveLayout === 'text') {
    layoutContent = Wordmark;
  } else if (effectiveLayout === 'stacked') {
    layoutContent = (
      <div className={`inline-flex flex-col items-center gap-2 select-none ${className}`}>
        {IconSVG}
        {Wordmark}
      </div>
    );
  } else {
    // Horizontal (Unified Logo: S Icon + tructra spelling 'Structra' as one seamless mark)
    layoutContent = (
      <div className={`inline-flex items-center -space-x-0.5 sm:-space-x-1 select-none ${className}`}>
        {IconSVG}
        {Wordmark}
      </div>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="Structra Logo"
        className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-xl transition-opacity hover:opacity-95 text-left inline-flex items-center"
      >
        {layoutContent}
      </button>
    );
  }

  return (
    <div aria-label="Structra Logo" role="img" className="inline-flex items-center">
      {layoutContent}
    </div>
  );
};

