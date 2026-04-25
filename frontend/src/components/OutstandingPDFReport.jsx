import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { FileText, Printer, FileSpreadsheet, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const OutstandingPDFReport = ({ customers, creditData, payments, isDarkMode, selectedDate }) => {
  // fromDate defaults to the start of the current financial year (1 April)
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${fyStart}-04-01`;
  });
  const [tillDate, setTillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pdfSettings, setPdfSettings] = useState({
    showZeroBalance: false,
    showNegativeBalance: true,
    sortBy: 'amount', // 'amount' or 'name'
    includeHeader: true,
    includeDate: true,
    includeTotal: true
  });

  // Calculate outstanding for all customers:
  //   start       = opening balance on the day BEFORE fromDate
  //                 = startingBalance + (credits before fromDate) - (receipts before fromDate)
  //   credit      = credits in [fromDate, tillDate]
  //   received    = receipts in [fromDate, tillDate]
  //   outstanding = start + credit - received (balance at end of tillDate)
  const outstandingData = customers.map(customer => {
    const allCredits = creditData.filter(c => c.customerName === customer.name && c.date <= tillDate);
    const allPayments = payments.filter(p =>
      (p.customerId === customer.id || p.customerName === customer.name) && p.date <= tillDate
    );

    const creditBefore = allCredits
      .filter(c => c.date < fromDate)
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const receivedBefore = allPayments
      .filter(p => p.date < fromDate)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const creditInRange = allCredits
      .filter(c => c.date >= fromDate)
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const receivedInRange = allPayments
      .filter(p => p.date >= fromDate)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const startingBalance = customer.startingBalance || 0;
    const start = startingBalance + creditBefore - receivedBefore;
    const outstanding = start + creditInRange - receivedInRange;

    return {
      name: customer.name,
      startingBalance,
      start,
      totalCredit: creditInRange,
      totalReceived: receivedInRange,
      outstanding,
    };
  });

  // Filter based on settings
  const filteredData = outstandingData.filter(d => {
    if (!pdfSettings.showZeroBalance && d.outstanding === 0) return false;
    if (!pdfSettings.showNegativeBalance && d.outstanding < 0) return false;
    return true;
  });

  // Sort based on settings
  const sortedData = [...filteredData].sort((a, b) => {
    if (pdfSettings.sortBy === 'amount') {
      return b.outstanding - a.outstanding; // Descending
    } else {
      return a.name.localeCompare(b.name); // Alphabetical
    }
  });

  // Calculate totals
  const totals = sortedData.reduce((acc, d) => ({
    start: acc.start + d.start,
    totalCredit: acc.totalCredit + d.totalCredit,
    totalReceived: acc.totalReceived + d.totalReceived,
    outstanding: acc.outstanding + d.outstanding
  }), { start: 0, totalCredit: 0, totalReceived: 0, outstanding: 0 });

  // Excel Export functionality
  const handleExcelExport = () => {
    try {
      // Prepare data for Excel
      const excelData = [
        // Title row
        ['Outstanding Report'],
        [],
        [`From: ${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}  To: ${new Date(tillDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`],
        [],
        // Table headers
        ['Sr. No', 'Customer Name', 'Start (₹)', 'Credit (₹)', 'Receipt (₹)', 'Outstanding (₹)'],
        // Table data
        ...sortedData.map((customer, index) => [
          index + 1,
          customer.name,
          customer.start.toFixed(2),
          customer.totalCredit.toFixed(2),
          customer.totalReceived.toFixed(2),
          customer.outstanding.toFixed(2)
        ]),
        // Total row
        ['Total', '', totals.start.toFixed(2), totals.totalCredit.toFixed(2), totals.totalReceived.toFixed(2), totals.outstanding.toFixed(2)],
        [],
        // Footer
        [`Generated on: ${new Date().toLocaleString('en-IN')}`]
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // Sr. No
        { wch: 25 },  // Customer Name
        { wch: 15 },  // Start
        { wch: 15 },  // Credit
        { wch: 15 },  // Receipt
        { wch: 18 }   // Outstanding
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Outstanding');

      // Generate filename with date
      const filename = `Outstanding_Report_${fromDate}_to_${tillDate}.xlsx`;

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
      doc.text('Outstanding Report', 105, yPos, { align: 'center' });
      yPos += 10;

      // Date (From / Till)
      doc.setFontSize(12);
      const fromStr = new Date(fromDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      const toStr = new Date(tillDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      doc.text(`From: ${fromStr}    To: ${toStr}`, 105, yPos, { align: 'center' });
      yPos += 15;

      if (sortedData.length === 0) {
        doc.setFontSize(12);
        doc.text('No data to display based on current filters', 105, yPos, { align: 'center' });
      } else {
        // 5 columns: Customer Name, Start, Credit, Receipt, Outstanding
        const headers = ['Customer Name', 'Start', 'Credit', 'Receipt', 'Outstanding'];

        // Build table data with all columns
        const tableData = sortedData.map((customer) => {
          return [
            customer.name,
            customer.start.toFixed(2),
            customer.totalCredit.toFixed(2),
            customer.totalReceived.toFixed(2),
            customer.outstanding.toFixed(2)
          ];
        });

        // Add total row
        const totalStart = sortedData.reduce((sum, c) => sum + c.start, 0);
        const totalCredit = sortedData.reduce((sum, c) => sum + c.totalCredit, 0);
        const totalReceived = sortedData.reduce((sum, c) => sum + c.totalReceived, 0);
        const totalOutstanding = sortedData.reduce((sum, c) => sum + c.outstanding, 0);

        const totalRow = [
          'Total',
          totalStart.toFixed(2),
          totalCredit.toFixed(2),
          totalReceived.toFixed(2),
          totalOutstanding.toFixed(2)
        ];

        tableData.push(totalRow);

        doc.autoTable({
          startY: yPos,
          head: [headers],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
          styles: { fontSize: 11 },
          footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' }
        });
      }

      // Footer
      yPos = doc.internal.pageSize.height - 15;
      doc.setFontSize(9);
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, yPos, { align: 'center' });

      // Convert to base64 and send to Android
      const pdfBase64 = doc.output('dataurlstring').split(',')[1];
      const fileName = `Outstanding_Report_${fromDate}_to_${tillDate}.pdf`;
      
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
    // HTML generation for web browsers - shows all 4 columns
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Outstanding Report</title>
<style>
*{font-family:Helvetica,Arial,sans-serif;font-weight:normal}
body{margin:10px;line-height:1.2;color:#000;font-size:12px}
h1{font-size:18px;margin:0;text-align:center;text-transform:uppercase}
p{font-size:12px;margin:2px 0;text-align:center}
table{width:100%;border-collapse:collapse;font-size:10px;margin:3px 0}
th{border:1px solid #000;padding:2px;text-align:center;;font-size:10px}
td{border:1px solid #000;padding:2px;font-size:10px}
.r{text-align:right}
.t{}
.print-btn{background:#000;color:white;border:none;padding:10px 20px;font-size:16px;cursor:pointer;margin:10px auto;display:block}
.no-print{display:block}
@media print{body{margin:5mm}.no-print{display:none}@page{margin:5mm}}
</style>
</head>
<body>
<h1>Outstanding Report</h1>
<p>From: ${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}&nbsp;&nbsp;To: ${new Date(tillDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

${sortedData.length > 0 ? `
<table>
<tr>
  <th>Customer Name</th>
  <th>Start</th>
  <th>Credit</th>
  <th>Receipt</th>
  <th>Outstanding</th>
</tr>
${sortedData.map(customer => `
<tr>
  <td>${customer.name}</td>
  <td class="r">${customer.start.toFixed(2)}</td>
  <td class="r">${customer.totalCredit.toFixed(2)}</td>
  <td class="r">${customer.totalReceived.toFixed(2)}</td>
  <td class="r">${customer.outstanding.toFixed(2)}</td>
</tr>
`).join('')}
<tr class="t">
  <td>Total</td>
  <td class="r">${sortedData.reduce((sum, c) => sum + c.start, 0).toFixed(2)}</td>
  <td class="r">${sortedData.reduce((sum, c) => sum + c.totalCredit, 0).toFixed(2)}</td>
  <td class="r">${sortedData.reduce((sum, c) => sum + c.totalReceived, 0).toFixed(2)}</td>
  <td class="r">${sortedData.reduce((sum, c) => sum + c.outstanding, 0).toFixed(2)}</td>
</tr>
</table>
` : '<p>No data to display</p>'}

<div style="margin-top:10px;text-align:center;font-size:10px;border-top:1px solid #000;padding-top:5px">
Generated on: ${new Date().toLocaleString()}
</div>

<div class="no-print" style="text-align:center;margin:20px 0">
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
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

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-2">
      {/* Outstanding Report controls (compact, matches Bank Settlement) */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
        <CardContent className="p-2 sm:p-3 space-y-2">
          <h2 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Outstanding Report
          </h2>

          {/* Settings */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showZeroBalance"
                checked={pdfSettings.showZeroBalance}
                onChange={(e) => setPdfSettings({...pdfSettings, showZeroBalance: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="showZeroBalance" className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Show Zero Balance Customers
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showNegativeBalance"
                checked={pdfSettings.showNegativeBalance}
                onChange={(e) => setPdfSettings({...pdfSettings, showNegativeBalance: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="showNegativeBalance" className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Show Negative Balance (Overpaid)
              </Label>
            </div>
          </div>

          {/* Date Range — compact, matches Bank Settlement size */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                <Calendar className="w-3 h-3" />
                From Date
              </Label>
              <input
                type="date"
                data-testid="outstanding-from-date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`w-full rounded-md border px-2 py-1 text-xs sm:text-sm ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div className="space-y-1">
              <Label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                <Calendar className="w-3 h-3" />
                Till Date
              </Label>
              <input
                type="date"
                data-testid="outstanding-till-date"
                value={tillDate}
                onChange={(e) => setTillDate(e.target.value)}
                className={`w-full rounded-md border px-2 py-1 text-xs sm:text-sm ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          </div>

          {/* Sort By — compact */}
          <div className="space-y-1">
            <Label className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
              Sort By
            </Label>
            <select
              value={pdfSettings.sortBy}
              onChange={(e) => setPdfSettings({...pdfSettings, sortBy: e.target.value})}
              className={`w-full rounded-md border px-2 py-1 text-xs sm:text-sm ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300'
              }`}
            >
              <option value="amount">Outstanding Amount (Highest First)</option>
              <option value="name">Customer Name (A-Z)</option>
            </select>
          </div>

          {/* Print + Excel Buttons — compact outline, same as Bank Settlement */}
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
              Print Outs
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

          {/* Single-line heading: "Outstanding Report From <date> to <date>" */}
          <p className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${
            isDarkMode ? 'text-gray-200' : 'text-slate-800'
          }`}>
            Outstanding Report From {new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(tillDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>

          {/* Hidden clone used by Print handler. DOM is anchored to #outstanding-pdf-content. */}
          <div id="outstanding-pdf-content" style={{ display: 'none' }}>
            <h1>Outstanding Report</h1>
            <p>
              From: {new Date(fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' to '}
              {new Date(tillDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {sortedData.length === 0 ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No data to display based on current filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`px-2 py-1 border text-xs font-bold text-left ${
                        isDarkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-slate-400 bg-slate-200 text-slate-900'
                      }`} colSpan={6}>
                        Customer Outstanding
                      </th>
                    </tr>
                    <tr>
                      <th className={`px-2 py-1 border text-xs font-bold text-center ${
                        isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                      }`}>#</th>
                      <th className={`px-2 py-1 border text-xs font-bold text-left ${
                        isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                      }`}>Customer Name</th>
                      <th className={`px-2 py-1 border text-xs font-bold text-right ${
                        isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                      }`}>Start (₹)</th>
                      <th className={`px-2 py-1 border text-xs font-bold text-right ${
                        isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                      }`}>Credit (₹)</th>
                      <th className={`px-2 py-1 border text-xs font-bold text-right ${
                        isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                      }`}>Receipt (₹)</th>
                      <th className={`px-2 py-1 border text-xs font-bold text-right ${
                        isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
                      }`}>Outstanding (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row, index) => (
                      <tr
                        key={row.customerId || `out-${index}`}
                        className={index % 2 === 1
                          ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50')
                          : (isDarkMode ? 'bg-gray-700' : 'bg-white')}
                      >
                        <td className={`px-2 py-1 border text-xs text-center ${
                          isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                        }`}>{index + 1}</td>
                        <td className={`px-2 py-1 border text-xs ${
                          isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                        }`}>{row.name}</td>
                        <td className={`px-2 py-1 border text-xs text-right font-mono ${
                          isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                        }`}>{row.start.toFixed(2)}</td>
                        <td className={`px-2 py-1 border text-xs text-right font-mono ${
                          isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                        }`}>{row.totalCredit.toFixed(2)}</td>
                        <td className={`px-2 py-1 border text-xs text-right font-mono ${
                          isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                        }`}>{row.totalReceived.toFixed(2)}</td>
                        <td className={`px-2 py-1 border text-xs text-right font-mono font-semibold ${
                          isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
                        }`}>{row.outstanding.toFixed(2)}</td>
                      </tr>
                    ))}
                    {pdfSettings.includeTotal && (
                      <tr className={isDarkMode ? 'bg-gray-900' : 'bg-slate-200'}>
                        <td colSpan="2" className={`px-2 py-1 border text-xs font-bold ${
                          isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                        }`}>
                          TOTAL ({sortedData.length} customer{sortedData.length === 1 ? '' : 's'})
                        </td>
                        <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                          isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                        }`}>{totals.start.toFixed(2)}</td>
                        <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                          isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                        }`}>{totals.totalCredit.toFixed(2)}</td>
                        <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                          isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                        }`}>{totals.totalReceived.toFixed(2)}</td>
                        <td className={`px-2 py-1 border text-xs font-bold text-right font-mono ${
                          isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                        }`}>{totals.outstanding.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OutstandingPDFReport;
