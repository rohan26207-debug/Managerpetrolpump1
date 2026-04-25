import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CreditCard, Edit, Trash2, ChevronDown, AlertTriangle, IndianRupee, Printer, FileSpreadsheet, Plus } from 'lucide-react';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { useConfirm } from '../hooks/use-confirm';
import localStorageService from '../services/localStorage';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CreditSalesManagement = ({ 
  customers, 
  creditData, 
  selectedDate,
  onEditCredit,
  onDeleteCredit,
  onAddCredit,
  isDarkMode 
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(true);
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, credit: null });
  const [selectedCredits, setSelectedCredits] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  const customerDropdownRef = useRef(null);
  const { confirm, confirmDialog } = useConfirm();

  // Sync date range with selectedDate
  useEffect(() => {
    setFromDate(selectedDate);
    setToDate(selectedDate);
  }, [selectedDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Filter credit sales based on customer and date range
  const filteredCreditData = creditData.filter(credit => {
    // Match by customerId or customerName (for backward compatibility)
    let matchesCustomer = showAllCustomers;
    if (!showAllCustomers && selectedCustomer) {
      const selectedCustomerObj = customers.find(c => c.id === selectedCustomer);
      if (selectedCustomerObj) {
        matchesCustomer = 
          credit.customerId === selectedCustomer || 
          credit.customerName === selectedCustomerObj.name;
      }
    }
    const matchesDateRange = credit.date >= fromDate && credit.date <= toDate;
    return matchesCustomer && matchesDateRange;
  });

  // Helper function to calculate credit amount including fuel, income, and expense
  const calculateCreditAmount = (credit) => {
    // Calculate fuel total
    let fuelTotal = 0;
    if (credit.fuelEntries && credit.fuelEntries.length > 0) {
      fuelTotal = credit.fuelEntries.reduce((fuelSum, entry) => {
        return fuelSum + (parseFloat(entry.amount) || (parseFloat(entry.liters || 0) * parseFloat(entry.rate || 0)));
      }, 0);
    } else if (credit.liters && credit.rate) {
      // Backward compatibility for old single fuel entry
      fuelTotal = parseFloat(credit.liters) * parseFloat(credit.rate);
    }

    // Calculate income total
    let incomeTotal = 0;
    if (credit.incomeEntries && credit.incomeEntries.length > 0) {
      incomeTotal = credit.incomeEntries.reduce((incSum, entry) => {
        return incSum + parseFloat(entry.amount || 0);
      }, 0);
    }

    // Calculate expense total (to subtract)
    let expenseTotal = 0;
    if (credit.expenseEntries && credit.expenseEntries.length > 0) {
      expenseTotal = credit.expenseEntries.reduce((expSum, entry) => {
        return expSum + parseFloat(entry.amount || 0);
      }, 0);
    }

    // Total = fuel + income - expense
    const creditTotal = fuelTotal + incomeTotal - expenseTotal;
    
    // Fallback to stored amount if calculation fails
    return creditTotal || credit.totalAmount || credit.amount || 0;
  };

  // Calculate total - handle undefined/null values and backward compatibility
  const totalAmount = filteredCreditData.reduce((sum, credit) => {
    return sum + calculateCreditAmount(credit);
  }, 0);

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleDeleteClick = (credit) => {
    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      if (onDeleteCredit) {
        onDeleteCredit(credit.id);
      }
    } else {
      // Show confirmation dialog
      setDeleteConfirm({ show: true, credit });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.credit && onDeleteCredit) {
      onDeleteCredit(deleteConfirm.credit.id);
    }
    setDeleteConfirm({ show: false, credit: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, credit: null });
  };

  // Handle select all checkbox
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const allIds = new Set(filteredCreditData.map(credit => credit.id));
      setSelectedCredits(allIds);
    } else {
      setSelectedCredits(new Set());
    }
  };

  // Handle individual checkbox
  const handleSelectCredit = (creditId, checked) => {
    const newSelected = new Set(selectedCredits);
    if (checked) {
      newSelected.add(creditId);
    } else {
      newSelected.delete(creditId);
    }
    setSelectedCredits(newSelected);
    setSelectAll(newSelected.size === filteredCreditData.length && filteredCreditData.length > 0);
  };

  // Update selectAll when filtered data changes
  useEffect(() => {
    if (selectedCredits.size > 0 && selectedCredits.size === filteredCreditData.length) {
      setSelectAll(true);
    } else if (selectedCredits.size === 0 || filteredCreditData.length === 0) {
      setSelectAll(false);
    }
  }, [filteredCreditData, selectedCredits]);

  // Delete selected credits
  const handleDeleteSelected = async () => {
    if (selectedCredits.size === 0) return;

    const performBulkDelete = () => {
      selectedCredits.forEach(id => {
        if (onDeleteCredit) {
          onDeleteCredit(id);
        }
      });
      setSelectedCredits(new Set());
      setSelectAll(false);
    };

    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      performBulkDelete();
    } else {
      // Show in-app confirmation dialog (window.confirm is blocked in Android WebView)
      const ok = await confirm({
        title: `Delete ${selectedCredits.size} Credit Sale${selectedCredits.size === 1 ? '' : 's'}?`,
        message: `Are you sure you want to delete the ${selectedCredits.size} selected credit sale${selectedCredits.size === 1 ? '' : 's'}?\n\nThis action cannot be undone.`,
        isDarkMode,
      });
      if (ok) {
        performBulkDelete();
      }
    }
  };

  // Excel Export functionality
  const handleExcelExport = () => {
    try {
      // Prepare data for Excel
      const excelData = [
        // Title row
        ['Credit Sales Report'],
        [],
        [`From: ${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} To: ${new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`],
        [],
        // Table headers
        ['Sr. No', 'Date', 'Customer Name', 'Fuel Type', 'Liters', 'Rate (₹)', 'Amount (₹)'],
        // Table data
        ...filteredCreditData.map((credit, index) => {
          const fuelDetails = credit.fuelEntries && credit.fuelEntries.length > 0 
            ? credit.fuelEntries.map(f => `${f.fuelType}: ${f.liters}L @ ₹${f.rate}`).join(', ')
            : `${credit.fuelType || 'N/A'}: ${credit.liters || 0}L @ ₹${credit.rate || 0}`;
          
          return [
            index + 1,
            new Date(credit.date).toLocaleDateString('en-IN'),
            credit.customerName,
            fuelDetails,
            credit.liters || (credit.fuelEntries ? credit.fuelEntries.reduce((sum, f) => sum + parseFloat(f.liters || 0), 0) : 0),
            credit.rate || '',
            calculateCreditAmount(credit).toFixed(2)
          ];
        }),
        // Total row
        ['Total', '', '', '', '', '', totalAmount.toFixed(2)],
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
        { wch: 25 },  // Fuel Type
        { wch: 10 },  // Liters
        { wch: 12 },  // Rate
        { wch: 15 }   // Amount
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Credit Sales');

      // Generate filename with date
      const filename = `Credit_Sales_${fromDate}_to_${toDate}.xlsx`;

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
      doc.text('Credit Sales Report', 105, yPos, { align: 'center' });
      yPos += 10;

      // Date Range
      doc.setFontSize(12);
      const dateStr = `From: ${new Date(fromDate).toLocaleDateString('en-IN')} To: ${new Date(toDate).toLocaleDateString('en-IN')}`;
      doc.text(dateStr, 105, yPos, { align: 'center' });
      yPos += 15;

      if (filteredCreditData.length === 0) {
        doc.setFontSize(12);
        doc.text('No credit sales in selected date range', 105, yPos, { align: 'center' });
      } else {
        // Table headers
        const headers = ['Date', 'Customer', 'Fuel', 'Liters', 'Rate', 'Amount'];

        // Build table data
        const tableData = filteredCreditData.map((credit) => {
          const fuelInfo = credit.fuelEntries && credit.fuelEntries.length > 0
            ? credit.fuelEntries.map(f => `${f.fuelType}`).join(', ')
            : credit.fuelType || 'N/A';
          
          const totalLiters = credit.fuelEntries && credit.fuelEntries.length > 0
            ? credit.fuelEntries.reduce((sum, f) => sum + parseFloat(f.liters || 0), 0)
            : credit.liters || 0;

          return [
            new Date(credit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            credit.customerName,
            fuelInfo,
            totalLiters.toFixed(2),
            credit.rate ? credit.rate.toFixed(2) : '-',
            calculateCreditAmount(credit).toFixed(2)
          ];
        });

        // Add total row
        const totalRow = ['Total', '', '', '', '', totalAmount.toFixed(2)];
        tableData.push(totalRow);

        doc.autoTable({
          startY: yPos,
          head: [headers],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
          styles: { fontSize: 9 },
          footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' }
        });
      }

      // Footer
      yPos = doc.internal.pageSize.height - 15;
      doc.setFontSize(9);
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, yPos, { align: 'center' });

      // Convert to base64 and send to Android
      const pdfBase64 = doc.output('dataurlstring').split(',')[1];
      const fileName = `Credit_Sales_${fromDate}_to_${toDate}.pdf`;
      
      if (window.MPumpCalcAndroid && window.MPumpCalcAndroid.saveFileToDownloads) {
        window.MPumpCalcAndroid.saveFileToDownloads(pdfBase64, fileName, 'application/pdf');
      } else if (window.MPumpCalcAndroid && window.MPumpCalcAndroid.openPdfWithViewer) {
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
      const tableRows = filteredCreditData.map(credit => {
        const fuelInfo = credit.fuelEntries && credit.fuelEntries.length > 0
          ? credit.fuelEntries.map(f => f.fuelType + ': ' + f.liters + 'L @ ₹' + f.rate).join('<br>')
          : (credit.fuelType || 'N/A');
        
        const totalLiters = credit.fuelEntries && credit.fuelEntries.length > 0
          ? credit.fuelEntries.reduce((sum, f) => sum + parseFloat(f.liters || 0), 0)
          : credit.liters || 0;

        return '<tr>' +
          '<td>' + new Date(credit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '</td>' +
          '<td>' + credit.customerName + '</td>' +
          '<td>' + fuelInfo + '</td>' +
          '<td class="r">' + totalLiters.toFixed(2) + '</td>' +
          '<td class="r">' + (credit.rate ? credit.rate.toFixed(2) : '-') + '</td>' +
          '<td class="r">' + calculateCreditAmount(credit).toFixed(2) + '</td>' +
          '</tr>';
      }).join('');

      // HTML generation for web browsers
      const htmlContent = '<!DOCTYPE html>' +
        '<html>' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Credit Sales Report</title>' +
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
        '<h1>Credit Sales Report</h1>' +
        '<p>From: ' + new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) + ' To: ' + new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) + '</p>' +
        '<table>' +
        '<thead>' +
        '<tr>' +
        '<th>Date</th>' +
        '<th>Customer Name</th>' +
        '<th>Fuel Type</th>' +
        '<th class="r">Liters</th>' +
        '<th class="r">Rate (₹)</th>' +
        '<th class="r">Amount (₹)</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' +
        tableRows +
        '<tr class="total-row">' +
        '<td colspan="5" class="r">Total:</td>' +
        '<td class="r">₹' + totalAmount.toFixed(2) + '</td>' +
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
      <Card className={`${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
      }`}>
        <CardContent className="p-4">
          {/* Filters */}
          <div className="space-y-3 mb-4">
            {/* Customer Selection Row */}
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Customer
              </Label>
              <div className="grid grid-cols-[1fr_auto] gap-3 mt-1">
                {/* Search and Select Customer Dropdown */}
                <div className="relative" ref={customerDropdownRef}>
                  <Input
                    type="text"
                    placeholder="Search and select customer..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    disabled={showAllCustomers}
                    className={`w-full pr-10 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                    } ${showAllCustomers ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <ChevronDown 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 cursor-pointer ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } ${showAllCustomers ? 'opacity-50' : ''}`}
                    onClick={() => !showAllCustomers && setShowCustomerDropdown(!showCustomerDropdown)}
                  />
                  
                  {showCustomerDropdown && !showAllCustomers && (
                    <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-md border shadow-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {/* Individual customers */}
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className={`px-3 py-2 cursor-pointer ${
                              isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                            } ${
                              selectedCustomer === customer.id 
                                ? isDarkMode ? 'bg-blue-600' : 'bg-blue-100' 
                                : ''
                            }`}
                            onClick={() => {
                              setSelectedCustomer(customer.id);
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

                {/* All Customers Checkbox */}
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md min-w-[140px]" 
                     style={{ 
                       backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
                       borderColor: isDarkMode ? '#4b5563' : '#d1d5db'
                     }}>
                  <input
                    type="checkbox"
                    id="allCustomers"
                    checked={showAllCustomers}
                    onChange={(e) => {
                      setShowAllCustomers(e.target.checked);
                      if (e.target.checked) {
                        setSelectedCustomer('');
                        setCustomerSearch('');
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label 
                    htmlFor="allCustomers" 
                    className={`text-sm font-medium cursor-pointer ${
                      isDarkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}
                  >
                    All Customers
                  </label>
                </div>
              </div>
            </div>

            {/* Date Range with Select All and Delete */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    From Date
                  </Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                </div>
                <div>
                  <Label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    To Date
                  </Label>
                  <Input
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
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    className={isDarkMode ? 'border-gray-500' : ''}
                  />
                  <Label
                    htmlFor="select-all"
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
                  disabled={selectedCredits.size === 0}
                  className={isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700 disabled:opacity-50' : 'border-slate-400 text-slate-800 hover:bg-slate-100 disabled:opacity-50'}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedCredits.size})
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
              onClick={onAddCredit}
              variant="outline"
              size="sm"
              className={isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700' : 'border-slate-400 text-slate-800 hover:bg-slate-100'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Credit
            </Button>
          </div>

          {/* Header with Total */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-300 dark:border-gray-600">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Credit Sales {formatDisplayDate(fromDate)} to {formatDisplayDate(toDate)}
            </h3>
            <div className={`text-lg font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              ₹{totalAmount.toFixed(2)}
            </div>
          </div>

          {/* Credit Sales Table */}
          {filteredCreditData.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
              <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No credit sales in selected date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`px-2 py-1 border text-xs font-bold text-left ${
                      isDarkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-slate-400 bg-slate-200 text-slate-900'
                    }`} colSpan={6}>
                      Credit Sales
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
                    }`}>Details</th>
                    <th className={`px-2 py-1 border text-xs font-bold text-right ${
                      isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                    }`}>Amount (₹)</th>
                    <th className={`px-2 py-1 border text-xs font-bold text-center ${
                      isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                    }`} style={{ width: '90px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreditData.map((credit, i) => {
                    const isSelected = selectedCredits.has(credit.id);
                    const baseRow = i % 2 === 1
                      ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50')
                      : (isDarkMode ? 'bg-gray-700' : 'bg-white');
                    const cellCls = `px-2 py-1 border text-xs align-top ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`;
                    const detailParts = [];
                    (credit.fuelEntries || []).forEach((e) => {
                      detailParts.push(`${e.fuelType}: ${e.liters}L @ ₹${e.rate}`);
                    });
                    (credit.incomeEntries || []).forEach((e) => {
                      detailParts.push(`+ ${e.description} ₹${(e.amount || 0).toFixed(2)}`);
                    });
                    (credit.expenseEntries || []).forEach((e) => {
                      detailParts.push(`- ${e.description} ₹${(e.amount || 0).toFixed(2)}`);
                    });
                    return (
                      <tr key={credit.id} className={`${baseRow} ${isSelected ? (isDarkMode ? 'outline outline-1 outline-white' : 'outline outline-1 outline-slate-900') : ''}`}>
                        <td className={`${cellCls} text-center`}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectCredit(credit.id, checked)}
                            className={isDarkMode ? 'border-gray-500' : ''}
                          />
                        </td>
                        <td className={cellCls}>
                          {new Date(credit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </td>
                        <td className={`${cellCls} font-medium`}>{credit.customerName}</td>
                        <td className={cellCls}>
                          {detailParts.length === 0 ? (
                            <span className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>—</span>
                          ) : (
                            <div className="space-y-0.5">
                              {detailParts.map((p, idx) => (
                                <div key={idx} className="whitespace-nowrap">{p}</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className={`${cellCls} text-right font-mono font-semibold`}>
                          {calculateCreditAmount(credit).toFixed(2)}
                        </td>
                        <td className={`${cellCls} text-center`}>
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditCredit(credit)}
                              className="h-6 w-6 p-0"
                              aria-label={`Edit credit for ${credit.customerName}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(credit)}
                              className="h-6 w-6 p-0"
                              aria-label={`Delete credit for ${credit.customerName}`}
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
                    }`}>TOTAL ({filteredCreditData.length} sale{filteredCreditData.length === 1 ? '' : 's'})</td>
                    <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                      isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                    }`}>{totalAmount.toFixed(2)}</td>
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
                    Delete Credit Sale?
                  </h3>
                  <p className={`text-sm mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    Are you sure you want to delete credit sale of <span className="font-semibold">₹{deleteConfirm.credit ? calculateCreditAmount(deleteConfirm.credit).toFixed(2) : '0.00'}</span> for <span className="font-semibold">"{deleteConfirm.credit?.customerName}"</span>?
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
      {confirmDialog}
    </div>
  );
};

export default CreditSalesManagement;
