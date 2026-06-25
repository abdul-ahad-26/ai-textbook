import type {ReactNode} from 'react';
import styles from './styles.module.css';

/**
 * Signature visual for the book: a bipedal humanoid rendered as a "digital twin".
 * Left side  = cyan, dashed wireframe  -> the simulated / sensing / digital self.
 * Right side = amber, solid limbs      -> the real / actuated / physical self.
 * A scan line sweeps the seam, evoking the sim -> real transfer. Joints are TF nodes.
 */
export default function KinematicFigure(): ReactNode {
  return (
    <svg
      className={styles.figure}
      viewBox="0 0 320 430"
      role="img"
      aria-label="A humanoid robot split between a cyan simulated wireframe and an amber physical body">
      <defs>
        <linearGradient id="seam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#36e0c8" stopOpacity="0" />
          <stop offset="50%" stopColor="#36e0c8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffb627" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#36e0c8" stopOpacity="0" />
          <stop offset="50%" stopColor="#36e0c8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#36e0c8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* center seam: the boundary between sim and real */}
      <rect x="158" y="20" width="4" height="400" fill="url(#seam)" />

      {/* ---- DIGITAL (left): dashed cyan wireframe ---- */}
      <g className={styles.digital} fill="none" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round">
        <circle cx="160" cy="56" r="26" />
        <path d="M160 82 L160 235" />
        <path d="M160 110 L120 110 L96 170 L86 226" />
        <path d="M160 235 L132 235 L124 320 L120 392 L92 404" />
      </g>

      {/* ---- PHYSICAL (right): solid amber limbs ---- */}
      <g className={styles.physical} fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M160 110 L200 110 L224 170 L236 226" />
        <path d="M160 235 L188 235 L196 320 L200 392 L228 404" />
      </g>

      {/* ---- TF joint nodes ---- */}
      <g>
        {/* left joints: hollow cyan */}
        {[
          [120, 110], [96, 170], [86, 226], [132, 235], [124, 320], [120, 392],
        ].map(([x, y], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r="4.5" className={styles.nodeDigital} />
        ))}
        {/* right joints: filled amber */}
        {[
          [200, 110], [224, 170], [236, 226], [188, 235], [196, 320], [200, 392],
        ].map(([x, y], i) => (
          <circle key={`p${i}`} cx={x} cy={y} r="5" className={styles.nodePhysical} />
        ))}
        {/* shoulder hub on the seam */}
        <circle cx="160" cy="110" r="5.5" className={styles.nodeHub} />
        <circle cx="160" cy="235" r="5.5" className={styles.nodeHub} />
      </g>

      {/* small coordinate-frame triad near the head — the roboticist's XYZ marker */}
      <g className={styles.triad} strokeWidth="2" strokeLinecap="round">
        <line x1="206" y1="44" x2="230" y2="44" stroke="#ff5c5c" />
        <line x1="206" y1="44" x2="206" y2="20" stroke="#36e0c8" />
      </g>

      {/* sweeping scan line (sim -> real transfer); paused under reduced-motion via CSS */}
      <rect className={styles.scanline} x="40" y="18" width="240" height="3" fill="url(#scan)" />
    </svg>
  );
}
