import React, { useState } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark' | 'light' | 'original'; // 'dark' for dark text on white, 'light' for white text on navy, 'original' for official colors
  showSubtitle?: boolean;
  className?: string;
  iconOnly?: boolean;
}

export const BrandMarkIcon: React.FC<{ sizeClass?: string; className?: string }> = ({
  sizeClass = 'w-9 h-9',
  className = '',
}) => {
  const [imgSrcIndex, setImgSrcIndex] = useState(0);
  const candidateSources = [
    '/brand/MPT_logo_1.png',
    '/brand/myprojecttrace-logo.png',
    'https://raw.githubusercontent.com/usceriverau/myprojecttrace-assets/main/MPT_logo_1.png',
  ];

  // If external PNG/SVG logo is present, render it; otherwise fallback to the vector SVG mark
  if (imgSrcIndex < candidateSources.length) {
    return (
      <img
        src={candidateSources[imgSrcIndex]}
        alt="MyProjectTrace Logo"
        className={`${sizeClass} object-contain shrink-0 ${className}`}
        onError={() => setImgSrcIndex(prev => prev + 1)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <svg
      viewBox="0 0 120 120"
      className={`${sizeClass} shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MyProjectTrace Icon"
    >
      {/* Document Body with cut corner */}
      <path
        d="M 34 100 C 26 100 20 94 20 86 L 20 22 C 20 14 26 8 34 8 L 74 8 L 100 34 L 100 86 C 100 94 94 100 86 100 Z"
        fill="#FFFFFF"
        stroke="#03225F"
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* Top-Right Blue Folded Corner */}
      <path
        d="M 74 8 L 100 34 L 74 34 Z"
        fill="#0055D4"
      />

      {/* Inner Dotted Grey Flow Track */}
      <path
        d="M 44 48 C 44 36 68 36 68 48 C 68 62 48 66 48 80"
        stroke="#CBD5E1"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="2 7"
      />

      {/* Rising Vibrant Blue Trace Line */}
      <path
        d="M 16 88 C 26 86 38 74 44 64 C 50 54 58 46 68 46"
        stroke="#0055D4"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Start Node (Bottom Left outside/edge) */}
      <circle cx="14" cy="88" r="8" fill="#FFFFFF" stroke="#0055D4" strokeWidth="5" />

      {/* Middle Node */}
      <circle cx="44" cy="64" r="6" fill="#0055D4" />

      {/* End Node (Top Right Inside) */}
      <circle cx="68" cy="46" r="6.5" fill="#FFFFFF" stroke="#0055D4" strokeWidth="4.5" />

      {/* Verified Blue Checkmark Badge */}
      <circle cx="94" cy="86" r="17" fill="#0055D4" />
      <path
        d="M 87 86 L 92 91 L 102 80"
        stroke="#FFFFFF"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'light',
  showSubtitle = false,
  className = '',
  iconOnly = false,
}) => {
  // Sizing configurations
  const config = {
    sm: {
      iconSize: 'w-7 h-7',
      textClass: 'text-base',
      subSize: 'text-[9px]',
      gap: 'gap-2',
    },
    md: {
      iconSize: 'w-9 h-9',
      textClass: 'text-xl',
      subSize: 'text-[11px]',
      gap: 'gap-2.5',
    },
    lg: {
      iconSize: 'w-12 h-12',
      textClass: 'text-2xl sm:text-3xl',
      subSize: 'text-xs',
      gap: 'gap-3',
    },
    xl: {
      iconSize: 'w-16 h-16',
      textClass: 'text-3xl sm:text-4xl',
      subSize: 'text-sm',
      gap: 'gap-3.5',
    },
  }[size];

  // Text color schemes based on variant
  const getWordmarkColors = () => {
    if (variant === 'light') {
      // For dark headers / dark navy surfaces
      return {
        my: 'text-white',
        project: 'text-[#38BDF8]',
        trace: 'text-white',
        sub: 'text-[#7FA0D4]',
      };
    }
    if (variant === 'original' || variant === 'dark') {
      // Official colors: "My" (Deep Navy) + "Project" (Vibrant Royal Blue) + "Trace" (Deep Navy)
      return {
        my: 'text-[#03225F]',
        project: 'text-[#0055D4]',
        trace: 'text-[#03225F]',
        sub: 'text-slate-500',
      };
    }
    return {
      my: 'text-slate-900',
      project: 'text-[#0055D4]',
      trace: 'text-slate-900',
      sub: 'text-slate-500',
    };
  };

  const colors = getWordmarkColors();

  if (iconOnly) {
    return <BrandMarkIcon sizeClass={config.iconSize} className={className} />;
  }

  return (
    <div className={`flex items-center ${config.gap} select-none ${className}`}>
      <BrandMarkIcon sizeClass={config.iconSize} />

      <div className="flex flex-col justify-center">
        <div className={`font-bold tracking-tight ${config.textClass} leading-none flex items-baseline font-sans`}>
          <span className={colors.my}>My</span>
          <span className={colors.project}>Project</span>
          <span className={colors.trace}>Trace</span>
        </div>

        {showSubtitle && (
          <p className={`${config.subSize} ${colors.sub} font-semibold tracking-wide uppercase mt-1`}>
            Project Financial Capture
          </p>
        )}
      </div>
    </div>
  );
};
