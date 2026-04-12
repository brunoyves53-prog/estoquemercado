import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, Flashlight, FlashlightOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);
  const [torch, setTorch] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('barcode-reader-' + Date.now());
  const lastCodeRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);
  const lastCodeTimeRef = useRef(0);
  const hasScannedRef = useRef(false);

  const STABILITY_THRESHOLD = 3; // need 3 consistent reads
  const DUPLICATE_COOLDOWN = 2000; // 2s cooldown for same code

  const handleDetection = useCallback((decodedText: string) => {
    if (hasScannedRef.current) return;

    const now = Date.now();

    // Stability check: same code read multiple times
    if (decodedText === lastCodeRef.current) {
      stableCountRef.current++;
    } else {
      lastCodeRef.current = decodedText;
      stableCountRef.current = 1;
    }

    // Only accept after stable reads
    if (stableCountRef.current < STABILITY_THRESHOLD) return;

    // Duplicate cooldown
    if (now - lastCodeTimeRef.current < DUPLICATE_COOLDOWN && decodedText === lastCodeRef.current) return;

    hasScannedRef.current = true;
    lastCodeTimeRef.current = now;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Visual feedback
    setDetected(true);

    // Stop and callback after brief visual feedback
    setTimeout(() => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => {
          onScan(decodedText);
        }).catch(() => {
          onScan(decodedText);
        });
      } else {
        onScan(decodedText);
      }
    }, 300);
  }, [onScan]);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerRef.current);
    scannerRef.current = scanner;

    const config = {
      fps: 15,
      qrbox: { width: 280, height: 120 },
      aspectRatio: 1.0,
      disableFlip: false,
      formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as any,
    };

    scanner.start(
      {
        facingMode: 'environment',
      },
      config,
      handleDetection,
      () => {} // ignore non-detections
    ).then(() => {
      // Try to apply camera optimizations
      try {
        const videoElement = document.querySelector(`#${containerRef.current} video`) as HTMLVideoElement;
        if (videoElement?.srcObject) {
          const track = (videoElement.srcObject as MediaStream).getVideoTracks()[0];
          const capabilities = track.getCapabilities?.() as any;

          const constraints: any = {};

          // Enable continuous autofocus
          if (capabilities?.focusMode?.includes('continuous')) {
            constraints.focusMode = 'continuous';
          }

          // Apply zoom if available
          if (capabilities?.zoom) {
            const minZoom = capabilities.zoom.min || 1;
            const maxZoom = capabilities.zoom.max || 1;
            const targetZoom = Math.min(minZoom * 1.5, maxZoom);
            constraints.zoom = targetZoom;
          }

          // Lower resolution for speed
          if (Object.keys(constraints).length > 0) {
            track.applyConstraints({ advanced: [constraints] } as any).catch(() => {});
          }
        }
      } catch {
        // Camera optimizations are best-effort
      }
    }).catch((err) => {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      console.error(err);
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [handleDetection]);

  const toggleTorch = async () => {
    try {
      const videoElement = document.querySelector(`#${containerRef.current} video`) as HTMLVideoElement;
      if (videoElement?.srcObject) {
        const track = (videoElement.srcObject as MediaStream).getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities?.torch) {
          await track.applyConstraints({ advanced: [{ torch: !torch }] } as any);
          setTorch(!torch);
        }
      }
    } catch {
      // Torch not available
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <h3 className="text-lg font-display font-semibold text-white">Escanear Código</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTorch} className="text-white hover:bg-white/20">
            {torch ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X size={24} />
          </Button>
        </div>
      </div>

      {/* Scanner area */}
      <div className="relative w-full h-full">
        <div
          id={containerRef.current}
          className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
        />

        {/* Scan area overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Dark overlay with transparent center */}
          <div className="absolute inset-0 bg-black/50" style={{
            maskImage: 'linear-gradient(to bottom, black 30%, transparent 30%, transparent 60%, black 60%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 30%, transparent 60%, black 60%)',
          }} />

          {/* Scan frame */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-28">
            {/* Corner markers */}
            <div className={`absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 rounded-tl-lg transition-colors duration-200 ${detected ? 'border-green-400' : 'border-white'}`} style={{ borderWidth: '3px 0 0 3px' }} />
            <div className={`absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 rounded-tr-lg transition-colors duration-200 ${detected ? 'border-green-400' : 'border-white'}`} style={{ borderWidth: '3px 3px 0 0' }} />
            <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 rounded-bl-lg transition-colors duration-200 ${detected ? 'border-green-400' : 'border-white'}`} style={{ borderWidth: '0 0 3px 3px' }} />
            <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 rounded-br-lg transition-colors duration-200 ${detected ? 'border-green-400' : 'border-white'}`} style={{ borderWidth: '0 3px 3px 0' }} />

            {/* Scanning line animation */}
            {!detected && (
              <div className="absolute left-2 right-2 h-0.5 bg-red-500/80 animate-scan-line rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            )}

            {/* Success flash */}
            {detected && (
              <div className="absolute inset-0 bg-green-400/20 rounded-lg animate-pulse" />
            )}
          </div>
        </div>

        {/* Bottom instruction */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/70 to-transparent text-center">
          {detected ? (
            <p className="text-green-400 font-medium text-sm">✓ Código detectado!</p>
          ) : (
            <p className="text-white/80 text-sm">Posicione o código de barras dentro da área</p>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-4">
          <div className="text-center">
            <p className="text-destructive text-sm mb-4">{error}</p>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
