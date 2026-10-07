import Text from "./AppText";
import React, { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { registerConfirmation } from "../state";
import { Button, Card, s } from "./ui";
type Request = {
  title: string;
  body: string;
  resolve: (confirmed: boolean) => void;
};
export default function ConfirmationHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const request = queue[0] || null;
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
          backgroundColor: "rgba(24,36,59,0.45)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Card style={{ maxWidth: 420, width: "100%" }}>
          <Text accessibilityRole="header" style={s.subheading}>
            {request?.title}
          </Text>
          <Text style={s.body}>{request?.body}</Text>
          <Button title="Confirm" onPress={() => close(true)} />
          <Button secondary title="Cancel" onPress={() => close(false)} />
        </Card>
      </View>
    </Modal>
  );
}
