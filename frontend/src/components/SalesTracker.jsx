import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  Calculator, 
  Plus, 
  Edit,
  Trash2,
  Fuel,
  IndianRupee,
  Gauge 
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const SalesTracker = ({ isDarkMode, salesData, addSaleRecord, updateSaleRecord, deleteSaleRecord, fuelSettings, selectedDate, creditData, incomeData, expenseData, formResetKey, editingRecord, onRecordSaved, hideRecordsList, customers }) => {
  const [formData, setFormData] = useState({
    nozzle: '',
    fuelType: '',
    startReading: '',
    endReading: '',
    testing: '',
    rate: '',
    type: 'cash',
    mpp: false // Manager Petrol Pump tag
  });
  const [editingId, setEditingId] = useState(null);
  const { toast } = useToast();
  
  // MPP checkbox is always visible
  const isMPPVisible = true;

  // Pre-fill form when editingRecord is provided
  useEffect(() => {
    if (editingRecord) {
      setFormData({
        nozzle: editingRecord.nozzle || '',
        fuelType: editingRecord.fuelType || '',
        startReading: editingRecord.startReading?.toString() || '',
        endReading: editingRecord.endReading?.toString() || '',
        testing: editingRecord.testing?.toString() || '',
        rate: editingRecord.rate?.toString() || '',
        type: editingRecord.type || 'cash',
        mpp: editingRecord.mpp || false
      });
      setEditingId(editingRecord.id);
    } else {
      // Reset when editingRecord is null (adding new record)
      setEditingId(null);
    }
  }, [editingRecord]);

  // Reset form when date changes (formResetKey changes) - but NOT when editing
  useEffect(() => {
    // Don't reset form if we're editing a record
    if (!editingRecord && !editingId) {
      setFormData({
        nozzle: '',
        fuelType: '',
        startReading: '',
        endReading: '',
        testing: '',
        rate: '',
        type: 'cash',
        mpp: false
      });
    }
  }, [formResetKey, editingRecord, editingId]);

  // Generate fuel types from settings with date-specific rates (with safety check)
  const fuelTypes = React.useMemo(() => {
    if (!fuelSettings) return [];
    
    const localStorageService = require('../services/localStorage').default;
    const dateSpecificRates = localStorageService.getRatesForDate(selectedDate);
    
    return Object.entries(fuelSettings).map(([type, config]) => {
      let rate = config.price;
      
      // Check for date-specific or last changed rate
      if (dateSpecificRates[type] !== undefined) {
        rate = dateSpecificRates[type];
      } else {
        const lastChangedRate = localStorageService.getLastChangedRate(type, selectedDate);
        if (lastChangedRate !== null) {
          rate = lastChangedRate;
        }
      }
      
      return {
        type,
        rate
      };
    });
  }, [fuelSettings, selectedDate]);

  // Generate nozzles for a specific fuel type
  const generateNozzlesForFuelType = (fuelType) => {
    if (!fuelSettings[fuelType]) return [];
    
    const config = fuelSettings[fuelType];
    const nozzles = [];
    
    // Special naming for specific fuel types
    let prefix;
    if (fuelType.toLowerCase() === 'power') {
      prefix = 'PO';
    } else if (fuelType.toLowerCase() === 'premium') {
      prefix = 'PR';
    } else {
      prefix = fuelType.charAt(0).toUpperCase();
    }
    
    for (let i = 1; i <= config.nozzleCount; i++) {
      const nozzleId = `${prefix}${i}`;
      nozzles.push({
        id: nozzleId,
        name: `Nozzle ${nozzleId}`,
        currentReading: Math.floor(Math.random() * 2000) + 500 // Mock reading
      });
    }
    return nozzles;
  };

  const generateNozzles = () => {
    const allNozzles = [];
    if (!fuelSettings) return allNozzles;
    
    Object.entries(fuelSettings).forEach(([fuelType, config]) => {
      // Special naming for specific fuel types
      let prefix;
      if (fuelType.toLowerCase() === 'power') {
        prefix = 'PO';
      } else if (fuelType.toLowerCase() === 'premium') {
        prefix = 'PR';
      } else {
        prefix = fuelType.charAt(0).toUpperCase();
      }
      
      for (let i = 1; i <= config.nozzleCount; i++) {
        allNozzles.push(`${prefix}${i}`);
      }
    });
    return allNozzles;
  };

  const nozzles = generateNozzles();

  // Function to get yesterday's end reading for a specific nozzle
  const getYesterdayEndReading = (nozzleId, fuelType) => {
    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Find all sales for this nozzle + fuel type from yesterday. Filtering by
    // fuel type as well is critical: multiple fuel types can share a nozzle
    // prefix (e.g. "Petrol" and "Power Petrol" both start with "P" → both
    // produce nozzle id "P1"). Without the fuel-type filter the starting
    // reading for a custom fuel would leak from a different fuel's sale.
    const yesterdaySales = salesData.filter(
      sale =>
        sale.date === yesterdayStr &&
        sale.nozzle === nozzleId &&
        (!fuelType || sale.fuelType === fuelType)
    );

    if (yesterdaySales.length === 0) return 0;
    return Math.max(...yesterdaySales.map(sale => sale.endReading));
  };

  const handleFuelChange = (fuelType) => {
    const fuelConfig = fuelSettings && fuelSettings[fuelType];
    
    // Get date-specific rate or last changed rate for this fuel type
    const localStorageService = require('../services/localStorage').default;
    const dateSpecificRates = localStorageService.getRatesForDate(selectedDate);
    
    let rateToUse = fuelConfig ? fuelConfig.price : '';
    
    // Check if there's a date-specific or last changed rate
    if (dateSpecificRates[fuelType] !== undefined) {
      rateToUse = dateSpecificRates[fuelType];
    } else {
      // If no date-specific rate, get last changed rate
      const lastChangedRate = localStorageService.getLastChangedRate(fuelType, selectedDate);
      if (lastChangedRate !== null) {
        rateToUse = lastChangedRate;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      fuelType,
      nozzle: '', // Clear nozzle selection when fuel type changes
      startReading: '', // Clear start reading when fuel type changes
      rate: rateToUse.toString()
    }));
  };

  const handleNozzleChange = (nozzleId) => {
    const yesterdayEndReading = getYesterdayEndReading(nozzleId, formData.fuelType);

    setFormData(prev => ({
      ...prev,
      nozzle: nozzleId,
      startReading: yesterdayEndReading.toString()
    }));
  };

  const calculateSale = () => {
    const { startReading, endReading, testing, rate } = formData;
    if (!startReading || !endReading || !rate) return null;

    // Stored `liters` is the NET quantity sold to paying customers:
    //   net = (end - start) - testing
    // The Summary card's "Fuel Sales" row shows this net — it is the money
    // the pump actually collected. Testing litres are captured separately
    // (sale.testing) and the right-column breakdown adds them back when
    // computing the gross per-fuel volume dispensed.
    const testingAmount = parseFloat(testing) || 0;
    const netLiters = parseFloat(endReading) - parseFloat(startReading) - testingAmount;
    const amount = netLiters * parseFloat(rate);

    return { liters: netLiters.toFixed(2), amount: amount.toFixed(2) };
  };

  const validateAndCreateSaleRecord = () => {
    if (!formData.nozzle || !formData.fuelType || !formData.startReading || !formData.endReading || !formData.rate) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return null;
    }

    const calculation = calculateSale();
    if (!calculation) {
      return null;
    }

    return {
      id: editingId || Date.now(),
      date: selectedDate,
      ...formData,
      startReading: parseFloat(formData.startReading),
      endReading: parseFloat(formData.endReading),
      testing: parseFloat(formData.testing) || 0,
      rate: parseFloat(formData.rate),
      liters: parseFloat(calculation.liters),
      amount: parseFloat(calculation.amount)
    };
  };

  const handleSubmit = () => {
    const saleRecord = validateAndCreateSaleRecord();
    if (!saleRecord) return;

    if (editingId) {
      // Update existing sale record
      if (updateSaleRecord) {
        updateSaleRecord(editingId, saleRecord);
        setEditingId(null);
        resetForm();
        // Close dialog after updating
        if (onRecordSaved) onRecordSaved();
      }
    } else {
      const newSale = addSaleRecord({
        nozzle: formData.nozzle,
        fuelType: formData.fuelType,
        startReading: parseFloat(formData.startReading),
        endReading: parseFloat(formData.endReading),
        testing: parseFloat(formData.testing) || 0,
        rate: parseFloat(formData.rate),
        liters: parseFloat(saleRecord.liters),
        amount: parseFloat(saleRecord.amount),
        mpp: formData.mpp || false
      });
      
      if (newSale) {
        resetForm();
        // Close dialog after adding
        if (onRecordSaved) onRecordSaved();
      }
    }
  };

  const handleAddAndContinue = () => {
    const saleRecord = validateAndCreateSaleRecord();
    if (!saleRecord) return;

    const newSale = addSaleRecord({
      nozzle: formData.nozzle,
      fuelType: formData.fuelType,
      startReading: parseFloat(formData.startReading),
      endReading: parseFloat(formData.endReading),
      testing: parseFloat(formData.testing) || 0,
      rate: parseFloat(formData.rate),
      liters: parseFloat(saleRecord.liters),
      amount: parseFloat(saleRecord.amount),
      mpp: formData.mpp || false
    });
    
    if (newSale) {
      resetForm();
      toast({
        title: "Success",
        description: `Sale added. Add more sales.`,
        variant: "default"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nozzle: '',
      fuelType: '',
      startReading: '',
      endReading: '',
      testing: '',
      rate: '',
      type: 'cash',
      mpp: false
    });
    setEditingId(null);
  };

  const editSale = (sale) => {
    setFormData({
      nozzle: sale.nozzle,
      fuelType: sale.fuelType,
      startReading: sale.startReading.toString(),
      endReading: sale.endReading.toString(),
      testing: sale.testing?.toString() || '',
      rate: sale.rate.toString(),
      type: sale.type,
      mpp: sale.mpp || false
    });
    setEditingId(sale.id);
  };

  const deleteSale = (id) => {
    if (deleteSaleRecord) {
      deleteSaleRecord(id);
    }
  };

  const calculation = calculateSale();

  // Filter sales data for the selected date
  const filteredSalesData = salesData.filter(sale => sale.date === selectedDate);

  // Render form content function (similar to CreditSales pattern)
  const renderFormContent = () => (
    <div className="p-0.5 gap-0.5 space-y-2">
      <div className={`grid ${isMPPVisible ? 'grid-cols-[1fr,1fr,auto]' : 'grid-cols-2'} gap-2`}>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Fuel Type</Label>
          <Select key={`fuel-${editingId || 'new'}`} value={formData.fuelType} onValueChange={handleFuelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select fuel type" />
            </SelectTrigger>
            <SelectContent>
              {fuelTypes.length > 0 ? fuelTypes.map(({ type, rate }) => (
                <SelectItem key={type} value={type}>
                  {type} - ₹{rate}
                </SelectItem>
              )) : (
                <SelectItem value="" disabled>Select fuel type</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Nozzle</Label>
          <Select 
            key={`nozzle-${editingId || 'new'}`}
            value={formData.nozzle} 
            onValueChange={handleNozzleChange}
            disabled={!formData.fuelType}
          >
            <SelectTrigger>
              <SelectValue placeholder={formData.fuelType ? "Select nozzle" : "Select fuel type first"} />
            </SelectTrigger>
            <SelectContent>
              {formData.fuelType && generateNozzlesForFuelType(formData.fuelType).map((nozzle) => (
                <SelectItem key={nozzle.id} value={nozzle.id}>
                  {nozzle.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isMPPVisible && (
          <div className="space-y-1">
            <Label className="text-xs font-semibold whitespace-nowrap">MPP</Label>
            <div className="flex items-center justify-center h-10 -mt-1">
              <input
                type="checkbox"
                checked={formData.mpp}
                onChange={(e) => setFormData(prev => ({ ...prev, mpp: e.target.checked }))}
                className="w-5 h-5 cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Start Reading</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.startReading}
            onChange={(e) => setFormData(prev => ({ ...prev, startReading: e.target.value }))}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">End Reading</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.endReading}
            onChange={(e) => setFormData(prev => ({ ...prev, endReading: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Testing (Liters)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.testing}
            onChange={(e) => setFormData(prev => ({ ...prev, testing: e.target.value }))}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Rate per Liter (₹)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.rate}
            onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>

      {calculation && (
        <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${
          isDarkMode ? 'bg-green-900/20 border-green-700' : ''
        }`}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-green-600">Net Liters</p>
              <p className="text-xl font-bold text-green-700">{calculation.liters}</p>
              <p className="text-xs text-green-600 mt-1">
                End - Start - Testing
              </p>
            </div>
            <div>
              <p className="text-sm text-green-600">Amount</p>
              <p className="text-xl font-bold text-green-700">₹{calculation.amount}</p>
              <p className="text-xs text-green-600 mt-1">
                Net Liters × Rate
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-4">
        {!editingId && (
          <Button 
            onClick={handleAddAndContinue} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sale & Add more
          </Button>
        )}
        <div className="flex gap-3">
          <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            {editingId ? 'Update Sale' : 'Add Sale & Close'}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={hideRecordsList ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
        {/* Input Form */}
        {hideRecordsList ? (
          // Dialog mode: Just render content without Card wrapper
          renderFormContent()
        ) : (
          // Normal mode: Render with Card wrapper
          <Card className={`${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          } shadow-lg`}>
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg py-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="w-5 h-5" />
                {editingId ? 'Edit Sale Record' : 'Add Sale Record'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {renderFormContent()}
            </CardContent>
          </Card>
        )}

      {/* Sales List - Only show when NOT in dialog mode */}
      {!hideRecordsList ? (
      <Card className={`${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
      } shadow-lg`}>
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            Sales Records ({filteredSalesData.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-3">
              {filteredSalesData.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sales records for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : 'selected date'}</p>
                </div>
              ) : (
                filteredSalesData.map((sale) => (
                  <div key={sale.id} className={`border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-white'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                          {sale.nozzle}
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">
                          {sale.fuelType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => editSale(sale)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteSale(sale.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <div className="flex flex-col sm:flex-row sm:gap-1">
                          <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Start:</span>
                          <span className="font-medium">{sale.startReading}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-1">
                          <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>End:</span>
                          <span className="font-medium">{sale.endReading}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-1">
                          <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Litres:</span>
                          <span className="font-medium">{sale.liters}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-1">
                          <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Rate:</span>
                          <span className="font-medium">₹{sale.rate}</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className={`font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Total Amount:</span>
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4 text-green-600" />
                        <span className="text-lg sm:text-xl font-bold text-green-600">
                          {sale.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      ) : null}
      </div>
    </div>
  );
};

export default SalesTracker;