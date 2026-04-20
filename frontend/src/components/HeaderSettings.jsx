import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Settings as SettingsIcon,
  Fuel,
  Plus,
  Minus,
  Trash2,
  Save,
  RotateCcw,
  Gauge,
  User,
  Users,
  Phone,
  MapPin,
  Download,
  Upload,
  Mail,
  Globe,
  X,
  RefreshCw,
  Receipt,
  ArrowRightLeft
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAutoBackupWeekly } from '../hooks/use-auto-backup-weekly';
import localStorageService, { exportAllData, importAllData, mergeAllData } from '../services/localStorage';
import CustomerManagement from './CustomerManagement';
import IncomeExpenseCategories from './IncomeExpenseCategories';
import SettlementManagement from './SettlementManagement';

const HeaderSettings = ({ isDarkMode, fuelSettings, setFuelSettings, customers, onAddCustomer, onDeleteCustomer, onUpdateCustomer }) => {
  const [newFuelType, setNewFuelType] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false); // For Sheet open state
  const [proMode, setProMode] = useState(() => {
    return localStorage.getItem('mpump_pro_mode') === 'true';
  });
  const [showProPasswordDialog, setShowProPasswordDialog] = useState(false);
  const [proPassword, setProPassword] = useState('');
  const { toast } = useToast();
  
  // Auto-backup weekly hook
  const { toggleAutoBackup, getBackupStatus } = useAutoBackupWeekly(toast);

  // Income/Expense Categories state
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);

  // Settlement Types state
  const [settlementTypes, setSettlementTypes] = useState([]);

  // Load categories and settlement types on mount
  React.useEffect(() => {
    setIncomeCategories(localStorageService.getIncomeCategories());
    setExpenseCategories(localStorageService.getExpenseCategories());
    setSettlementTypes(localStorageService.getSettlementTypes());
  }, []);

  // Clear All Data handler
  const handleClearAllData = async () => {
    try {
      const confirmClear = window.confirm(
        '⚠️ WARNING: This will DELETE ALL DATA!\n\n' +
        '• All sales, customers, payments\n' +
        '• All income, expenses, settlements\n' +
        '• All fuel settings and categories\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Type "DELETE ALL" to confirm:'
      );
      
      if (!confirmClear) return;
      
      const finalConfirm = window.prompt('Type "DELETE ALL" to confirm:');
      
      if (finalConfirm !== 'DELETE ALL') {
        toast({
          title: "Cancelled",
          description: "Data deletion cancelled.",
        });
        return;
      }

      // Clear localStorage
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('mpp:') || 
        key.includes('mpump') || 
        key.includes('stock') ||
        key.includes('Stock')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('✅ localStorage cleared:', keysToRemove.length, 'keys');

      toast({
        title: "All Data Cleared!",
        description: `Deleted ${keysToRemove.length} localStorage keys.`,
      });

      // Reload page to reset state
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('❌ Clear data error:', error);
      toast({
        title: "Error Clearing Data",
        description: error.message || "Failed to clear all data.",
        variant: "destructive",
      });
    }
  };

  // Category management functions
  const handleAddIncomeCategory = (name) => {
    const newCategory = localStorageService.addIncomeCategory(name);
    setIncomeCategories(localStorageService.getIncomeCategories());
    return newCategory;
  };

  const handleDeleteIncomeCategory = (id) => {
    localStorageService.deleteIncomeCategory(id);
    setIncomeCategories(localStorageService.getIncomeCategories());
  };

  const handleUpdateIncomeCategory = (id, name) => {
    localStorageService.updateIncomeCategory(id, name);
    setIncomeCategories(localStorageService.getIncomeCategories());
  };

  const handleAddExpenseCategory = (name) => {
    const newCategory = localStorageService.addExpenseCategory(name);
    setExpenseCategories(localStorageService.getExpenseCategories());
    return newCategory;
  };

  const handleDeleteExpenseCategory = (id) => {
    localStorageService.deleteExpenseCategory(id);
    setExpenseCategories(localStorageService.getExpenseCategories());
  };

  const handleUpdateExpenseCategory = (id, name) => {
    localStorageService.updateExpenseCategory(id, name);
    setExpenseCategories(localStorageService.getExpenseCategories());
  };

  // Settlement type management functions
  const handleAddSettlementType = (name) => {
    const newType = localStorageService.addSettlementType(name);
    setSettlementTypes(localStorageService.getSettlementTypes());
    return newType;
  };

  const handleDeleteSettlementType = (id) => {
    console.log('handleDeleteSettlementType called with id:', id);
    try {
      console.log('Calling localStorageService.deleteSettlementType');
      localStorageService.deleteSettlementType(id);
      console.log('Delete successful, updating state');
      const updatedTypes = localStorageService.getSettlementTypes();
      console.log('Updated settlement types:', updatedTypes);
      setSettlementTypes(updatedTypes);
      toast({
        title: "Success",
        description: "Settlement type deleted successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting settlement type:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete settlement type.',
        variant: "destructive"
      });
    }
  };

  const handleProModeToggle = (checked) => {
    if (checked) {
      // Enabling Pro mode - show password dialog
      setShowProPasswordDialog(true);
    } else {
      // Disabling Pro mode - no password needed
      setProMode(false);
      localStorage.setItem('mpump_pro_mode', 'false');
      toast({
        title: "Pro Mode Disabled",
        description: "Confirmation dialogs will be shown.",
        variant: "default"
      });
    }
  };

  const handleProPasswordSubmit = () => {
    if (proPassword === '123456') {
      setProMode(true);
      localStorage.setItem('mpump_pro_mode', 'true');
      setShowProPasswordDialog(false);
      setProPassword('');
      toast({
        title: "Pro Mode Enabled",
        description: "Confirmation dialogs will be hidden.",
        variant: "default"
      });
    } else {
      toast({
        title: "Incorrect Password",
        description: "Please try again.",
        variant: "destructive"
      });
      setProPassword('');
    }
  };

  const handleUpdateSettlementType = (id, name) => {
    try {
      localStorageService.updateSettlementType(id, name);
      setSettlementTypes(localStorageService.getSettlementTypes());
      toast({
        title: "Success",
        description: "Settlement type updated successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating settlement type:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update settlement type.',
        variant: "destructive"
      });
    }
  };

  // Employee management removed

  // Owner details state removed

  // Contact information state (static display)
  const [contactInfo, setContactInfo] = useState({
    pumpName: 'Vishnu Parvati Petroleum',
    dealerName: 'Rohan.R.Khandve',
    address: 'Station Road, Near City Mall, Mumbai - 400001',
    email: 'vishnuparvatipetroleum@gmail.com'
  });

  // Load contact info from localStorage on mount
  React.useEffect(() => {
    const savedContactInfo = localStorage.getItem('mpump_contact_info');
    if (savedContactInfo) {
      setContactInfo(JSON.parse(savedContactInfo));
    }
  }, []);

  // Save contact info to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('mpump_contact_info', JSON.stringify(contactInfo));
  }, [contactInfo]);

  // Cloud sync removed - local backup only

  // Google Drive functions removed

  // Online URL state
  const [onlineUrl, setOnlineUrl] = useState('');

  const [savedOnlineUrl, setSavedOnlineUrl] = useState('');

  // Load online URL from localStorage
  React.useEffect(() => {
    const savedUrl = localStorage.getItem('mpump_online_url');
    if (savedUrl) {
      setSavedOnlineUrl(savedUrl);
      setOnlineUrl(savedUrl);
    }
  }, []);

  // Weekly auto-backup state
  const [weeklyBackupEnabled, setWeeklyBackupEnabled] = useState(false);
  const [weeklyLastBackup, setWeeklyLastBackup] = useState(null);
  const [weeklyNextScheduled, setWeeklyNextScheduled] = useState(null);

  // Load weekly auto-backup settings
  React.useEffect(() => {
    const status = getBackupStatus();
    setWeeklyBackupEnabled(status.enabled);
    setWeeklyLastBackup(status.lastBackupTime);
    setWeeklyNextScheduled(status.nextScheduledTime);
  }, [getBackupStatus]);

  // Auto-backup folder state
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFolderName, setBackupFolderName] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState(null);

  // Load auto-backup settings from localStorage
  React.useEffect(() => {
    const settings = localStorage.getItem('mpump_auto_backup_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setAutoBackupEnabled(parsed.enabled || false);
      setBackupFolderName(parsed.folderName || '');
      setLastBackupTime(parsed.lastBackupTime || null);
    }
  }, []);

  // Android import callback removed - using standard file input for all platforms

  const updateNozzleCount = (fuelType, delta) => {
    if (!fuelSettings || !fuelSettings[fuelType]) return;
    
    const newSettings = {
      ...fuelSettings,
      [fuelType]: {
        ...fuelSettings[fuelType],
        nozzleCount: Math.max(1, Math.min(10, fuelSettings[fuelType].nozzleCount + delta))
      }
    };
    
    setFuelSettings(newSettings);
    localStorageService.setFuelSettings(newSettings);
  };

  const addFuelType = () => {
    if (!newFuelType.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a fuel type name",
        variant: "destructive",
      });
      return;
    }

    if (fuelSettings && fuelSettings[newFuelType]) {
      toast({
        title: "Duplicate Fuel Type",
        description: "This fuel type already exists",
        variant: "destructive",
      });
      return;
    }

    // Use a default price of 100 when adding new fuel type
    // Price will be set in the Price Configuration tab
    const newSettings = {
      ...(fuelSettings || {}),
      [newFuelType]: {
        price: 100.00, // Default price, will be configured in Price tab
        nozzleCount: 2
      }
    };
    
    setFuelSettings(newSettings);
    localStorageService.setFuelSettings(newSettings);
    setNewFuelType('');
    
    toast({
      title: "Fuel Type Added",
      description: `${newFuelType} has been added successfully. Set the rate in the Rate tab.`,
    });
  };

  const removeFuelType = (fuelType) => {
    if (!fuelSettings) return;
    
    const { [fuelType]: removed, ...newSettings } = fuelSettings;
    
    setFuelSettings(newSettings);
    localStorageService.setFuelSettings(newSettings);
    
    toast({
      title: "Fuel Type Removed",
      description: `${fuelType} has been removed successfully`,
    });
  };

  const resetToDefaults = () => {
    const defaultSettings = {
      'Petrol': { price: 102.50, nozzleCount: 3 },
      'Diesel': { price: 89.75, nozzleCount: 2 },
      'CNG': { price: 75.20, nozzleCount: 2 },
      'Premium': { price: 108.90, nozzleCount: 1 }
    };
    setFuelSettings(defaultSettings);
    
    toast({
      title: "Settings Reset",
      description: "Fuel settings have been reset to defaults",
    });
  };

  // Employee management functions removed

  // Owner details functions removed

  // Employee form handlers removed

  const handleNewFuelTypeChange = useCallback((e) => {
    setNewFuelType(e.target.value);
  }, []);

  // Setup auto-backup folder
  const setupAutoBackupFolder = async () => {
    try {
      // Check if File System Access API is supported
      if (!('showDirectoryPicker' in window)) {
        toast({
          title: "Not Supported",
          description: "Auto-backup requires Chrome/Edge browser version 86+",
          variant: "destructive",
        });
        return;
      }

      // Ask user to select a folder
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Test write permission
      await dirHandle.requestPermission({ mode: 'readwrite' });

      // Save folder handle (note: can't directly serialize handle)
      // We'll store folder name and request permission each time
      const folderName = dirHandle.name;
      
      // Store settings
      const settings = {
        enabled: true,
        folderName: folderName,
        lastBackupTime: new Date().toISOString()
      };
      
      localStorage.setItem('mpump_auto_backup_settings', JSON.stringify(settings));
      localStorage.setItem('mpump_backup_folder_handle', 'granted'); // Flag to indicate permission was granted
      
      // Store the handle in a way we can retrieve it (IndexedDB)
      const db = await openBackupDB();
      await db.put('folderHandles', dirHandle, 'autoBackupFolder');
      
      setAutoBackupEnabled(true);
      setBackupFolderName(folderName);
      
      // Perform initial backup
      await performAutoBackup(dirHandle);
      
      toast({
        title: "Auto-Backup Enabled",
        description: `Backups will be saved to: ${folderName}`,
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        toast({
          title: "Cancelled",
          description: "Folder selection was cancelled",
        });
      } else {
        console.error('Auto-backup setup error:', error);
        toast({
          title: "Setup Failed",
          description: "Could not setup auto-backup folder. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Disable auto-backup
  const disableAutoBackup = () => {
    localStorage.removeItem('mpump_auto_backup_settings');
    localStorage.removeItem('mpump_backup_folder_handle');
    setAutoBackupEnabled(false);
    setBackupFolderName('');
    setLastBackupTime(null);
    
    toast({
      title: "Auto-Backup Disabled",
      description: "Automatic backups have been turned off",
    });
  };

  // Perform auto backup
  const performAutoBackup = async (dirHandle) => {
    try {
      const backupData = localStorageService.exportAllData();
      const dataStr = JSON.stringify(backupData, null, 2);
      const fileName = `mpump-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // Create/overwrite file in the selected folder
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(dataStr);
      await writable.close();
      
      const now = new Date().toISOString();
      setLastBackupTime(now);
      
      // Update settings
      const settings = JSON.parse(localStorage.getItem('mpump_auto_backup_settings') || '{}');
      settings.lastBackupTime = now;
      localStorage.setItem('mpump_auto_backup_settings', JSON.stringify(settings));
      
      return true;
    } catch (error) {
      console.error('Auto-backup failed:', error);
      return false;
    }
  };

  // Manual backup to selected folder
  const manualBackupToFolder = async () => {
    try {
      // Get stored folder handle from IndexedDB
      const db = await openBackupDB();
      const dirHandle = await db.get('folderHandles', 'autoBackupFolder');
      
      if (!dirHandle) {
        toast({
          title: "No Folder Selected",
          description: "Please setup auto-backup folder first",
          variant: "destructive",
        });
        return;
      }

      // Request permission again (in case it was revoked)
      const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        toast({
          title: "Permission Denied",
          description: "Please grant folder access permission",
          variant: "destructive",
        });
        return;
      }

      const success = await performAutoBackup(dirHandle);
      
      if (success) {
        toast({
          title: "Backup Successful",
          description: `Saved to: ${backupFolderName}`,
        });
      } else {
        toast({
          title: "Backup Failed",
          description: "Could not save backup file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Manual backup error:', error);
      toast({
        title: "Backup Failed",
        description: "Could not access backup folder. Please setup again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to open IndexedDB for storing folder handles
  const openBackupDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MPumpBackupDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('folderHandles')) {
          db.createObjectStore('folderHandles');
        }
      };
    });
  };

  // saveOwnerDetails function removed

  // Contact information functions
  const updateContactInfo = (field, value) => {
    setContactInfo(prev => ({ ...prev, [field]: value }));
  };

  const saveContactInfo = () => {
    toast({
      title: "Contact Information Saved",
      description: "Contact information has been updated successfully",
    });
  };

  // Owner Details component removed

  // Fuel Types component removed - now inline

  // Employees component removed

  // Contact component removed - now inline

  // No separate views needed - everything in dropdown

  // Settings dialog
  return (
    <>
      <Button
        variant="outline"
        className="flex items-center gap-2"
        onClick={() => setSettingsOpen(true)}
      >
        <SettingsIcon className="w-4 h-4" />
        Settings
      </Button>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent 
          className={`w-screen h-[calc(100vh-60px)] max-w-none p-0 border-0 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} [&>button]:hidden`}
          style={{ 
            top: '60px',
            transform: 'translate(-50%, 0)',
            margin: 0
          }}
        >
          <div className="flex flex-col h-full">
            {/* Header with X button */}
            <div className={`flex items-center justify-between px-6 ${
              isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gradient-to-r from-gray-600 to-gray-700 border-b border-gray-300'
            }`}
            style={{ height: '48px' }}
            >
              <div className="flex items-center gap-2">
                <SettingsIcon className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-white'}`} />
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-white'}`}>
                  Settings
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-gray-600'}`}
                onClick={() => setSettingsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="customer" className="w-full h-full flex flex-col">
                <TabsList 
                  className={`grid w-full grid-cols-5 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}
                  style={{ height: '48px', gap: '4px', padding: '4px' }}
                >
                  <TabsTrigger value="customer" className="flex items-center gap-1 text-xs sm:text-sm px-2">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Customer</span>
                    <span className="sm:hidden">Cust</span>
                  </TabsTrigger>
                  <TabsTrigger value="settlement" className="flex items-center gap-1 text-xs sm:text-sm px-2">
                    <ArrowRightLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Settlement</span>
                    <span className="sm:hidden">Sett</span>
                  </TabsTrigger>
                  <TabsTrigger value="fuel" className="flex items-center gap-1 text-xs sm:text-sm px-2">
                    <Fuel className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Fuel Types</span>
                    <span className="sm:hidden">Fuel</span>
                  </TabsTrigger>
                  <TabsTrigger value="backup" className="flex items-center gap-1 text-xs sm:text-sm px-2">
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Backup</span>
                    <span className="sm:hidden">Bkup</span>
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-1 text-xs sm:text-sm px-2">
                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Contact</span>
                    <span className="sm:hidden">Info</span>
                  </TabsTrigger>
                </TabsList>
              
              <TabsContent value="customer" className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 60px - 48px - 48px)' }}>
                <CustomerManagement
                  customers={customers}
                  onAddCustomer={onAddCustomer}
                  onDeleteCustomer={onDeleteCustomer}
                  onUpdateCustomer={onUpdateCustomer}
                  isDarkMode={isDarkMode}
                />
              </TabsContent>
              
              <TabsContent value="settlement" className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 60px - 48px - 48px)' }}>
                <SettlementManagement
                  settlementTypes={settlementTypes}
                  onAddSettlementType={handleAddSettlementType}
                  onDeleteSettlementType={handleDeleteSettlementType}
                  onUpdateSettlementType={handleUpdateSettlementType}
                  isDarkMode={isDarkMode}
                />
              </TabsContent>
              
              <TabsContent value="contact" className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)] px-4 py-4">
                <div className="space-y-4 pb-20">
                  
                  {/* Contact Information Display */}
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full">
                      <Phone className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>
                      Contact Information
                    </h3>
                  </div>
                  
                  <div className={`border rounded-lg p-4 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <div className={`text-xs font-medium ${
                            isDarkMode ? 'text-gray-400' : 'text-slate-600'
                          }`}>
                            Owner
                          </div>
                          <div className={`font-medium ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>
                            {contactInfo.dealerName}
                          </div>
                          <div className={`text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-slate-600'
                          }`}>
                            {contactInfo.pumpName}
                          </div>
                        </div>
                      </div>
                      
                      <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                      
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <div className={`text-xs font-medium ${
                            isDarkMode ? 'text-gray-400' : 'text-slate-600'
                          }`}>
                            Email
                          </div>
                          <div className={`font-medium break-all ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>
                            {contactInfo.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Online Access Section (moved from Online tab) */}
                  <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                  
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full">
                      <Globe className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>
                      Online Access
                    </h3>
                    <p className={`text-sm mt-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Save your webpage URL to access the app online
                    </p>
                  </div>
                  
                  {/* URL Input Section */}
                  <div className={`border rounded-lg p-4 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Webpage URL</Label>
                      <Input
                        type="url"
                        value={onlineUrl}
                        onChange={(e) => setOnlineUrl(e.target.value)}
                        placeholder="https://example.com/your-app"
                        className={isDarkMode ? 'bg-gray-600 border-gray-500' : ''}
                      />
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          if (!onlineUrl.trim()) {
                            toast({
                              title: "Invalid URL",
                              description: "Please enter a valid URL",
                              variant: "destructive"
                            });
                            return;
                          }

                          localStorage.setItem('mpump_online_url', onlineUrl);
                          setSavedOnlineUrl(onlineUrl);

                          toast({
                            title: "URL Saved",
                            description: "Your online URL has been saved successfully"
                          });
                        }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save URL
                      </Button>
                      
                      {/* Default Vercel URL */}
                      <div className={`mt-3 p-3 rounded-lg border ${
                        isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                          Default URL:
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          https://mobilepetrolpump.vercel.app/
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Saved URL Display */}
                  {savedOnlineUrl && (
                    <>
                      <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                      
                      <div className={`border rounded-lg p-4 ${
                        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                      }`}>
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Saved URL</Label>
                          <div 
                            className={`p-3 rounded border cursor-pointer transition-colors ${
                              isDarkMode 
                                ? 'bg-gray-600 border-gray-500 hover:bg-gray-500' 
                                : 'bg-white border-slate-300 hover:bg-slate-50'
                            }`}
                            onClick={() => {
                              navigator.clipboard.writeText(savedOnlineUrl).then(() => {
                                toast({
                                  title: "URL Copied",
                                  description: "URL copied to clipboard successfully"
                                });
                              }).catch(() => {
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea');
                                textArea.value = savedOnlineUrl;
                                textArea.style.position = 'fixed';
                                textArea.style.left = '-999999px';
                                document.body.appendChild(textArea);
                                textArea.select();
                                
                                try {
                                  document.execCommand('copy');
                                  toast({
                                    title: "URL Copied",
                                    description: "URL copied to clipboard successfully"
                                  });
                                } catch (err) {
                                  toast({
                                    title: "Copy Failed",
                                    description: "Could not copy URL. Please enable clipboard permissions.",
                                    variant: "destructive"
                                  });
                                }
                                
                                document.body.removeChild(textArea);
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm break-all ${
                                isDarkMode ? 'text-blue-300' : 'text-blue-600'
                              }`}>
                                {savedOnlineUrl}
                              </span>
                              <span className={`text-xs ml-2 whitespace-nowrap ${
                                isDarkMode ? 'text-gray-400' : 'text-slate-500'
                              }`}>
                                Click to copy
                              </span>
                            </div>
                          </div>
                          <p className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-slate-500'
                          }`}>
                            💡 Click on the URL above to copy it to clipboard
                          </p>
                          
                          <Button
                            variant="outline"
                            className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white border-red-600"
                            onClick={() => {
                              // Check if Pro Mode is enabled
                              if (localStorageService.isProModeEnabled()) {
                                // Skip confirmation dialog, delete directly
                                localStorage.removeItem('mpump_online_url');
                                setSavedOnlineUrl('');
                                setOnlineUrl('');
                                
                                toast({
                                  title: "URL Deleted",
                                  description: "Saved URL has been removed successfully"
                                });
                              } else {
                                // Show confirmation dialog
                                if (window.confirm('Are you sure you want to delete the saved URL?')) {
                                  localStorage.removeItem('mpump_online_url');
                                  setSavedOnlineUrl('');
                                  setOnlineUrl('');
                                  
                                  toast({
                                    title: "URL Deleted",
                                    description: "Saved URL has been removed successfully"
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Saved URL
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Delete Data Section - Pro Mode Only */}
                  {proMode && (
                    <>
                      <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                      
                      <div className={`border rounded-lg p-4 ${
                        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                      }`}>
                        <div className="space-y-3">
                          <h4 className={`font-medium ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>
                            Delete Data
                          </h4>
                          
                          {/* Date Range Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">From Date</Label>
                              <Input
                                type="date"
                                id="delete-from-date"
                                className={`text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500' : ''}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">To Date</Label>
                              <Input
                                type="date"
                                id="delete-to-date"
                                className={`text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500' : ''}`}
                              />
                            </div>
                          </div>
                          
                          {/* Permanent Delete Button */}
                          <Button 
                            variant="outline" 
                            className="w-full bg-red-600 hover:bg-red-700 text-white border-red-600"
                            onClick={() => {
                              const fromDateInput = document.getElementById('delete-from-date');
                              const toDateInput = document.getElementById('delete-to-date');
                              const fromDate = fromDateInput.value;
                              const toDate = toDateInput.value;
                              
                              // Validate dates
                              if (!fromDate || !toDate) {
                                toast({
                                  title: "Invalid Date Range",
                                  description: "Please select both from and to dates",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              if (fromDate > toDate) {
                                toast({
                                  title: "Invalid Date Range",
                                  description: "From date cannot be after To date",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              // Confirm deletion - check Pro Mode
                              const confirmDelete = localStorageService.isProModeEnabled() || 
                                window.confirm(`⚠️ WARNING: This will PERMANENTLY delete all data from ${fromDate} to ${toDate}.\n\nThis includes:\n- Stock Data\n- Reading Sales Data\n- Credit Sales Data\n- Income/Expense Data\n- Receipt Data\n\nThis action CANNOT be undone!\n\nAre you absolutely sure you want to continue?`);
                              
                              if (confirmDelete) {
                                try {
                                  // Get all data
                                  const salesData = localStorageService.getSalesData();
                                  const creditData = localStorageService.getCreditData();
                                  const incomeData = localStorageService.getIncomeData();
                                  const expenseData = localStorageService.getExpenseData();
                                  const payments = localStorageService.getPayments();
                                  
                                  // Filter out data within the date range (keep data outside range)
                                  const filteredSales = salesData.filter(item => item.date < fromDate || item.date > toDate);
                                  const filteredCredits = creditData.filter(item => item.date < fromDate || item.date > toDate);
                                  const filteredIncome = incomeData.filter(item => item.date < fromDate || item.date > toDate);
                                  const filteredExpenses = expenseData.filter(item => item.date < fromDate || item.date > toDate);
                                  const filteredPayments = payments.filter(item => item.date < fromDate || item.date > toDate);
                                  
                                  // Calculate deleted counts
                                  const deletedSales = salesData.length - filteredSales.length;
                                  const deletedCredits = creditData.length - filteredCredits.length;
                                  const deletedIncome = incomeData.length - filteredIncome.length;
                                  const deletedExpenses = expenseData.length - filteredExpenses.length;
                                  const deletedPayments = payments.length - filteredPayments.length;
                                  
                                  // Delete stock data for date range
                                  let deletedStockRecords = 0;
                                  const stockKeys = Object.keys(localStorage).filter(key => key.includes('StockData'));
                                  stockKeys.forEach(key => {
                                    // Extract the base key (without namespace prefix)
                                    const baseKey = key.includes(':') ? key.split(':').pop() : key;
                                    const stockData = localStorageService.getItem(baseKey) || {};
                                    
                                    // Filter stock data by date
                                    Object.keys(stockData).forEach(date => {
                                      if (date >= fromDate && date <= toDate) {
                                        deletedStockRecords++;
                                        delete stockData[date];
                                      }
                                    });
                                    
                                    // Update stock data in localStorage
                                    localStorageService.setItem(baseKey, stockData);
                                  });
                                  
                                  const totalDeleted = deletedSales + deletedCredits + deletedIncome + deletedExpenses + deletedPayments + deletedStockRecords;
                                  
                                  // Update localStorage
                                  localStorageService.setSalesData(filteredSales);
                                  localStorageService.setCreditData(filteredCredits);
                                  localStorageService.setIncomeData(filteredIncome);
                                  localStorageService.setExpenseData(filteredExpenses);
                                  localStorageService.setPayments(filteredPayments);
                                  
                                  // Show success message
                                  toast({
                                    title: "Data Deleted Successfully",
                                    description: `Deleted ${totalDeleted} records (Stock: ${deletedStockRecords}, Sales: ${deletedSales}, Credits: ${deletedCredits}, Income: ${deletedIncome}, Expenses: ${deletedExpenses}, Receipts: ${deletedPayments}). Refreshing...`,
                                  });
                                  
                                  // Clear date inputs
                                  fromDateInput.value = '';
                                  toDateInput.value = '';
                                  
                                  // Refresh page after 3 seconds
                                  setTimeout(() => {
                                    window.location.reload();
                                  }, 3000);
                                } catch (error) {
                                  console.error('Delete error:', error);
                                  toast({
                                    title: "Delete Failed",
                                    description: "Failed to delete data. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          >
                            🗑️ Permanent Delete
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Pro Mode Section */}
                  <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                  
                  <div className={`border rounded-lg p-4 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="space-y-3">
                      <h4 className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Pro Mode
                      </h4>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        Enable Pro mode to skip "Are you sure?" confirmation dialogs
                      </p>
                      
                      <div className="flex items-center space-x-3 pt-2">
                        <Checkbox
                          id="pro-mode"
                          checked={proMode}
                          onCheckedChange={handleProModeToggle}
                          className={isDarkMode ? 'border-gray-500' : ''}
                        />
                        <Label
                          htmlFor="pro-mode"
                          className={`text-sm font-medium cursor-pointer ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}
                        >
                          {proMode ? '✅ Pro Mode Active' : 'Enable Pro Mode'}
                        </Label>
                      </div>
                      
                      {proMode && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
                        }`}>
                          <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                            ⚡ Pro Mode is active. Delete confirmations are disabled.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clear All Data Section - Pro Mode Only */}
                  {proMode && (
                    <>
                      <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                      
                      <div className={`border-2 rounded-lg p-4 ${
                        isDarkMode ? 'border-red-600 bg-red-900/20' : 'border-red-500 bg-red-50'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-600" />
                            <h4 className={`font-bold ${
                              isDarkMode ? 'text-red-400' : 'text-red-700'
                            }`}>
                              ⚠️ Danger Zone
                            </h4>
                          </div>
                          
                          <p className={`text-sm ${
                            isDarkMode ? 'text-red-300' : 'text-red-700'
                          }`}>
                            <strong>Pro Mode Only:</strong> Permanently delete all data from this account.
                          </p>
                          
                          <div className={`text-xs space-y-1 ${
                            isDarkMode ? 'text-red-200' : 'text-red-600'
                          }`}>
                            <p>This will delete:</p>
                            <ul className="list-disc list-inside pl-2">
                              <li>All sales, credit sales, payments</li>
                              <li>All customers and settlements</li>
                              <li>All income and expenses</li>
                              <li>All fuel settings and categories</li>
                              <li>Data from localStorage</li>
                            </ul>
                          </div>

                          <div className={`p-3 rounded ${
                            isDarkMode ? 'bg-red-800/30' : 'bg-red-100'
                          }`}>
                            <p className={`text-xs font-bold ${
                              isDarkMode ? 'text-red-300' : 'text-red-700'
                            }`}>
                              ⚠️ This action CANNOT be undone!
                            </p>
                          </div>
                          
                          <Button 
                            variant="destructive"
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={handleClearAllData}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All Data
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="fuel" className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 60px - 48px - 48px)' }}>
                {/* Add New Fuel Type */}
                <div className="space-y-3 mb-4">
                  <Label className="text-sm font-medium">Add New Fuel Type</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newFuelType}
                      onChange={handleNewFuelTypeChange}
                      placeholder="Enter fuel type name"
                      className="flex-1"
                      autoComplete="off"
                      inputMode="text"
                    />
                    <Button onClick={addFuelType} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Existing Fuel Types */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Configure Fuel Types</Label>
                  {fuelSettings && Object.entries(fuelSettings).map(([fuelType, config]) => (
                    <div key={fuelType} className={`border rounded-lg p-3 ${
                      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-blue-100 text-blue-800 border-0">
                          {fuelType}
                        </Badge>
                        {fuelType.toUpperCase() !== 'MPP' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFuelType(fuelType)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Nozzles:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateNozzleCount(fuelType, -1)}
                              disabled={config.nozzleCount <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="font-medium w-8 text-center">
                              {config.nozzleCount}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateNozzleCount(fuelType, 1)}
                              disabled={config.nozzleCount >= 10}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Reset Button */}
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  className="w-full flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </Button>
              </TabsContent>
              
              <TabsContent value="backup" className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 60px - 48px - 48px)' }}>
                <div className="space-y-4">
                  {/* Manual Backup Section */}
                  <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                  
                  <div className={`border rounded-lg p-4 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="space-y-3">
                      <h4 className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Manual Backup
                      </h4>
                      
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        Export data manually or copy to clipboard
                      </p>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={async () => {
                            try {
                              const backupData = localStorageService.exportAllData();
                              const dataStr = JSON.stringify(backupData, null, 2);
                              const fileName = `mpump-backup-${new Date().toISOString().split('T')[0]}.json`;
                              
                              // Simple download method - works everywhere
                              const blob = new Blob([dataStr], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = fileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                              
                              toast({
                                title: "✓ Backup Exported",
                                description: `Check your Downloads folder for ${fileName}`,
                              });
                            } catch (error) {
                              console.error('Export error:', error);
                              toast({
                                title: "Export Failed",
                                description: "Could not download backup file. Try 'Copy Backup Data' button instead.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          💾 Export Data Backup
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            try {
                              const backupData = localStorageService.exportAllData();
                              const dataStr = JSON.stringify(backupData, null, 2);
                              
                              navigator.clipboard.writeText(dataStr).then(() => {
                                toast({
                                  title: "Backup Data Copied",
                                  description: "Backup data copied to clipboard. Paste it into a text file and save as .json",
                                });
                              }).catch(() => {
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea');
                                textArea.value = dataStr;
                                textArea.style.position = 'fixed';
                                textArea.style.left = '-999999px';
                                document.body.appendChild(textArea);
                                textArea.select();
                                
                                try {
                                  document.execCommand('copy');
                                  toast({
                                    title: "Backup Data Copied",
                                    description: "Backup data copied to clipboard. Paste it into a text file and save as .json",
                                  });
                                } catch (err) {
                                  toast({
                                    title: "Copy Failed",
                                    description: "Could not copy to clipboard. Please enable clipboard permissions.",
                                    variant: "destructive",
                                  });
                                }
                                
                                document.body.removeChild(textArea);
                              });
                              
                            } catch (error) {
                              console.error('Copy error:', error);
                              toast({
                                title: "Copy Failed",
                                description: "Could not copy backup data",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          📋 Copy Backup Data
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            const storageInfo = localStorageService.getStorageInfo();
                            
                            toast({
                              title: "Storage Information",
                              description: `Using ${Math.round(storageInfo.usagePercent)}% of browser storage (${storageInfo.itemCount} items)`,
                            });
                          }}
                        >
                          📊 Check Storage Usage
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Merge Backup Data Section */}
                  <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                  
                  <div className={`border rounded-lg p-4 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="space-y-3">
                      <h4 className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Merge Backup Data
                      </h4>
                      
                      <Button 
                        variant="outline" 
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                        onClick={() => {
                          // Create file input and append to DOM (required for mobile browsers)
                          const fileInput = document.createElement('input');
                          fileInput.type = 'file';
                          fileInput.accept = '.json,application/json,.txt,text/plain';
                          fileInput.style.display = 'none';
                          document.body.appendChild(fileInput);
                          
                          fileInput.onchange = (e) => {
                            const file = e.target.files[0];
                            // Remove input from DOM
                            if (fileInput.parentNode) document.body.removeChild(fileInput);
                            if (!file) return;
                            
                            // Check file type - accept json and txt
                            if (!file.name.endsWith('.json') && !file.name.endsWith('.txt')) {
                              toast({
                                title: "Invalid File",
                                description: "Please select a valid JSON backup file",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            // Read file
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const importedData = JSON.parse(event.target.result);
                                console.log('Merge: Parsed data keys:', Object.keys(importedData));
                                console.log('Merge: salesData count:', importedData.salesData?.length || 0);
                                console.log('Merge: customers count:', importedData.customers?.length || 0);
                                console.log('Merge: settlements count:', importedData.settlements?.length || 0);
                                
                                // Validate data structure - accept if has any valid data
                                const hasData = importedData.salesData || importedData.creditData || 
                                    importedData.incomeData || importedData.expenseData ||
                                    importedData.customers || importedData.payments ||
                                    importedData.settlements || importedData.fuelSettings;
                                
                                console.log('Merge: hasData =', !!hasData);
                                
                                if (!hasData) {
                                  toast({
                                    title: "Invalid Backup File",
                                    description: "The file doesn't contain valid backup data",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                // Proceed with merge directly
                                console.log('Merge: Calling mergeAllData...');
                                const success = localStorageService.mergeAllData(importedData);
                                console.log('Merge: Result =', success);
                                  
                                if (success) {
                                    toast({
                                      title: "Data Merged Successfully",
                                      description: "Backup data has been merged with existing data. Refreshing...",
                                    });
                                    
                                    setTimeout(() => {
                                      window.location.reload();
                                    }, 2000);
                                } else {
                                    toast({
                                      title: "Merge Failed",
                                      description: "Failed to merge data. Please try again.",
                                      variant: "destructive",
                                    });
                                }
                              } catch (error) {
                                toast({
                                  title: "Merge Error",
                                  description: "Failed to read backup file. Please ensure it's a valid JSON file.",
                                  variant: "destructive",
                                });
                                console.error('Merge error:', error);
                              }
                            };
                            
                            reader.readAsText(file);
                          };
                          
                          // Trigger file selection after DOM attachment
                          setTimeout(() => fileInput.click(), 100);
                        }}
                      >
                        🔀 Merge Manual Data
                      </Button>
                    </div>
                  </div>

                  {/* Auto Backup (7 Days) Section */}
                  <Separator className={isDarkMode ? 'bg-gray-600' : 'bg-slate-200'} />
                  
                  <div className={`border rounded-lg p-4 ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                          Auto Backup (Every 7 Days)
                        </h4>
                        <Badge variant={weeklyBackupEnabled ? "default" : "outline"}>
                          {weeklyBackupEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        Automatically download backup file every 7 days
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="weekly-backup-toggle"
                            checked={weeklyBackupEnabled}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setWeeklyBackupEnabled(enabled);
                              toggleAutoBackup(enabled);
                              
                              // Refresh status
                              const status = getBackupStatus();
                              setWeeklyLastBackup(status.lastBackupTime);
                              setWeeklyNextScheduled(status.nextScheduledTime);
                              
                              toast({
                                title: enabled ? "Auto Backup Enabled" : "Auto Backup Disabled",
                                description: enabled 
                                  ? "Backup will be automatically downloaded every 7 days"
                                  : "Auto backup has been turned off"
                              });
                            }}
                            className="w-4 h-4"
                          />
                          <label 
                            htmlFor="weekly-backup-toggle"
                            className={`text-sm cursor-pointer ${
                              isDarkMode ? 'text-gray-300' : 'text-slate-700'
                            }`}
                          >
                            Enable automatic backup every 7 days
                          </label>
                        </div>

                        {weeklyBackupEnabled && (
                          <div className={`space-y-2 p-3 rounded ${
                            isDarkMode ? 'bg-gray-600' : 'bg-blue-50'
                          }`}>
                            <div className={`text-xs ${
                              isDarkMode ? 'text-gray-300' : 'text-slate-700'
                            }`}>
                              <strong>Last Auto Backup:</strong>{' '}
                              {weeklyLastBackup 
                                ? new Date(weeklyLastBackup).toLocaleString()
                                : 'Not yet performed'}
                            </div>
                            <div className={`text-xs ${
                              isDarkMode ? 'text-gray-300' : 'text-slate-700'
                            }`}>
                              <strong>Next Scheduled:</strong>{' '}
                              {weeklyNextScheduled 
                                ? new Date(weeklyNextScheduled).toLocaleString()
                                : 'Not scheduled'}
                            </div>
                          </div>
                        )}

                        <p className={`text-xs ${
                          isDarkMode ? 'text-gray-500' : 'text-slate-500'
                        }`}>
                          💡 Note: Backup file will download automatically when you open the app after 7 days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              
              {/* Cloud Sync Tab removed - local backup only */}
              
            </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pro Mode Password Dialog */}
      <Dialog open={showProPasswordDialog} onOpenChange={setShowProPasswordDialog}>
        <DialogContent className={`sm:max-w-md ${isDarkMode ? 'bg-gray-800 text-white' : ''}`}>
          <div className="space-y-4">
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Enable Pro Mode
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                Enter password to enable Pro mode
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pro-password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="pro-password"
                type="password"
                value={proPassword}
                onChange={(e) => setProPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleProPasswordSubmit();
                  }
                }}
                placeholder="Enter password"
                className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowProPasswordDialog(false);
                  setProPassword('');
                }}
                className={isDarkMode ? 'border-gray-600' : ''}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProPasswordSubmit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Enable Pro Mode
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HeaderSettings;