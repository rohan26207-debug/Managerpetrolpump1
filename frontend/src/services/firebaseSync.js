// Firebase Sync Service - Works alongside localStorage
import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  getDocs, 
  query, 
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth, getDeviceId, initializeAuth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import localStorageService, { setStorageNamespace, clearStorageNamespace } from './localStorage';

class FirebaseSyncService {
  constructor() {
    this.deviceId = getDeviceId();
    this.syncEnabled = true;
    this.listeners = [];
    this.initialized = false;
    this.currentUserId = null;
  }

  // Get current user ID
  getUserId() {
    return auth.currentUser?.uid || null;
  }

  // Initialize Firebase sync
  async initialize() {
    if (this.initialized) {
      console.log('⚠️ Firebase sync already initialized, skipping');
      return;
    }
    try {
      await initializeAuth();
      console.log('✅ Firebase sync service initialized');
      this.initialized = true;
      await this.waitForAuth();
      // Set namespace for this user
      const userId = this.getUserId();
      if (userId) {
        setStorageNamespace(userId);
        this.currentUserId = userId;
      }
      this.startListeners();
      // Also watch for auth changes to swap namespaces & listeners cleanly
      this.setupAuthWatcher();
    } catch (error) {
      console.error('❌ Firebase sync initialization failed:', error);
    }
  }

  setupAuthWatcher() {
    try {
      onAuthStateChanged(auth, (user) => {
        const newUid = user?.uid || null;
        if (newUid === this.currentUserId) return; // No change
        console.log('🔐 Auth state changed. Restarting listeners and switching storage namespace...', { from: this.currentUserId, to: newUid });
        // Stop existing listeners
        this.stopListeners();
        if (newUid) {
          // Switch namespace to new user and start fresh listeners
          setStorageNamespace(newUid);
          this.currentUserId = newUid;
          this.startListeners();
        } else {
          // Logged out → switch to guest namespace and no listeners
          clearStorageNamespace();
          this.currentUserId = null;
        }
        // Notify UI
        try { window.dispatchEvent(new CustomEvent('localStorageChange', { detail: { userId: newUid }})); } catch (_) {}
      });
    } catch (e) {
      console.log('Auth watcher setup skipped:', e?.message || e);
    }
  }

  // Wait for authentication to be ready
  async waitForAuth(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const userId = this.getUserId();
      if (userId) {
        console.log('✅ Auth ready, user ID:', userId);
        return userId;
      }
      console.log(`⏳ Waiting for auth... attempt ${i + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Authentication timeout - user not logged in');
  }

  setSyncEnabled(enabled) { this.syncEnabled = enabled; console.log(`🔄 Firebase sync ${enabled ? 'enabled' : 'disabled'}`); }

  // ==================== CUSTOMERS ====================
  async syncCustomer(customer, operation = 'add') {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return;
      const customerData = { ...customer, userId, deviceId: this.deviceId, syncedAt: serverTimestamp(), operation };
      if (operation === 'add' || operation === 'update') {
        const docRef = doc(db, 'customers', customer.id);
        await updateDoc(docRef, customerData).catch(async () => {
          await setDoc(doc(db, 'customers', customer.id), customerData);
        });
      } else if (operation === 'delete') { 
        await deleteDoc(doc(db, 'customers', customer.id));
        console.log('🗑️ Customer deleted from Firestore:', customer.id);
      }
      console.log('✅ Customer synced:', customer.name);
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }

  // ==================== CREDIT SALES ====================
  async syncCreditSale(credit, operation = 'add') {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return;
      const creditData = { ...credit, userId, deviceId: this.deviceId, syncedAt: serverTimestamp(), operation };
      if (operation === 'add' || operation === 'update') {
        await updateDoc(doc(db, 'creditSales', credit.id), creditData).catch(async () => {
          await setDoc(doc(db, 'creditSales', credit.id), creditData);
        });
      } else if (operation === 'delete') { 
        await deleteDoc(doc(db, 'creditSales', credit.id));
        console.log('🗑️ Credit sale deleted from Firestore:', credit.id);
      }
      console.log('✅ Credit sale synced:', credit.customerName);
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }

  // ==================== PAYMENTS ====================
  async syncPayment(payment, operation = 'add') {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return;
      const paymentData = { ...payment, userId, deviceId: this.deviceId, syncedAt: serverTimestamp(), operation };
      if (operation === 'add' || operation === 'update') {
        await updateDoc(doc(db, 'payments', payment.id), paymentData).catch(async () => {
          await setDoc(doc(db, 'payments', payment.id), paymentData);
        });
      } else if (operation === 'delete') { 
        await deleteDoc(doc(db, 'payments', payment.id));
        console.log('🗑️ Payment deleted from Firestore:', payment.id);
      }
      console.log('✅ Payment synced:', payment.customerName);
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }

  // ==================== SETTLEMENTS ====================
  async syncSettlement(settlement, operation = 'add') {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return;
      const settlementData = { ...settlement, userId, deviceId: this.deviceId, syncedAt: serverTimestamp(), operation };
      if (operation === 'add' || operation === 'update') {
        await updateDoc(doc(db, 'settlements', settlement.id), settlementData).catch(async () => {
          await setDoc(doc(db, 'settlements', settlement.id), settlementData);
        });
      } else if (operation === 'delete') { 
        await deleteDoc(doc(db, 'settlements', settlement.id));
        console.log('🗑️ Settlement deleted from Firestore:', settlement.id);
      }
      console.log('✅ Settlement synced');
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }

  // ==================== SALES ====================
  async syncSale(sale, operation = 'add') {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return;
      const saleData = { ...sale, userId, deviceId: this.deviceId, syncedAt: serverTimestamp(), operation };
      if (operation === 'add' || operation === 'update') {
        await updateDoc(doc(db, 'sales', sale.id), saleData).catch(async () => {
          // If update fails, create new doc with same ID using setDoc
          await setDoc(doc(db, 'sales', sale.id), saleData);
        });
      } else if (operation === 'delete') { 
        await deleteDoc(doc(db, 'sales', sale.id)); 
        console.log('🗑️ Sale deleted from Firestore:', sale.id);
      }
      console.log('✅ Sale synced');
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }

  // ==================== INCOME/EXPENSES ====================
  async syncIncomeExpense(record, operation = 'add') {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return;
      const recordData = { ...record, userId, deviceId: this.deviceId, syncedAt: serverTimestamp(), operation };
      if (operation === 'add' || operation === 'update') {
        await updateDoc(doc(db, 'incomeExpenses', record.id), recordData).catch(async () => {
          await setDoc(doc(db, 'incomeExpenses', record.id), recordData);
        });
      } else if (operation === 'delete') { 
        await deleteDoc(doc(db, 'incomeExpenses', record.id));
        console.log('🗑️ Income/Expense deleted from Firestore:', record.id);
      }
      console.log('✅ Income/Expense synced');
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }

  // ==================== SETTINGS SYNC ====================
  async syncFuelSettings(settings) {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return console.log('📴 User not authenticated, skipping fuel settings sync');
      const settingsData = { settings, userId, deviceId: this.deviceId, syncedAt: serverTimestamp() };
      await updateDoc(doc(db, 'fuelSettings', userId), settingsData).catch(async () => {
        await setDoc(doc(db, 'fuelSettings', userId), settingsData);
      });
      console.log('✅ Fuel settings synced');
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }
  async syncSettlementTypes(types) {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return console.log('📴 User not authenticated, skipping settlement types sync');
      const typesData = { types, userId, deviceId: this.deviceId, syncedAt: serverTimestamp() };
      await updateDoc(doc(db, 'settlementTypes', userId), typesData).catch(async () => {
        await setDoc(doc(db, 'settlementTypes', userId), typesData);
      });
      console.log('✅ Settlement types synced');
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }
  async syncIncomeCategories(categories) {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return console.log('📴 User not authenticated, skipping income categories sync');
      const data = { categories, userId, deviceId: this.deviceId, syncedAt: serverTimestamp() };
      await updateDoc(doc(db, 'incomeCategories', userId), data).catch(async () => {
        await setDoc(doc(db, 'incomeCategories', userId), data);
      });
      console.log('✅ Income categories synced');
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }
  async syncExpenseCategories(categories) {
    if (!this.syncEnabled) return; try {
      const userId = this.getUserId(); if (!userId) return console.log('📴 User not authenticated, skipping expense categories sync');
      const data = { categories, userId, deviceId: this.deviceId, syncedAt: serverTimestamp() };
      await updateDoc(doc(db, 'expenseCategories', userId), data).catch(async () => {
        await setDoc(doc(db, 'expenseCategories', userId), data);
      });
      console.log('✅ Expense categories synced');
    } catch (e) { console.log('📴 Will sync when online:', e.message); }
  }

  // ==================== BULK SYNC ====================
  async syncAllLocalData() {
    if (!this.syncEnabled) return;
    console.log('🔄 Starting bulk sync of local data to cloud...');
    try {
      const customers = localStorageService.getCustomers();
      const creditSales = localStorageService.getCreditData();
      const payments = localStorageService.getPayments();
      const settlements = localStorageService.getSettlements();
      const sales = localStorageService.getSalesData();
      const incomeExpenses = localStorageService.getIncomeExpenseData();
      for (const customer of customers) await this.syncCustomer(customer, 'add');
      for (const credit of creditSales) await this.syncCreditSale(credit, 'add');
      for (const payment of payments) await this.syncPayment(payment, 'add');
      for (const settlement of settlements) await this.syncSettlement(settlement, 'add');
      for (const sale of sales) await this.syncSale(sale, 'add');
      for (const record of incomeExpenses) await this.syncIncomeExpense(record, 'add');
      const fuelSettings = localStorageService.getFuelSettings();
      const settlementTypes = localStorageService.getSettlementTypes();
      const incomeCategories = localStorageService.getIncomeCategories();
      const expenseCategories = localStorageService.getExpenseCategories();
      if (fuelSettings) await this.syncFuelSettings(fuelSettings);
      if (settlementTypes) await this.syncSettlementTypes(settlementTypes);
      if (incomeCategories) await this.syncIncomeCategories(incomeCategories);
      if (expenseCategories) await this.syncExpenseCategories(expenseCategories);
      console.log('✅ Bulk sync completed successfully');
    } catch (error) { console.error('❌ Bulk sync failed:', error); }
  }

  // ==================== LISTENERS ====================
  startListeners() {
    if (this.listeners.length > 0) { console.log('⚠️ Listeners already running, skipping duplicate initialization'); return; }
    console.log('👂 Starting Firebase listeners for real-time updates...');
    const userId = this.getUserId();
    if (!userId) { console.log('❌ User not authenticated, cannot start listeners'); return; }
    console.log('✅ User authenticated, starting listeners for user:', userId);

    const uidDetailEvent = () => { try { window.dispatchEvent(new CustomEvent('localStorageChange', { detail: { userId } })); } catch(_){} };

    // CUSTOMERS
    const customersListener = onSnapshot(
      query(collection(db, 'customers'), where('userId', '==', userId)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          
          // Don't skip deletes from same device - they need to persist
          if (data.deviceId === this.deviceId && change.type !== 'removed') return;
          
          const customers = localStorageService.getCustomers();
          if (change.type === 'added' || change.type === 'modified') {
            const idx = customers.findIndex(c => c.id === data.id);
            if (idx >= 0) customers[idx] = data; else customers.push(data);
            localStorageService.setCustomers(customers);
          } else if (change.type === 'removed') {
            console.log('🗑️ Customer removed:', data.id);
            const beforeCount = customers.length;
            const filtered = customers.filter(c => c.id !== data.id);
            console.log(`Filtered customers: ${beforeCount} → ${filtered.length}`);
            localStorageService.setCustomers(filtered);
            console.log('✅ Customers updated in localStorage');
          }
          uidDetailEvent();
        });
      },
      (error) => console.error('❌ CUSTOMER LISTENER ERROR:', error)
    );

    // CREDIT SALES
    const creditSalesListener = onSnapshot(
      query(collection(db, 'creditSales'), where('userId', '==', userId)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (data.deviceId === this.deviceId && change.type !== 'removed') return;
          const credits = localStorageService.getCreditData();
          if (change.type === 'added' || change.type === 'modified') {
            const idx = credits.findIndex(c => c.id === data.id);
            if (idx >= 0) credits[idx] = data; else credits.push(data);
            localStorageService.setCreditData(credits);
          } else if (change.type === 'removed') {
            console.log('🗑️ Credit sale removed:', data.id);
            const beforeCount = credits.length;
            const filtered = credits.filter(c => c.id !== data.id);
            console.log(`Filtered credits: ${beforeCount} → ${filtered.length}`);
            localStorageService.setCreditData(filtered);
            console.log('✅ Credits updated in localStorage');
          }
          uidDetailEvent();
        });
      },
      (error) => console.log('📴 Listener error:', error.message)
    );

    // PAYMENTS
    const paymentsListener = onSnapshot(
      query(collection(db, 'payments'), where('userId', '==', userId)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (data.deviceId === this.deviceId && change.type !== 'removed') return;
          const payments = localStorageService.getPayments();
          if (change.type === 'added' || change.type === 'modified') {
            const idx = payments.findIndex(p => p.id === data.id);
            if (idx >= 0) payments[idx] = data; else payments.push(data);
            localStorageService.setPayments(payments);
          } else if (change.type === 'removed') {
            console.log('🗑️ Payment removed:', data.id);
            const beforeCount = payments.length;
            const filtered = payments.filter(p => p.id !== data.id);
            console.log(`Filtered payments: ${beforeCount} → ${filtered.length}`);
            localStorageService.setPayments(filtered);
            console.log('✅ Payments updated in localStorage');
          }
          uidDetailEvent();
        });
      },
      (error) => console.log('📴 Listener error:', error.message)
    );

    // SETTLEMENTS
    const settlementsListener = onSnapshot(
      query(collection(db, 'settlements'), where('userId', '==', userId)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (data.deviceId === this.deviceId && change.type !== 'removed') return;
          const settlements = localStorageService.getSettlements();
          if (change.type === 'added' || change.type === 'modified') {
            const idx = settlements.findIndex(s => s.id === data.id);
            if (idx >= 0) settlements[idx] = data; else settlements.push(data);
            localStorageService.setSettlements(settlements);
          } else if (change.type === 'removed') {
            console.log('🗑️ Settlement removed:', data.id);
            const beforeCount = settlements.length;
            const filtered = settlements.filter(s => s.id !== data.id);
            console.log(`Filtered settlements: ${beforeCount} → ${filtered.length}`);
            localStorageService.setSettlements(filtered);
            console.log('✅ Settlements updated in localStorage');
          }
          uidDetailEvent();
        });
      },
      (error) => console.log('📴 Listener error:', error.message)
    );

    // SALES
    const salesListener = onSnapshot(
      query(collection(db, 'sales'), where('userId', '==', userId)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (data.deviceId === this.deviceId && change.type !== 'removed') return;
          const sales = localStorageService.getSalesData();
          if (change.type === 'added' || change.type === 'modified') {
            const idx = sales.findIndex(s => s.id === data.id);
            if (idx >= 0) sales[idx] = data; else sales.push(data);
            localStorageService.setSalesData(sales);
          } else if (change.type === 'removed') {
            console.log('🗑️ Sale removed:', data.id);
            const beforeCount = sales.length;
            const filtered = sales.filter(s => s.id !== data.id);
            console.log(`Filtered sales: ${beforeCount} → ${filtered.length}`);
            localStorageService.setSalesData(filtered);
            console.log('✅ Sales updated in localStorage');
          }
          uidDetailEvent();
        });
      },
      (error) => console.log('📴 Listener error:', error.message)
    );

    // INCOME/EXPENSES
    const incomeExpensesListener = onSnapshot(
      query(collection(db, 'incomeExpenses'), where('userId', '==', userId)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (data.deviceId === this.deviceId && change.type !== 'removed') return;
          const records = localStorageService.getIncomeExpenseData();
          if (change.type === 'added' || change.type === 'modified') {
            const idx = records.findIndex(r => r.id === data.id);
            if (idx >= 0) records[idx] = data; else records.push(data);
          } else if (change.type === 'removed') {
            const filtered = records.filter(r => r.id !== data.id);
            records.length = 0; filtered.forEach(v => records.push(v));
          }
          const income = records.filter(r => r.type === 'income');
          const expense = records.filter(r => r.type === 'expense');
          localStorageService.setIncomeData(income);
          localStorageService.setExpenseData(expense);
          uidDetailEvent();
        });
      },
      (error) => console.log('📴 Listener error:', error.message)
    );

    // FUEL SETTINGS
    const fuelSettingsListener = onSnapshot(
      doc(db, 'fuelSettings', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.deviceId === this.deviceId) return;
          localStorageService.setFuelSettings(data.settings);
          uidDetailEvent();
        }
      },
      (error) => console.log('📴 Fuel settings listener error:', error.message)
    );

    // SETTLEMENT TYPES
    const settlementTypesListener = onSnapshot(
      doc(db, 'settlementTypes', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.deviceId === this.deviceId) return;
          localStorageService.setSettlementTypes(data.types);
          uidDetailEvent();
        }
      },
      (error) => console.log('📴 Settlement types listener error:', error.message)
    );

    // INCOME CATEGORIES
    const incomeCategoriesListener = onSnapshot(
      doc(db, 'incomeCategories', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.deviceId === this.deviceId) return;
          localStorageService.setIncomeCategories(data.categories);
          uidDetailEvent();
        }
      },
      (error) => console.log('📴 Income categories listener error:', error.message)
    );

    // EXPENSE CATEGORIES
    const expenseCategoriesListener = onSnapshot(
      doc(db, 'expenseCategories', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.deviceId === this.deviceId) return;
          localStorageService.setExpenseCategories(data.categories);
          uidDetailEvent();
        }
      },
      (error) => console.log('📴 Expense categories listener error:', error.message)
    );

    this.listeners.push(
      customersListener,
      creditSalesListener,
      paymentsListener,
      settlementsListener,
      salesListener,
      incomeExpensesListener,
      fuelSettingsListener,
      settlementTypesListener,
      incomeCategoriesListener,
      expenseCategoriesListener
    );
    console.log(`✅ Successfully started ${this.listeners.length} Firebase listeners`);
  }

  // Stop all listeners
  stopListeners() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    console.log('🛑 Firebase listeners stopped');
  }

  // Diagnostics
  getSyncStatus() {
    const userId = this.getUserId();
    return { enabled: this.syncEnabled, deviceId: this.deviceId, initialized: this.initialized, authenticated: !!userId, userId, listenersCount: this.listeners.length };
  }
  diagnoseSync() {
    const status = this.getSyncStatus();
    console.log('=== FIREBASE SYNC DIAGNOSTIC ===');
    console.log('Sync Enabled:', status.enabled);
    console.log('Initialized:', status.initialized);
    console.log('User Authenticated:', status.authenticated);
    console.log('User ID:', status.userId || 'NOT LOGGED IN');
    console.log('Device ID:', status.deviceId);
    console.log('Active Listeners:', status.listenersCount);
    console.log('================================');
    return status;
  }

  // Manual pull
  async manualPullFromFirebase() {
    console.log('🔄 Manually pulling data from Firebase...');
    const userId = this.getUserId(); if (!userId) return console.error('❌ Cannot pull: User not authenticated');
    try {
      const customersSnap = await getDocs(query(collection(db, 'customers'), where('userId', '==', userId)));
      const customers = []; customersSnap.forEach(docSnap => customers.push(docSnap.data()));
      localStorageService.setCustomers(customers);

      const creditsSnap = await getDocs(query(collection(db, 'creditSales'), where('userId', '==', userId)));
      const credits = []; creditsSnap.forEach(docSnap => credits.push(docSnap.data()));
      localStorageService.setCreditData(credits);

      console.log('✅ Manual pull completed successfully');
      try { window.dispatchEvent(new CustomEvent('localStorageChange', { detail: { userId } })); } catch(_){}
    } catch (error) { console.error('❌ Manual pull failed:', error); }
  }
}

// Export singleton instance
const firebaseSyncService = new FirebaseSyncService();

// Auto-initialize
firebaseSyncService.initialize().catch(err => { console.log('📴 Firebase sync will work when online:', err.message); });

// Expose diagnostic globally for debugging
if (typeof window !== 'undefined') {
  window.firebaseSyncService = firebaseSyncService;
  window.diagnoseFirebaseSync = () => firebaseSyncService.diagnoseSync();
  window.manualPullFirebase = () => firebaseSyncService.manualPullFromFirebase();
  window.syncAllToFirebase = () => firebaseSyncService.syncAllLocalData();
  console.log('💡 Debug commands:');
  console.log('  - window.diagnoseFirebaseSync() → Check sync status');
  console.log('  - window.manualPullFirebase() → Manually pull data from Firebase');
  console.log('  - window.syncAllToFirebase() → Push all local data to Firebase');
}

export default firebaseSyncService;
