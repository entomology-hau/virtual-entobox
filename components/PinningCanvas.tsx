import React, { useRef, useState } from "react";
import { PinPosition } from "../types";
const clamp = (v: number) => Math.max(0, Math.min(100, v));
export function PinningCanvas({
  imageUrl,
  pinPosition,
  onPinPlace,
  readOnly = false,
}: {
  imageUrl: string;
  pinPosition: PinPosition | null;
  onPinPlace: (p: PinPosition) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  return (
    <div className="pin-wrap">
      <div
        ref={ref}
        className={`pin-image ${readOnly ? "" : "interactive"}`}
        tabIndex={readOnly ? undefined : 0}
        role={readOnly ? "img" : "button"}
        aria-label={
          readOnly
            ? "Specimen photograph"
            : "Place virtual pin. Press Enter then use arrow keys to adjust."
        }
        onClick={(e) => {
          if (readOnly) return;
          const r = ref.current!.getBoundingClientRect();
          onPinPlace({
            x: clamp(((e.clientX - r.left) / r.width) * 100),
            y: clamp(((e.clientY - r.top) / r.height) * 100),
          });
        }}
        onKeyDown={(e) => {
          if (readOnly) return;
          const p = pinPosition || { x: 50, y: 42 };
          const step = e.shiftKey ? 5 : 1;
          let next: PinPosition | undefined;
          if (e.key === "Enter" || e.key === " ") next = p;
          if (e.key === "ArrowLeft") next = { ...p, x: clamp(p.x - step) };
          if (e.key === "ArrowRight") next = { ...p, x: clamp(p.x + step) };
          if (e.key === "ArrowUp") next = { ...p, y: clamp(p.y - step) };
          if (e.key === "ArrowDown") next = { ...p, y: clamp(p.y + step) };
          if (next) {
            e.preventDefault();
            onPinPlace(next);
          }
        }}
      >
        {failed ? (
          <p className="image-error">
            Photograph unavailable. Replace the image to continue.
          </p>
        ) : (
          <img
            src={imageUrl}
            alt="Specimen photograph"
            draggable={false}
            onError={() => setFailed(true)}
          />
        )}
        {pinPosition && !failed && (
          <span
            className="virtual-pin"
            style={{ left: `${pinPosition.x}%`, top: `${pinPosition.y}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      {!readOnly && (
        <p className="caption">
          Click to position the pin. Arrow keys fine-tune; Shift moves further.
        </p>
      )}
    </div>
  );
}
