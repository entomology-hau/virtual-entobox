import React, { useRef, useState } from 'react';
import { PinPosition } from '../types';
import { MousePointer2 } from 'lucide-react';

interface PinningCanvasProps {
  imageUrl: string;
  pinPosition: PinPosition | null;
  onPinPlace: (pos: PinPosition) => void;
  readOnly?: boolean;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const PinningCanvas: React.FC<PinningCanvasProps> = ({ imageUrl, pinPosition, onPinPlace, readOnly = false }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [hoverPos, setHoverPos] = useState<PinPosition | null>(null);

  const positionFromClientPoint = (clientX: number, clientY: number): PinPosition | null => {
    if (!imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const x = clamp(((clientX - rect.left) / rect.width) * 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100);
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const position = positionFromClientPoint(e.clientX, e.clientY);
    if (position) onPinPlace(position);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    setHoverPos(positionFromClientPoint(e.clientX, e.clientY));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPinPlace(pinPosition || { x: 50, y: 42 });
      return;
    }

    if (!pinPosition) return;
    const increment = e.shiftKey ? 5 : 1;
    const next = { ...pinPosition };

    if (e.key === 'ArrowLeft') next.x = clamp(next.x - increment);
    else if (e.key === 'ArrowRight') next.x = clamp(next.x + increment);
    else if (e.key === 'ArrowUp') next.y = clamp(next.y - increment);
    else if (e.key === 'ArrowDown') next.y = clamp(next.y + increment);
    else return;

    e.preventDefault();
    onPinPlace(next);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Insect_anatomy_diagram.svg/640px-Insect_anatomy_diagram.svg.png';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {!readOnly && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 uppercase tracking-wide font-medium">
          <MousePointer2 size={14} /> Click thorax/notum to place pin; arrow keys fine-tune
        </div>
      )}
      <div
        className={`relative inline-block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-inner overflow-hidden ${!readOnly ? 'cursor-crosshair focus:outline-none focus:ring-2 focus:ring-indigo-500' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverPos(null)}
        onKeyDown={handleKeyDown}
        tabIndex={readOnly ? undefined : 0}
        role={readOnly ? 'img' : 'button'}
        aria-label={readOnly ? 'Pinned specimen image' : 'Pinning canvas. Click the thorax or use Enter and arrow keys to place and adjust the pin.'}
      >
        <div className="absolute inset-0 checkerboard-soft opacity-60" aria-hidden="true" />
        <img
          ref={imgRef}
          src={imageUrl}
          onError={handleImageError}
          alt="Specimen for virtual pinning"
          draggable={false}
          className="relative z-10 max-w-[280px] md:max-w-[360px] max-h-[420px] select-none pointer-events-none object-contain p-3"
        />

        {pinPosition && (
          <>
            <div
              className="absolute w-[2px] h-12 bg-neutral-700 dark:bg-neutral-200 opacity-70 shadow-sm z-20 transform -translate-x-1/2 pointer-events-none"
              style={{ left: `${pinPosition.x}%`, top: `calc(${pinPosition.y}% + 2px)` }}
              aria-hidden="true"
            />
            <div
              className="absolute w-5 h-5 rounded-full bg-neutral-950 dark:bg-white border-2 border-neutral-400 dark:border-neutral-600 shadow-xl z-30 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${pinPosition.x}%`, top: `${pinPosition.y}%` }}
            >
              <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white dark:bg-neutral-900 rounded-full opacity-50" />
            </div>
            <div
              className="absolute w-2 h-2 rounded-full bg-black opacity-20 blur-[1px] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
              style={{ left: `${pinPosition.x + 2}%`, top: `${pinPosition.y + 2}%` }}
              aria-hidden="true"
            />
          </>
        )}

        {!readOnly && hoverPos && !pinPosition && (
          <div
            className="absolute w-5 h-5 rounded-full bg-neutral-900 opacity-40 border-2 border-white z-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${hoverPos.x}%`, top: `${hoverPos.y}%` }}
          />
        )}
      </div>
    </div>
  );
};
