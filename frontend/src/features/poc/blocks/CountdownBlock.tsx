import { useState, useEffect } from "react";
import type { CountdownBlock } from "../types";

interface Props {
  block: CountdownBlock;
}

export function CountdownBlockComponent({ block }: Props) {
  const { minutes, label, textColor, backgroundColor } = block;

  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div style={{ padding: "0 var(--p-block-padding-x)" }}>
    <div
      style={{
        display: "inline-block",
        textAlign: "center",
        padding: "var(--p-space-4)",
        borderRadius: "var(--p-radius-md)",
        ...(backgroundColor ? { backgroundColor } : {}),
        ...(textColor ? { color: textColor } : {}),
      }}
    >
      {label && (
        <div
          style={{
            fontSize: "var(--p-micro-size)",
            fontWeight: "var(--p-micro-weight)" as React.CSSProperties["fontWeight"],
            lineHeight: "var(--p-micro-lh)",
            letterSpacing: "var(--p-micro-ls)",
            marginBottom: "var(--p-space-2)",
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontSize: "var(--p-h1-size)",
          fontWeight: "var(--p-h1-weight)" as React.CSSProperties["fontWeight"],
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {mm}:{ss}
      </div>
    </div>
    </div>
  );
}
