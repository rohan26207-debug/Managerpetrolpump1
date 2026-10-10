import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import QRCode from 'qrcode';
import { X, Download } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const QRCodeSender = ({ isDarkMode, data, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    generateQRCode();
  }, [data]);

  const generateQRCode = async () => {
    try {
      setIsGenerating(true);
      
      // Convert data to JSON string
      const jsonString = JSON.stringify(data);
      
      // Check data size
      const dataSize = new Blob([jsonString]).size;
      const dataSizeKB = (dataSize / 1024).toFixed(2);
      
      console.log(`Data size: ${dataSizeKB} KB`);
      
      if (dataSize > 2900) { // QR code limit is around 2900 bytes with low error correction
        toast({
          title: "Warning: Large Data",
          description: `Data size is ${dataSizeKB} KB. For best results, keep data under 2.8 KB. QR code may take longer to scan.`,
          variant: "destructive",
        });
      }
      
      if (dataSize > 7000) { // Hard limit
        throw new Error(`Data too large (${dataSizeKB} KB). Maximum is 7 KB. Please select a date with fewer transactions.`);
      }

      // Generate QR code with low error correction for maximum data capacity
      const url = await QRCode.toDataURL(jsonString, {
        width: 800,
        margin: 1,
        color: {
          dark: isDarkMode ? '#FFFFFF' : '#000000',
          light: isDarkMode ? '#1F2937' : '#FFFFFF'
        },
        errorCorrectionLevel: 'L' // Low error correction = more data capacity
      });

      setQrCodeUrl(url);
      
      toast({
        title: "QR Code Generated",
        description: `Ready to scan! Data size: ${dataSizeKB} KB`,
      });
    } catch (error) {
      console.error('QR Code generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate QR code. Data might be too large.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = `backup-qr-${new Date().toISOString().split('T')[0]}.png`;
    link.href = qrCodeUrl;
    link.click();
    
    toast({
      title: "QR Code Downloaded",
      description: "QR code image saved to downloads",
    });
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
              Send Data via QR Code
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* QR Code Display */}
          <div className="space-y-4">
            {isGenerating ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
              </div>
            ) : qrCodeUrl ? (
              <div className="flex flex-col items-center space-y-4">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-slate-50'
                }`}>
                  <img 
                    src={qrCodeUrl} 
                    alt="Backup QR Code" 
                    className="w-64 h-64"
                  />
                </div>
                
                <div className={`text-center space-y-2 p-4 rounded-lg border ${
                  isDarkMode ? 'bg-gray-900/20 border-gray-800' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📱 Instructions
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    1. Receiver opens Settings → Contact tab<br/>
                    2. Click "Receive via QR Code"<br/>
                    3. Point camera at this QR code<br/>
                    4. Data will be automatically merged
                  </p>
                </div>

                <Button
                  onClick={downloadQRCode}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            ) : (
              <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Failed to generate QR code
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeSender;
