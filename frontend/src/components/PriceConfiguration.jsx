import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
// ScrollArea import removed as no longer needed
import { 
  IndianRupee,
  Save,
  Fuel,
  Calendar
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const PriceConfiguration = ({ 
  isDarkMode, 
  fuelSettings, 
  updateFuelRate, 
  selectedDate,
  salesData,
  creditData,
  incomeData,
  expenseData,
  onClose
}) => {
  const [tempPrices, setTempPrices] = useState({});
  
  const { toast } = useToast();

  // Load date-specific rates when selectedDate changes
  React.useEffect(() => {
    const localStorageService = require('../services/localStorage').default;
    const dateSpecificRates = localStorageService.getRatesForDate(selectedDate);
    
    const prices = {};
    Object.entries(fuelSettings).forEach(([fuelType, config]) => {
      // Priority: 1. Date-specific rate 2. Last changed rate 3. Global setting
      let rateToUse = config.price;
      
      if (dateSpecificRates[fuelType] !== undefined) {
        // Use date-specific rate if it exists
        rateToUse = dateSpecificRates[fuelType];
      } else {
        // If no date-specific rate, use last changed rate from previous dates
        const lastChangedRate = localStorageService.getLastChangedRate(fuelType, selectedDate);
        if (lastChangedRate !== null) {
          rateToUse = lastChangedRate;
        }
      }
      
      prices[fuelType] = rateToUse.toString();
    });
    setTempPrices(prices);
  }, [selectedDate, fuelSettings]);

  const updateTempPrice = (fuelType, price) => {
    setTempPrices(prev => ({
      ...prev,
      [fuelType]: price
    }));
  };

  const savePrices = async () => {
    let hasChanges = false;
    let hasErrors = false;
    let updatedFuelTypes = [];
    
    // Get current date-specific rates for comparison
    const localStorageService = require('../services/localStorage').default;
    const currentDateRates = localStorageService.getRatesForDate(selectedDate);
    
    // Validate all prices first
    Object.entries(tempPrices).forEach(([fuelType, priceStr]) => {
      const price = parseFloat(priceStr);
      if (isNaN(price) || price <= 0) {
        hasErrors = true;
        return;
      }
      
      // Check if price is different from current date-specific rate
      const currentRate = currentDateRates[fuelType] || (fuelSettings[fuelType] && fuelSettings[fuelType].price);
      if (currentRate !== price) {
        hasChanges = true;
        updatedFuelTypes.push({ fuelType, price });
      }
    });
    
    if (hasErrors) {
      return;
    }
    
    if (!hasChanges) {
      // Close dialog even if no changes
      if (onClose) {
        onClose();
      }
      return;
    }

    try {
      // Update each fuel type rate for the selected date
      for (const { fuelType, price } of updatedFuelTypes) {
        await updateFuelRate(fuelType, price, selectedDate);
      }
      
      // Close dialog after saving
      if (onClose) {
        onClose();
      }
      
      // Rate updated silently - no toast notification
    } catch (error) {
      console.error('Failed to save fuel rates:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Configuration Form */}
        <Card className={`${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
        } shadow-lg`}>
          <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-t-lg py-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="w-5 h-5" />
              Rate Configuration for {selectedDate}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-2">
              {/* Individual Fuel Price Settings */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Fuel Rate (₹ per Liter)</Label>
                {Object.entries(fuelSettings).map(([fuelType, config]) => (
                  <div key={fuelType} className={`border rounded-lg p-2 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 text-gray-800 border-0 text-xs">
                          {fuelType}
                        </Badge>
                        <span className="text-xs text-slate-600">
                          {config.nozzleCount} nozzle{config.nozzleCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Current: ₹{config.price}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold min-w-0">New Rate:</Label>
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4 text-slate-500" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tempPrices[fuelType] || ''}
                          onChange={(e) => updateTempPrice(fuelType, e.target.value)}
                          placeholder="0.00"
                          className="w-24"
                        />
                        <span className="text-sm text-slate-500"></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={savePrices} className="w-full bg-gray-600 hover:bg-gray-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Rate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Rate Summary removed per user request */}
      </div>
    </div>
  );
};

export default PriceConfiguration;