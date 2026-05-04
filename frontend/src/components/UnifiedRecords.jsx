import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { 
  Calculator, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  IndianRupee,
  Fuel,
  Users,
  Receipt,
  Edit,
  Trash2,
  Wallet
} from 'lucide-react';

const UnifiedRecords = ({ 
  isDarkMode, 
  salesData, 
  creditData, 
  incomeData, 
  expenseData,
  settlementData,
  selectedDate,
  // Edit and delete functions
  onEditSale,
  deleteSaleRecord,
  onEditCredit,
  deleteCreditRecord,
  onEditIncome,
  deleteIncomeRecord,
  onEditExpense,
  deleteExpenseRecord,
  onEditSettlement,
  deleteSettlementRecord
}) => {
  // Filter all data for selected date
  const filteredSales = salesData.filter(item => item.date === selectedDate);
  const filteredCredits = creditData.filter(item => item.date === selectedDate);
  const filteredIncome = incomeData.filter(item => item.date === selectedDate);
  const filteredExpenses = expenseData.filter(item => item.date === selectedDate);
  const filteredSettlements = settlementData.filter(item => item.date === selectedDate);

  const totalRecords = filteredSales.length + filteredCredits.length + filteredIncome.length + filteredExpenses.length + filteredSettlements.length;

  const RecordGroup = ({ title, icon: Icon, records, color, renderRecord }) => {
    if (records.length === 0) return null;

    return (
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${color}`} />
          <h3 className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            {title} ({records.length})
          </h3>
        </div>
        <div className="space-y-1">
          {records.map(renderRecord)}
        </div>
      </div>
    );
  };

  const renderSalesRecord = (sale) => (
    <div key={sale.id} className={`border rounded-lg p-2 sm:p-3 ${
      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
            {sale.nozzle}
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">
            {sale.fuelType}
          </Badge>
          {sale.mpp && (
            <Badge data-testid="mpp-tag-badge" className="bg-amber-100 text-amber-800 border-0 text-xs font-bold">
              MPP
            </Badge>
          )}
          <div className="flex items-center gap-1 text-green-600 font-bold">
            <IndianRupee className="w-4 h-4" />
            <span className="text-base sm:text-lg">{sale.amount.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEditSale && onEditSale(sale)}
            className="h-7 w-7 p-0"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => deleteSaleRecord && deleteSaleRecord(sale.id)}
            className="h-7 w-7 p-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-1 text-xs sm:text-sm">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex flex-col sm:flex-row sm:gap-1">
            <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Start:</span>
            <span>{sale.startReading}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-1">
            <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>End:</span>
            <span>{sale.endReading}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-1">
            <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Testing:</span>
            <span>{sale.testing || 0}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-1">
            <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Litres:</span>
            <span>{sale.liters}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-1">
            <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Rate:</span>
            <span>₹{sale.rate}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreditRecord = (credit) => (
    <div key={credit.id} className={`border rounded-lg p-2 sm:p-3 ${
      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <Badge className="bg-orange-100 text-orange-800 border-0 text-xs">
            Credit
          </Badge>
          <div className="flex items-center gap-1 text-orange-600 font-bold">
            <IndianRupee className="w-4 h-4" />
            <span className="text-base sm:text-lg">{credit.amount.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEditCredit && onEditCredit(credit)}
            className="h-7 w-7 p-0"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => deleteCreditRecord && deleteCreditRecord(credit.id)}
            className="h-7 w-7 p-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Customer Name */}
      <div className="mb-2">
        <span className="font-semibold text-base break-words">{credit.customerName}</span>
      </div>

      {/* Fuel Entries */}
      {credit.fuelEntries && credit.fuelEntries.length > 0 ? (
        <div className="space-y-2 mb-2">
          {credit.fuelEntries.map((entry, index) => (
            <div key={entry.id || `fuel-${index}`} className={`p-2 rounded border ${
              isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-purple-50 border-purple-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">
                  {entry.fuelType}
                </Badge>
                <span className="text-xs font-medium text-purple-600">
                  ₹{entry.amount.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                <div>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>Litres: </span>
                  <span className="font-medium">{entry.liters}L</span>
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
        // Legacy single entry format
        credit.liters && (
          <div className="space-y-1 mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">
                {credit.fuelType}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-1">
                <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Litres:</span>
                <span>{credit.liters}L</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-1">
                <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Rate:</span>
                <span>₹{credit.rate}</span>
              </div>
            </div>
          </div>
        )
      )}

      {/* Income Entries */}
      {credit.incomeEntries && credit.incomeEntries.length > 0 && (
        <div className="space-y-2 mb-2">
          {credit.incomeEntries.map((entry, index) => (
            <div key={entry.id || `inc-${index}`} className={`p-2 rounded border ${
              isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{entry.description}</span>
                <span className="text-xs font-medium text-green-600">
                  +₹{entry.amount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expense Entries */}
      {credit.expenseEntries && credit.expenseEntries.length > 0 && (
        <div className="space-y-2">
          {credit.expenseEntries.map((entry, index) => (
            <div key={entry.id || `exp-${index}`} className={`p-2 rounded border ${
              isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{entry.description}</span>
                <span className="text-xs font-medium text-red-600">
                  -₹{entry.amount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderIncomeRecord = (income) => (
    <div key={income.id} className={`border rounded-lg p-2 sm:p-3 ${
      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {income.description && (
            <p className={`text-xs sm:text-sm break-words ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
              {income.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-green-600 font-bold">
            <IndianRupee className="w-4 h-4" />
            <span className="text-base sm:text-lg">{income.amount.toFixed(2)}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEditIncome && onEditIncome(income)}
            className="h-7 w-7 p-0"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => deleteIncomeRecord && deleteIncomeRecord(income.id)}
            className="h-7 w-7 p-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderExpenseRecord = (expense) => (
    <div key={expense.id} className={`border rounded-lg p-2 sm:p-3 ${
      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {expense.description && (
            <p className={`text-xs sm:text-sm break-words ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
              {expense.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-red-600 font-bold">
            <IndianRupee className="w-4 h-4" />
            <span className="text-base sm:text-lg">{expense.amount.toFixed(2)}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEditExpense && onEditExpense(expense)}
            className="h-7 w-7 p-0"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => deleteExpenseRecord && deleteExpenseRecord(expense.id)}
            className="h-7 w-7 p-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSettlementRecord = (settlement) => (
    <div key={settlement.id} className={`border rounded-lg p-2 sm:p-3 ${
      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {settlement.description && (
            <p className={`text-xs sm:text-sm break-words ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
              {settlement.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-yellow-600 font-bold">
            <IndianRupee className="w-4 h-4" />
            <span className="text-base sm:text-lg">{settlement.amount.toFixed(2)}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEditSettlement && onEditSettlement(settlement)}
            className="h-7 w-7 p-0"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => deleteSettlementRecord && deleteSettlementRecord(settlement.id)}
            className="h-7 w-7 p-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card className={`${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
    } shadow-lg mt-2`}>
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-lg py-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="w-5 h-5" />
          All Records for {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate} ({totalRecords})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {totalRecords === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No records for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : 'selected date'}</p>
          </div>
        ) : (
          <>
            <RecordGroup
              title="Fuel Sales"
              icon={Calculator}
              records={filteredSales}
              color="text-blue-600"
              renderRecord={renderSalesRecord}
            />
            
            <RecordGroup
              title="Credit Sales"
              icon={CreditCard}
              records={filteredCredits}
              color="text-orange-600"
              renderRecord={renderCreditRecord}
            />
            
            <RecordGroup
              title="Income"
              icon={TrendingUp}
              records={filteredIncome}
              color="text-green-600"
              renderRecord={renderIncomeRecord}
            />
            
            <RecordGroup
              title="Expenses"
              icon={TrendingDown}
              records={filteredExpenses}
              color="text-red-600"
              renderRecord={renderExpenseRecord}
            />
            
            <RecordGroup
              title="Settlement"
              icon={Wallet}
              records={filteredSettlements}
              color="text-yellow-600"
              renderRecord={renderSettlementRecord}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedRecords;