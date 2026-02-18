import './BackgroundWaves.css'

/**
 * Animated wave background — flowing waves, floating orbs, subtle pulse.
 */
export function BackgroundWaves() {
  return (
    <div className="background-waves" aria-hidden="true">
      {/* Soft floating orbs */}
      <div className="wave-orb wave-orb-1" />
      <div className="wave-orb wave-orb-2" />
      <div className="wave-orb wave-orb-3" />
      <div className="wave-orb wave-orb-4" />

      <svg
        className="waves-svg"
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Horizontal waves */}
        <g className="wave-group wave-group-1">
          <path
            d="M0,200 Q100,150 200,200 T400,200 M400,200 Q500,150 600,200 T800,200 M800,200 Q900,150 1000,200 T1200,200 M1200,200 Q1300,150 1400,200 T1600,200"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            strokeOpacity="0.25"
          />
        </g>
        <g className="wave-group wave-group-2">
          <path
            d="M0,160 Q100,210 200,160 T400,160 M400,160 Q500,210 600,160 T800,160 M800,160 Q900,210 1000,160 T1200,160 M1200,160 Q1300,210 1400,160 T1600,160"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeOpacity="0.18"
          />
        </g>
        <g className="wave-group wave-group-3">
          <path
            d="M0,240 Q100,190 200,240 T400,240 M400,240 Q500,190 600,240 T800,240 M800,240 Q900,190 1000,240 T1200,240 M1200,240 Q1300,190 1400,240 T1600,240"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeOpacity="0.18"
          />
        </g>

        {/* Half-saw waves — flat then sharp rise, 2 freqs layered */}
        <g className="wave-group wave-group-saw">
          {/* Low freq: period 80px */}
          <path
            d="M0,200 L40,200 L40,165 L80,200 L80,200 L120,200 L120,165 L160,200 L160,200 L200,200 L200,165 L240,200 L240,200 L280,200 L280,165 L320,200 L320,200 L360,200 L360,165 L400,200 M400,200 L440,200 L440,165 L480,200 L480,200 L520,200 L520,165 L560,200 L560,200 L600,200 L600,165 L640,200 L640,200 L680,200 L680,165 L720,200 L720,200 L760,200 L760,165 L800,200 M800,200 L840,200 L840,165 L880,200 L880,200 L920,200 L920,165 L960,200 L960,200 L1000,200 L1000,165 L1040,200 L1040,200 L1080,200 L1080,165 L1120,200 L1120,200 L1160,200 L1160,165 L1200,200 M1200,200 L1240,200 L1240,165 L1280,200 L1280,200 L1320,200 L1320,165 L1360,200 L1360,200 L1400,200 L1400,165 L1440,200 L1440,200 L1480,200 L1480,165 L1520,200 L1520,200 L1560,200 L1560,165 L1600,200"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1.2"
            strokeOpacity="0.18"
          />
          {/* Mid freq: period 40px */}
          <path
            d="M0,195 L20,195 L20,165 L40,195 L40,195 L60,195 L60,165 L80,195 L80,195 L100,195 L100,165 L120,195 L120,195 L140,195 L140,165 L160,195 L160,195 L180,195 L180,165 L200,195 L200,195 L220,195 L220,165 L240,195 L240,195 L260,195 L260,165 L280,195 L280,195 L300,195 L300,165 L320,195 L320,195 L340,195 L340,165 L360,195 L360,195 L380,195 L380,165 L400,195 M400,195 L420,195 L420,165 L440,195 L440,195 L460,195 L460,165 L480,195 L480,195 L500,195 L500,165 L520,195 L520,195 L540,195 L540,165 L560,195 L560,195 L580,195 L580,165 L600,195 L600,195 L620,195 L620,165 L640,195 L640,195 L660,195 L660,165 L680,195 L680,195 L700,195 L700,165 L720,195 L720,195 L740,195 L740,165 L760,195 L760,195 L780,195 L780,165 L800,195 M800,195 L820,195 L820,165 L840,195 L840,195 L860,195 L860,165 L880,195 L880,195 L900,195 L900,165 L920,195 L920,195 L940,195 L940,165 L960,195 L960,195 L980,195 L980,165 L1000,195 L1000,195 L1020,195 L1020,165 L1040,195 L1040,195 L1060,195 L1060,165 L1080,195 L1080,195 L1100,195 L1100,165 L1120,195 L1120,195 L1140,195 L1140,165 L1160,195 L1160,195 L1180,195 L1180,165 L1200,195 M1200,195 L1220,195 L1220,165 L1240,195 L1240,195 L1260,195 L1260,165 L1280,195 L1280,195 L1300,195 L1300,165 L1320,195 L1320,195 L1340,195 L1340,165 L1360,195 L1360,195 L1380,195 L1380,165 L1400,195 L1400,195 L1420,195 L1420,165 L1440,195 L1440,195 L1460,195 L1460,165 L1480,195 L1480,195 L1500,195 L1500,165 L1520,195 L1520,195 L1540,195 L1540,165 L1560,195 L1560,195 L1580,195 L1580,165 L1600,195"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeOpacity="0.15"
          />
        </g>

        {/* Diagonal wave — different direction */}
        <g className="wave-group wave-group-diag">
          <path
            d="M-200,0 L0,100 L200,0 L400,100 L600,0 L800,100 L1000,0 L1200,100"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeOpacity="0.08"
          />
          <path
            d="M-200,200 L0,300 L200,200 L400,300 L600,200 L800,300 L1000,200 L1200,300"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeOpacity="0.08"
          />
        </g>
      </svg>
    </div>
  )
}
