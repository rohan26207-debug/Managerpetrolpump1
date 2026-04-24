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

  // Print functionality - matches PDF button style
  const handlePrint = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Bank Settlement Report</title>
<style>
*{font-family:Helvetica,Arial,sans-serif;font-weight:normal}
body{margin:10px;line-height:1.2;color:#000;font-size:12px}
h1{font-size:18px;margin:0;text-align:center;text-transform:uppercase}
p{font-size:12px;margin:2px 0;text-align:center}
.s{margin:10px 0 3px 0;font-size:12px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;font-size:10px;margin:3px 0}
th{border:1px solid #000;padding:2px;text-align:center;font-size:10px;text-transform:uppercase}
td{border:1px solid #000;padding:2px;font-size:10px}
.r{text-align:right}
.c{text-align:center}
.t{}
.print-btn{background:#000;color:white;border:none;padding:10px 20px;font-size:16px;cursor:pointer;margin:10px auto;display:block}
.no-print{display:block}
@media print{body{margin:5mm}.no-print{display:none}@page{margin:5mm}}
</style>
</head>
<body>
<h1>Bank Settlement Report</h1>
<p>${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>

<div class="s">SETTLEMENT SUMMARY</div>
<table>
<tr><th>Sr.No<th>Date<th>Cash<th>Card<th>Paytm<th>PhonePe<th>DTP</tr>
${bankSettlementData.map(row => 
  `<tr><td class="c">${row.srNo}<td class="c">${row.date}<td class="r">${row.cashAmount > 0 ? row.cashAmount.toFixed(2) : '-'}<td class="r">${row.cardAmount > 0 ? row.cardAmount.toFixed(2) : '-'}<td class="r">${row.paytmAmount > 0 ? row.paytmAmount.toFixed(2) : '-'}<td class="r">${row.phonepeAmount > 0 ? row.phonepeAmount.toFixed(2) : '-'}<td class="r">${row.dtpAmount > 0 ? row.dtpAmount.toFixed(2) : '-'}</tr>`
).join('')}
<tr class="t"><td colspan="2" class="r">Total<td class="r">${totals.cashAmount.toFixed(2)}<td class="r">${totals.cardAmount.toFixed(2)}<td class="r">${totals.paytmAmount.toFixed(2)}<td class="r">${totals.phonepeAmount.toFixed(2)}<td class="r">${totals.dtpAmount.toFixed(2)}</tr>
</table>

<div style="margin-top:10px;text-align:center;font-size:10px;border-top:1px solid #000;padding-top:5px">
Generated on: ${new Date().toLocaleString()}
</div>

<div class="no-print" style="text-align:center;margin:20px 0">
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>

<script>
window.onload = function() {
  setTimeout(function() { window.print(); }, 500);
};
</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
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
          
          {/* Print and Excel Buttons — black & white */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              className={`text-xs sm:text-sm ${
                isDarkMode
                  ? 'border-gray-500 text-gray-200 hover:bg-gray-700'
                  : 'border-slate-400 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Print
            </Button>
            <Button
              onClick={handleExcelExport}
              variant="outline"
              className={`text-xs sm:text-sm ${
                isDarkMode
                  ? 'border-gray-500 text-gray-200 hover:bg-gray-700'
                  : 'border-slate-400 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Daily Breakdown Table (B&W, Reports-style) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`px-2 py-1 border text-xs font-bold text-left ${
                  isDarkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-slate-400 bg-slate-200 text-slate-900'
                }`} colSpan={7}>
                  Daily Breakdown
                </th>
              </tr>
              <tr>
                <th className={`px-2 py-1 border text-xs font-bold text-center ${
                  isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                }`}>#</th>
                <th className={`px-2 py-1 border text-xs font-bold text-left ${
                  isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                }`}>Date</th>
                <th className={`px-2 py-1 border text-xs font-bold text-right ${
                  isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                }`}>Cash</th>
                <th className={`px-2 py-1 border text-xs font-bold text-right ${
                  isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                }`}>Card</th>
                <th className={`px-2 py-1 border text-xs font-bold text-right ${
                  isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                }`}>Paytm</th>
                <th className={`px-2 py-1 border text-xs font-bold text-right ${
                  isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                }`}>PhonePe</th>
                <th className={`px-2 py-1 border text-xs font-bold text-right ${
                  isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                }`}>DTP</th>
              </tr>
            </thead>
            <tbody>
              {bankSettlementData.length === 0 ? (
                <tr>
                  <td colSpan="7" className={`px-2 py-4 border text-center text-xs ${
                    isDarkMode ? 'border-gray-600 text-gray-400' : 'border-slate-400 text-slate-500'
                  }`}>
                    No data available for selected date range
                  </td>
                </tr>
              ) : (
                bankSettlementData.map((row, i) => (
                  <tr
                    key={row.date}
                    className={i % 2 === 1
                      ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50')
                      : (isDarkMode ? 'bg-gray-700' : 'bg-white')}
                  >
                    <td className={`px-2 py-1 border text-xs text-center ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`}>{row.srNo}</td>
                    <td className={`px-2 py-1 border text-xs ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`}>
                      {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className={`px-2 py-1 border text-xs text-right font-mono ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`}>{row.cashAmount > 0 ? row.cashAmount.toFixed(2) : '-'}</td>
                    <td className={`px-2 py-1 border text-xs text-right font-mono ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`}>{row.cardAmount > 0 ? row.cardAmount.toFixed(2) : '-'}</td>
                    <td className={`px-2 py-1 border text-xs text-right font-mono ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`}>{row.paytmAmount > 0 ? row.paytmAmount.toFixed(2) : '-'}</td>
                    <td className={`px-2 py-1 border text-xs text-right font-mono ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`}>{row.phonepeAmount > 0 ? row.phonepeAmount.toFixed(2) : '-'}</td>
                    <td className={`px-2 py-1 border text-xs text-right font-mono ${
                      isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                    }`}>{row.dtpAmount > 0 ? row.dtpAmount.toFixed(2) : '-'}</td>
                  </tr>
                ))
              )}
              {bankSettlementData.length > 0 && (
                <tr className={isDarkMode ? 'bg-gray-900' : 'bg-slate-200'}>
                  <td colSpan="2" className={`px-2 py-1 border text-xs font-bold ${
                    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                  }`}>Total</td>
                  <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                  }`}>{totals.cashAmount.toFixed(2)}</td>
                  <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                  }`}>{totals.cardAmount.toFixed(2)}</td>
                  <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                  }`}>{totals.paytmAmount.toFixed(2)}</td>
                  <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                  }`}>{totals.phonepeAmount.toFixed(2)}</td>
                  <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                  }`}>{totals.dtpAmount.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info Note */}
        <div className={`text-xs p-2 rounded border ${
          isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-slate-300 bg-slate-50 text-slate-700'
        }`}>
          <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>Note:</strong> Amounts include settlements and customer receipts for each payment mode.
        </div>
      </CardContent>
    </Card>
  );
};

export default BankSettlement;
