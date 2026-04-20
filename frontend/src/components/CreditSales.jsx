import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  CreditCard, 
  Plus, 
  Edit,
  Trash2,
  Users,
  IndianRupee,
  Calendar,
  CheckCircle,
  Clock,
  Search,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import localStorageService from '../services/localStorage';

const CreditSales = ({ isDarkMode, creditData, addCreditRecord, updateCreditRecord, deleteCreditRecord, fuelSettings, selectedDate, salesData, incomeData, expenseData, formResetKey, editingRecord, onRecordSaved, hideRecordsList, customers = [] }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    creditDate: selectedDate, // Add date field
    fuelEntries: [{ fuelType: '', liters: '', rate: '' }], // Array of fuel entries
    incomeEntries: [], // Array of income entries
    expenseEntries: [], // Array of expense entries (discounts, etc.)
    mpp: false // Manager Petrol Pump tag
  });
  const [editingId, setEditingId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef(null);
  const incomeExpenseMenuRef = useRef(null);
  const [showIncomeExpenseMenu, setShowIncomeExpenseMenu] = useState(false);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [tempIncome, setTempIncome] = useState({ description: '', amount: '' });
  const [tempExpense, setTempExpense] = useState({ description: '', amount: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, credit: null });
  const { toast } = useToast();
  
  // Check if MPP checkbox should be visible based on customers
  const isMPPVisible = React.useMemo(() => {
    return customers && customers.some(c => c.isMPP === true);
  }, [customers]);

  // Generate fuel types with date-specific rates
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
      if (incomeExpenseMenuRef.current && !incomeExpenseMenuRef.current.contains(event.target)) {
        setShowIncomeExpenseMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Pre-fill form when editingRecord is provided
  useEffect(() => {
    if (editingRecord) {
      setFormData({
        customerName: editingRecord.customerName || '',
        creditDate: editingRecord.date || selectedDate, // Add date from editing record
        fuelEntries: editingRecord.fuelEntries || [{ 
          fuelType: editingRecord.fuelType || '', 
          liters: editingRecord.liters?.toString() || '', 
          rate: editingRecord.rate?.toString() || '' 
        }],
        incomeEntries: editingRecord.incomeEntries || [],
        expenseEntries: editingRecord.expenseEntries || [],
        mpp: editingRecord.mpp || false
      });
      setCustomerSearch(editingRecord.customerName || ''); // Set customer search field
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
        customerName: '',
        fuelEntries: [{ fuelType: '', liters: '', rate: '' }],
        incomeEntries: [],
        expenseEntries: [],
        mpp: false
      });
    }
  }, [formResetKey, editingRecord, editingId]);

  const handleFuelChange = (index, fuelType) => {
    const fuelConfig = fuelSettings[fuelType];
    
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
    
    const newFuelEntries = [...formData.fuelEntries];
    newFuelEntries[index] = {
      ...newFuelEntries[index],
      fuelType,
      rate: rateToUse.toString()
    };
    
    setFormData(prev => ({
      ...prev,
      fuelEntries: newFuelEntries
    }));
  };

  const handleFuelEntryChange = (index, field, value) => {
    const newFuelEntries = [...formData.fuelEntries];
    newFuelEntries[index] = {
      ...newFuelEntries[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      fuelEntries: newFuelEntries
    }));
  };

  const addFuelEntry = () => {
    setFormData(prev => ({
      ...prev,
      fuelEntries: [...prev.fuelEntries, { fuelType: '', liters: '', rate: '' }]
    }));
  };

  const removeFuelEntry = (index) => {
    if (formData.fuelEntries.length > 1) {
      const newFuelEntries = formData.fuelEntries.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        fuelEntries: newFuelEntries
      }));
    }
  };

  const calculateTotalAmount = () => {
    // Calculate fuel total
    const fuelTotal = formData.fuelEntries.reduce((total, entry) => {
      if (entry.liters && entry.rate) {
        return total + (parseFloat(entry.liters) * parseFloat(entry.rate));
      }
      return total;
    }, 0);

    // Calculate income total
    const incomeTotal = formData.incomeEntries.reduce((total, entry) => {
      if (entry.amount) {
        return total + parseFloat(entry.amount);
      }
      return total;
    }, 0);

    // Calculate expense total (to subtract)
    const expenseTotal = formData.expenseEntries.reduce((total, entry) => {
      if (entry.amount) {
        return total + parseFloat(entry.amount);
      }
      return total;
    }, 0);

    return (fuelTotal + incomeTotal - expenseTotal).toFixed(2);
  };

  // Add income entry
  const addIncomeEntry = () => {
    if (tempIncome.description && tempIncome.amount) {
      setFormData(prev => ({
        ...prev,
        incomeEntries: [...prev.incomeEntries, { ...tempIncome }]
      }));
      setTempIncome({ description: '', amount: '' });
      setShowIncomeDialog(false);
    }
  };

  // Add expense entry
  const addExpenseEntry = () => {
    if (tempExpense.description && tempExpense.amount) {
      setFormData(prev => ({
        ...prev,
        expenseEntries: [...prev.expenseEntries, { ...tempExpense }]
      }));
      setTempExpense({ description: '', amount: '' });
      setShowExpenseDialog(false);
    }
  };

  // Remove income entry
  const removeIncomeEntry = (index) => {
    setFormData(prev => ({
      ...prev,
      incomeEntries: prev.incomeEntries.filter((_, i) => i !== index)
    }));
  };

  // Remove expense entry
  const removeExpenseEntry = (index) => {
    setFormData(prev => ({
      ...prev,
      expenseEntries: prev.expenseEntries.filter((_, i) => i !== index)
    }));
  };

  const validateAndCreateRecord = () => {
    // Validate customer name
    if (!formData.customerName) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return null;
    }

    // Validate at least one complete fuel entry or income entry
    const validFuelEntries = formData.fuelEntries.filter(entry => 
      entry.fuelType && entry.liters && entry.rate
    );

    const validIncomeEntries = formData.incomeEntries.filter(entry =>
      entry.description && entry.amount
    );

    const validExpenseEntries = formData.expenseEntries.filter(entry =>
      entry.description && entry.amount
    );

    if (validFuelEntries.length === 0 && validIncomeEntries.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one fuel or income entry",
        variant: "destructive"
      });
      return null;
    }

    return {
      id: editingId || Date.now(),
      date: formData.creditDate || selectedDate, // Use creditDate from form
      customerName: formData.customerName,
      fuelEntries: validFuelEntries.map(entry => ({
        fuelType: entry.fuelType,
        liters: parseFloat(entry.liters),
        rate: parseFloat(entry.rate),
        amount: (parseFloat(entry.liters) * parseFloat(entry.rate))
      })),
      incomeEntries: validIncomeEntries.map(entry => ({
        description: entry.description,
        amount: parseFloat(entry.amount)
      })),
      expenseEntries: validExpenseEntries.map(entry => ({
        description: entry.description,
        amount: parseFloat(entry.amount)
      })),
      amount: parseFloat(calculateTotalAmount()),
      status: 'pending',
      mpp: formData.mpp || false
    };
  };

  const handleSubmit = () => {
    const creditRecord = validateAndCreateRecord();
    if (!creditRecord) return;

    if (editingId) {
      // Update existing credit record
      if (updateCreditRecord) {
        updateCreditRecord(editingId, creditRecord);
        setEditingId(null);
        resetForm();
        // Close dialog after updating
        if (onRecordSaved) onRecordSaved();
      }
    } else {
      const newCredit = addCreditRecord(creditRecord);
      
      if (newCredit) {
        resetForm();
        // Close dialog after adding
        if (onRecordSaved) onRecordSaved();
      }
    }
  };

  const handleAddAndContinue = () => {
    const creditRecord = validateAndCreateRecord();
    if (!creditRecord) return;

    if (editingId) {
      // Update existing credit record
      if (updateCreditRecord) {
        updateCreditRecord(editingId, creditRecord);
        setEditingId(null);
        resetForm();
      }
    } else {
      const newCredit = addCreditRecord(creditRecord);
      
      if (newCredit) {
        // Save the current date before resetting
        const currentDate = formData.creditDate;
        resetForm();
        // Restore the date so user can add more records for the same date
        setFormData(prev => ({ ...prev, creditDate: currentDate }));
        // Don't close dialog - keep it open for next customer
        // Toast notification removed per user request
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      creditDate: selectedDate, // Reset to current selected date
      fuelEntries: [{ fuelType: '', liters: '', rate: '' }],
      incomeEntries: [],
      expenseEntries: [],
      mpp: false
    });
    setCustomerSearch(''); // Reset customer search field
    setEditingId(null);
  };

  const editCredit = (credit) => {
    setFormData({
      customerName: credit.customerName,
      fuelEntries: credit.fuelEntries || [{ 
        fuelType: credit.fuelType || '', 
        liters: credit.liters?.toString() || '', 
        rate: credit.rate?.toString() || '' 
      }],
      incomeEntries: credit.incomeEntries || [],
      expenseEntries: credit.expenseEntries || []
    });
    setEditingId(credit.id);
  };

  const deleteCredit = (credit) => {
    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      if (deleteCreditRecord) {
        deleteCreditRecord(credit.id);
      }
    } else {
      // Show confirmation dialog
      setDeleteConfirm({ show: true, credit });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.credit && deleteCreditRecord) {
      deleteCreditRecord(deleteConfirm.credit.id);
    }
    setDeleteConfirm({ show: false, credit: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, credit: null });
  };

  // Filter credit data for the selected date
  const filteredCreditData = creditData.filter(credit => credit.date === selectedDate);

  // Render form content
  const renderFormContent = () => (
    <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Customer Name *</Label>
            
            {customers.length > 0 ? (
              <div className="relative" ref={customerDropdownRef}>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className={`w-full pr-10 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                  <ChevronDown 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 cursor-pointer ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  />
                </div>
                
                {showCustomerDropdown && (
                  <div className={`absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border shadow-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-white border-gray-300'
                  }`}>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className={`px-3 py-2 cursor-pointer hover:${
                            isDarkMode ? 'bg-gray-600' : 'bg-gray-100'
                          } ${
                            formData.customerName === customer.name 
                              ? isDarkMode ? 'bg-blue-600' : 'bg-blue-100' 
                              : ''
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, customerName: customer.name }));
                            setCustomerSearch(customer.name);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <div className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                            {customer.name}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`px-3 py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        No customers found
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={`px-3 py-2 rounded-md border text-center ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-slate-300 text-slate-500'
              }`}>
                No customers available. Please add customers first.
              </div>
            )}
          </div>

          {/* Multi-Row Entry Form */}
          <div className="space-y-2">
            {/* Row 2: Date, Fuel Type, and MPP */}
            <div className={`grid ${isMPPVisible ? 'grid-cols-[1fr,1fr,auto]' : 'grid-cols-2'} gap-2`}>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Date *</Label>
                <Input
                  type="date"
                  value={formData.creditDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, creditDate: e.target.value }))}
                  className={`text-sm font-medium ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-medium">Fuel Type *</Label>
                <select
                  value={formData.fuelEntries[0].fuelType}
                  onChange={(e) => handleFuelChange(0, e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <option value="">Select Fuel Type</option>
                  {fuelTypes.map(({ type, rate }) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              
              {isMPPVisible && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium whitespace-nowrap">MPP</Label>
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

            {/* Row 3: Liters and Rate */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Liters *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fuelEntries[0].liters}
                  onChange={(e) => handleFuelEntryChange(0, 'liters', e.target.value)}
                  placeholder="0.00"
                  className={`text-sm font-medium ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Rate *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fuelEntries[0].rate}
                  onChange={(e) => handleFuelEntryChange(0, 'rate', e.target.value)}
                  placeholder="0.00"
                  className={`text-sm font-medium ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                />
              </div>
            </div>

            {/* Row 4: + Button and Amount */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="relative" ref={incomeExpenseMenuRef}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIncomeExpenseMenu(!showIncomeExpenseMenu)}
                  className={`w-full ${isDarkMode ? 'border-gray-500 hover:bg-gray-600' : 'border-slate-300 hover:bg-slate-100'}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Income/Expense
                </Button>
                
                {showIncomeExpenseMenu && (
                  <div className={`absolute z-50 mt-1 w-full rounded-md border shadow-lg ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-slate-300'
                  }`}>
                    <button
                      onClick={() => {
                        setShowIncomeExpenseMenu(false);
                        setShowIncomeDialog(true);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                    >
                      + Add Income
                    </button>
                    <button
                      onClick={() => {
                        setShowIncomeExpenseMenu(false);
                        setShowExpenseDialog(true);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                    >
                      - Add Expense
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-right block">Amount</Label>
                <div className={`px-3 py-2 rounded-md text-lg font-bold text-right ${
                  isDarkMode ? 'bg-green-900 text-green-400' : 'bg-green-50 text-green-600'
                }`}>
                  ₹{formData.fuelEntries[0].liters && formData.fuelEntries[0].rate
                    ? (parseFloat(formData.fuelEntries[0].liters) * parseFloat(formData.fuelEntries[0].rate)).toFixed(2)
                    : '0.00'}
                </div>
              </div>
            </div>

            {/* Display Final Total */}
            <div className="pt-2">
              <div className={`px-4 py-3 rounded-md text-xl font-bold text-center ${
                isDarkMode ? 'bg-orange-900 text-orange-400' : 'bg-orange-50 text-orange-600'
              }`}>
                Final: ₹{calculateTotalAmount()}
              </div>
            </div>

            {/* Income Entries Display */}
            {formData.incomeEntries.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.incomeEntries.map((entry, index) => (
                  <div key={entry.id || "inc-" + index} className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
                    isDarkMode ? 'bg-green-900 bg-opacity-30 text-green-400' : 'bg-green-50 text-green-700'
                  }`}>
                    <span>+ {entry.description}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">₹{parseFloat(entry.amount).toFixed(2)}</span>
                      <button
                        onClick={() => removeIncomeEntry(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expense Entries Display */}
            {formData.expenseEntries.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.expenseEntries.map((entry, index) => (
                  <div key={entry.id || "exp-" + index} className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
                    isDarkMode ? 'bg-red-900 bg-opacity-30 text-red-400' : 'bg-red-50 text-red-700'
                  }`}>
                    <span>- {entry.description}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">₹{parseFloat(entry.amount).toFixed(2)}</span>
                      <button
                        onClick={() => removeExpenseEntry(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Income Dialog */}
          {showIncomeDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className={`w-full max-w-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-6">
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Add Income
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Description *</Label>
                      <Input
                        type="text"
                        value={tempIncome.description}
                        onChange={(e) => setTempIncome(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., Transport, Loading"
                        className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label>Amount (₹) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={tempIncome.amount}
                        onChange={(e) => setTempIncome(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowIncomeDialog(false);
                        setTempIncome({ description: '', amount: '' });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addIncomeEntry}
                      disabled={!tempIncome.description || !tempIncome.amount}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Add Income
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Expense Dialog */}
          {showExpenseDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className={`w-full max-w-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-6">
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Add Expense/Discount
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Description *</Label>
                      <Input
                        type="text"
                        value={tempExpense.description}
                        onChange={(e) => setTempExpense(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., Discount, Commission"
                        className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label>Amount (₹) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={tempExpense.amount}
                        onChange={(e) => setTempExpense(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowExpenseDialog(false);
                        setTempExpense({ description: '', amount: '' });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addExpenseEntry}
                      disabled={!tempExpense.description || !tempExpense.amount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Add Expense
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            {!editingId && (
              <Button 
                onClick={handleAddAndContinue} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Credit & Add more
              </Button>
            )}
            <div className="flex gap-3">
              <Button onClick={handleSubmit} className="flex-1 bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                {editingId ? 'Update Credit' : 'Add Credit & Close'}
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
            <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {editingId ? 'Edit Credit Sale' : 'Add Credit Sale'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {renderFormContent()}
            </CardContent>
          </Card>
        )}

      {/* Credit Sales List - Only show when NOT in dialog mode */}
      {!hideRecordsList ? (
      <Card className={`${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
      } shadow-lg`}>
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Credit Sales Records ({filteredCreditData.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-3">
              {filteredCreditData.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No credit sales for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : 'selected date'}</p>
                </div>
              ) : (
                filteredCreditData.map((credit) => (
                  <div key={credit.id} className={`border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-white'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-semibold text-sm sm:text-base break-words ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {credit.customerName}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => editCredit(credit)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCredit(credit)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Fuel Entries Breakdown */}
                    {credit.fuelEntries && credit.fuelEntries.length > 0 ? (
                      <div className="space-y-2 mb-3">
                        {credit.fuelEntries.map((entry, index) => (
                          <div key={"item-" + index} className={`p-2 rounded border ${
                            isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">
                                {entry.fuelType}
                              </Badge>
                              <span className="text-xs font-medium text-orange-600">
                                ₹{entry.amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                              <div>
                                <span className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>Litres: </span>
                                <span className="font-medium">{entry.liters}</span>
                              </div>
                              <div>
                                <span className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>Rate: </span>
                                <span className="font-medium">₹{entry.rate}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Legacy single entry display
                      <div className="space-y-1.5 mb-3">
                        <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">
                          {credit.fuelType}
                        </Badge>
                        <div className="space-y-1.5 text-xs sm:text-sm mt-2">
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <div className="flex flex-col sm:flex-row sm:gap-1">
                              <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Litres:</span>
                              <span className="font-medium">{credit.liters}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:gap-1">
                              <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Rate:</span>
                              <span className="font-medium">₹{credit.rate}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Income Entries Breakdown */}
                    {credit.incomeEntries && credit.incomeEntries.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {credit.incomeEntries.map((entry, index) => (
                          <div key={"item-" + index} className={`p-2 rounded border ${
                            isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-green-50 border-green-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                Income
                              </Badge>
                              <span className="text-xs font-medium text-green-600">
                                +₹{entry.amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs">
                              <span className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                                {entry.description}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expense Entries Breakdown */}
                    {credit.expenseEntries && credit.expenseEntries.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {credit.expenseEntries.map((entry, index) => (
                          <div key={"item-" + index} className={`p-2 rounded border ${
                            isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <Badge className="bg-red-100 text-red-800 border-0 text-xs">
                                Expense
                              </Badge>
                              <span className="text-xs font-medium text-red-600">
                                -₹{entry.amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs">
                              <span className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                                {entry.description}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator className="my-3" />

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className={`font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Total Amount:</span>
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4 text-orange-600" />
                        <span className="text-lg sm:text-xl font-bold text-orange-600">
                          {credit.amount.toFixed(2)}
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

      {/* Delete Confirmation Dialog - Outside conditional rendering */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full max-w-md ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-2 rounded-full ${
                  isDarkMode ? 'bg-red-900 text-red-400' : 'bg-red-100 text-red-600'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    Delete Credit Sale?
                  </h3>
                  <p className={`text-sm mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    Are you sure you want to delete credit sale of <span className="font-semibold">₹{deleteConfirm.credit?.totalAmount.toFixed(2)}</span> for <span className="font-semibold">"{deleteConfirm.credit?.customerName}"</span>?
                  </p>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={cancelDelete}
                  className={`${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  No, Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Yes, Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CreditSales;