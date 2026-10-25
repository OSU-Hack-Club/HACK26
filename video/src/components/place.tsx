import React from "react";

export interface Pose {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
  o?: number;
  blur?: number;
}

/**
 * Places a child with its center at (cx, cy) on the 1920×1080 stage, then applies a 3D pose.
 * Must be a direct child of <Stage> so the stage's perspective applies.
 */
export function Place({ cx, cy, pose = {}, children, z: zIndex, style }: { cx: number; cy: number; pose?: Pose; children: React.ReactNode; z?: number; style?: React.CSSProperties }) {
  const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, o = 1, blur = 0 } = pose;
  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        zIndex,
        opacity: o,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
        transformStyle: "preserve-3d",
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
