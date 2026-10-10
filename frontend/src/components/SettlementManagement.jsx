import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Plus, Trash2, Edit, X, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import localStorageService from '../services/localStorage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const SettlementManagement = ({ 
  settlementTypes, 
  onAddSettlementType, 
  onDeleteSettlementType, 
  onUpdateSettlementType,
  isDarkMode 
}) => {
  const [newTypeName, setNewTypeName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, id: null, name: '' });
  const { toast } = useToast();

  const handleAddType = () => {
    if (!newTypeName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a settlement type name",
        variant: "destructive",
      });
      return;
    }

    const types = settlementTypes || [];
    if (types.some(t => t.name.toLowerCase() === newTypeName.toLowerCase())) {
      toast({
        title: "Duplicate Type",
        description: "This settlement type already exists",
        variant: "destructive",
      });
      return;
    }

    onAddSettlementType(newTypeName);
    setNewTypeName('');
    toast({
      title: "Settlement Type Added",
      description: `${newTypeName} has been added successfully`,
    });
  };

  const startEditing = (id, name) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEditing = (id) => {
    if (!editingName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Settlement type name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    onUpdateSettlementType(id, editingName);
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (id, name) => {
    console.log('Delete clicked for:', id, name);
    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      console.log('Pro Mode enabled, deleting directly');
      onDeleteSettlementType(id);
    } else {
      // Show confirmation dialog
      setDeleteConfirmation({ show: true, id, name });
    }
  };

  const confirmDelete = () => {
    console.log('User confirmed deletion');
    console.log('Calling onDeleteSettlementType with id:', deleteConfirmation.id);
    onDeleteSettlementType(deleteConfirmation.id);
    setDeleteConfirmation({ show: false, id: null, name: '' });
  };

  const cancelDelete = () => {
    console.log('User cancelled deletion');
    setDeleteConfirmation({ show: false, id: null, name: '' });
  };

  const currentTypes = settlementTypes || [];

  return (
    <div className="space-y-4">
      {/* Add New Settlement Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Add New Settlement Type
        </Label>
        <div className="flex gap-2">
          <Input
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="Enter settlement type name"
            className="flex-1"
            autoComplete="off"
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleAddType();
            }}
          />
          <Button onClick={handleAddType} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Settlement Types List */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Manage Settlement Types
        </Label>
        
        {currentTypes.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            <p className="text-sm">No settlement types added yet</p>
            <p className="text-xs mt-1">Add your first settlement type above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentTypes.map((type) => (
              <div 
                key={type.id}
                className={`border rounded-lg p-3 ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                }`}
              >
                {editingId === type.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') saveEditing(type.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveEditing(type.id)}
                      className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <Badge className="bg-gray-100 text-gray-800 border-0">
                      {type.name}
                    </Badge>
                    {type.builtin ? (
                      <span className={`text-[10px] px-2 py-1 rounded ${
                        isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                        built-in
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(type.id, type.name)}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(type.id, type.name)}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`p-4 rounded-lg border mt-4 ${
        isDarkMode ? 'bg-gray-900/20 border-gray-800' : 'bg-gray-50 border-gray-200'
      }`}>
        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
          ℹ️ <strong>About Settlements:</strong>
        </p>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Settlements are amounts transferred from cash sales to bank. This reduces your cash in hand but doesn't affect total sales.
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.show} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent className={isDarkMode ? 'bg-gray-800 text-white' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-gray-600" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-gray-300' : ''}>
              Are you sure you want to delete "{deleteConfirmation.name}"?
              <br />
              <span className="text-gray-600 font-semibold">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cancelDelete}
              className={isDarkMode ? 'border-gray-600' : ''}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettlementManagement;
