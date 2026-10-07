import Text from "./AppText";
import React from "react";
import { Modal, ScrollView, View } from "react-native";
import { Card, FocusPressable, s, C } from "./ui";
import { Ionicons } from "@expo/vector-icons";
import type { MapPin } from "../types";
export default function MapDetails({
  visible,
  pins,
  onClose,
}: {
  visible: boolean;
  pins: MapPin[];
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(24,36,59,0.45)",
          justifyContent: "flex-end",
          padding: 0,
        }}
      >
        <View
          accessibilityViewIsModal
          role="dialog"
          aria-modal
          accessibilityLabel="Map details"
          style={{
            backgroundColor: C.sky,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            width: "100%",
            maxWidth: 620,
            alignSelf: "center",
            maxHeight: "85%",
            padding: 22,
            paddingBottom: 34,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text accessibilityRole="header" style={s.subheading}>
                Map details
              </Text>
              {pins.length > 1 && (
                <Text style={s.small}>
                  {pins.length + " updates in this group"}
                </Text>
              )}
            </View>
            <FocusPressable
              accessibilityRole="button"
              accessibilityLabel="Close map details"
              onPress={onClose}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: C.mint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={23} color={C.blue} />
            </FocusPressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            {!pins.length && (
              <Text style={s.body}>
                These updates are no longer available in this view.
              </Text>
            )}
            {pins.map((pin) => (
              <Card
                key={pin.id}
                style={{ backgroundColor: C.white, paddingHorizontal: 0 }}
              >
                <Text style={s.label}>{pin.title}</Text>
                {!!pin.subtitle && <Text style={s.small}>{pin.subtitle}</Text>}
                {!!pin.description && (
                  <Text style={s.body}>{pin.description}</Text>
                )}
              </Card>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
