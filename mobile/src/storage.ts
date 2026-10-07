import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
export const storage = {
  async get(key: string) {
    return Platform.OS === "web"
      ? sessionStorage.getItem(key)
      : SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === "web") sessionStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (Platform.OS === "web") sessionStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
