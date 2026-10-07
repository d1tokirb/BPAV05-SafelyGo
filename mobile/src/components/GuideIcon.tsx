import React from "react";
import Svg, { Circle, Path, Rect, G } from "react-native-svg";
export type GuideKind = "people" | "time" | "review" | "details" | "type" | "location" | "campus" | "boundary" | "lighting" | "hazard" | "suspicious" | "harassment" | "theft" | "other";
export default function GuideIcon({ kind, color, size = 32 }: { kind: GuideKind; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <G fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {kind === "lighting" && <><Path d="M17 31c0-7-7-8-7-16a14 14 0 0 1 28 0c0 8-7 9-7 16H17ZM18 36h12M21 41h6M24 9v10M19 15l5 4 5-4" /></>}
      {kind === "hazard" && <><Path d="m24 6 20 35H4L24 6ZM24 17v11" /><Circle cx={24} cy={34} r={1} /></>}
      {kind === "suspicious" && <><Path d="M3 24s8-13 21-13 21 13 21 13-8 13-21 13S3 24 3 24Z" /><Circle cx={24} cy={24} r={7} /></>}
      {kind === "harassment" && <><Path d="M12 25V13a3 3 0 0 1 6 0v11-16a3 3 0 0 1 6 0v16-14a3 3 0 0 1 6 0v14-10a3 3 0 0 1 6 0v17c0 9-6 13-13 13-5 0-9-3-12-8l-6-9a3 3 0 0 1 5-3l5 5" /></>}
      {kind === "theft" && <><Rect x={9} y={21} width={30} height={23} rx={4} /><Path d="M17 21v-9a9 9 0 0 1 18 0M24 30v5" /></>}
      {kind === "other" && <><Circle cx={24} cy={24} r={19} /><Circle cx={14} cy={24} r={1.5} /><Circle cx={24} cy={24} r={1.5} /><Circle cx={34} cy={24} r={1.5} /></>}
      {kind === "people" && <><Circle cx={18} cy={15} r={6} /><Path d="M7 38v-5c0-6 5-10 11-10s11 4 11 10v5M32 10a6 6 0 0 1 0 12M35 26c5 1 7 5 7 10v2" /></>}
      {kind === "time" && <><Circle cx={24} cy={25} r={16} /><Path d="M24 15v11l7 4M18 4h12M24 4v5" /></>}
      {kind === "review" && <><Rect x={10} y={8} width={28} height={33} rx={4} /><Path d="M18 8V5h12v3M17 25l5 5 10-12" /></>}
      {kind === "details" && <><Path d="M29 8H11v32h28V21M20 29l2-8L36 7l5 5-14 14-7 3M33 10l5 5M17 34h15" /></>}
      {kind === "type" && <><Path d="M9 8h30v30H9zM9 18h30M20 18v20" /><Path d="m25 27 3 3 6-7" /></>}
      {kind === "location" && <><Path d="M24 43S10 28 10 18a14 14 0 0 1 28 0c0 10-14 25-14 25Z" /><Circle cx={24} cy={18} r={5} /></>}
      {kind === "campus" && <><Path d="m5 17 19-11 19 11H5ZM8 40h32M12 22v13M24 22v13M36 22v13M6 35h36v5" /></>}
      {kind === "boundary" && <><Rect x={5} y={5} width={38} height={38} rx={7} strokeDasharray="3 4" /><Path d="M24 36S15 26 15 20a9 9 0 0 1 18 0c0 6-9 16-9 16Z" /><Circle cx={24} cy={20} r={3} /></>}
    </G>
  </Svg>;
}
