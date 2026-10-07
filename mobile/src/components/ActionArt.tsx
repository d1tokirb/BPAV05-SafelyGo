import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect, G } from "react-native-svg";
import { C } from "./ui";
export type ActionKind = "walk" | "map" | "report" | "help";
// Instructional pictograms: a phone shares a position; a map locates; a report records; a phone calls.
export default function ActionArt({ kind, light = false, height = 76 }: { kind: ActionKind; light?: boolean; height?: number }) {
  const ink = light ? C.white : C.blue;
  const tint = light ? "#334663" : C.mint;
  return <View aria-hidden style={{ height, width: "100%" }}>
    <Svg width="100%" height="100%" viewBox="0 0 150 96" aria-hidden>
      <G stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {kind === "walk" && <>
          <Rect x={12} y={13} width={42} height={72} rx={7} fill={tint} />
          <Path d="M27 21h12M28 77h10M54 44h20l17-17M74 44l17 22" strokeDasharray="3 5" />
          <Path d="M33 64S22 53 22 45a11 11 0 0 1 22 0c0 8-11 19-11 19Z" /><Circle cx={33} cy={45} r={3} />
          <Circle cx={111} cy={25} r={18} fill={tint} /><Circle cx={111} cy={21} r={5} /><Path d="M102 34c0-8 18-8 18 0" />
          <Circle cx={111} cy={70} r={18} fill={tint} /><Circle cx={111} cy={66} r={5} /><Path d="M102 79c0-8 18-8 18 0" />
        </>}
        {kind === "map" && <>
          <Path d="m14 24 39-12 42 12 39-12v66L95 90 53 78 14 90V24Z" fill={tint} />
          <Path d="M53 12v66M95 24v66M22 64l18-8 33 12 24-15 26-9" strokeDasharray="4 5" />
          <Path d="M75 58S61 43 61 32a14 14 0 0 1 28 0c0 11-14 26-14 26Z" fill={light ? C.navy : C.white} /><Circle cx={75} cy={32} r={5} />
        </>}
        {kind === "report" && <>
          <Rect x={32} y={14} width={73} height={71} rx={6} fill={tint} />
          <Rect x={52} y={8} width={33} height={13} rx={4} fill={light ? C.navy : C.white} />
          <Path d="M47 38h43M47 50h25M47 63h19" />
          <Path d="m82 73 4-14 30-30 10 10-30 30-14 4ZM111 34l10 10" fill={light ? C.navy : C.white} />
        </>}
        {kind === "help" && <>
          <Circle cx={75} cy={48} r={37} fill={tint} stroke="none" />
          <Path d="m51 25 10-4 10 17-7 6c5 10 10 15 21 20l6-7 16 10-4 11c-23 5-55-27-52-53Z" fill={light ? C.navy : C.white} />
          <Path d="M88 19a27 27 0 0 1 27 27M89 30a15 15 0 0 1 15 15" />
        </>}
      </G>
    </Svg>
  </View>;
}
