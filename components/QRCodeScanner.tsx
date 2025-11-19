import React, { useEffect, useRef, useState } from 'react';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;
    let isScanning = true;

    const setupScanner = async () => {
      if (!('BarcodeDetector' in window)) {
        setError('QR code scanning is not supported by this browser.');
        return;
      }
      
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.error("Video play failed:", err);
            setError('Could not start video stream.');
          });
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError('Could not access camera. Please grant permission and try again.');
        return;
      }

      const detectQrCode = async () => {
        if (!isScanning) return;
        
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              isScanning = false;
              navigator.vibrate(200); // Vibrate on success
              onScan(barcodes[0].rawValue);
            }
          } catch (err) {
            // This can happen if the context is lost, etc.
            console.error('Error during QR detection:', err);
          }
        }
        if (isScanning) {
          animationFrameId = requestAnimationFrame(detectQrCode);
        }
      };
      
      // Delay initial detection to allow camera to focus
      setTimeout(detectQrCode, 500);
    };

    setupScanner();

    return () => {
      isScanning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md relative">
        <h3 className="text-lg font-bold text-center mb-4">Scan Participant QR Code</h3>
        {error ? (
          <p className="text-red-500 text-center bg-red-100 p-3 rounded-md">{error}</p>
        ) : (
          <div className="relative w-full aspect-square bg-gray-900 rounded-md overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 border-8 border-white border-opacity-25 rounded-md pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 pointer-events-none">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-400 rounded-tl-md"></div>
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-400 rounded-tr-md"></div>
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-400 rounded-bl-md"></div>
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-400 rounded-br-md"></div>
              <div className="scanner-line absolute left-0 w-full h-1 bg-green-400 shadow-[0_0_10px_theme(colors.green.400)]"></div>
            </div>
            <style>{`
              @keyframes scan {
                0% { top: 0; }
                100% { top: 100%; }
              }
              .scanner-line {
                animation: scan 3s ease-in-out infinite;
              }
            `}</style>
          </div>
        )}
        <div className="mt-4 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
