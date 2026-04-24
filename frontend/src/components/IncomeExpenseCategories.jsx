import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Plus, Trash2, Edit, X, Check } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useConfirm } from '../hooks/use-confirm';
import localStorageService from '../services/localStorage';

const IncomeExpenseCategories = ({ 
  incomeCategories, 
  expenseCategories,
  onAddIncomeCategory, 
  onDeleteIncomeCategory, 
  onUpdateIncomeCategory,
  onAddExpenseCategory, 
  onDeleteExpenseCategory, 
  onUpdateExpenseCategory,
  isDarkMode 
}) => {
  const [activeType, setActiveType] = useState('income');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirm();

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    if (activeType === 'income') {
      const categories = incomeCategories || [];
      if (categories.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
        toast({
          title: "Duplicate Category",
          description: "This category already exists",
          variant: "destructive",
        });
        return;
      }
      onAddIncomeCategory(newCategoryName);
    } else {
      const categories = expenseCategories || [];
      if (categories.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
        toast({
          title: "Duplicate Category",
          description: "This category already exists",
          variant: "destructive",
        });
        return;
      }
      onAddExpenseCategory(newCategoryName);
    }

    setNewCategoryName('');
    toast({
      title: "Category Added",
      description: `${newCategoryName} has been added successfully`,
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
        description: "Category name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (activeType === 'income') {
      onUpdateIncomeCategory(id, editingName);
    } else {
      onUpdateExpenseCategory(id, editingName);
    }

    setEditingId(null);
    setEditingName('');
    toast({
      title: "Category Updated",
      description: "Category has been updated successfully",
    });
  };

  const handleDelete = async (id, name) => {
    // Check if Pro Mode is enabled
    if (localStorageService.isProModeEnabled()) {
      // Skip confirmation dialog, delete directly
      if (activeType === 'income') {
        onDeleteIncomeCategory(id);
      } else {
        onDeleteExpenseCategory(id);
      }
      toast({
        title: "Category Deleted",
        description: `${name} has been removed`,
      });
    } else {
      // Show in-app confirmation dialog (window.confirm is blocked in Android WebView)
      const ok = await confirm({
        title: 'Delete Category?',
        message: `Are you sure you want to delete "${name}"?`,
        isDarkMode,
      });
      if (ok) {
        if (activeType === 'income') {
          onDeleteIncomeCategory(id);
        } else {
          onDeleteExpenseCategory(id);
        }
        toast({
          title: "Category Deleted",
          description: `${name} has been removed`,
        });
      }
    }
  };

  const currentCategories = activeType === 'income' ? (incomeCategories || []) : (expenseCategories || []);

  return (
    <div className="space-y-4">
      {/* Type Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={activeType === 'income' ? 'default' : 'outline'}
          onClick={() => setActiveType('income')}
          className={activeType === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          Income Categories
        </Button>
        <Button
          variant={activeType === 'expense' ? 'default' : 'outline'}
          onClick={() => setActiveType('expense')}
          className={activeType === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          Expense Categories
        </Button>
      </div>

      {/* Add New Category */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Add New {activeType === 'income' ? 'Income' : 'Expense'} Category
        </Label>
        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Enter category name"
            className="flex-1"
            autoComplete="off"
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleAddCategory();
            }}
          />
          <Button onClick={handleAddCategory} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Categories List */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Manage {activeType === 'income' ? 'Income' : 'Expense'} Categories
        </Label>
        
        {currentCategories.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            <p className="text-sm">No categories added yet</p>
            <p className="text-xs mt-1">Add your first category above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentCategories.map((category) => (
              <div 
                key={category.id}
                className={`border rounded-lg p-3 ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                }`}
              >
                {editingId === category.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') saveEditing(category.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveEditing(category.id)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                    <Badge className={
                      activeType === 'income' 
                        ? 'bg-green-100 text-green-800 border-0' 
                        : 'bg-red-100 text-red-800 border-0'
                    }>
                      {category.name}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(category.id, category.name)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id, category.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {confirmDialog}
    </div>
  );
};

export default IncomeExpenseCategories;
