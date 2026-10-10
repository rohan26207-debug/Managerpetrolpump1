import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Package, Plus, TrendingUp, TrendingDown, Box, Fuel } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import localStorageService from '../services/localStorage';

const MPPStock = ({ isDarkMode, selectedDate, salesData, fuelSettings, onClose, onStockSaved }) => {
  const [selectedFuelType, setSelectedFuelType] = useState('');
  const [stockData, setStockData] = useState({
    startStock: '',
    purchase: '',
    sales: 0,
    endStock: 0
  });
  const { toast } = useToast();

  // Get available fuel types from fuelSettings
  const availableFuelTypes = React.useMemo(() => {
    if (!fuelSettings) return ['MPP', 'Power'];
    return Object.keys(fuelSettings);
  }, [fuelSettings]);

  // Calculate sales from Reading Sales for selected fuel type
  useEffect(() => {
    const calculateFuelSales = () => {
      if (!salesData || salesData.length === 0) return 0;
      
      // Filter sales for selected fuel type on selected date, excluding MPP-tagged sales
      const fuelSales = salesData
        .filter(sale => sale.date === selectedDate && sale.fuelType === selectedFuelType && !sale.mpp)
        .reduce((total, sale) => total + (parseFloat(sale.liters) || 0), 0);
      
      return fuelSales;
    };

    const fuelSalesTotal = calculateFuelSales();
    setStockData(prev => ({
      ...prev,
      sales: fuelSalesTotal
    }));
  }, [salesData, selectedDate, selectedFuelType]);

  // Calculate end stock whenever start stock, purchase, or sales change
  useEffect(() => {
    const startStock = parseFloat(stockData.startStock) || 0;
    const purchase = parseFloat(stockData.purchase) || 0;
    const sales = parseFloat(stockData.sales) || 0;
    
    const calculatedEndStock = startStock + purchase - sales;
    
    setStockData(prev => ({
      ...prev,
      endStock: calculatedEndStock
    }));
  }, [stockData.startStock, stockData.purchase, stockData.sales]);

  // Load stock data for selected date and fuel type from localStorage
  useEffect(() => {
    const loadStockData = () => {
      const storageKey = `${selectedFuelType.toLowerCase()}StockData`;
      const allStockData = localStorageService.getItem(storageKey);
      if (allStockData) {
        const dateData = allStockData[selectedDate];
        
        if (dateData) {
          setStockData(prev => ({
            ...prev,
            startStock: dateData.startStock || '',
            purchase: dateData.purchase || ''
          }));
        } else {
          // Load start stock from previous date's end stock
          loadPreviousDayEndStock();
        }
      } else {
        loadPreviousDayEndStock();
      }
    };

    const loadPreviousDayEndStock = () => {
      const storageKey = `${selectedFuelType.toLowerCase()}StockData`;
      const allStockData = localStorageService.getItem(storageKey);
      if (allStockData) {
        
        // Get previous date
        const currentDate = new Date(selectedDate);
        currentDate.setDate(currentDate.getDate() - 1);
        const previousDate = currentDate.toISOString().split('T')[0];
        
        const previousDateData = allStockData[previousDate];
        if (previousDateData) {
          setStockData(prev => ({
            ...prev,
            startStock: previousDateData.endStock?.toString() || '',
            purchase: ''
          }));
        } else {
          setStockData(prev => ({
            ...prev,
            startStock: '',
            purchase: ''
          }));
        }
      }
    };

    loadStockData();
  }, [selectedDate, selectedFuelType]);

  const handleSave = () => {
    // Validation
    if (!selectedFuelType) {
      toast({
        title: "Validation Error",
        description: "Please select a fuel type",
        variant: "destructive"
      });
      return;
    }
    
    if (!stockData.startStock && !stockData.purchase) {
      return;
    }

    // Save to localStorage with fuel-type specific key
    const storageKey = `${selectedFuelType.toLowerCase()}StockData`;
    const allStockData = localStorageService.getItem(storageKey) || {};
    
    allStockData[selectedDate] = {
      fuelType: selectedFuelType,
      startStock: parseFloat(stockData.startStock) || 0,
      purchase: parseFloat(stockData.purchase) || 0,
      sales: stockData.sales,
      endStock: stockData.endStock,
      date: selectedDate
    };
    
    localStorageService.setItem(storageKey, allStockData);
    
    // Notify parent that stock was saved (to trigger re-render of STOCK summary)
    if (onStockSaved) {
      onStockSaved();
    }
    
    // Close dialog after saving
    if (onClose) {
      onClose();
    }
  };

  const handleSaveAndContinue = () => {
    // Validation
    if (!selectedFuelType) {
      toast({
        title: "Validation Error",
        description: "Please select a fuel type",
        variant: "destructive"
      });
      return;
    }
    
    if (!stockData.startStock && !stockData.purchase) {
      return;
    }

    // Save to localStorage with fuel-type specific key
    const storageKey = `${selectedFuelType.toLowerCase()}StockData`;
    const allStockData = localStorageService.getItem(storageKey) || {};
    
    allStockData[selectedDate] = {
      fuelType: selectedFuelType,
      startStock: parseFloat(stockData.startStock) || 0,
      purchase: parseFloat(stockData.purchase) || 0,
      sales: stockData.sales,
      endStock: stockData.endStock,
      date: selectedDate
    };
    
    localStorageService.setItem(storageKey, allStockData);
    
    // Notify parent that stock was saved (to trigger re-render of STOCK summary)
    if (onStockSaved) {
      onStockSaved();
    }
    
    // Reset form for next entry but keep the dialog open
    setSelectedFuelType(''); // Reset to no selection
    setStockData({
      startStock: '',
      purchase: '',
      sales: 0,
      endStock: 0
    });
    
    // Don't close dialog - user can continue adding for other fuel types or same type
  };

  return (
    <div className="space-y-4">
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
        <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-t-lg py-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-5 h-5" />
            Stock Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-2">
            {/* Fuel Type Selection */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-2">
                <Fuel className="w-4 h-4" />
                Select Fuel Type *
              </Label>
              <select
                value={selectedFuelType}
                onChange={(e) => setSelectedFuelType(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-base font-medium ${
                  isDarkMode 
                    ? 'bg-gray-600 border-gray-500 text-white' 
                    : 'bg-white border-slate-300'
                }`}
              >
                <option value="" disabled>
                  Select fuel type
                </option>
                {availableFuelTypes.map((fuelType) => (
                  <option key={fuelType} value={fuelType}>
                    {fuelType}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Stock */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-2">
                <Box className="w-4 h-4" />
                Start Stock (Liters)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={stockData.startStock}
                onChange={(e) => setStockData(prev => ({ ...prev, startStock: e.target.value }))}
                placeholder="0.00"
                className={`text-base font-medium ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>

            {/* Purchase */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                Purchase (Liters)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={stockData.purchase}
                onChange={(e) => setStockData(prev => ({ ...prev, purchase: e.target.value }))}
                placeholder="0.00"
                className={`text-base font-medium ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>

            {/* Sales (Read-only) */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-gray-600" />
                Sales (Liters)
              </Label>
              <div className={`px-4 py-2 rounded-md border text-base sm:text-lg font-bold ${
                isDarkMode ? 'bg-gray-900 bg-opacity-30 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {stockData.sales.toFixed(2)} L
              </div>
            </div>

            {/* End Stock (Read-only) */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-600" />
                End Stock (Liters)
              </Label>
              <div className={`px-4 py-2 rounded-md border text-base sm:text-lg font-bold ${
                stockData.endStock < 0 
                  ? isDarkMode ? 'bg-gray-900 bg-opacity-30 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200'
                  : isDarkMode ? 'bg-gray-900 bg-opacity-30 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {stockData.endStock.toFixed(2)} L
              </div>
            </div>

            {/* Save Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleSaveAndContinue}
                className="w-full bg-gray-600 hover:bg-gray-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Save & Add More
              </Button>
              
              <Button 
                onClick={handleSave}
                className="w-full bg-gray-600 hover:bg-gray-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Save Stock & Exit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MPPStock;
