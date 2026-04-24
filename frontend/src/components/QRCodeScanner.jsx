import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from './ui/button';
import { X, Camera } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useConfirm } from '../hooks/use-confirm';
import localStorageService from '../services/localStorage';

const QRCodeScanner = ({ isDarkMode, onClose, onDataReceived }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    // Initialize scanner
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      false
    );

    setScanner(html5QrcodeScanner);

    return () => {
      // Cleanup
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(err => console.error('Scanner cleanup error:', err));
      }
    };
  }, []);

  const startScanning = () => {
    if (!scanner) return;

    setIsScanning(true);

    scanner.render(
      (decodedText, decodedResult) => {
        // Success callback
        console.log('QR Code scanned:', decodedText);
        handleScanSuccess(decodedText);
      },
      (errorMessage) => {
        // Error callback (can be ignored for continuous scanning)
        // console.log('Scan error:', errorMessage);
      }
    );
  };

  const handleScanSuccess = async (decodedText) => {
    try {
      // Stop scanning
      if (scanner) {
        scanner.clear();
      }
      setIsScanning(false);

      // Parse JSON data
      const importedData = JSON.parse(decodedText);

      // Validate data structure
      if (!importedData.salesData && !importedData.creditData && 
          !importedData.incomeData && !importedData.expenseData) {
        toast({
          title: "Invalid QR Code",
          description: "QR code doesn't contain valid backup data",
          variant: "destructive",
        });
        return;
      }

      // Confirm merge (window.confirm is blocked in Android WebView)
      const ok = await confirm({
        title: 'Merge Scanned Data?',
        message: 'Merge the scanned data with your existing data?\n\nIn case of conflicts, your existing data will be preserved.',
        confirmText: 'Yes, Merge',
        variant: 'primary',
        isDarkMode,
      });
      if (ok) {
        const success = localStorageService.mergeAllData(importedData);

        if (success) {
          toast({
            title: "Data Merged Successfully",
            description: "Backup data has been merged. Refreshing...",
          });

          // Notify parent and refresh
          if (onDataReceived) {
            onDataReceived();
          }

          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          toast({
            title: "Merge Failed",
            description: "Failed to merge data. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('QR scan processing error:', error);
      toast({
        title: "Scan Error",
        description: "Failed to process QR code. Please ensure it's a valid backup QR code.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear().then(() => {
        setIsScanning(false);
      }).catch(err => {
        console.error('Stop scanning error:', err);
        setIsScanning(false);
      });
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4`}>
      <div className={`w-full max-w-md rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
      } border`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Receive Data via QR Code
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopScanning();
                onClose();
              }}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Scanner Area */}
          <div className="space-y-4">
            {!isScanning ? (
              <div className="flex flex-col items-center space-y-4 py-8">
                <Camera className={`w-16 h-16 ${isDarkMode ? 'text-gray-600' : 'text-slate-300'}`} />
                <p className={`text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                  Click the button below to start camera and scan QR code
                </p>
                <Button
                  onClick={startScanning}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div id="qr-reader" className="w-full"></div>
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="w-full"
                >
                  Stop Scanning
                </Button>
              </div>
            )}

            <div className={`text-center space-y-2 p-4 rounded-lg border ${
              isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-sm font-medium ${
                isDarkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>
                📱 Instructions
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                1. Allow camera permission when prompted<br/>
                2. Point camera at the QR code<br/>
                3. Hold steady until scan completes<br/>
                4. Data will merge automatically
              </p>
            </div>
          </div>
        </div>
      </div>
      {confirmDialog}
    </div>
  );
};

export default QRCodeScanner;
