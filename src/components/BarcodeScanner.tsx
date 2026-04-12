import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('barcode-reader-' + Date.now());

  useEffect(() => {
    const scanner = new Html5Qrcode(containerRef.current);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        scanner.stop().then(() => {
          onScan(decodedText);
        });
      },
      () => {}
    ).catch((err) => {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      console.error(err);
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold">Escanear Código</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={24} />
          </Button>
        </div>
        <div
          id={containerRef.current}
          className="w-full rounded-xl overflow-hidden"
        />
        {error && (
          <p className="mt-4 text-center text-destructive text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
