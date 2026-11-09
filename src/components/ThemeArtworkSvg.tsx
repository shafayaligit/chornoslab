import React from 'react';
import { HudVisualTheme } from '../types/hud';

interface ThemeIconProps {
  theme: HudVisualTheme;
  className?: string;
}

/**
 * Crisp, colorful, multi-layered vector icon for theme pills & compact notch
 * (Replaces flat system emojis with custom gradient vector icons)
 */
export const ThemeIconSvg: React.FC<ThemeIconProps> = ({
  theme,
  className = 'w-3.5 h-3.5',
}) => {
  switch (theme) {
    case 'neutral':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <defs>
            <linearGradient id="neu-orb" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="8" fill="url(#neu-orb)" />
          <circle cx="12" cy="12" r="3.5" fill="#0f172a" />
        </svg>
      );

    case 'space':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <defs>
            <linearGradient id="sp-planet" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="sp-ring" x1="0" y1="12" x2="24" y2="12">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="6.5" fill="url(#sp-planet)" />
          <ellipse
            cx="12"
            cy="12"
            rx="10.5"
            ry="3.6"
            transform="rotate(-24 12 12)"
            stroke="url(#sp-ring)"
            strokeWidth="2"
          />
          <path
            d="M19 4L19.6 5.4L21 6L19.6 6.6L19 8L18.4 6.6L17 6L18.4 5.4L19 4Z"
            fill="#fde047"
          />
        </svg>
      );

    case 'cats':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <defs>
            <linearGradient id="cat-grad" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          <path
            d="M4.5 11.5L3.5 4.2L9.2 7.8C10.1 7.5 11 7.4 12 7.4C13 7.4 13.9 7.5 14.8 7.8L20.5 4.2L19.5 11.5C20.1 12.6 20.5 13.9 20.5 15.2C20.5 19.2 16.7 21.5 12 21.5C7.3 21.5 3.5 19.2 3.5 15.2C3.5 13.9 3.9 12.6 4.5 11.5Z"
            fill="url(#cat-grad)"
          />
          <polygon points="5.2,9.2 4.8,5.8 8.0,7.9" fill="#fda4af" />
          <polygon points="18.8,9.2 19.2,5.8 16.0,7.9" fill="#fda4af" />
          <circle cx="8.8" cy="14" r="1.35" fill="#1e1b4b" />
          <circle cx="15.2" cy="14" r="1.35" fill="#1e1b4b" />
          <polygon points="12,16.2 10.8,14.9 13.2,14.9" fill="#fb7185" />
        </svg>
      );

    case 'flowers':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <defs>
            <linearGradient id="tlp-grad" x1="6" y1="2" x2="18" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="tlp-center" x1="8" y1="2" x2="16" y2="14" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          {/* Stem & Leaves */}
          <path d="M12 14V22" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 20C8.5 19.5 6.5 16.5 7 13.5C9.5 14.5 11.5 17 12 20Z" fill="#22c55e" />
          <path d="M12 19C15.5 18.5 17.5 15.5 17 12.5C14.5 13.5 12.5 16 12 19Z" fill="#16a34a" />
          {/* Tulip Cup Petals */}
          <path d="M12 3C9.5 5.5 9 9.5 12 14.5C15 9.5 14.5 5.5 12 3Z" fill="url(#tlp-center)" />
          <path d="M7.5 4.5C6 8.5 7.5 14.5 12 14.5C10.5 10.5 9.8 7 7.5 4.5Z" fill="url(#tlp-grad)" />
          <path d="M16.5 4.5C18 8.5 16.5 14.5 12 14.5C13.5 10.5 14.2 7 16.5 4.5Z" fill="url(#tlp-grad)" />
        </svg>
      );

    case 'otter':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <defs>
            <linearGradient id="otr-fur" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a16207" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <linearGradient id="otr-muzzle" x1="6" y1="10" x2="18" y2="19" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
          </defs>
          {/* Round Small Otter Ears */}
          <circle cx="5.5" cy="7.5" r="2.6" fill="url(#otr-fur)" />
          <circle cx="18.5" cy="7.5" r="2.6" fill="url(#otr-fur)" />
          <circle cx="5.5" cy="7.5" r="1.3" fill="#fde68a" />
          <circle cx="18.5" cy="7.5" r="1.3" fill="#fde68a" />
          {/* Round Otter Head */}
          <ellipse cx="12" cy="12.5" rx="8" ry="7.2" fill="url(#otr-fur)" />
          {/* Cream Cheeks / Muzzle */}
          <ellipse cx="9.6" cy="14.5" rx="3.4" ry="2.8" fill="url(#otr-muzzle)" />
          <ellipse cx="14.4" cy="14.5" rx="3.4" ry="2.8" fill="url(#otr-muzzle)" />
          {/* Glossy Eyes */}
          <circle cx="8.8" cy="10.5" r="1.35" fill="#1c1917" />
          <circle cx="15.2" cy="10.5" r="1.35" fill="#1c1917" />
          <circle cx="8.4" cy="10.1" r="0.45" fill="#ffffff" />
          <circle cx="14.8" cy="10.1" r="0.45" fill="#ffffff" />
          {/* Cute Diamond Nose */}
          <polygon points="12,14.2 10.4,12.5 13.6,12.5" fill="#292524" />
          {/* Whiskers */}
          <path d="M5 14L2.5 13.5M5 15.5L2.5 16" stroke="#fef3c7" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M19 14L21.5 13.5M19 15.5L21.5 16" stroke="#fef3c7" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case 'monkeys':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <defs>
            <linearGradient id="mnk-grad" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="mnk-face" x1="0" y1="6" x2="24" y2="22">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <circle cx="4.2" cy="12" r="3.2" fill="url(#mnk-grad)" />
          <circle cx="19.8" cy="12" r="3.2" fill="url(#mnk-grad)" />
          <circle cx="4.2" cy="12" r="1.8" fill="url(#mnk-face)" />
          <circle cx="19.8" cy="12" r="1.8" fill="url(#mnk-face)" />
          <circle cx="12" cy="12.2" r="7.5" fill="url(#mnk-grad)" />
          <circle cx="9.5" cy="11" r="3.2" fill="url(#mnk-face)" />
          <circle cx="14.5" cy="11" r="3.2" fill="url(#mnk-face)" />
          <ellipse cx="12" cy="15.2" rx="5.2" ry="3.6" fill="url(#mnk-face)" />
          <circle cx="9.6" cy="11" r="1.2" fill="#271206" />
          <circle cx="14.4" cy="11" r="1.2" fill="#271206" />
          <path
            d="M9.8 16Q12 17.6 14.2 16"
            stroke="#451a03"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

/**
 * Rich, multi-layered background SVG illustration for the Clock Card.
 * Positioned on the right/background with a smooth left-side contrast mask so
 * foreground typography remains 100% crisp and legible.
 */
export const ThemeBackdropArtwork: React.FC<{ theme: HudVisualTheme }> = ({
  theme,
}) => {
  switch (theme) {
    case 'neutral':
      return null;

    case 'space':
      return (
        <svg
          viewBox="0 0 380 120"
          fill="none"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          preserveAspectRatio="xMaxYMid slice"
        >
          <defs>
            <radialGradient id="bg-sp-nebula" cx="72%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.32" />
              <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bg-sp-planet" x1="210" y1="20" x2="290" y2="95">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="45%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#311042" />
            </linearGradient>
            <linearGradient id="bg-sp-ring" x1="185" y1="60" x2="310" y2="60">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Nebula Backdrop Glow */}
          <rect width="380" height="120" fill="url(#bg-sp-nebula)" />

          {/* Orbital Arcs */}
          <ellipse
            cx="260"
            cy="64"
            rx="95"
            ry="34"
            transform="rotate(-14 260 64)"
            stroke="rgba(167,139,250,0.16)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Distant Crescent Moon */}
          <path
            d="M172 26C167 28 164 34 166 40C168 46 174 49 180 47C174 47 170 42 170 36C170 31 171 28 172 26Z"
            fill="#fde047"
            fillOpacity="0.65"
          />

          {/* Ringed Planet in Background */}
          <g opacity="0.82">
            <circle cx="248" cy="58" r="24" fill="url(#bg-sp-planet)" />
            {/* Planet Surface Bands */}
            <path
              d="M225 52Q248 60 271 49"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M227 64Q248 71 269 61"
              stroke="rgba(56,189,248,0.25)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Tilted Planetary Ring */}
            <ellipse
              cx="248"
              cy="58"
              rx="42"
              ry="11"
              transform="rotate(-22 248 58)"
              stroke="url(#bg-sp-ring)"
              strokeWidth="3.2"
            />
            <ellipse
              cx="248"
              cy="58"
              rx="35"
              ry="8.5"
              transform="rotate(-22 248 58)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />
          </g>

          {/* Crisp Vector Stars */}
          <path
            d="M198 18L200 23L205 25L200 27L198 32L196 27L191 25L196 23L198 18Z"
            fill="#fde047"
            fillOpacity="0.85"
          />
          <path
            d="M286 22L287.2 25L290 26.2L287.2 27.4L286 30.2L284.8 27.4L282 26.2L284.8 25L286 22Z"
            fill="#38bdf8"
            fillOpacity="0.8"
          />
          <circle cx="152" cy="78" r="1.5" fill="#e0e7ff" fillOpacity="0.6" />
          <circle cx="212" cy="96" r="2" fill="#f472b6" fillOpacity="0.65" />
          <circle cx="278" cy="92" r="1.5" fill="#c084fc" fillOpacity="0.7" />
        </svg>
      );

    case 'cats':
      return (
        <svg
          viewBox="0 0 380 120"
          fill="none"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          preserveAspectRatio="xMaxYMid slice"
        >
          <defs>
            <radialGradient id="bg-cat-glow" cx="70%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#ea580c" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#1c1917" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bg-cat-body" x1="210" y1="25" x2="275" y2="110">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="55%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="bg-cat-yarn" x1="175" y1="75" x2="205" y2="105">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>

          <rect width="380" height="120" fill="url(#bg-cat-glow)" />

          {/* Floating Soft Paw Prints */}
          <g opacity="0.28" fill="#fdba74" transform="translate(155, 22) rotate(-18)">
            <ellipse cx="10" cy="13" rx="4.5" ry="3.8" />
            <circle cx="4.5" cy="7.5" r="2" />
            <circle cx="8.2" cy="5.5" r="2" />
            <circle cx="12.2" cy="5.5" r="2" />
            <circle cx="15.8" cy="7.8" r="2" />
          </g>
          <g opacity="0.22" fill="#fde68a" transform="translate(185, 48) rotate(12) scale(0.85)">
            <ellipse cx="10" cy="13" rx="4.5" ry="3.8" />
            <circle cx="4.5" cy="7.5" r="2" />
            <circle cx="8.2" cy="5.5" r="2" />
            <circle cx="12.2" cy="5.5" r="2" />
            <circle cx="15.8" cy="7.8" r="2" />
          </g>

          {/* Cozy Stylized Cat Silhouette with Warm Rim-Light */}
          <g opacity="0.85">
            {/* Curled Tail */}
            <path
              d="M268 96C285 96 294 82 288 68C284 59 274 62 276 71"
              stroke="url(#bg-cat-body)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* Cat Body */}
            <ellipse cx="248" cy="84" rx="24" ry="22" fill="url(#bg-cat-body)" />
            {/* Cat Head */}
            <circle cx="242" cy="52" r="17" fill="url(#bg-cat-body)" />
            {/* Left & Right Ears */}
            <polygon points="227,44 224,24 239,36" fill="url(#bg-cat-body)" />
            <polygon points="257,44 260,24 245,36" fill="url(#bg-cat-body)" />
            <polygon points="229,42 227,28 237,36" fill="#fda4af" opacity="0.8" />
            <polygon points="255,42 257,28 247,36" fill="#fda4af" opacity="0.8" />
            {/* Happy Closed Sleeping Eyes & Whiskers */}
            <path
              d="M232 52Q236 56 240 52"
              stroke="#271206"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M245 52Q249 56 253 52"
              stroke="#271206"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <polygon points="242,57 239.5,54.5 244.5,54.5" fill="#fb7185" />
            <path
              d="M224 55L214 53M224 58L213 59"
              stroke="#fde68a"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M260 55L270 53M260 58L271 59"
              stroke="#fde68a"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>

          {/* Yarn Ball & Thread */}
          <g opacity="0.85">
            <circle cx="196" cy="92" r="11" fill="url(#bg-cat-yarn)" />
            <path
              d="M188 87Q196 95 205 88M187 94Q196 86 204 96"
              stroke="#ffe4e6"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.65"
            />
            <path
              d="M185 95Q170 102 156 94"
              stroke="#fb7185"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        </svg>
      );

    case 'flowers':
      return (
        <svg
          viewBox="0 0 380 120"
          fill="none"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          preserveAspectRatio="xMaxYMid slice"
        >
          <defs>
            <radialGradient id="bg-tlp-glow" cx="72%" cy="48%" r="55%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#fff1f2" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bg-tulip-main" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="55%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
            <linearGradient id="bg-tulip-inner" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="bg-tulip-pink" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f9a8d4" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
          </defs>

          <rect width="380" height="120" fill="url(#bg-tlp-glow)" />

          {/* Main Blooming Tulip (Right-Center) */}
          <g transform="translate(248, 62)" opacity="0.92">
            {/* Stem & Sweeping Leaves */}
            <path
              d="M0 10Q2 36 -2 58"
              stroke="#16a34a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M-1 46C-18 40 -26 22 -20 4C-8 14 -2 28 -1 46Z"
              fill="#22c55e"
              opacity="0.88"
            />
            <path
              d="M1 42C18 36 26 18 20 0C8 10 2 24 1 42Z"
              fill="#15803d"
              opacity="0.85"
            />
            {/* Tulip Cup Petals */}
            <path
              d="M0 -36C-10 -24 -12 -6 0 12C12 -6 10 -24 0 -36Z"
              fill="url(#bg-tulip-inner)"
            />
            <path
              d="M-16 -28C-22 -10 -14 12 0 12C-6 -4 -8 -18 -16 -28Z"
              fill="url(#bg-tulip-main)"
            />
            <path
              d="M16 -28C22 -10 14 12 0 12C6 -4 8 -18 16 -28Z"
              fill="url(#bg-tulip-main)"
            />
          </g>

          {/* Secondary Tilted Pink Tulip */}
          <g transform="translate(194, 72) rotate(-14) scale(0.74)" opacity="0.82">
            <path
              d="M0 10Q-2 34 -4 56"
              stroke="#16a34a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M-2 42C-16 36 -22 20 -17 6C-7 14 -2 26 -2 42Z"
              fill="#22c55e"
            />
            <path
              d="M0 -34C-9 -22 -11 -6 0 12C11 -6 9 -22 0 -34Z"
              fill="#fbcfe8"
            />
            <path
              d="M-15 -26C-20 -10 -13 12 0 12C-5 -4 -7 -16 -15 -26Z"
              fill="url(#bg-tulip-pink)"
            />
            <path
              d="M15 -26C20 -10 13 12 0 12C5 -4 7 -16 15 -26Z"
              fill="url(#bg-tulip-pink)"
            />
          </g>

          {/* Soft Floating Sparkles / Dewdrops */}
          <circle cx="164" cy="34" r="2.5" fill="#fb7185" fillOpacity="0.55" />
          <circle cx="218" cy="24" r="3" fill="#f43f5e" fillOpacity="0.45" />
          <circle cx="284" cy="28" r="2.2" fill="#f59e0b" fillOpacity="0.55" />
        </svg>
      );

    case 'otter':
      return (
        <svg
          viewBox="0 0 380 120"
          fill="none"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          preserveAspectRatio="xMaxYMid slice"
        >
          <defs>
            <radialGradient id="bg-otr-glow" cx="72%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f0f9ff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bg-otter-fur" x1="210" y1="28" x2="280" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a16207" />
              <stop offset="55%" stopColor="#854d0e" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <linearGradient id="bg-otter-belly" x1="220" y1="45" x2="270" y2="98" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            <linearGradient id="bg-shell" x1="235" y1="72" x2="258" y2="92" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>

          <rect width="380" height="120" fill="url(#bg-otr-glow)" />

          {/* Gentle River Water Ripples */}
          <ellipse
            cx="244"
            cy="88"
            rx="68"
            ry="18"
            stroke="rgba(14,165,233,0.28)"
            strokeWidth="1.5"
          />
          <ellipse
            cx="244"
            cy="88"
            rx="50"
            ry="12"
            stroke="rgba(2,132,199,0.35)"
            strokeWidth="1.3"
          />

          {/* Cute Floating Sea Otter Holding a Scallop Shell */}
          <g opacity="0.92">
            {/* Otter Body Floating on Back */}
            <ellipse cx="246" cy="82" rx="28" ry="18" fill="url(#bg-otter-fur)" />
            <ellipse cx="246" cy="84" rx="19" ry="12" fill="url(#bg-otter-belly)" />

            {/* Round Otter Ears */}
            <circle cx="225" cy="42" r="6" fill="url(#bg-otter-fur)" />
            <circle cx="267" cy="42" r="6" fill="url(#bg-otter-fur)" />
            <circle cx="225" cy="42" r="3" fill="#fde68a" />
            <circle cx="267" cy="42" r="3" fill="#fde68a" />

            {/* Otter Head */}
            <ellipse cx="246" cy="52" rx="22" ry="18" fill="url(#bg-otter-fur)" />

            {/* Puffy Cream Whisker Pads */}
            <ellipse cx="239" cy="57" rx="8.5" ry="6.5" fill="url(#bg-otter-belly)" />
            <ellipse cx="253" cy="57" rx="8.5" ry="6.5" fill="url(#bg-otter-belly)" />

            {/* Expressive Dark Eyes & Shine */}
            <circle cx="236" cy="48" r="3.2" fill="#1c1917" />
            <circle cx="256" cy="48" r="3.2" fill="#1c1917" />
            <circle cx="235" cy="47" r="1.1" fill="#ffffff" />
            <circle cx="255" cy="47" r="1.1" fill="#ffffff" />

            {/* Cute Dark Nose & Smile */}
            <polygon points="246,56 242,51.5 250,51.5" fill="#1c1917" />
            <path
              d="M241 60Q246 63.5 251 60"
              stroke="#451a03"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Whiskers */}
            <path
              d="M229 56L218 54M229 59L218 60"
              stroke="#fef3c7"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M263 56L274 54M263 59L274 60"
              stroke="#fef3c7"
              strokeWidth="1.3"
              strokeLinecap="round"
            />

            {/* Pink Scallop Shell & Little Paws on Belly */}
            <path
              d="M238 82C238 74 254 74 254 82L249 88H243L238 82Z"
              fill="url(#bg-shell)"
            />
            <circle cx="236" cy="80" r="4" fill="#713f12" />
            <circle cx="256" cy="80" r="4" fill="#713f12" />
          </g>

          {/* Water Bubbles */}
          <circle cx="176" cy="44" r="3.5" fill="#38bdf8" fillOpacity="0.45" />
          <circle cx="192" cy="30" r="2.2" fill="#0ea5e9" fillOpacity="0.4" />
          <circle cx="286" cy="36" r="2.8" fill="#38bdf8" fillOpacity="0.45" />
        </svg>
      );

    case 'monkeys':
      return (
        <svg
          viewBox="0 0 380 120"
          fill="none"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          preserveAspectRatio="xMaxYMid slice"
        >
          <defs>
            <radialGradient id="bg-mnk-glow" cx="72%" cy="48%" r="55%">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#ca8a04" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#181209" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bg-banana" x1="165" y1="24" x2="215" y2="75">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <linearGradient id="bg-monkey-fur" x1="220" y1="30" x2="285" y2="105">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="bg-monkey-skin" x1="225" y1="45" x2="275" y2="95">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          <rect width="380" height="120" fill="url(#bg-mnk-glow)" />

          {/* Tropical Jungle Vine & Leaves */}
          <path
            d="M150 0Q210 38 295 14"
            stroke="#4ade80"
            strokeOpacity="0.35"
            strokeWidth="2.5"
             fill="none"
          />
          <path
            d="M204 22C196 12 208 4 218 14C222 20 212 26 204 22Z"
            fill="#22c55e"
            fillOpacity="0.45"
          />

          {/* Glowing Golden Crescent Banana */}
          <g transform="translate(172, 42) rotate(-18)" opacity="0.88">
            <path
              d="M4 28C16 32 32 22 36 4C39 16 28 38 6 36C2 35 1 30 4 28Z"
              fill="url(#bg-banana)"
            />
            <path
              d="M35 4L38 1"
              stroke="#78350f"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* Playful Monkey Character */}
          <g opacity="0.9">
            {/* Monkey Ears */}
            <circle cx="220" cy="64" r="9.5" fill="url(#bg-monkey-fur)" />
            <circle cx="276" cy="64" r="9.5" fill="url(#bg-monkey-fur)" />
            <circle cx="220" cy="64" r="5.5" fill="url(#bg-monkey-skin)" />
            <circle cx="276" cy="64" r="5.5" fill="url(#bg-monkey-skin)" />
            {/* Monkey Head */}
            <circle cx="248" cy="64" r="23" fill="url(#bg-monkey-fur)" />
            {/* Tuft of Hair */}
            <path
              d="M244 42Q248 32 254 39Q250 34 242 36"
              stroke="url(#bg-monkey-fur)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Heart-Shaped Face Mask & Muzzle */}
            <circle cx="239" cy="59" r="10" fill="url(#bg-monkey-skin)" />
            <circle cx="257" cy="59" r="10" fill="url(#bg-monkey-skin)" />
            <ellipse cx="248" cy="72" rx="15" ry="10.5" fill="url(#bg-monkey-skin)" />
            {/* Bright Expressive Eyes */}
            <circle cx="239" cy="59" r="3.6" fill="#271206" />
            <circle cx="257" cy="59" r="3.6" fill="#271206" />
            <circle cx="237.8" cy="57.8" r="1.2" fill="#ffffff" />
            <circle cx="255.8" cy="57.8" r="1.2" fill="#ffffff" />
            {/* Cute Nostrils & Big Grin */}
            <circle cx="245" cy="68" r="1.2" fill="#78350f" />
            <circle cx="251" cy="68" r="1.2" fill="#78350f" />
            <path
              d="M239 74Q248 81 257 74"
              stroke="#451a03"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        </svg>
      );
  }
};
