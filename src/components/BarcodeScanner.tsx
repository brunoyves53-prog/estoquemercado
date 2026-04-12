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

    // 1st attempt: force rear camera with exact
    try {
      await scanner.start(
        { facingMode: { exact: 'environment' } },
        scanConfig, onSuccess, onError
      );
      return;
    } catch { /* continue to fallback */ }

    // 2nd attempt: find rear camera by device label
    const fallbackId = await findRearCameraFallback();
    if (fallbackId) {
      try {
        await scanner.start(
          { deviceId: { exact: fallbackId } },
          scanConfig, onSuccess, onError
        );
        return;
      } catch { /* continue */ }
    }

    // 3rd attempt: non-exact environment
    try {
      await scanner.start(
        { facingMode: 'environment' },
        scanConfig, onSuccess, onError
      );
      return;
    } catch (err) {
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
