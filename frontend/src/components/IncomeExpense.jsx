import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Edit,
  Trash2,
  IndianRupee,
  Receipt,
  ChevronDown,
  X
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import localStorageService from '../services/localStorage';

const IncomeExpense = ({ isDarkMode, incomeData, addIncomeRecord, updateIncomeRecord, deleteIncomeRecord, expenseData, addExpenseRecord, updateExpenseRecord, deleteExpenseRecord, selectedDate, salesData, creditData, formResetKey, editingRecord, onRecordSaved, hideRecordsList, customers }) => {
  const [activeType, setActiveType] = useState('income');
  const [formData, setFormData] = useState({
    date: selectedDate,
    amount: '',
    description: '',
    type: 'income',
    mpp: false
  });
  const [editingId, setEditingId] = useState(null);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeDescHistory, setIncomeDescHistory] = useState([]);
  const [expenseDescHistory, setExpenseDescHistory] = useState([]);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const { toast } = useToast();
  
  // Check if MPP checkbox should be visible based on customers
  const isMPPVisible = React.useMemo(() => {
    return customers && customers.some(c => c.isMPP === true);
  }, [customers]);

  // Load categories and description history on mount
  useEffect(() => {
    setIncomeCategories(localStorageService.getIncomeCategories());
    setExpenseCategories(localStorageService.getExpenseCategories());
    setIncomeDescHistory(localStorageService.getIncomeDescHistory());
    setExpenseDescHistory(localStorageService.getExpenseDescHistory());
  }, []);

  // Reload description history when activeType changes
  useEffect(() => {
    setIncomeDescHistory(localStorageService.getIncomeDescHistory());
    setExpenseDescHistory(localStorageService.getExpenseDescHistory());
  }, [activeType]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (descriptionOpen && !event.target.closest('.relative')) {
        setDescriptionOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [descriptionOpen]);

  // Pre-fill form when editingRecord is provided
  useEffect(() => {
    if (editingRecord) {
      const recordType = editingRecord.type || 'income';
      setActiveType(recordType);
      setFormData({
        date: editingRecord.date || selectedDate,
        amount: editingRecord.amount?.toString() || '',
        description: editingRecord.description || '',
        type: recordType,
        mpp: editingRecord.mpp || false
      });
      setEditingId(editingRecord.id);
    } else {
      // Reset when editingRecord is null (adding new record)
      setEditingId(null);
    }
  }, [editingRecord, selectedDate]);

  // Reset form when date changes (formResetKey changes) - but NOT when editing
  useEffect(() => {
    // Don't reset form if we're editing a record
    if (!editingRecord && !editingId) {
      setFormData({
        date: selectedDate,
        amount: '',
        description: '',
        type: 'income',
        mpp: false
      });
      setActiveType('income');
    }
  }, [formResetKey, editingRecord, editingId, selectedDate]);
  
  // Update date when selectedDate changes (only if not editing)
  useEffect(() => {
    if (!editingId && !editingRecord) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
  }, [selectedDate, editingId, editingRecord]);

  // Removed category arrays - simplified to just amount and description

  const validateAndCreateRecord = () => {
    if (!formData.amount) {
      toast({
        title: "Error",
        description: "Please enter an amount",
        variant: "destructive"
      });
      return null;
    }

    return {
      id: editingId || Date.now(),
      date: selectedDate,
      description: formData.description,
      amount: parseFloat(formData.amount)
    };
  };

  const handleSubmit = () => {
    const record = validateAndCreateRecord();
    if (!record) return;

    if (editingId) {
      // Update existing record
      const recordData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        mpp: formData.mpp || false
      };
      
      if (activeType === 'income' && updateIncomeRecord) {
        updateIncomeRecord(editingId, recordData);
      } else if (activeType === 'expense' && updateExpenseRecord) {
        updateExpenseRecord(editingId, recordData);
      }
      setEditingId(null);
      setFormData({ date: selectedDate, description: '', amount: '', mpp: false });
      // Close dialog after updating
      if (onRecordSaved) onRecordSaved();
    } else {
      if (activeType === 'income') {
        const newIncome = addIncomeRecord({
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: formData.date,
          mpp: formData.mpp || false
        });
        
        if (newIncome) {
          // Save description to history
          localStorageService.addIncomeDescHistory(formData.description);
          setIncomeDescHistory(localStorageService.getIncomeDescHistory());
          
          setFormData({ date: selectedDate, description: '', amount: '', mpp: false });
          // Close dialog after adding
          if (onRecordSaved) onRecordSaved();
        }
      } else {
        const newExpense = addExpenseRecord({
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: formData.date,
          mpp: formData.mpp || false
        });
        
        if (newExpense) {
          // Save description to history
          localStorageService.addExpenseDescHistory(formData.description);
          setExpenseDescHistory(localStorageService.getExpenseDescHistory());
          
          setFormData({ date: selectedDate, description: '', amount: '', mpp: false });
          // Close dialog after adding
          if (onRecordSaved) onRecordSaved();
        }
      }
    }

    resetForm();
  };

  const handleAddAndContinue = () => {
    const record = validateAndCreateRecord();
    if (!record) return;

    if (activeType === 'income') {
      const newIncome = addIncomeRecord({
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        mpp: formData.mpp || false
      });
      
      if (newIncome) {
        // Save description to history
        localStorageService.addIncomeDescHistory(formData.description);
        setIncomeDescHistory(localStorageService.getIncomeDescHistory());
        
        // Keep the date, only clear description and amount
        setFormData(prev => ({ ...prev, description: '', amount: '' }));
        toast({
          title: "Success",
          description: `Income added. Add more ${activeType}.`,
          variant: "default"
        });
      }
    } else {
      const newExpense = addExpenseRecord({
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        mpp: formData.mpp || false
      });
      
      if (newExpense) {
        // Save description to history
        localStorageService.addExpenseDescHistory(formData.description);
        setExpenseDescHistory(localStorageService.getExpenseDescHistory());
        
        // Keep the date, only clear description and amount
        setFormData(prev => ({ ...prev, description: '', amount: '' }));
        toast({
          title: "Success",
          description: `Expense added. Add more ${activeType}.`,
          variant: "default"
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: selectedDate,
      amount: '',
      description: '',
      type: activeType,
      mpp: false
    });
    setEditingId(null);
  };

  const handleDeleteDescriptionHistory = (description) => {
    if (activeType === 'income') {
      localStorageService.deleteIncomeDescHistory(description);
      setIncomeDescHistory(localStorageService.getIncomeDescHistory());
    } else {
      localStorageService.deleteExpenseDescHistory(description);
      setExpenseDescHistory(localStorageService.getExpenseDescHistory());
    }
    
    toast({
      title: "Removed",
      description: `"${description}" removed from suggestions.`,
      variant: "default"
    });
  };

  const editRecord = (record, type) => {
    if (editingId === record.id) {
      // Cancel editing
      setEditingId(null);
      setFormData({ date: selectedDate, description: '', amount: '', mpp: false });
    } else {
      // Start editing
      setActiveType(type);
      setEditingId(record.id);
      setFormData({
        date: record.date || selectedDate,
        description: record.description,
        amount: record.amount.toString(),
        mpp: record.mpp || false
      });
    }
  };

  const deleteRecord = (id, type) => {
    if (type === 'income' && deleteIncomeRecord) {
      deleteIncomeRecord(id);
    } else if (type === 'expense' && deleteExpenseRecord) {
      deleteExpenseRecord(id);
    }
  };

  // Filter data for selected date  
  const filteredIncomeData = incomeData.filter(item => item.date === selectedDate);
  const filteredExpenseData = expenseData.filter(item => item.date === selectedDate);
  
  // Calculate cash position for the selected date
  const getFuelCashSales = () => {
    if (!salesData) return 0;
    const dailySales = salesData.filter(sale => sale.date === selectedDate);
    return dailySales.reduce((sum, sale) => sum + (sale.type === 'cash' ? sale.amount : 0), 0);
  };
  
  const currentData = activeType === 'income' ? filteredIncomeData : filteredExpenseData;
  
  // Calculate financial position
  const fuelCashSales = getFuelCashSales();
  const otherIncome = filteredIncomeData.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = filteredExpenseData.reduce((sum, item) => sum + item.amount, 0);
  
  // Total income from all sources
  const totalIncome = fuelCashSales + otherIncome;
  
  // Net cash in hand after all transactions
  const netCashInHand = fuelCashSales + otherIncome - totalExpenses;
  
  // Profit calculation (income - expenses)
  const netProfit = totalIncome - totalExpenses;

  // Render form content
  const renderFormContent = () => (
    <div className="space-y-4">
      {/* Date Field */}
      <div className="space-y-1">
        <Label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          className={`text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
        />
      </div>

      {/* Toggle Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={activeType === 'income' ? 'default' : 'outline'}
          onClick={() => { setActiveType('income'); resetForm(); }}
          className={activeType === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Income
        </Button>
        <Button
          variant={activeType === 'expense' ? 'default' : 'outline'}
          onClick={() => { setActiveType('expense'); resetForm(); }}
          className={activeType === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          Expense
        </Button>
      </div>

      {/* Inline Row Layout */}
      <div className="space-y-2">
        {/* Header Labels */}
        <div className={`grid grid-cols-12 gap-1 text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
          <div className="col-span-7">Description</div>
          <div className="col-span-5">Amount *</div>
        </div>

        {/* Main Entry Row */}
        <div className={`p-0.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-200'}`}>
          <div className="grid grid-cols-12 gap-0.5 items-start">
            {/* Description - 7 cols */}
            <div className="col-span-7 relative">
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                onFocus={() => setDescriptionOpen(true)}
                placeholder={`Type ${activeType} description...`}
                className={`text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                autoComplete="off"
              />
              
              {/* History suggestions dropdown */}
              {descriptionOpen && (activeType === 'income' ? incomeDescHistory : expenseDescHistory).length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-md border shadow-lg ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <div className={`text-xs font-medium p-2 border-b ${isDarkMode ? 'text-gray-400 border-gray-600' : 'text-gray-600 border-gray-200'}`}>
                    Recent Suggestions
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    <div className="p-1">
                      {(activeType === 'income' ? incomeDescHistory : expenseDescHistory).map((desc, index) => (
                        <div
                          key={`desc-${desc}-${index}`}
                          className={`flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer group ${isDarkMode ? 'text-white' : ''}`}
                        >
                          <span
                            onClick={() => {
                              setFormData(prev => ({ ...prev, description: desc }));
                              setDescriptionOpen(false);
                            }}
                            className="flex-1 text-sm"
                          >
                            {desc}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDescriptionHistory(desc);
                            }}
                          >
                            <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Amount - 5 cols */}
            <div className="col-span-5">
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className={`text-sm font-medium ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
              />
            </div>
          </div>
        </div>
        
        {/* MPP Checkbox */}
        {isMPPVisible && (
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="mpp-incexp"
              checked={formData.mpp}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mpp: checked }))}
            />
            <Label
              htmlFor="mpp-incexp"
              className={`text-sm font-medium cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-700'}`}
            >
              Manager Petrol Pump (MPP)
            </Label>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-4">
        {!editingId && !editingRecord && (
          <Button 
            onClick={handleAddAndContinue} 
            className={`w-full ${
              activeType === 'income' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeType === 'income' ? 'Add Income & Add more' : 'Add Expense & Add more'}
          </Button>
        )}
        <div className="flex gap-3">
          <Button 
            onClick={handleSubmit} 
            className={`flex-1 ${
              activeType === 'income' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            {(editingId || editingRecord) ? `Update ${activeType}` : `Add ${activeType} & Close`}
          </Button>
          {(editingId || editingRecord) && (
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
      {/* Input Form - Always render */}
      {renderFormContent()}

      {/* Records List - Only show when NOT editing a specific record */}
      {!editingRecord && (
        <>
          <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />

          {/* Records List */}
          <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
            {activeType === 'income' ? 'Income' : 'Expense'} Records
          </h3>
          <Badge variant="outline" className={activeType === 'income' ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}>
            {currentData.length} records
          </Badge>
        </div>

        {currentData.length === 0 ? (
          <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            No {activeType} records for {new Date(selectedDate).toLocaleDateString()}
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {currentData.map((record) => (
                <div 
                  key={record.id}
                  className={`border rounded-lg p-3 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${
                          activeType === 'income' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        } border-0 text-xs`}>
                          {activeType === 'income' ? 'Income' : 'Expense'}
                        </Badge>
                        {record.mpp && (
                          <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                            MPP
                          </Badge>
                        )}
                      </div>
                      {record.description && (
                        <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                          {record.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <IndianRupee className={`w-4 h-4 ${
                          activeType === 'income' ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <span className={activeType === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {record.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editRecord(record, activeType)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRecord(record.id, activeType)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default IncomeExpense;