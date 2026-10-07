import { useEffect, useRef, useState } from "react";
import { draftStorage } from "./drafts";
export function useFormDraft<T extends object>(
  key: string,
  values: T,
  restore: (value: T) => void,
) {
  const callback = useRef(restore);
  const [readyKey, setReadyKey] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    callback.current = restore;
  }, [restore]);
  useEffect(() => {
    let mounted = true;
    void draftStorage
      .get(key)
      .then((saved) => {
        if (!mounted) return;
        if (saved) callback.current(JSON.parse(saved));
        setReadyKey(key);
      })
      .catch(() => {
        if (mounted) {
          setError(
            "Draft storage is unavailable. Keep this form open until you save it.",
          );
          setReadyKey(key);
        }
      });
    return () => {
      mounted = false;
    };
  }, [key]);
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (readyKey !== key) return;
    void draftStorage
      .set(key, serialized)
      .catch(() =>
        setError(
          "Your draft could not be saved. Keep this form open until you finish.",
        ),
      );
  }, [key, readyKey, serialized]);
  return {
    ready: readyKey === key,
    error,
    clear: () => draftStorage.remove(key),
  };
}
