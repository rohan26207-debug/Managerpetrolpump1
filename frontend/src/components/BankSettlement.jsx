import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Wallet, Calendar, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const BankSettlement = ({ isDarkMode, settlementData, payments, creditData, salesData, incomeData, expenseData, selectedDate }) => {
  // Initialize date range with current selected date
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);

  // Calculate bank settlement data for date range
  const bankSettlementData = useMemo(() => {
    // Create a date range array
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const dateArray = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateArray.push(new Date(d).toISOString().split('T')[0]);
    }

    // Calculate amounts for each date
    return dateArray.map((date, index) => {
      const daySettlements = settlementData.filter(s => s.date === date);
      const dayPayments = payments.filter(p => p.date === date);

      // Helper: check if a receipt matches a bank settlement category
      const receiptMatchesCategory = (p, keyword) => {
        const st = (p.settlementType || '').toLowerCase();
        const mode = (p.mode || '').toLowerCase();
        const pt = (p.paymentType || '').toLowerCase();
        // Match if settlementType, mode, or paymentType contains the keyword
        return st.includes(keyword) || mode.includes(keyword) || (pt === keyword);
      };

      // Cash = Settlement "cash" + Receipts matching "cash"
      const cashAmount = daySettlements
        .filter(s => s.description && s.description.toLowerCase().includes('cash'))
        .reduce((sum, s) => sum + (s.amount || 0), 0)
        + dayPayments.filter(p => receiptMatchesCategory(p, 'cash'))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Card = Settlement "card" + Receipts matching "card"
      const cardAmount = daySettlements
        .filter(s => s.description && s.description.toLowerCase().includes('card'))
        .reduce((sum, s) => sum + (s.amount || 0), 0)
        + dayPayments.filter(p => receiptMatchesCategory(p, 'card'))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Paytm = Settlement "paytm" + Receipts matching "paytm"
      const paytmAmount = daySettlements
        .filter(s => s.description && s.description.toLowerCase().includes('paytm'))
        .reduce((sum, s) => sum + (s.amount || 0), 0)
        + dayPayments.filter(p => receiptMatchesCategory(p, 'paytm'))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // PhonePe = Settlement "phonepe" + Receipts matching "phonepe"
      const phonepeAmount = daySettlements
        .filter(s => s.description && s.description.toLowerCase().includes('phonepe'))
        .reduce((sum, s) => sum + (s.amount || 0), 0)
        + dayPayments.filter(p => receiptMatchesCategory(p, 'phonepe'))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // DTP = Settlement "dtp" + Receipts matching "dtp"
      const dtpAmount = daySettlements
        .filter(s => s.description && s.description.toLowerCase().includes('dtp'))
        .reduce((sum, s) => sum + (s.amount || 0), 0)
        + dayPayments.filter(p => receiptMatchesCategory(p, 'dtp'))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        srNo: index + 1,
        date,
        cashAmount,
        cardAmount,
        paytmAmount,
        phonepeAmount,
        dtpAmount
      };
    });
  }, [fromDate, toDate, settlementData, payments]);

  // Calculate totals
  const totals = useMemo(() => {
    return bankSettlementData.reduce(
      (acc, row) => ({
        cashAmount: acc.cashAmount + row.cashAmount,
        cardAmount: acc.cardAmount + row.cardAmount,
        paytmAmount: acc.paytmAmount + row.paytmAmount,
        phonepeAmount: acc.phonepeAmount + row.phonepeAmount,
        dtpAmount: acc.dtpAmount + row.dtpAmount
      }),
      { cashAmount: 0, cardAmount: 0, paytmAmount: 0, phonepeAmount: 0, dtpAmount: 0 }
    );
  }, [bankSettlementData]);

  // Excel Export functionality
  const handleExcelExport = () => {
    try {
      // Prepare data for Excel
      const excelData = [
        // Title row
        ['Bank Settlement Report'],
        [],
        // Date range
        [`Date Range: ${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(toDate).toLocaleDateString('en-IN')}`],
        [],
        // Summary totals
        ['Summary'],
        ['Payment Mode', 'Total Amount (₹)'],
        ['Cash', totals.cashAmount.toFixed(2)],
        ['Card', totals.cardAmount.toFixed(2)],
        ['Paytm', totals.paytmAmount.toFixed(2)],
        ['PhonePe', totals.phonepeAmount.toFixed(2)],
        ['DTP', totals.dtpAmount.toFixed(2)],
        [],
        // Table headers
        ['Sr. No', 'Date', 'Cash (₹)', 'Card (₹)', 'Paytm (₹)', 'PhonePe (₹)', 'DTP (₹)'],
        // Table data
        ...bankSettlementData.map(row => [
          row.srNo,
          new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          row.cashAmount > 0 ? row.cashAmount.toFixed(2) : '-',
          row.cardAmount > 0 ? row.cardAmount.toFixed(2) : '-',
          row.paytmAmount > 0 ? row.paytmAmount.toFixed(2) : '-',
          row.phonepeAmount > 0 ? row.phonepeAmount.toFixed(2) : '-',
          row.dtpAmount > 0 ? row.dtpAmount.toFixed(2) : '-'
        ]),
        // Total row
        ['Total', '', totals.cashAmount.toFixed(2), totals.cardAmount.toFixed(2), totals.paytmAmount.toFixed(2), totals.phonepeAmount.toFixed(2), totals.dtpAmount.toFixed(2)],
        [],
        // Footer
        [`Generated on: ${new Date().toLocaleString('en-IN')}`],
        ['Note: Amounts include settlements and customer receipts for each payment mode']
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // Sr. No
        { wch: 15 },  // Date
        { wch: 12 },  // Cash
        { wch: 12 },  // Card
        { wch: 12 },  // Paytm
        { wch: 12 },  // PhonePe
        { wch: 12 }   // DTP
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Bank Settlement');

      // Generate filename with date
      const filename = `Bank_Settlement_${new Date(fromDate).toISOString().split('T')[0]}_to_${new Date(toDate).toISOString().split('T')[0]}.xlsx`;

      // Export file
      XLSX.writeFile(wb, filename);
      
      console.log('Excel file exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Error exporting to Excel: ' + error.message);
    }
  };

  // Print functionality
  const handlePrint = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bank Settlement Report</title>
  <style>
    @media print {
      body { margin: 10mm; }
      @page { size: A4 landscape; margin: 10mm; }
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      color: #1a56db;
    }
    .date-range {
      text-align: center;
      margin-bottom: 20px;
      font-size: 13px;
      color: #666;
    }
    .summary {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;
      gap: 10px;
    }
    .summary-card {
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 5px;
      text-align: center;
      flex: 1;
    }
    .summary-card .label {
      font-size: 11px;
      color: #666;
      font-weight: bold;
    }
    .summary-card .value {
      font-size: 16px;
      font-weight: bold;
      margin-top: 5px;
    }
    .cash { color: #ea580c; }
    .card { color: #1d4ed8; }
    .paytm { color: #7c3aed; }
    .phonepe { color: #4338ca; }
    .dtp { color: #16a34a; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: left;
    }
    td.number {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    tfoot td {
      font-weight: bold;
      background-color: #f9fafb;
      border-top: 2px solid #333;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏦 Bank Settlement Report</h1>
  </div>
  
  <div class="date-range">
    <strong>Date Range:</strong> ${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} 
    to ${new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Cash</div>
      <div class="value cash">₹${totals.cashAmount.toFixed(2)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Card</div>
      <div class="value card">₹${totals.cardAmount.toFixed(2)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Paytm</div>
      <div class="value paytm">₹${totals.paytmAmount.toFixed(2)}</div>
    </div>
    <div class="summary-card">
      <div class="label">PhonePe</div>
      <div class="value phonepe">₹${totals.phonepeAmount.toFixed(2)}</div>
    </div>
    <div class="summary-card">
      <div class="label">DTP</div>
      <div class="value dtp">₹${totals.dtpAmount.toFixed(2)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Sr. No</th>
        <th>Date</th>
        <th style="text-align: right;">Cash (₹)</th>
        <th style="text-align: right;">Card (₹)</th>
        <th style="text-align: right;">Paytm (₹)</th>
        <th style="text-align: right;">PhonePe (₹)</th>
        <th style="text-align: right;">DTP (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${bankSettlementData.map(row => `
        <tr>
          <td>${row.srNo}</td>
          <td>${new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td class="number">${row.cashAmount > 0 ? row.cashAmount.toFixed(2) : '-'}</td>
          <td class="number">${row.cardAmount > 0 ? row.cardAmount.toFixed(2) : '-'}</td>
          <td class="number">${row.paytmAmount > 0 ? row.paytmAmount.toFixed(2) : '-'}</td>
          <td class="number">${row.phonepeAmount > 0 ? row.phonepeAmount.toFixed(2) : '-'}</td>
          <td class="number">${row.dtpAmount > 0 ? row.dtpAmount.toFixed(2) : '-'}</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2">Total</td>
        <td class="number cash">${totals.cashAmount.toFixed(2)}</td>
        <td class="number card">${totals.cardAmount.toFixed(2)}</td>
        <td class="number paytm">${totals.paytmAmount.toFixed(2)}</td>
        <td class="number phonepe">${totals.phonepeAmount.toFixed(2)}</td>
        <td class="number dtp">${totals.dtpAmount.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    Generated on: ${new Date().toLocaleString('en-IN')}<br>
    Note: Amounts include settlements and customer receipts for each payment mode.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-lg`}>
      <CardContent className="p-2 sm:p-3 space-y-3">
        {/* Header */}
        <h2 className={`text-lg sm:text-2xl font-bold mb-2 ${
          isDarkMode ? 'text-white' : 'text-slate-800'
        }`}>
          Bank Settlement
        </h2>
        
        {/* Date Range Selector and Action Buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                <Calendar className="w-3 h-3" />
                From Date
              </Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`text-xs sm:text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>
            <div className="space-y-1">
              <Label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                <Calendar className="w-3 h-3" />
                To Date
              </Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`text-xs sm:text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>
          </div>
          
          {/* Print and Excel Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handlePrint}
              className={`text-xs sm:text-sm ${
                isDarkMode 
                  ? 'bg-green-700 hover:bg-green-600 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Print
            </Button>
            <Button
              onClick={handleExcelExport}
              className={`text-xs sm:text-sm ${
                isDarkMode 
                  ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards - Matching Today Summary styling */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className={`py-1.5 px-2 sm:py-2 sm:px-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
            <div className={`text-xs sm:text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-800'}`}>Cash</div>
            <div className={`text-xs sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              ₹{totals.cashAmount.toFixed(2)}
            </div>
          </div>
          <div className={`py-1.5 px-2 sm:py-2 sm:px-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
            <div className={`text-xs sm:text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-800'}`}>Card</div>
            <div className={`text-xs sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              ₹{totals.cardAmount.toFixed(2)}
            </div>
          </div>
          <div className={`py-1.5 px-2 sm:py-2 sm:px-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
            <div className={`text-xs sm:text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-800'}`}>Paytm</div>
            <div className={`text-xs sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              ₹{totals.paytmAmount.toFixed(2)}
            </div>
          </div>
          <div className={`py-1.5 px-2 sm:py-2 sm:px-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-indigo-50'}`}>
            <div className={`text-xs sm:text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-800'}`}>PhonePe</div>
            <div className={`text-xs sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              ₹{totals.phonepeAmount.toFixed(2)}
            </div>
          </div>
          <div className={`py-1.5 px-2 sm:py-2 sm:px-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
            <div className={`text-xs sm:text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-800'}`}>DTP</div>
            <div className={`text-xs sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              ₹{totals.dtpAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className={`rounded-lg border overflow-hidden ${
          isDarkMode ? 'border-gray-600' : 'border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className={`${
                isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-slate-100 text-slate-700'
              }`}>
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold">Sr. No</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold">Date</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Cash (₹)</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Card (₹)</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Paytm (₹)</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">PhonePe (₹)</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">DTP (₹)</th>
                </tr>
              </thead>
              <tbody className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                {bankSettlementData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={`px-2 sm:px-3 py-6 sm:py-8 text-center text-xs sm:text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}>
                      No data available for selected date range
                    </td>
                  </tr>
                ) : (
                  bankSettlementData.map((row) => (
                    <tr key={row.date} className={`border-t ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">{row.srNo}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 font-medium">
                        {new Date(row.date).toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono">
                        {row.cashAmount > 0 ? row.cashAmount.toFixed(2) : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono">
                        {row.cardAmount > 0 ? row.cardAmount.toFixed(2) : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono">
                        {row.paytmAmount > 0 ? row.paytmAmount.toFixed(2) : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono">
                        {row.phonepeAmount > 0 ? row.phonepeAmount.toFixed(2) : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono">
                        {row.dtpAmount > 0 ? row.dtpAmount.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {bankSettlementData.length > 0 && (
                <tfoot className={`border-t-2 ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-300 bg-slate-50'
                }`}>
                  <tr className="font-bold">
                    <td colSpan="2" className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">Total</td>
                    <td className={`px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono ${
                      isDarkMode ? 'text-orange-400' : 'text-orange-600'
                    }`}>
                      {totals.cashAmount.toFixed(2)}
                    </td>
                    <td className={`px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {totals.cardAmount.toFixed(2)}
                    </td>
                    <td className={`px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {totals.paytmAmount.toFixed(2)}
                    </td>
                    <td className={`px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono ${
                      isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                    }`}>
                      {totals.phonepeAmount.toFixed(2)}
                    </td>
                    <td className={`px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {totals.dtpAmount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Info Note */}
        <div className={`text-xs sm:text-sm p-2 sm:p-3 rounded-lg ${
          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-slate-700'
        }`}>
          <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>Note:</strong> Amounts include settlements and customer receipts for each payment mode.
          This report helps verify digital payment settlements with bank deposits.
        </div>
      </CardContent>
    </Card>
  );
};

export default BankSettlement;
