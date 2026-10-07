import React from "react";
import Screen from "../screens/Sharing";
import { useApp } from "../state";
export default function Route() {
  const { user } = useApp();
  if (!user?.verified) return null;
  return <Screen />;
}
