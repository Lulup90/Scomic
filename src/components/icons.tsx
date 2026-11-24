// Icone a tratto, ereditano il colore del testo.
interface P {
  size?: number;
}
const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconPlus = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconInherit = ({ size = 12 }: P) => (
  <svg {...base(size)} strokeWidth={2.4}>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);
export const IconWarn = ({ size = 14 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="M12 3 2 21h20L12 3z" />
    <path d="M12 10v5M12 18h.01" />
  </svg>
);
export const IconUp = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="m6 15 6-6 6 6" />
  </svg>
);
export const IconDown = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconTrash = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
export const IconCopy = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </svg>
);
export const IconUndo = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
);
export const IconRedo = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9a5 5 0 0 0 0 10h3" />
  </svg>
);
export const IconClose = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconLogo = ({ size = 24 }: P) => (
  <svg {...base(size)} strokeWidth={1.8}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M3 10h18M12 10v11M3 15.5h9" />
  </svg>
);
