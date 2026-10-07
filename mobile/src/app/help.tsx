import React from "react";
import Screen from "../screens/Help";
import { useApp } from "../state";
export default function Route() {
  const { user, campus } = useApp();
  if (!user?.verified || !campus) return null;
  return <Screen />;
}
