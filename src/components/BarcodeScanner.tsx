import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

async function findBestRearCamera(): Promise<string | null> {
  try {
    // Request permission first
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    tempStream.getTracks().forEach(t => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');

    if (videoInputs.length <= 1) return null; // fallback

    type CameraInfo = { deviceId: string; zoomMin: number; score: number };
    const candidates: CameraInfo[] = [];

    for (const device of videoInputs) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: device.deviceId } }
        });
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as any;
        stream.getTracks().forEach(t => t.stop());

        if (!caps) continue;

        const zoomMin = caps.zoom?.min ?? 1;

        // Skip ultra-wide (zoom.min < 1)
        if (zoomMin < 0.9) continue;

        // Score: prefer zoom.min closest to 1, and higher resolution
        const zoomScore = 1 / (1 + Math.abs(zoomMin - 1));
        const resScore = (caps.width?.max ?? 0) / 10000;
        candidates.push({
          deviceId: device.deviceId,
          zoomMin,
          score: zoomScore * 10 + resScore,
        });
      } catch {
        // skip inaccessible cameras
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].deviceId;
  } catch {
    return null;
  }
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('barcode-reader-' + Date.now());
  const stableOnScan = useRef(onScan);
  stableOnScan.current = onScan;

  const startScanner = useCallback(async () => {
    const scanner = new Html5Qrcode(containerRef.current);
    scannerRef.current = scanner;

    const bestId = await findBestRearCamera();

    const cameraConfig: any = bestId
      ? { deviceId: { exact: bestId } }
      : { facingMode: 'environment' };

    try {
      await scanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          scanner.stop().then(() => stableOnScan.current(decodedText));
        },
        () => {}
      );
    } catch (err) {
      // Fallback if exact device fails
      if (bestId) {
        try {
          await scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
              scanner.stop().then(() => stableOnScan.current(decodedText));
            },
            () => {}
          );
          return;
        } catch { /* fall through */ }
      }
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    startScanner();
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [startScanner]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold">Escanear Código</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={24} />
          </Button>
        </div>
        <div id={containerRef.current} className="w-full rounded-xl overflow-hidden" />
        {error && (
          <p className="mt-4 text-center text-destructive text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
