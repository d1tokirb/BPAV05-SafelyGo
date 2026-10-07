import Text from "./AppText";
import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "./ui";
export default function ReportStatus({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const current = status === "submitted" ? 0 : status === "reviewing" ? 1 : 2;
  const labels = [
    "Received",
    "Staff reviewing",
    status === "dismissed" ? "Closed" : "Resolved",
  ];
  const icons = [
    "checkmark",
    "reader-outline",
    status === "dismissed" ? "close" : "checkmark-done",
  ] as const;
  if (compact)
    return (
      <View
        accessible
        accessibilityLabel={`Report status: ${labels[current]}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        <Ionicons name={icons[current]} size={17} color={C.blue} />
        <Text
          style={{
            fontSize: 13,
            lineHeight: 20,
            color: C.blue,
            fontWeight: "600",
          }}
        >
          {labels[current]}
        </Text>
      </View>
    );
  return (
    <View
      accessible
      accessibilityLabel={`Report status: ${labels[current]}`}
      style={{ flexDirection: "row", paddingVertical: 4 }}
    >
      {labels.map((label, index) => (
        <View key={label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          {index < 2 && (
            <View
              aria-hidden
              style={{
                position: "absolute",
                left: "65%",
                width: "70%",
                top: 14,
                height: 1,
                backgroundColor: C.line,
              }}
            />
          )}
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: index === current ? C.blue : C.mint,
            }}
          >
            <Ionicons
              name={icons[index]}
              size={16}
              color={index === current ? C.white : C.muted}
            />
          </View>
          <Text
            style={{
              fontSize: 12,
              textAlign: "center",
              fontWeight: index === current ? "700" : "400",
              color: index === current ? C.blue : C.muted,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
