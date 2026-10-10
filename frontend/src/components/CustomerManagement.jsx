import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Users, Plus, Trash2, AlertTriangle, Pencil, Search } from 'lucide-react';
import localStorageService from '../services/localStorage';

const CustomerManagement = ({ customers, onAddCustomer, onDeleteCustomer, onUpdateCustomer, isDarkMode }) => {
  const [newCustomerName, setNewCustomerName] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, customer: null });
  const [editDialog, setEditDialog] = useState({ show: false, customer: null, balance: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [addError, setAddError] = useState('');

  const handleAddCustomer = () => {
    if (newCustomerName.trim()) {
      // Check for duplicate before calling parent handler
      const trimmedName = newCustomerName.trim();
      const isDuplicate = customers.some(c => 
        c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (isDuplicate) {
        setAddError('Duplicate customer name. Please use a unique name');
        return;
      }
      
      const balance = parseFloat(startingBalance) || 0;
      const result = onAddCustomer(trimmedName, balance);
      // If customer was added successfully (no error thrown), clear the form
      if (result !== null) {
        setNewCustomerName('');
        setStartingBalance('');
        setAddError('');
      }
    }
  };
  
  const handleNameChange = (e) => {
    setNewCustomerName(e.target.value);
    // Clear error when user starts typing
    if (addError) setAddError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCustomer();
    }
  };

  const handleDeleteClick = (customer) => {
    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      onDeleteCustomer(customer.id);
    } else {
      // Show confirmation dialog
      setDeleteConfirm({ show: true, customer });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.customer) {
      onDeleteCustomer(deleteConfirm.customer.id);
    }
    setDeleteConfirm({ show: false, customer: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, customer: null });
  };

  const handleEditClick = (customer) => {
    setEditDialog({ 
      show: true, 
      customer, 
      balance: (customer.startingBalance || 0).toString() 
    });
  };

  const confirmEdit = () => {
    if (editDialog.customer) {
      const newBalance = parseFloat(editDialog.balance) || 0;
      onUpdateCustomer(editDialog.customer.id, newBalance);
    }
    setEditDialog({ show: false, customer: null, balance: '' });
  };

  const cancelEdit = () => {
    setEditDialog({ show: false, customer: null, balance: '' });
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Add Customer Form */}
      <Card className={`${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Add New Customer
            </h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="customerName" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                Customer Name
              </Label>
              <Input
                id="customerName"
                type="text"
                value={newCustomerName}
                onChange={handleNameChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter customer name"
                className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''} ${
                  addError ? 'border-gray-500 focus:border-gray-500' : ''
                }`}
              />
              {addError && (
                <div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{addError}</span>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="startingBalance" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                Starting Balance (Optional)
              </Label>
              <Input
                id="startingBalance"
                type="number"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="0.00"
                className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>
            
            <Button
              onClick={handleAddCustomer}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white"
              disabled={!newCustomerName.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card className={`${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
      }`}>
        <CardContent className="p-4">
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Customer List ({filteredCustomers.length})
          </h3>
          
          {/* Search Input */}
          {customers.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-slate-400'
                }`} />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search customers by name..."
                  className={`pl-10 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`}
                />
              </div>
            </div>
          )}
          
          {customers.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No customers added yet</p>
              <p className="text-sm mt-1">Add your first customer above</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No customers found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium block ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {customer.name}
                        </span>
                        {(customer.name.toLowerCase().includes('mobile petrol pump') || 
                          customer.name.toLowerCase().includes('manager petrol pump') || 
                          customer.name.toLowerCase().includes('m.petrol pump')) && (
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customer.isMPP || false}
                              onChange={(e) => onUpdateCustomer(customer.id, customer.startingBalance, e.target.checked)}
                              className="w-4 h-4 cursor-pointer accent-gray-500"
                            />
                            <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              MPP
                            </span>
                          </label>
                        )}
                      </div>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Balance: ₹{(customer.startingBalance || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(customer)}
                      className={`hover:bg-gray-100 hover:text-gray-600 ${
                        isDarkMode ? 'text-gray-400 hover:bg-gray-900 hover:text-gray-400' : ''
                      }`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(customer)}
                      className={`hover:bg-gray-100 hover:text-gray-600 ${
                        isDarkMode ? 'text-gray-400 hover:bg-gray-900 hover:text-gray-400' : ''
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
                  isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    Delete Customer?
                  </h3>
                  <p className={`text-sm mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    Are you sure you want to delete <span className="font-semibold">"{deleteConfirm.customer?.name}"</span>?
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
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Yes, Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Balance Dialog */}
      {editDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full max-w-md ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <CardContent className="p-6">
              <div className="mb-4">
                <h3 className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  Edit Balance
                </h3>
                <p className={`text-sm mb-4 ${
                  isDarkMode ? 'text-gray-300' : 'text-slate-600'
                }`}>
                  Update starting balance for <span className="font-semibold">"{editDialog.customer?.name}"</span>
                </p>
                
                <div>
                  <Label htmlFor="editBalance" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                    Starting Balance
                  </Label>
                  <Input
                    id="editBalance"
                    type="number"
                    step="0.01"
                    value={editDialog.balance}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, balance: e.target.value }))}
                    placeholder="0.00"
                    className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  className={`${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmEdit}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
