import React from "react";
import Screen from "../screens/Staff";
import { useApp } from "../state";
export default function Route() {
  const { user, campus } = useApp();
  if (!user?.verified || !campus || !["owner", "staff"].includes(campus.role))
    return null;
  return <Screen />;
}
