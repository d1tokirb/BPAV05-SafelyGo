import React from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
// Illustrative sharing diagram, never a measured map or navigation route.
export default function SharingScene({
  light = false,
  showCampus = true,
}: {
  light?: boolean;
  showCampus?: boolean;
}) {
  const ink = light ? "#D9E5FF" : "#3157A5";
  const panel = light ? "#243650" : "#EDF0FA";
  return (
    <View aria-hidden style={{ width: "100%", height: 128 }}>
      <Svg width="100%" height="100%" viewBox="0 0 200 140" aria-hidden>
        <G fill="none" strokeLinecap="round" strokeLinejoin="round">
          {showCampus && (
            <Path
              d="M5 114h190M15 93h32V66H15v27Zm6-18h5m8 0h5M64 105V58l26-17 26 17v47M71 61h38M75 71h7m17 0h7M75 83h7m17 0h7M86 105V91h9v14M141 108V78h41v30M149 88h7m12 0h7"
              stroke={light ? "#41577A" : "#CAD5E8"}
              strokeWidth={1.5}
            />
          )}
          <Rect
            x={30}
            y={13}
            width={49}
            height={94}
            rx={10}
            fill={panel}
            stroke={ink}
            strokeWidth={2}
          />
          <Path
            d="M47 22h15M50 97h9M37 38l34 14M38 72l33-13M50 32v55"
            stroke={ink}
            opacity={0.25}
            strokeWidth={1.5}
          />
          <Circle cx={54} cy={59} r={17} fill={ink} opacity={0.12} />
          <Circle
            cx={54}
            cy={59}
            r={8}
            fill={light ? "#D9E5FF" : "#3157A5"}
            stroke={light ? "#18243B" : "#FFFFFF"}
            strokeWidth={3}
          />
          <Path
            d="M80 57h22c15 0 14-29 28-29h12M102 57c15 0 14 31 28 31h12"
            stroke={ink}
            strokeWidth={1.8}
            strokeDasharray="3 5"
          />
          {[28, 88].map((y) => (
            <G key={y}>
              <Circle
                cx={162}
                cy={y}
                r={22}
                fill={panel}
                stroke={ink}
                strokeWidth={1.6}
              />
              <Circle
                cx={162}
                cy={y - 5}
                r={6}
                stroke={ink}
                strokeWidth={1.8}
              />
              <Path
                d={`M150 ${y + 10}c1-12 23-12 24 0`}
                stroke={ink}
                strokeWidth={1.8}
              />
              <Circle
                cx={179}
                cy={y + 14}
                r={6}
                fill={light ? "#D9E5FF" : "#3157A5"}
                stroke={light ? "#18243B" : "#FFFFFF"}
                strokeWidth={2}
              />
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}
