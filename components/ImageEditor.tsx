import React, { useEffect, useRef, useState } from 'react';
import { Brush, Check, Info, MousePointer2, RotateCcw, Undo, Wand2, X, ZoomIn } from 'lucide-react';

interface ImageEditorProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

type EditorTab = 'transform' | 'retouch';
type Tool = 'magic' | 'brush';

type RGB = { r: number; g: number; b: number };
type Point = { x: number; y: number };
type BrushPreview = { x: number; y: number; size: number };

const CANVAS_SIZE = 600;

export const ImageEditor: React.FC<ImageEditorProps> = ({ src, onSave, onCancel }) => {
  const [tab, setTab] = useState<EditorTab>('transform');

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
  const [currentTool, setCurrentTool] = useState<Tool>('magic');
  const [tolerance, setTolerance] = useState(22);
  const [targetColor, setTargetColor] = useState<RGB>({ r: 255, g: 255, b: 255 });
  const [targetPoint, setTargetPoint] = useState<Point | null>(null);
  const [brushSize, setBrushSize] = useState(22);
  const [brushPreview, setBrushPreview] = useState<BrushPreview | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const img = sourceImageRef.current;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const fitScale = Math.min((CANVAS_SIZE * 0.82) / img.naturalWidth, (CANVAS_SIZE * 0.82) / img.naturalHeight, 1);
      setScale(Number(fitScale.toFixed(2)));
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      requestAnimationFrame(renderTransformCanvas);
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (tab === 'transform') renderTransformCanvas();
  }, [scale, rotation, position, tab]);

  const drawCheckerboard = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const size = 12;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e5e7eb';
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

    const ctx = canvas.getContext('2d');
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

  const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor((clientX - rect.left) * (canvas.width / rect.width)),
      y: Math.floor((clientY - rect.top) * (canvas.height / rect.height))
    };
  };

  const getBrushPreview = (canvas: HTMLCanvasElement, clientX: number, clientY: number): BrushPreview => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      size: brushSize * (rect.width / canvas.width)
    };
  };

  const handleTransformPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tab !== 'transform') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleTransformPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || tab !== 'transform') return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleTransformPointerUp = () => setIsDragging(false);

  const commitTransform = () => {
    const canvas = transformCanvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_SIZE;
    tempCanvas.height = CANVAS_SIZE;
    const tCtx = tempCanvas.getContext('2d');
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
    setTab('retouch');
  };

  useEffect(() => {
    if (tab === 'retouch' && retouchCanvasRef.current && history.length > 0) {
      const canvas = retouchCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const data = history[history.length - 1];
      if (ctx && data) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(data, 0, 0);
      }
    }
  }, [history, tab]);

  const colourDistance = (data: Uint8ClampedArray, offset: number, target: RGB) => Math.sqrt(
    (data[offset] - target.r) ** 2 +
    (data[offset + 1] - target.g) ** 2 +
    (data[offset + 2] - target.b) ** 2
  );

  const applyMagicWand = (tol: number, target: RGB, point: Point | null = targetPoint) => {
    if (history.length === 0 || !point) return;

    const lastData = history[history.length - 1];
    const width = lastData.width;
    const height = lastData.height;
    if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) return;

    const newData = new ImageData(new Uint8ClampedArray(lastData.data), width, height);
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

    if (removed > 0) setHistory(prev => [...prev, newData]);
  };

  const applyBrush = (cx: number, cy: number) => {
    const canvas = retouchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const handleRetouchPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tab !== 'retouch') return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const canvas = retouchCanvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(canvas, e.clientX, e.clientY);

    if (currentTool === 'magic') {
      const ctx = canvas.getContext('2d');
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

  const handleRetouchPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tab !== 'retouch') return;
    const canvas = retouchCanvasRef.current;
    if (!canvas) return;

    if (currentTool === 'brush') setBrushPreview(getBrushPreview(canvas, e.clientX, e.clientY));

    if (currentTool === 'brush' && isDrawing) {
      const point = getCanvasPoint(canvas, e.clientX, e.clientY);
      applyBrush(point.x, point.y);
    }
  };

  const handleRetouchPointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = retouchCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  };

  const handleUndo = () => {
    if (history.length > 1) setHistory(prev => prev.slice(0, -1));
  };

  const handleResetRetouch = () => {
    if (baseImageData) {
      setHistory([baseImageData]);
      setTargetPoint(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-700 shadow-2xl">
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-3 flex flex-col md:flex-row gap-3 md:justify-between md:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('transform')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 ${tab === 'transform' ? 'bg-indigo-600 text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            <MousePointer2 size={14} /> 1. Frame
          </button>
          <button
            onClick={() => baseImageData && setTab('retouch')}
            disabled={!baseImageData}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 disabled:opacity-40 ${tab === 'retouch' ? 'bg-indigo-600 text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            <Wand2 size={14} /> 2. Clean
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <Info size={14} /> {tab === 'transform' ? 'Drag to centre; scale before cleaning.' : 'Magic wand removes connected background only; brush removes manually.'}
          <button onClick={onCancel} className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white" aria-label="Close image studio"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-neutral-200 dark:bg-neutral-950 p-4">
        {tab === 'transform' ? (
          <canvas
            ref={transformCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="max-w-full max-h-full shadow-2xl cursor-move bg-white rounded-lg touch-none"
            onPointerDown={handleTransformPointerDown}
            onPointerMove={handleTransformPointerMove}
            onPointerUp={handleTransformPointerUp}
            onPointerLeave={handleTransformPointerUp}
          />
        ) : (
          <div className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden checkerboard-soft">
            <canvas
              ref={retouchCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={`block bg-transparent max-w-full max-h-full touch-none ${currentTool === 'brush' ? 'cursor-none' : 'cursor-crosshair'}`}
              onPointerDown={handleRetouchPointerDown}
              onPointerMove={handleRetouchPointerMove}
              onPointerUp={handleRetouchPointerUp}
              onPointerLeave={() => {
                handleRetouchPointerUp();
                setBrushPreview(null);
              }}
            />
            {currentTool === 'brush' && brushPreview && (
              <div
                className="absolute rounded-full border border-rose-500 bg-rose-500/10 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ left: brushPreview.x, top: brushPreview.y, width: brushPreview.size, height: brushPreview.size }}
              />
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-4 min-h-[104px]">
        {tab === 'transform' && (
          <div className="flex flex-wrap items-center gap-5 justify-center">
            <div className="flex items-center gap-2">
              <ZoomIn size={16} className="text-neutral-500" />
              <input
                type="range"
                min="0.08"
                max="3"
                step="0.02"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-40 accent-indigo-600"
                aria-label="Zoom specimen image"
              />
              <span className="text-xs text-neutral-500 w-10">{Math.round(scale * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-500 uppercase">Rotate</span>
              <button onClick={() => setRotation(r => r - 90)} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-200 rounded text-xs">-90°</button>
              <button onClick={() => setRotation(r => r + 90)} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-200 rounded text-xs">+90°</button>
              <button onClick={() => { setPosition({ x: 0, y: 0 }); setRotation(0); }} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-200 rounded text-xs flex items-center gap-1"><RotateCcw size={12} /> Reset frame</button>
            </div>
            <div className="md:ml-auto">
              <button onClick={commitTransform} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold shadow hover:bg-indigo-700">Next: clean up</button>
            </div>
          </div>
        )}

        {tab === 'retouch' && (
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between w-full">
            <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setCurrentTool('magic')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition ${currentTool === 'magic' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700' : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
                  <Wand2 size={16} className={currentTool === 'magic' ? 'text-indigo-600' : 'text-neutral-400'} />
                  Magic remove
                </div>
                {currentTool === 'magic' && (
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-4 h-4 rounded-full border border-neutral-300 shadow-sm"
                      style={{ backgroundColor: `rgb(${targetColor.r},${targetColor.g},${targetColor.b})` }}
                      title="Target colour"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tolerance}
                      onChange={(e) => setTolerance(parseInt(e.target.value))}
                      onPointerUp={() => applyMagicWand(tolerance, targetColor, targetPoint)}
                      className="w-24 accent-indigo-600 h-1.5"
                      aria-label="Magic remove tolerance"
                    />
                    <span className="text-[10px] text-neutral-400 w-6">{tolerance}</span>
                  </div>
                )}
              </button>

              <div className="w-px h-10 bg-neutral-200 dark:bg-neutral-700 mx-1" />

              <button
                onClick={() => setCurrentTool('brush')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition ${currentTool === 'brush' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700' : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
                  <Brush size={16} className={currentTool === 'brush' ? 'text-rose-500' : 'text-neutral-400'} />
                  Brush remove
                </div>
                {currentTool === 'brush' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Size</span>
                    <input
                      type="range"
                      min="5"
                      max="90"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-24 accent-rose-500 h-1.5"
                      aria-label="Brush size"
                    />
                    <span className="text-[10px] text-neutral-400 w-6">{brushSize}</span>
                  </div>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 md:ml-auto">
              <button
                onClick={handleResetRetouch}
                className="px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg flex items-center gap-2"
                title="Reset cleanup"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg flex items-center gap-2"
                title="Undo last action"
              >
                <Undo size={14} /> Undo
              </button>
              <button
                onClick={() => {
                  if (retouchCanvasRef.current) onSave(retouchCanvasRef.current.toDataURL('image/png'));
                }}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-emerald-700 flex items-center gap-2"
              >
                <Check size={16} /> Save image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
