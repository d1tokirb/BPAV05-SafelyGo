import Text from "./AppText";
import React, { useEffect, useState } from "react";
import { Animated, Modal, Platform, View } from "react-native";
import { ease, useReducedMotion } from "./motion";
import { registerConfirmation } from "../state";
import { Button, Card, s } from "./ui";
type Request = {
  title: string;
  body: string;
  confirmLabel?: string;
  destructive?: boolean;
  resolve: (confirmed: boolean) => void;
};
export default function ConfirmationHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const request = queue[0] || null;
  const reduced = useReducedMotion();
  const enter = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!request) return;
    if (reduced) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      easing: ease,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [request, reduced, enter]);
  useEffect(() => {
    registerConfirmation((value) =>
      setQueue((previous) => [...previous, value]),
    );
    return () => registerConfirmation(null);
  }, []);
  const close = (confirmed: boolean) => {
    request?.resolve(confirmed);
    setQueue((previous) => previous.slice(1));
  };
  return (
    <Modal
      visible={!!request}
      transparent
      animationType="none"
      onRequestClose={() => close(false)}
    >
      <View
        accessibilityViewIsModal
        role="alertdialog"
        aria-modal
        accessibilityLabel={request?.title}
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: "rgba(15,30,58,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Animated.View
          style={{
            maxWidth: 420,
            width: "100%",
            opacity: enter,
            transform: [
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
              {
                scale: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          }}
        >
          <Card style={{ width: "100%", borderRadius: 20, padding: 20 }}>
            <Text accessibilityRole="header" style={s.subheading}>
              {request?.title}
            </Text>
            <Text style={s.body}>{request?.body}</Text>
            <Button
              title={request?.confirmLabel || "Continue"}
              danger={request?.destructive}
              onPress={() => close(true)}
            />
            <Button secondary title="Go back" onPress={() => close(false)} />
          </Card>
        </Animated.View>
      </View>
    </Modal>
  );
}
