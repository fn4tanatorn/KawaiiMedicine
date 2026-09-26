import type { SVGProps } from "react";

interface FigureProps extends SVGProps<SVGSVGElement> {
  activeLabelNo?: number;
}

/**
 * High-precision medical SVG illustrations for the Public Demo.
 * 100% vector, zero network egress, fully responsive with numbered callouts.
 */

export function DemoOsteonFigure({ activeLabelNo, className = "", ...props }: FigureProps) {
  return (
    <svg
      viewBox="0 0 540 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-h-[360px] select-none ${className}`}
      {...props}
    >
      <defs>
        <radialGradient id="boneBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0.05" />
        </radialGradient>
        <radialGradient id="haversianGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#991B1B" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#7F1D1D" />
        </radialGradient>
      </defs>

      {/* Background Matrix */}
      <rect width="540" height="380" rx="16" fill="#FFFDF8" />
      <rect x="20" y="20" width="500" height="340" rx="14" fill="url(#boneBg)" stroke="#E2E8F0" strokeWidth="1.5" />

      {/* Concentric Lamellae (Label 4) */}
      <circle cx="270" cy="190" r="145" stroke="#D97706" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
      <circle cx="270" cy="190" r="115" stroke="#D97706" strokeWidth="2" opacity="0.5" />
      <circle cx="270" cy="190" r="85" stroke="#D97706" strokeWidth="2" strokeDasharray="8 3" opacity="0.6" />
      <circle cx="270" cy="190" r="55" stroke="#D97706" strokeWidth="2" opacity="0.7" />

      {/* Radiating Canaliculi (Label 3) */}
      <g stroke="#92400E" strokeWidth="0.8" opacity="0.35">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180;
          const x1 = 270 + Math.cos(angle) * 35;
          const y1 = 190 + Math.sin(angle) * 35;
          const x2 = 270 + Math.cos(angle) * 145;
          const y2 = 190 + Math.sin(angle) * 145;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>

      {/* Osteocytes in Lacunae (Label 2) */}
      {[
        { x: 345, y: 175, r: 0 },
        { x: 230, y: 265, r: 45 },
        { x: 195, y: 140, r: -30 },
        { x: 320, y: 250, r: 60 },
        { x: 230, y: 110, r: 20 },
        { x: 370, y: 130, r: -15 },
        { x: 160, y: 220, r: 80 },
      ].map((cell, idx) => (
        <g key={idx} transform={`rotate(${cell.r}, ${cell.x}, ${cell.y})`}>
          <ellipse cx={cell.x} cy={cell.y} rx="9" ry="4.5" fill="#78350F" />
          <ellipse cx={cell.x} cy={cell.y} rx="5" ry="2.5" fill="#FBBF24" />
        </g>
      ))}

      {/* Central Haversian Canal (Label 1) */}
      <circle cx="270" cy="190" r="32" fill="url(#haversianGrad)" stroke="#B91C1C" strokeWidth="2.5" />
      {/* Vessel inside canal */}
      <circle cx="264" cy="186" r="10" fill="#EF4444" opacity="0.8" />
      <circle cx="277" cy="194" r="8" fill="#3B82F6" opacity="0.8" />
      <circle cx="272" cy="180" r="4" fill="#FACC15" opacity="0.9" />

      {/* CALLOUT POINTERS WITH NUMBERS */}

      {/* Callout 1: Haversian Canal */}
      <g className={activeLabelNo === 1 ? "animate-pulse" : ""}>
        <line x1="270" y1="175" x2="270" y2="70" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="270" cy="175" r="4" fill="#DC2626" />
        <circle cx="270" cy="55" r="16" fill={activeLabelNo === 1 ? "#DC2626" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="270" y="61" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">1</text>
      </g>

      {/* Callout 2: Osteocyte */}
      <g className={activeLabelNo === 2 ? "animate-pulse" : ""}>
        <line x1="345" y1="175" x2="435" y2="175" stroke="#D97706" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="345" cy="175" r="4" fill="#D97706" />
        <circle cx="455" cy="175" r="16" fill={activeLabelNo === 2 ? "#D97706" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="455" y="181" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">2</text>
      </g>

      {/* Callout 3: Canaliculi */}
      <g className={activeLabelNo === 3 ? "animate-pulse" : ""}>
        <line x1="210" y1="215" x2="110" y2="280" stroke="#2563EB" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="210" cy="215" r="4" fill="#2563EB" />
        <circle cx="95" cy="290" r="16" fill={activeLabelNo === 3 ? "#2563EB" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="95" y="296" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">3</text>
      </g>

      {/* Callout 4: Concentric Lamellae */}
      <g className={activeLabelNo === 4 ? "animate-pulse" : ""}>
        <line x1="315" y1="108" x2="415" y2="60" stroke="#059669" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="315" cy="108" r="4" fill="#059669" />
        <circle cx="430" cy="50" r="16" fill={activeLabelNo === 4 ? "#059669" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="430" y="56" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">4</text>
      </g>
    </svg>
  );
}

export function DemoStomachFigure({ activeLabelNo, className = "", ...props }: FigureProps) {
  return (
    <svg
      viewBox="0 0 540 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-h-[360px] select-none ${className}`}
      {...props}
    >
      {/* Background Matrix */}
      <rect width="540" height="380" rx="16" fill="#FFFDF8" />
      <rect x="20" y="20" width="500" height="340" rx="14" fill="#FEF2F2" stroke="#E2E8F0" strokeWidth="1.5" />

      {/* Gastric Pit & Gland Lumen */}
      <path
        d="M210 30 C210 120 230 180 230 340 L310 340 C310 180 330 120 330 30 Z"
        fill="#FFFFFF"
        stroke="#FECACA"
        strokeWidth="2"
      />

      {/* Mucous Neck Cells (Label 3) - Upper Neck */}
      <g fill="#FBCFE8" stroke="#DB2777" strokeWidth="1.5">
        <rect x="175" y="80" width="35" height="24" rx="4" />
        <rect x="175" y="110" width="35" height="24" rx="4" />
        <rect x="330" y="80" width="35" height="24" rx="4" />
        <rect x="330" y="110" width="35" height="24" rx="4" />
      </g>

      {/* Parietal Cells (Label 1) - Triangular / Eosinophilic Pink */}
      <g fill="#F87171" stroke="#DC2626" strokeWidth="2">
        <polygon points="160,165 210,150 205,185" />
        <circle cx="180" cy="165" r="5" fill="#7F1D1D" />

        <polygon points="380,185 330,170 335,205" />
        <circle cx="360" cy="185" r="5" fill="#7F1D1D" />

        <polygon points="160,225 210,210 205,245" />
        <circle cx="180" cy="225" r="5" fill="#7F1D1D" />
      </g>

      {/* Chief Cells (Label 2) - Basophilic Purple Base */}
      <g fill="#C4B5FD" stroke="#7C3AED" strokeWidth="1.5">
        <rect x="180" y="270" width="35" height="26" rx="5" />
        <circle cx="195" cy="283" r="5" fill="#4C1D95" />

        <rect x="180" y="305" width="35" height="26" rx="5" />
        <circle cx="195" cy="318" r="5" fill="#4C1D95" />

        <rect x="325" y="270" width="35" height="26" rx="5" />
        <circle cx="345" cy="283" r="5" fill="#4C1D95" />

        <rect x="325" y="305" width="35" height="26" rx="5" />
        <circle cx="345" cy="318" r="5" fill="#4C1D95" />
      </g>

      {/* Callout 1: Parietal cell */}
      <g className={activeLabelNo === 1 ? "animate-pulse" : ""}>
        <line x1="160" y1="165" x2="80" y2="165" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="160" cy="165" r="4" fill="#DC2626" />
        <circle cx="65" cy="165" r="16" fill={activeLabelNo === 1 ? "#DC2626" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="65" y="171" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">1</text>
      </g>

      {/* Callout 2: Chief cell */}
      <g className={activeLabelNo === 2 ? "animate-pulse" : ""}>
        <line x1="360" y1="290" x2="450" y2="290" stroke="#7C3AED" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="360" cy="290" r="4" fill="#7C3AED" />
        <circle cx="470" cy="290" r="16" fill={activeLabelNo === 2 ? "#7C3AED" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="470" y="296" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">2</text>
      </g>

      {/* Callout 3: Mucous neck cell */}
      <g className={activeLabelNo === 3 ? "animate-pulse" : ""}>
        <line x1="365" y1="95" x2="450" y2="95" stroke="#DB2777" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="365" cy="95" r="4" fill="#DB2777" />
        <circle cx="470" cy="95" r="16" fill={activeLabelNo === 3 ? "#DB2777" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="470" y="101" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">3</text>
      </g>
    </svg>
  );
}

export function DemoHeartFigure({ activeLabelNo, className = "", ...props }: FigureProps) {
  return (
    <svg
      viewBox="0 0 540 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-h-[360px] select-none ${className}`}
      {...props}
    >
      {/* Background Matrix */}
      <rect width="540" height="380" rx="16" fill="#FFFDF8" />
      <rect x="20" y="20" width="500" height="340" rx="14" fill="#EFF6FF" stroke="#E2E8F0" strokeWidth="1.5" />

      {/* Stylized Heart Outline */}
      <path
        d="M270 330 C200 270 140 200 150 120 C155 70 210 65 250 100 L270 120 L290 100 C330 65 385 70 390 120 C400 200 340 270 270 330 Z"
        fill="#FEE2E2"
        stroke="#EF4444"
        strokeWidth="3"
      />

      {/* Septum & Chambers Divider */}
      <line x1="270" y1="170" x2="270" y2="320" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />

      {/* Conduction Pathways */}
      {/* Intermodal Tracts */}
      <path d="M210 95 Q235 125 255 160" stroke="#F59E0B" strokeWidth="3" strokeDasharray="4 3" />
      {/* Bundle of His & Branches */}
      <path d="M255 160 L270 185 L270 240" stroke="#F59E0B" strokeWidth="4" />
      <path d="M270 240 Q240 260 210 280" stroke="#F59E0B" strokeWidth="3" />
      <path d="M270 240 Q300 260 330 280" stroke="#F59E0B" strokeWidth="3" />

      {/* Purkinje Network (Label 4) */}
      <path d="M210 280 Q190 270 180 240 M210 280 L195 295 M210 280 L225 305" stroke="#F59E0B" strokeWidth="2.5" />
      <path d="M330 280 Q350 270 360 240 M330 280 L345 295 M330 280 L315 305" stroke="#F59E0B" strokeWidth="2.5" />

      {/* SA Node (Label 1) */}
      <circle cx="210" cy="95" r="9" fill="#10B981" stroke="#047857" strokeWidth="2" />

      {/* AV Node (Label 2) */}
      <circle cx="255" cy="160" r="9" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2" />

      {/* Callout 1: SA Node */}
      <g className={activeLabelNo === 1 ? "animate-pulse" : ""}>
        <line x1="210" y1="95" x2="105" y2="75" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="210" cy="95" r="4" fill="#10B981" />
        <circle cx="90" cy="75" r="16" fill={activeLabelNo === 1 ? "#10B981" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="90" y="81" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">1</text>
      </g>

      {/* Callout 2: AV Node */}
      <g className={activeLabelNo === 2 ? "animate-pulse" : ""}>
        <line x1="255" y1="160" x2="120" y2="160" stroke="#3B82F6" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="255" cy="160" r="4" fill="#3B82F6" />
        <circle cx="105" cy="160" r="16" fill={activeLabelNo === 2 ? "#3B82F6" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="105" y="166" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">2</text>
      </g>

      {/* Callout 3: Bundle of His */}
      <g className={activeLabelNo === 3 ? "animate-pulse" : ""}>
        <line x1="270" y1="210" x2="420" y2="180" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="270" cy="210" r="4" fill="#F59E0B" />
        <circle cx="435" cy="175" r="16" fill={activeLabelNo === 3 ? "#F59E0B" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="435" y="181" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">3</text>
      </g>

      {/* Callout 4: Purkinje Fibers */}
      <g className={activeLabelNo === 4 ? "animate-pulse" : ""}>
        <line x1="330" y1="280" x2="440" y2="280" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="330" cy="280" r="4" fill="#8B5CF6" />
        <circle cx="455" cy="280" r="16" fill={activeLabelNo === 4 ? "#8B5CF6" : "#1E293B"} stroke="#FFFFFF" strokeWidth="2" />
        <text x="455" y="286" fill="#FFFFFF" fontSize="14" fontWeight="bold" textAnchor="middle">4</text>
      </g>
    </svg>
  );
}
