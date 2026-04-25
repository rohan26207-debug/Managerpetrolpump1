import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { IndianRupee, Wallet, Trash2, Search, ChevronDown, Edit, X, AlertTriangle, Printer, FileSpreadsheet, Plus } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import localStorageService from '../services/localStorage';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PaymentReceived = ({ 
  customers, 
  payments, 
  selectedDate,
  onAddPayment, 
  onDeletePayment, 
  onUpdatePayment,
  isDarkMode 
}) => {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(selectedDate);
  const [paymentType, setPaymentType] = useState(''); // Cash, NEFT, RTGS, Cheque, Settlement
  const [settlementType, setSettlementType] = useState(''); // Only used when paymentType is Settlement
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [settlementTypes, setSettlementTypes] = useState([]); // New: load settlement types
  
  // Date range filter state
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);

  // Settlement-type filter state (Set of lowercase keys of types that ARE included).
  // Default: all types included (computed lazily once `payments` is available).
  const [excludedTypeKeys, setExcludedTypeKeys] = useState(() => new Set());
  
  // Record Receipt Sheet state
  const [recordReceiptOpen, setRecordReceiptOpen] = useState(false);
  
  // Filter state for receipts list
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterCustomerSearch, setFilterCustomerSearch] = useState('');
  const [showFilterCustomerDropdown, setShowFilterCustomerDropdown] = useState(false);
  const [showAllCustomersFilter, setShowAllCustomersFilter] = useState(true);
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, payment: null });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState({ show: false, count: 0 });
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editSettlementType, setEditSettlementType] = useState('');
  const [editPaymentType, setEditPaymentType] = useState('');
  const [editCustomerSearch, setEditCustomerSearch] = useState('');
  const [showEditCustomerDropdown, setShowEditCustomerDropdown] = useState(false);
  
  const customerDropdownRef = useRef(null);
  const editCustomerDropdownRef = useRef(null);
  const filterCustomerDropdownRef = useRef(null);
  
  // Checkbox selection state
  const [selectedPayments, setSelectedPayments] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Load settlement types on mount
  useEffect(() => {
    setSettlementTypes(localStorageService.getSettlementTypes());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
      if (editCustomerDropdownRef.current && !editCustomerDropdownRef.current.contains(event.target)) {
        setShowEditCustomerDropdown(false);
      }
      if (filterCustomerDropdownRef.current && !filterCustomerDropdownRef.current.contains(event.target)) {
        setShowFilterCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync date range with selectedDate
  useEffect(() => {
    setFromDate(selectedDate);
    setToDate(selectedDate);
    setPaymentDate(selectedDate);
  }, [selectedDate]);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredEditCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(editCustomerSearch.toLowerCase())
  );
  
  const filteredFilterCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(filterCustomerSearch.toLowerCase())
  );

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setEditCustomerId(payment.customerId);
    setEditCustomerSearch(payment.customerName);
    setEditAmount(payment.amount.toString());
    setEditPaymentDate(payment.date);
    setEditSettlementType(payment.settlementType || '');
    setEditPaymentType(payment.paymentType || payment.mode || '');
    setEditDialogOpen(true);
  };

  const handleUpdatePaymentSubmit = () => {
    if (editCustomerId && editAmount && parseFloat(editAmount) > 0 && editPaymentDate && editingPayment) {
      const customer = customers.find(c => c.id === editCustomerId);
      if (customer) {
        onUpdatePayment(editingPayment.id, {
          customerId: editCustomerId,
          customerName: customer.name,
          amount: parseFloat(editAmount),
          date: editPaymentDate,
          paymentType: editPaymentType,
          mode: editPaymentType === 'Settlement' ? editSettlementType : editPaymentType,
          settlementType: editPaymentType === 'Settlement' ? editSettlementType : ''
        });
        setEditDialogOpen(false);
        setEditingPayment(null);
        setEditCustomerId('');
        setEditCustomerSearch('');
        setEditAmount('');
        setEditPaymentDate('');
        setEditPaymentType('');
        setEditSettlementType('');
      }
    }
  };

  const handleDeleteClick = (payment) => {
    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      onDeletePayment(payment.id);
    } else {
      // Show confirmation dialog
      setDeleteConfirm({ show: true, payment });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.payment) {
      onDeletePayment(deleteConfirm.payment.id);
    }
    setDeleteConfirm({ show: false, payment: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, payment: null });
  };

  const handleAddPayment = () => {
    if (customerId && amount && parseFloat(amount) > 0 && paymentDate) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        onAddPayment({
          customerId,
          customerName: customer.name,
          amount: parseFloat(amount),
          date: paymentDate,
          paymentType: paymentType,
          mode: paymentType === 'Settlement' ? settlementType : paymentType,
          settlementType: paymentType === 'Settlement' ? settlementType : ''
        });
        // Save the current payment date before clearing
        const currentDate = paymentDate;
        const currentPaymentType = paymentType;
        const currentSettlementType = settlementType;
        setCustomerId('');
        setCustomerSearch('');
        setAmount('');
        // Keep the same date and types for next payment
        setPaymentDate(currentDate);
        setPaymentType(currentPaymentType);
        setSettlementType(currentSettlementType);
      }
    }
  };

  // Available settlement-type options derived from current data (default: all)
  const availableSettlementTypes = (() => {
    const map = new Map(); // key -> label
    payments.forEach((p) => {
      const lbl = (p.settlementType || p.mode || p.paymentType || '').trim();
      if (!lbl) return;
      const key = lbl.toLowerCase();
      if (!map.has(key)) map.set(key, lbl);
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  })();

  const toggleSettlementType = (key) => {
    setExcludedTypeKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const setOnlySettlementType = (key) => {
    // Tick only this one (exclude every other)
    const next = new Set();
    availableSettlementTypes.forEach((t) => { if (t.key !== key) next.add(t.key); });
    setExcludedTypeKeys(next);
  };
  const setAllSettlementTypes = (checked) => {
    if (checked) setExcludedTypeKeys(new Set());
    else setExcludedTypeKeys(new Set(availableSettlementTypes.map(t => t.key)));
  };

  // Filter payments for date range
  const filteredPayments = payments.filter(p => {
    // Filter by date range
    const matchesDateRange = p.date >= fromDate && p.date <= toDate;
    
    // Filter by customer
    let matchesCustomer = showAllCustomersFilter;
    if (!showAllCustomersFilter && filterCustomerId) {
      const selectedCustomerObj = customers.find(c => c.id === filterCustomerId);
      if (selectedCustomerObj) {
        matchesCustomer = 
          p.customerId === filterCustomerId || 
          p.customerName === selectedCustomerObj.name;
      }
    }

    // Filter by settlement type
    const lbl = (p.settlementType || p.mode || p.paymentType || '').trim().toLowerCase();
    const matchesType = !excludedTypeKeys.has(lbl);

    return matchesDateRange && matchesCustomer && matchesType;
  });

  // Calculate total received in date range
  const totalReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Handle select all checkbox
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const allIds = new Set(filteredPayments.map(payment => payment.id));
      setSelectedPayments(allIds);
    } else {
      setSelectedPayments(new Set());
    }
  };

  // Handle individual checkbox
  const handleSelectPayment = (paymentId, checked) => {
    const newSelected = new Set(selectedPayments);
    if (checked) {
      newSelected.add(paymentId);
    } else {
      newSelected.delete(paymentId);
    }
    setSelectedPayments(newSelected);
    setSelectAll(newSelected.size === filteredPayments.length && filteredPayments.length > 0);
  };

  // Update selectAll when filtered data changes
  useEffect(() => {
    if (selectedPayments.size > 0 && selectedPayments.size === filteredPayments.length) {
      setSelectAll(true);
    } else if (selectedPayments.size === 0 || filteredPayments.length === 0) {
      setSelectAll(false);
    }
  }, [filteredPayments, selectedPayments]);

  // Delete selected payments
  const handleDeleteSelected = () => {
    if (selectedPayments.size === 0) return;

    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      selectedPayments.forEach(id => {
        if (onDeletePayment) {
          onDeletePayment(id);
        }
      });
      setSelectedPayments(new Set());
      setSelectAll(false);
    } else {
      // Show in-app confirmation dialog (window.confirm is blocked in Android WebView)
      setBulkDeleteConfirm({ show: true, count: selectedPayments.size });
    }
  };

  const confirmBulkDelete = () => {
    selectedPayments.forEach(id => {
      if (onDeletePayment) {
        onDeletePayment(id);
      }
    });
    setSelectedPayments(new Set());
    setSelectAll(false);
    setBulkDeleteConfirm({ show: false, count: 0 });
  };

  const cancelBulkDelete = () => {
    setBulkDeleteConfirm({ show: false, count: 0 });
  };

  // Excel Export functionality
  const handleExcelExport = () => {
    try {
      // Prepare data for Excel
      const excelData = [
        // Title row
        ['Payment Receipts Report'],
        [],
        [`From: ${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} To: ${new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`],
        [],
        // Table headers
        ['Sr. No', 'Date', 'Customer Name', 'Settlement Type', 'Amount (₹)'],
        // Table data
        ...filteredPayments.map((payment, index) => [
          index + 1,
          new Date(payment.date).toLocaleDateString('en-IN'),
          payment.customerName || customers.find(c => c.id === payment.customerId)?.name || 'Unknown',
          payment.mode || 'N/A',
          payment.amount.toFixed(2)
        ]),
        // Total row
        ['Total', '', '', '', totalReceived.toFixed(2)],
        [],
        // Footer
        [`Generated on: ${new Date().toLocaleString('en-IN')}`]
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // Sr. No
        { wch: 12 },  // Date
        { wch: 20 },  // Customer Name
        { wch: 15 },  // Settlement Type
        { wch: 15 }   // Amount
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Receipts');

      // Generate filename with date
      const filename = `Payment_Receipts_${fromDate}_to_${toDate}.xlsx`;

      // Export file (Android bridge if available, else browser download)
      if (window.MPumpCalcAndroid && typeof window.MPumpCalcAndroid.saveFileToDownloads === 'function') {
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        window.MPumpCalcAndroid.saveFileToDownloads(
          base64,
          filename,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      } else {
        XLSX.writeFile(wb, filename);
      }
      
      console.log('Excel file exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Error exporting to Excel: ' + error.message);
    }
  };

  // Print/PDF functionality
  const handlePrint = () => {
    try {
      // Check if running in Android WebView
      const isAndroid = typeof window.MPumpCalcAndroid !== 'undefined';
      
      if (isAndroid) {
        // Generate PDF using jsPDF for Android
        generatePDFForAndroid();
        return;
      }
      
      // For web browser - use print dialog
      generateHTMLForWeb();
    } catch (error) {
      console.error('Print error:', error);
      alert('Error generating report: ' + error.message);
    }
  };

  const generatePDFForAndroid = () => {
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text('Payment Receipts Report', 105, yPos, { align: 'center' });
      yPos += 10;

      // Date Range
      doc.setFontSize(12);
      const dateStr = `From: ${new Date(fromDate).toLocaleDateString('en-IN')} To: ${new Date(toDate).toLocaleDateString('en-IN')}`;
      doc.text(dateStr, 105, yPos, { align: 'center' });
      yPos += 15;

      if (filteredPayments.length === 0) {
        doc.setFontSize(12);
        doc.text('No receipts in selected date range', 105, yPos, { align: 'center' });
      } else {
        // Table headers
        const headers = ['Date', 'Customer', 'Settlement Type', 'Amount'];

        // Build table data
        const tableData = filteredPayments.map((payment) => {
          const customerName = payment.customerName || customers.find(c => c.id === payment.customerId)?.name || 'Unknown';
          
          return [
            new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            customerName,
            payment.mode || 'N/A',
            payment.amount.toFixed(2)
          ];
        });

        // Add total row
        const totalRow = ['Total', '', '', totalReceived.toFixed(2)];
        tableData.push(totalRow);

        doc.autoTable({
          startY: yPos,
          head: [headers],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
          styles: { fontSize: 10 },
          footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' }
        });
      }

      // Footer
      yPos = doc.internal.pageSize.height - 15;
      doc.setFontSize(9);
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, yPos, { align: 'center' });

      // Convert to base64 and send to Android
      const pdfBase64 = doc.output('dataurlstring').split(',')[1];
      const fileName = `Payment_Receipts_${fromDate}_to_${toDate}.pdf`;
      
      if (window.MPumpCalcAndroid && window.MPumpCalcAndroid.openPdfWithViewer) {
        window.MPumpCalcAndroid.openPdfWithViewer(pdfBase64, fileName);
      } else {
        console.error('Android interface not available');
        alert('PDF generation is only available in the Android app');
      }
    } catch (error) {
      console.error('Error generating PDF for Android:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const generateHTMLForWeb = () => {
    try {
      // Build table rows
      const tableRows = filteredPayments.map(payment => {
        const customerName = payment.customerName || customers.find(c => c.id === payment.customerId)?.name || 'Unknown';
        
        return '<tr>' +
          '<td>' + new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '</td>' +
          '<td>' + customerName + '</td>' +
          '<td>' + (payment.mode || 'N/A') + '</td>' +
          '<td class="r">' + payment.amount.toFixed(2) + '</td>' +
          '</tr>';
      }).join('');

      // HTML generation for web browsers
      const htmlContent = '<!DOCTYPE html>' +
        '<html>' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Payment Receipts Report</title>' +
        '<style>' +
        'body{font-family:Arial,sans-serif;margin:20px;padding:0;line-height:1.4}' +
        'h1{font-size:24px;margin:10px 0;text-align:center;color:#333}' +
        'p{font-size:14px;margin:5px 0;text-align:center;color:#666}' +
        'table{width:100%;border-collapse:collapse;margin:15px 0;font-size:13px}' +
        'th{background:#f0f0f0;border:1px solid #333;padding:8px;text-align:left;font-weight:bold}' +
        'td{border:1px solid #333;padding:6px}' +
        '.r{text-align:right}' +
        '.total-row{font-weight:bold;background:#f8f8f8}' +
        '.print-btn{background:#007bff;color:white;border:none;padding:10px 20px;font-size:16px;cursor:pointer;border-radius:5px;margin:10px auto;display:block;box-shadow:0 2px 4px rgba(0,0,0,0.2)}' +
        '.print-btn:hover{background:#0056b3}' +
        '.no-print{display:block}' +
        '@media print{body{margin:8mm}.no-print{display:none}}' +
        '</style>' +
        '</head>' +
        '<body>' +
        '<h1>Payment Receipts Report</h1>' +
        '<p>From: ' + new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) + ' To: ' + new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) + '</p>' +
        '<table>' +
        '<thead>' +
        '<tr>' +
        '<th>Date</th>' +
        '<th>Customer Name</th>' +
        '<th>Settlement Type</th>' +
        '<th class="r">Amount (₹)</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' +
        tableRows +
        '<tr class="total-row">' +
        '<td colspan="3" class="r">Total:</td>' +
        '<td class="r">₹' + totalReceived.toFixed(2) + '</td>' +
        '</tr>' +
        '</tbody>' +
        '</table>' +
        '<p style="margin-top:20px;font-size:11px">Generated on: ' + new Date().toLocaleString('en-IN') + '</p>' +
        '<div class="no-print" style="text-align:center;margin:20px 0">' +
        '<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>' +
        '</div>' +
        '<script>' +
        'setTimeout(function() { window.print(); }, 500);' +
        '</script>' +
        '</body>' +
        '</html>';

      // Open in new window for printing/PDF generation
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('Please allow pop-ups for this site to enable PDF export and printing.');
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Focus the new window
      printWindow.focus();
    } catch (error) {
      console.error('Error generating HTML for web:', error);
      alert('Error generating report: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Receipts List with Customer and Date Range Filters */}
      <Card className={`${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
      }`}>
        <CardContent className="p-4">
          {/* Filters */}
          <div className="mb-4 space-y-3">
            {/* Customer Filter Row */}
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Customer
              </Label>
              <div className="grid grid-cols-[1fr_auto] gap-3 mt-1">
                {/* Search and Select Customer Dropdown */}
                <div className="relative" ref={filterCustomerDropdownRef}>
                  <Input
                    type="text"
                    placeholder="Search and select customer..."
                    value={filterCustomerSearch}
                    onChange={(e) => {
                      setFilterCustomerSearch(e.target.value);
                      setShowFilterCustomerDropdown(true);
                    }}
                    onFocus={() => setShowFilterCustomerDropdown(true)}
                    disabled={showAllCustomersFilter}
                    className={`w-full pr-10 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                    } ${showAllCustomersFilter ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <ChevronDown 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 cursor-pointer ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } ${showAllCustomersFilter ? 'opacity-50' : ''}`}
                    onClick={() => !showAllCustomersFilter && setShowFilterCustomerDropdown(!showFilterCustomerDropdown)}
                  />
                  
                  {showFilterCustomerDropdown && !showAllCustomersFilter && (
                    <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-md border shadow-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {/* Individual customers */}
                      {filteredFilterCustomers.length > 0 ? (
                        filteredFilterCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className={`px-3 py-2 cursor-pointer ${
                              isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                            } ${
                              filterCustomerId === customer.id 
                                ? isDarkMode ? 'bg-blue-600' : 'bg-blue-100' 
                                : ''
                            }`}
                            onClick={() => {
                              setFilterCustomerId(customer.id);
                              setFilterCustomerSearch(customer.name);
                              setShowFilterCustomerDropdown(false);
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

                {/* All Customers Checkbox */}
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md min-w-[140px]" 
                     style={{ 
                       backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
                       borderColor: isDarkMode ? '#4b5563' : '#d1d5db'
                     }}>
                  <input
                    type="checkbox"
                    id="allCustomersFilter"
                    checked={showAllCustomersFilter}
                    onChange={(e) => {
                      setShowAllCustomersFilter(e.target.checked);
                      if (e.target.checked) {
                        setFilterCustomerId('');
                        setFilterCustomerSearch('');
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label 
                    htmlFor="allCustomersFilter" 
                    className={`text-sm font-medium cursor-pointer ${
                      isDarkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}
                  >
                    All Customers
                  </label>
                </div>
              </div>
            </div>

            {/* Receipt Heading and Total */}
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Receipt {formatDisplayDate(fromDate)} to {formatDisplayDate(toDate)}
              </h3>
              <div className={`text-lg font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                ₹{totalReceived.toFixed(2)}
              </div>
            </div>
            
            {/* Date Range Filters with Select All and Delete */}
            <div className="space-y-3">
              {/* Settlement Type checkboxes (default: all ticked) */}
              {availableSettlementTypes.length > 0 && (
                <div className={`p-2 rounded border ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-300 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <Label className={`text-xs font-medium ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>
                      Settlement Types
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAllSettlementTypes(true)}
                        data-testid="receipt-types-select-all"
                        className={`text-[10px] underline ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllSettlementTypes(false)}
                        data-testid="receipt-types-clear"
                        className={`text-[10px] underline ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSettlementTypes.map((t) => {
                      const checked = !excludedTypeKeys.has(t.key);
                      return (
                        <label
                          key={t.key}
                          className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-xs ${
                            checked
                              ? (isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-slate-400 text-slate-800')
                              : (isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-slate-100 border-slate-300 text-slate-500')
                          }`}
                          data-testid={`receipt-type-chip-${t.key}`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSettlementType(t.key)}
                            className={isDarkMode ? 'border-gray-400' : ''}
                            data-testid={`receipt-type-cb-${t.key}`}
                          />
                          <span>{t.label}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setOnlySettlementType(t.key); }}
                            data-testid={`receipt-type-only-${t.key}`}
                            className={`ml-1 text-[10px] underline ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}
                          >
                            only
                          </button>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fromDate" className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    From Date
                  </Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="toDate" className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    To Date
                  </Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                </div>
              </div>
              
              {/* Select All and Delete Row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-receipts"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    className={isDarkMode ? 'border-gray-500' : ''}
                  />
                  <Label
                    htmlFor="select-all-receipts"
                    className={`text-sm font-medium cursor-pointer ${
                      isDarkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}
                  >
                    Select All
                  </Label>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedPayments.size === 0}
                  className={isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700 disabled:opacity-50' : 'border-slate-400 text-slate-800 hover:bg-slate-100 disabled:opacity-50'}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedPayments.size})
                </Button>
              </div>
            </div>
          </div>
          
          {/* Action Buttons Row */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : ''}`}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExcelExport}
                className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : ''}`}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
            
            <Button 
              onClick={() => setRecordReceiptOpen(true)}
              variant="outline"
              size="sm"
              className={isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700' : 'border-slate-400 text-slate-800 hover:bg-slate-100'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Receipt
            </Button>
          </div>
          
          {filteredPayments.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
              <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No receipts in selected date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`px-2 py-1 border text-xs font-bold text-left ${
                      isDarkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-slate-400 bg-slate-200 text-slate-900'
                    }`} colSpan={6}>
                      Receipts
                    </th>
                  </tr>
                  <tr>
                    <th className={`px-2 py-1 border text-xs font-bold text-center ${
                      isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                    }`} style={{ width: '30px' }}></th>
                    <th className={`px-2 py-1 border text-xs font-bold text-left ${
                      isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                    }`}>Date</th>
                    <th className={`px-2 py-1 border text-xs font-bold text-left ${
                      isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                    }`}>Customer</th>
                    <th className={`px-2 py-1 border text-xs font-bold text-left ${
                      isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                    }`}>Mode</th>
                    <th className={`px-2 py-1 border text-xs font-bold text-right ${
                      isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                    }`}>Amount (₹)</th>
                    <th className={`px-2 py-1 border text-xs font-bold text-center ${
                      isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                    }`} style={{ width: '90px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, i) => {
                    const isSelected = selectedPayments.has(payment.id);
                    const baseRow = i % 2 === 1
                      ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50')
                      : (isDarkMode ? 'bg-gray-700' : 'bg-white');
                    const cellCls = `px-2 py-1 border text-xs ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`;
                    const modeText = payment.paymentType || payment.mode || 'N/A';
                    const modeFull = payment.paymentType === 'Settlement' && payment.settlementType
                      ? `${modeText} (${payment.settlementType})`
                      : modeText;
                    return (
                      <tr key={payment.id} className={`${baseRow} ${isSelected ? (isDarkMode ? 'outline outline-1 outline-white' : 'outline outline-1 outline-slate-900') : ''}`}>
                        <td className={`${cellCls} text-center`}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectPayment(payment.id, checked)}
                            className={isDarkMode ? 'border-gray-500' : ''}
                          />
                        </td>
                        <td className={cellCls}>{new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                        <td className={`${cellCls} font-medium`}>{payment.customerName}</td>
                        <td className={cellCls}>{modeFull}</td>
                        <td className={`${cellCls} text-right font-mono font-semibold`}>{payment.amount.toFixed(2)}</td>
                        <td className={`${cellCls} text-center`}>
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPayment(payment)}
                              className="h-6 w-6 p-0"
                              aria-label={`Edit receipt for ${payment.customerName}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(payment)}
                              className="h-6 w-6 p-0"
                              aria-label={`Delete receipt for ${payment.customerName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={isDarkMode ? 'bg-gray-900' : 'bg-slate-200'}>
                    <td colSpan="4" className={`px-2 py-1 border text-xs font-bold ${
                      isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                    }`}>TOTAL ({filteredPayments.length} receipt{filteredPayments.length === 1 ? '' : 's'})</td>
                    <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                      isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                    }`}>{totalReceived.toFixed(2)}</td>
                    <td className={`px-2 py-1 border text-xs ${
                      isDarkMode ? 'border-gray-600' : 'border-slate-400'
                    }`}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Receipt Sheet */}
      <Sheet open={recordReceiptOpen} onOpenChange={setRecordReceiptOpen}>
        <SheetContent side="bottom" className={`h-[90vh] ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <SheetHeader>
            <SheetTitle className={isDarkMode ? 'text-white' : 'text-slate-800'}>
              Record Receipt
            </SheetTitle>
            <SheetDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Record payment received from customer
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-4 overflow-y-auto h-[calc(90vh-80px)] px-2">
            <div className="space-y-3">
              {/* Customer Search */}
              <div className="relative" ref={customerDropdownRef}>
                <Label htmlFor="customer" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                  Customer
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="text"
                    placeholder="Search and select customer..."
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
                  
                  {showCustomerDropdown && (
                    <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-md border shadow-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className={`px-3 py-2 cursor-pointer ${
                              isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                            } ${
                              customerId === customer.id 
                                ? isDarkMode ? 'bg-blue-600' : 'bg-blue-100' 
                                : ''
                            }`}
                            onClick={() => {
                              setCustomerId(customer.id);
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
              </div>

              {/* Payment Date */}
              <div>
                <Label htmlFor="paymentDate" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                  Date
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>

              {/* Amount and Payment Type in same row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="amount" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                    Amount Received
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                </div>
                <div>
                  <Label className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                    Payment Type
                  </Label>
                  <Select
                    value={paymentType}
                    onValueChange={(value) => {
                      setPaymentType(value);
                      if (value !== 'Settlement') setSettlementType('');
                    }}
                  >
                    <SelectTrigger data-testid="payment-type-select" className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                      <SelectValue placeholder="Select payment type..." />
                    </SelectTrigger>
                    <SelectContent className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                      <SelectGroup>
                        <SelectItem value="Cash" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>Cash</SelectItem>
                        <SelectItem value="NEFT" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>NEFT</SelectItem>
                        <SelectItem value="RTGS" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>RTGS</SelectItem>
                        <SelectItem value="Cheque" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>Cheque</SelectItem>
                        <SelectItem value="Settlement" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>Settlement</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Settlement Type - only shown when Payment Type is Settlement */}
              {paymentType === 'Settlement' && (
                <div>
                  <Label className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                    Settlement Type
                  </Label>
                  <Select
                    value={settlementType}
                    onValueChange={(value) => setSettlementType(value)}
                  >
                    <SelectTrigger className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
                      <SelectValue placeholder="Select settlement type..." />
                    </SelectTrigger>
                    <SelectContent className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                      <SelectGroup>
                        {settlementTypes.length > 0 ? (
                          settlementTypes.map((type) => (
                            <SelectItem 
                              key={type.id} 
                              value={type.name}
                              className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}
                            >
                              {type.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-types" disabled className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                            No settlement types available. Add from Settings.
                          </SelectItem>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Record Receipt & Add More */}
              <Button
                onClick={() => {
                  handleAddPayment();
                  // Clear form but keep sheet open
                  setCustomerId('');
                  setCustomerSearch('');
                  setAmount('');
                  // Keep the same date for convenience
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!customerId || !amount || !paymentDate}
              >
                <IndianRupee className="w-4 h-4 mr-1" />
                Record Receipt & Add More
              </Button>

              {/* Record Receipt & Close */}
              <Button
                onClick={() => {
                  handleAddPayment();
                  setRecordReceiptOpen(false);
                  // Reset form
                  setCustomerId('');
                  setCustomerSearch('');
                  setAmount('');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={!customerId || !amount || !paymentDate}
              >
                <IndianRupee className="w-4 h-4 mr-1" />
                Record Receipt & Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Edit Receipt Dialog */}
      <Sheet open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <SheetContent side="bottom" className={`h-[90vh] ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <SheetHeader>
            <SheetTitle className={isDarkMode ? 'text-white' : 'text-slate-800'}>
              Edit Receipt
            </SheetTitle>
            <SheetDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Update payment receipt details
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4 px-2">
            <div className="relative" ref={editCustomerDropdownRef}>
              <Label htmlFor="editCustomer" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                Customer
              </Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  placeholder="Search and select customer..."
                  value={editCustomerSearch}
                  onChange={(e) => {
                    setEditCustomerSearch(e.target.value);
                    setShowEditCustomerDropdown(true);
                  }}
                  onFocus={() => setShowEditCustomerDropdown(true)}
                  className={`w-full pr-10 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
                <ChevronDown 
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 cursor-pointer ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                  onClick={() => setShowEditCustomerDropdown(!showEditCustomerDropdown)}
                />
                
                {showEditCustomerDropdown && (
                  <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-md border shadow-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-white border-gray-300'
                  }`}>
                    {filteredEditCustomers.length > 0 ? (
                      filteredEditCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className={`px-3 py-2 cursor-pointer ${
                            isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                          } ${
                            editCustomerId === customer.id 
                              ? isDarkMode ? 'bg-blue-600' : 'bg-blue-100' 
                              : ''
                          }`}
                          onClick={() => {
                            setEditCustomerId(customer.id);
                            setEditCustomerSearch(customer.name);
                            setShowEditCustomerDropdown(false);
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
            </div>

            <div>
              <Label htmlFor="editDate" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                Payment Date
              </Label>
              <Input
                id="editDate"
                type="date"
                value={editPaymentDate}
                onChange={(e) => setEditPaymentDate(e.target.value)}
                className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>

            {/* Amount and Payment Type in same row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editAmount" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                  Amount
                </Label>
                <Input
                  id="editAmount"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="Enter amount"
                  className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                  Payment Type
                </Label>
                <Select
                  value={editPaymentType}
                  onValueChange={(value) => {
                    setEditPaymentType(value);
                    if (value !== 'Settlement') setEditSettlementType('');
                  }}
                >
                  <SelectTrigger className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                    <SelectValue placeholder="Select payment type..." />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                    <SelectGroup>
                      <SelectItem value="Cash" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>Cash</SelectItem>
                      <SelectItem value="NEFT" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>NEFT</SelectItem>
                      <SelectItem value="RTGS" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>RTGS</SelectItem>
                      <SelectItem value="Cheque" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>Cheque</SelectItem>
                      <SelectItem value="Settlement" className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}>Settlement</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Settlement Type - only when Payment Type is Settlement */}
            {editPaymentType === 'Settlement' && (
              <div>
                <Label className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                  Settlement Type
                </Label>
                <Select
                  value={editSettlementType}
                  onValueChange={(value) => setEditSettlementType(value)}
                >
                  <SelectTrigger className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                    <SelectValue placeholder="Select settlement type..." />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                    <SelectGroup>
                      {settlementTypes.length > 0 ? (
                        settlementTypes.map((type) => (
                          <SelectItem 
                            key={type.id} 
                            value={type.name}
                            className={isDarkMode ? 'text-white hover:bg-gray-600' : ''}
                          >
                            {type.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-types" disabled className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                          No settlement types available. Add from Settings.
                        </SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleUpdatePaymentSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!editCustomerId || !editAmount || !editPaymentDate}
              >
                <IndianRupee className="w-4 h-4 mr-1" />
                Update Receipt
              </Button>
              <Button
                onClick={() => setEditDialogOpen(false)}
                variant="outline"
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
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
                    Delete Receipt?
                  </h3>
                  <p className={`text-sm mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    Are you sure you want to delete this receipt of <span className="font-semibold">₹{deleteConfirm.payment?.amount.toFixed(2)}</span> from <span className="font-semibold">"{deleteConfirm.payment?.customerName}"</span>?
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

      {/* Bulk Delete Confirmation Dialog */}
      {bulkDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="bulk-delete-confirm-modal">
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
                    Delete {bulkDeleteConfirm.count} Receipt{bulkDeleteConfirm.count === 1 ? '' : 's'}?
                  </h3>
                  <p className={`text-sm mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    Are you sure you want to delete the <span className="font-semibold">{bulkDeleteConfirm.count}</span> selected receipt{bulkDeleteConfirm.count === 1 ? '' : 's'}?
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
                  onClick={cancelBulkDelete}
                  data-testid="bulk-delete-cancel-btn"
                  className={`${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  No, Cancel
                </Button>
                <Button
                  onClick={confirmBulkDelete}
                  data-testid="bulk-delete-confirm-btn"
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

export default PaymentReceived;
