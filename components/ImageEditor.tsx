import React, { useEffect, useRef, useState } from "react";
import {
  Brush,
  Check,
  Info,
  MousePointer2,
  RotateCcw,
  Undo,
  Wand2,
  X,
  ZoomIn,
} from "lucide-react";

interface ImageEditorProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

type EditorTab = "transform" | "retouch";
type Tool = "magic" | "brush";

type RGB = { r: number; g: number; b: number };
type Point = { x: number; y: number };
type BrushPreview = { x: number; y: number; size: number };

const CANVAS_SIZE = 600;

export const ImageEditor: React.FC<ImageEditorProps> = ({
  src,
  onSave,
  onCancel,
}) => {
  const [tab, setTab] = useState<EditorTab>("transform");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Transform state
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Canvas refs
  const transformCanvasRef = useRef<HTMLCanvasElement>(null);
  const retouchCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement>(new Image());

  // Retouch state
  const [baseImageData, setBaseImageData] = useState<ImageData | null>(null);
  const [currentTool, setCurrentTool] = useState<Tool>("magic");
  const [tolerance, setTolerance] = useState(22);
  const [targetColor, setTargetColor] = useState<RGB>({
    r: 255,
    g: 255,
    b: 255,
  });
  const [targetPoint, setTargetPoint] = useState<Point | null>(null);
  const [brushSize, setBrushSize] = useState(22);
  const [brushPreview, setBrushPreview] = useState<BrushPreview | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const img = sourceImageRef.current;
    img.crossOrigin = "Anonymous";
    setImageLoaded(false);
    setLoadError("");
    img.onerror = () =>
      setLoadError(
        "This image cannot be prepared. Upload a local photograph, or check that a reference image permits image editing.",
      );
    img.onload = () => {
      setImageLoaded(true);
      const fitScale = Math.min(
        (CANVAS_SIZE * 0.82) / img.naturalWidth,
        (CANVAS_SIZE * 0.82) / img.naturalHeight,
        1,
      );
      setScale(Number(fitScale.toFixed(2)));
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      requestAnimationFrame(renderTransformCanvas);
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (tab === "transform") renderTransformCanvas();
  }, [scale, rotation, position, tab]);

  const drawCheckerboard = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ) => {
    const size = 12;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e5e7eb";
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        if ((x / size + y / size) % 2 === 0) ctx.fillRect(x, y, size, size);
      }
    }
  };

  const renderTransformCanvas = () => {
    const canvas = transformCanvasRef.current;
    const img = sourceImageRef.current;
    if (!canvas || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCheckerboard(ctx, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(position.x, position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  };

  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor((clientX - rect.left) * (canvas.width / rect.width)),
      y: Math.floor((clientY - rect.top) * (canvas.height / rect.height)),
    };
  };

  const getBrushPreview = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): BrushPreview => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      size: brushSize * (rect.width / canvas.width),
    };
  };

  const handleTransformPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (tab !== "transform") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({
      x: (e.clientX * CANVAS_SIZE) / rect.width - position.x,
      y: (e.clientY * CANVAS_SIZE) / rect.height - position.y,
    });
  };

  const handleTransformPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (!isDragging || tab !== "transform") return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: (e.clientX * CANVAS_SIZE) / rect.width - dragStart.x,
      y: (e.clientY * CANVAS_SIZE) / rect.height - dragStart.y,
    });
  };

  const handleTransformPointerUp = () => setIsDragging(false);

  const commitTransform = () => {
    const canvas = transformCanvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = CANVAS_SIZE;
    tempCanvas.height = CANVAS_SIZE;
    const tCtx = tempCanvas.getContext("2d");
    if (!tCtx) return;

    const img = sourceImageRef.current;
    tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.save();
    tCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tCtx.translate(position.x, position.y);
    tCtx.rotate((rotation * Math.PI) / 180);
    tCtx.scale(scale, scale);
    tCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    tCtx.restore();

    const data = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    setBaseImageData(data);
    setHistory([data]);
    setTargetPoint(null);
    setTab("retouch");
  };

  useEffect(() => {
    if (tab === "retouch" && retouchCanvasRef.current && history.length > 0) {
      const canvas = retouchCanvasRef.current;
      const ctx = canvas.getContext("2d");
      const data = history[history.length - 1];
      if (ctx && data) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(data, 0, 0);
      }
    }
  }, [history, tab]);

  const colourDistance = (
    data: Uint8ClampedArray,
    offset: number,
    target: RGB,
  ) =>
    Math.sqrt(
      (data[offset] - target.r) ** 2 +
        (data[offset + 1] - target.g) ** 2 +
        (data[offset + 2] - target.b) ** 2,
    );

  const applyMagicWand = (
    tol: number,
    target: RGB,
    point: Point | null = targetPoint,
  ) => {
    if (history.length === 0 || !point) return;

    const lastData = history[history.length - 1];
    const width = lastData.width;
    const height = lastData.height;
    if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height)
      return;

    const newData = new ImageData(
      new Uint8ClampedArray(lastData.data),
      width,
      height,
    );
    const d = newData.data;
    const threshold = tol * 2.55;
    const visited = new Uint8Array(width * height);
    const stack = [point.y * width + point.x];
    let removed = 0;

    while (stack.length > 0) {
      const index = stack.pop();
      if (index === undefined || visited[index]) continue;
      visited[index] = 1;

      const offset = index * 4;
      if (d[offset + 3] === 0) continue;
      if (colourDistance(d, offset, target) > threshold) continue;

      d[offset + 3] = 0;
      removed += 1;

      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0) stack.push(index - 1);
      if (x < width - 1) stack.push(index + 1);
      if (y > 0) stack.push(index - width);
      if (y < height - 1) stack.push(index + width);
    }

    if (removed > 0) setHistory((prev) => [...prev.slice(-24), newData]);
  };

  const applyBrush = (cx: number, cy: number) => {
    const canvas = retouchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };

  const handleRetouchPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (tab !== "retouch") return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const canvas = retouchCanvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(canvas, e.clientX, e.clientY);

    if (currentTool === "magic") {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
      if (pixel[3] > 0) {
        const target = { r: pixel[0], g: pixel[1], b: pixel[2] };
        setTargetColor(target);
        setTargetPoint(point);
        applyMagicWand(tolerance, target, point);
      }
    } else {
      setIsDrawing(true);
      setBrushPreview(getBrushPreview(canvas, e.clientX, e.clientY));
      applyBrush(point.x, point.y);
    }
  };

  const handleRetouchPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (tab !== "retouch") return;
    const canvas = retouchCanvasRef.current;
    if (!canvas) return;

    if (currentTool === "brush")
      setBrushPreview(getBrushPreview(canvas, e.clientX, e.clientY));

    if (currentTool === "brush" && isDrawing) {
      const point = getCanvasPoint(canvas, e.clientX, e.clientY);
      applyBrush(point.x, point.y);
    }
  };

  const handleRetouchPointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = retouchCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx)
          setHistory((prev) => [
            ...prev.slice(-24),
            ctx.getImageData(0, 0, canvas.width, canvas.height),
          ]);
      }
    }
  };

  const handleUndo = () => {
    if (history.length > 1) setHistory((prev) => prev.slice(0, -1));
  };

  const handleResetRetouch = () => {
    if (baseImageData) {
      setHistory([baseImageData]);
      setTargetPoint(null);
    }
  };

  return (
    <div className="image-studio">
      <div className="studio-header">
        <div>
          <span className="eyebrow">PHOTOGRAPH PREPARATION</span>
          <h3>
            {tab === "transform"
              ? "Frame your specimen"
              : "Refine the background"}
          </h3>
        </div>
        <button className="button" onClick={onCancel}>
          <X size={16} /> Cancel
        </button>
      </div>
      {loadError && (
        <p className="notice error" role="alert">
          {loadError}
        </p>
      )}
      <p className="muted">
        Keep diagnostic features intact. Your original photograph is retained
        with the record.
      </p>
      <div className="studio-layout">
        <div className="studio-canvas checkerboard-soft">
          {tab === "transform" ? (
            <canvas
              ref={transformCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              tabIndex={0}
              aria-label="Image framing canvas. Drag to move, or use the arrow keys."
              onPointerDown={handleTransformPointerDown}
              onPointerMove={handleTransformPointerMove}
              onPointerUp={handleTransformPointerUp}
              onPointerCancel={handleTransformPointerUp}
              onKeyDown={(e) => {
                const n = e.shiftKey ? 10 : 2;
                const delta = {
                  ArrowLeft: [-n, 0],
                  ArrowRight: [n, 0],
                  ArrowUp: [0, -n],
                  ArrowDown: [0, n],
                }[e.key];
                if (delta) {
                  e.preventDefault();
                  setPosition((p) => ({
                    x: p.x + delta[0],
                    y: p.y + delta[1],
                  }));
                }
              }}
            />
          ) : (
            <canvas
              ref={retouchCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              aria-label="Background cleanup canvas"
              onPointerDown={handleRetouchPointerDown}
              onPointerMove={handleRetouchPointerMove}
              onPointerUp={handleRetouchPointerUp}
              onPointerCancel={handleRetouchPointerUp}
              onPointerLeave={() => setBrushPreview(null)}
            />
          )}
          {tab === "retouch" && currentTool === "brush" && brushPreview && (
            <span
              className="brush-preview"
              style={{
                left: brushPreview.x,
                top: brushPreview.y,
                width: brushPreview.size,
                height: brushPreview.size,
              }}
            />
          )}
        </div>
        <div className="studio-tools">
          {tab === "transform" ? (
            <>
              <label>
                Zoom{" "}
                <input
                  type="range"
                  min="0.03"
                  max="3"
                  step="0.01"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
              </label>
              <label>
                Rotation · {rotation}°{" "}
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                />
              </label>
              <p className="caption">
                Drag the photograph to centre it. Anything outside the square
                will be cropped.
              </p>
              <button
                className="button"
                onClick={() => {
                  const img = sourceImageRef.current;
                  setScale(
                    Math.min(
                      (CANVAS_SIZE * 0.82) / img.naturalWidth,
                      (CANVAS_SIZE * 0.82) / img.naturalHeight,
                      1,
                    ),
                  );
                  setPosition({ x: 0, y: 0 });
                  setRotation(0);
                }}
              >
                <RotateCcw size={16} /> Reset framing
              </button>
              <button
                className="button primary"
                onClick={commitTransform}
                disabled={!imageLoaded}
              >
                <Check size={16} /> Apply frame
              </button>
            </>
          ) : (
            <>
              <div className="segmented">
                <button
                  aria-pressed={currentTool === "magic"}
                  className={currentTool === "magic" ? "active" : ""}
                  onClick={() => setCurrentTool("magic")}
                >
                  <Wand2 size={16} /> Select
                </button>
                <button
                  aria-pressed={currentTool === "brush"}
                  className={currentTool === "brush" ? "active" : ""}
                  onClick={() => setCurrentTool("brush")}
                >
                  <Brush size={16} /> Erase
                </button>
              </div>
              {currentTool === "magic" ? (
                <>
                  <label>
                    Colour tolerance · {tolerance}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                    />
                  </label>
                  <p className="caption">
                    Click a background area to remove connected pixels of
                    similar colour. Undo before trying a different tolerance.
                  </p>
                </>
              ) : (
                <>
                  <label>
                    Eraser size · {brushSize}
                    <input
                      type="range"
                      min="5"
                      max="90"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                    />
                  </label>
                  <p className="caption">
                    Drag over the background to erase it. Avoid antennae, legs
                    and wing margins.
                  </p>
                </>
              )}
              <button
                className="button"
                onClick={handleUndo}
                disabled={history.length <= 1}
              >
                <Undo size={16} /> Undo
              </button>
              <button className="button" onClick={handleResetRetouch}>
                <RotateCcw size={16} /> Reset cleanup
              </button>
              <button
                className="button primary"
                onClick={() => {
                  if (retouchCanvasRef.current)
                    onSave(retouchCanvasRef.current.toDataURL("image/png"));
                }}
              >
                <Check size={16} /> Use prepared image
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
