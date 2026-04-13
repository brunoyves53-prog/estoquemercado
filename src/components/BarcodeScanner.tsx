import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

async function findRearCameraFallback(): Promise<string | null> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    const rear = videoInputs.find(d => {
      const label = (d.label || '').toLowerCase();
      return label.includes('back') || label.includes('rear') || label.includes('traseira') || label.includes('environment');
    });
    return rear?.deviceId ?? null;
  } catch {
    return null;
  }
}

/** Apply continuous autofocus and zoom=1 to the running video track */
async function applyFocusConstraints(scanner: Html5Qrcode) {
  try {
    // Access the internal video element to get the active track
    const videoElem = document.querySelector(`#${CSS.escape(scanner.getRunningTrackSettings ? '' : '')}`) as HTMLVideoElement | null;
    // Html5Qrcode exposes getRunningTrackSettings but not the track itself,
    // so we grab it from the video element inside the container
    const container = scanner.getState ? document.querySelector('video') : document.querySelector('video');
    if (!container) return;

    const stream = (container as HTMLVideoElement).srcObject as MediaStream | null;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const capabilities = track.getCapabilities?.() as any;
    const constraints: any = {};

    // Enable continuous autofocus if supported
    if (capabilities?.focusMode?.includes?.('continuous')) {
      constraints.focusMode = 'continuous';
    }

    // Lock zoom to 1x to avoid ultra-wide
    if (capabilities?.zoom) {
      const targetZoom = Math.max(capabilities.zoom.min, 1);
      constraints.zoom = Math.min(targetZoom, capabilities.zoom.max);
    }

    if (Object.keys(constraints).length > 0) {
      await track.applyConstraints({ advanced: [constraints] } as any);
      console.log('Camera constraints applied:', constraints);
    }
  } catch (e) {
    console.warn('Could not apply focus constraints:', e);
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

    const scanConfig = { fps: 10, qrbox: { width: 250, height: 150 } };
    const onSuccess = (decodedText: string) => {
      scanner.stop().then(() => stableOnScan.current(decodedText));
    };
    const onError = () => {};

    const tryStart = async (cameraIdOrConfig: any): Promise<boolean> => {
      try {
        await scanner.start(cameraIdOrConfig, scanConfig, onSuccess, onError);
        // After scanner starts, apply focus & zoom constraints
        await applyFocusConstraints(scanner);
        return true;
      } catch {
        return false;
      }
    };

    // 1st attempt: force rear camera with exact
    if (await tryStart({ facingMode: { exact: 'environment' } })) return;

    // 2nd attempt: find rear camera by device label
    const fallbackId = await findRearCameraFallback();
    if (fallbackId && await tryStart({ deviceId: { exact: fallbackId } })) return;

    // 3rd attempt: non-exact environment
    if (await tryStart({ facingMode: 'environment' })) return;

    setError('Não foi possível acessar a câmera. Verifique as permissões.');
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