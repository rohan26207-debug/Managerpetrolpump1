import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  ArrowRightLeft,
  Plus, 
  Edit,
  Trash2,
  IndianRupee
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useConfirm } from '../hooks/use-confirm';
import localStorageService from '../services/localStorage';

const Settlement = ({ 
  isDarkMode, 
  settlementData, 
  addSettlementRecord, 
  updateSettlementRecord, 
  deleteSettlementRecord, 
  selectedDate,
  formResetKey,
  editingRecord,
  onRecordSaved,
  hideRecordsList,
  customers
}) => {
  const [formData, setFormData] = useState({
    date: selectedDate,
    amount: '',
    description: '',
    mpp: false
  });
  
  // Check if MPP checkbox should be visible based on customers
  const isMPPVisible = React.useMemo(() => {
    return customers && customers.some(c => c.isMPP === true);
  }, [customers]);

  const { confirm, confirmDialog } = useConfirm();

  const [editingId, setEditingId] = useState(null);
  const [settlementTypes, setSettlementTypes] = useState([]);
  const { toast } = useToast();

  // Load settlement types on mount
  useEffect(() => {
    setSettlementTypes(localStorageService.getSettlementTypes());
  }, []);

  // Pre-fill form when editingRecord is provided
  useEffect(() => {
    console.log('Settlement useEffect - editingRecord:', editingRecord);
    if (editingRecord) {
      console.log('Settlement - setting form data:', {
        date: editingRecord.date,
        amount: editingRecord.amount,
        description: editingRecord.description,
        mpp: editingRecord.mpp
      });
      setFormData({
        date: editingRecord.date,
        amount: editingRecord.amount.toString(),
        description: editingRecord.description,
        mpp: editingRecord.mpp || false
      });
      setEditingId(editingRecord.id);
    } else {
      // Reset when editingRecord is null (adding new record)
      setEditingId(null);
    }
  }, [editingRecord]);

  // Reset form when formResetKey changes (but not during editing)
  useEffect(() => {
    if (formResetKey && !editingRecord && !editingId) {
      resetForm();
    }
  }, [formResetKey, editingRecord, editingId]);

  // Update date when selectedDate changes (only if not editing)
  useEffect(() => {
    if (!editingId && !editingRecord) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
  }, [selectedDate, editingId, editingRecord]);

  const resetForm = () => {
    setFormData({
      date: selectedDate,
      amount: '',
      description: '',
      mpp: false
    });
    setEditingId(null);
  };

  const handleSubmit = (shouldClose = false) => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a description",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      updateSettlementRecord(editingId, formData);
      toast({
        title: "Settlement Updated",
        description: "Settlement record has been updated successfully",
      });
    } else {
      addSettlementRecord(formData);
      toast({
        title: "Settlement Added",
        description: "Settlement record has been added successfully",
      });
    }

    resetForm();
    
    if (shouldClose && onRecordSaved) {
      onRecordSaved();
    }
  };

  const handleEdit = (record) => {
    setFormData({
      date: record.date,
      amount: record.amount.toString(),
      description: record.description,
      mpp: record.mpp || false
    });
    setEditingId(record.id);
  };

  const handleDelete = async (id) => {
    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      deleteSettlementRecord(id);
      toast({
        title: "Settlement Deleted",
        description: "Settlement record has been deleted.",
        variant: "default"
      });
    } else {
      // Show confirmation dialog (window.confirm is blocked in Android WebView)
      const ok = await confirm({
        title: 'Delete Settlement?',
        message: 'Are you sure you want to delete this settlement record?\n\nThis action cannot be undone.',
        isDarkMode,
      });
      if (ok) {
        deleteSettlementRecord(id);
        toast({
          title: "Settlement Deleted",
          description: "Settlement record has been deleted.",
          variant: "default"
        });
      }
    }
  };

  // Filter settlements for selected date
  const filteredSettlements = settlementData.filter(item => item.date === selectedDate);
  const totalSettlements = filteredSettlements.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-lg ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          <ArrowRightLeft className="w-5 h-5 text-orange-600" />
          Settlement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Entry Form */}
        <div className="space-y-3">
          <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
            {editingId ? 'Edit Settlement' : 'Add Settlement'}
          </h3>
          
          {/* Date Field */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className={`text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
            />
          </div>

          {/* Main Entry Row */}
          <div className={`p-0.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`grid ${isMPPVisible ? 'grid-cols-[1fr,1fr,auto]' : 'grid-cols-2'} gap-2 items-end p-2`}>
              {/* Description */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Settlement Type</Label>
                <Select
                  value={formData.description}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                >
                  <SelectTrigger className={`text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}>
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

              {/* Amount */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className={`text-sm font-medium ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                />
              </div>
              
              {/* MPP Checkbox */}
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
          </div>

          {/* Action Buttons */}
          {(editingId || editingRecord) ? (
            <div className="flex gap-2">
              <Button 
                onClick={() => handleSubmit(true)}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!formData.amount || !formData.description}
              >
                <Plus className="w-4 h-4 mr-1" />
                Update Settlement
              </Button>
              <Button 
                onClick={resetForm}
                variant="outline"
                className="px-4"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button 
                onClick={() => handleSubmit(false)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!formData.amount || !formData.description}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Settlement & Add More
              </Button>
              <Button 
                onClick={() => handleSubmit(true)}
                className="w-full bg-orange-700 hover:bg-orange-800 text-white"
                disabled={!formData.amount || !formData.description}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Settlement & Close
              </Button>
            </div>
          )}
        </div>

        {/* Records List - Only show when NOT editing a specific record */}
        {!editingRecord && (
          <>
            <Separator />

            {/* Records List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                  Today's Settlements
                </h3>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Total: ₹{totalSettlements.toFixed(2)}
                </Badge>
              </div>

              {filteredSettlements.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  No settlement records for {new Date(selectedDate).toLocaleDateString()}
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredSettlements.map((record) => (
                      <div 
                        key={record.id}
                        className={`border rounded-lg p-3 ${
                          isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-medium ${
                                isDarkMode ? 'text-white' : 'text-slate-800'
                              }`}>
                                {record.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-lg font-semibold text-orange-600">
                              <IndianRupee className="w-4 h-4" />
                              {record.amount.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
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
      </CardContent>
      {confirmDialog}
    </Card>
  );
};

export default Settlement;
