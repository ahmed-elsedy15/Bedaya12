
"use client"

import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db_firestore, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  price: number;
  quantity: number;
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalDebt: number;
  createdAt: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantitySold: number;
  purchasePriceAtSale: number;
  sellingPriceAtSale: number;
  totalPrice: number;
  profit: number;
  date: string;
  timestamp: number;
  customerId?: string;
  customerName?: string;
  paymentType: 'cash' | 'credit';
}

const STORAGE_KEYS = {
  PRODUCTS: 'salesphere_products',
  SALES: 'salesphere_sales',
  CUSTOMERS: 'salesphere_customers',
};

export const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSafeSaleProfit = (sale: Sale, products: Product[] = []) => {
  if (typeof sale.profit === 'number' && sale.profit !== 0) return Number(sale.profit);
  if (sale.sellingPriceAtSale && sale.purchasePriceAtSale) {
    return (Number(sale.sellingPriceAtSale) - Number(sale.purchasePriceAtSale)) * sale.quantitySold;
  }
  const product = products.find(p => p.id === sale.productId);
  if (product) {
    const sell = Number(product.sellingPrice) || Number(product.price) || 0;
    const buy = Number(product.purchasePrice) || 0;
    return (sell - buy) * sale.quantitySold;
  }
  return 0;
};

// تهيئة الدخول المجهول لضمان وجود UID للمزامنة
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth).catch(console.error);
    } else {
      // مزامنة البيانات عند تسجيل الدخول
      db.syncWithCloud();
    }
  });
}

export const db = {
  getProducts: (): Product[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : [];
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('storage'));
    
    // المزامنة التلقائية مع السحاب
    const user = auth.currentUser;
    if (user) {
      const batch = writeBatch(db_firestore);
      products.forEach(p => {
        const ref = doc(db_firestore, `users/${user.uid}/data/products`, p.id);
        batch.set(ref, p);
      });
      batch.commit().catch(console.error);
    }
  },

  getSales: (): Sale[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.SALES);
    return stored ? JSON.parse(stored) : [];
  },

  saveSales: (sales: Sale[]) => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    window.dispatchEvent(new CustomEvent('storage'));

    const user = auth.currentUser;
    if (user) {
      const batch = writeBatch(db_firestore);
      // لمحدودية الـ Batch (500 عملية)، نرسل آخر 100 فقط أو نستخدم طريقة أخرى
      sales.slice(0, 100).forEach(s => {
        const ref = doc(db_firestore, `users/${user.uid}/data/sales`, s.id);
        batch.set(ref, s);
      });
      batch.commit().catch(console.error);
    }
  },

  getCustomers: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return stored ? JSON.parse(stored) : [];
  },

  saveCustomers: (customers: Customer[]) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new CustomEvent('storage'));

    const user = auth.currentUser;
    if (user) {
      const batch = writeBatch(db_firestore);
      customers.forEach(c => {
        const ref = doc(db_firestore, `users/${user.uid}/data/customers`, c.id);
        batch.set(ref, c);
      });
      batch.commit().catch(console.error);
    }
  },

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'price'>) => {
    const products = db.getProducts();
    const newProduct: Product = {
      ...product,
      price: product.sellingPrice,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    db.saveProducts([newProduct, ...products]);
    return newProduct;
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    const products = db.getProducts();
    const updated = products.map((p) => {
      if (p.id === id) {
        const merged = { ...p, ...updates };
        if (updates.sellingPrice !== undefined) merged.price = updates.sellingPrice;
        return merged;
      }
      return p;
    });
    db.saveProducts(updated);
  },

  deleteProduct: (id: string) => {
    const products = db.getProducts();
    db.saveProducts(products.filter((p) => p.id !== id));
    
    const user = auth.currentUser;
    if (user) {
      deleteDoc(doc(db_firestore, `users/${user.uid}/data/products`, id)).catch(console.error);
    }
  },

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalDebt'>) => {
    const customers = db.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      totalDebt: 0,
      createdAt: Date.now(),
    };
    db.saveCustomers([newCustomer, ...customers]);
    return newCustomer;
  },

  updateCustomerDebt: (id: string, amount: number) => {
    const customers = db.getCustomers();
    const updated = customers.map(c => {
      if (c.id === id) return { ...c, totalDebt: (Number(c.totalDebt) || 0) + amount };
      return c;
    });
    db.saveCustomers(updated);
  },

  recordSale: (productId: string, quantity: number, paymentType: 'cash' | 'credit' = 'cash', customerId?: string) => {
    const products = db.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product || product.quantity < quantity) throw new Error('Insufficient stock');

    const sellingPrice = Number(product.sellingPrice) || 0;
    const purchasePrice = Number(product.purchasePrice) || 0;
    const totalPrice = sellingPrice * quantity;
    const profit = (sellingPrice - purchasePrice) * quantity;

    db.updateProduct(productId, { quantity: product.quantity - quantity });

    let customerName = undefined;
    if (customerId) {
      const customers = db.getCustomers();
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        customerName = customer.name;
        if (paymentType === 'credit') db.updateCustomerDebt(customerId, totalPrice);
      }
    }

    const sales = db.getSales();
    const newSale: Sale = {
      id: crypto.randomUUID(),
      productId,
      productName: product.name,
      quantitySold: quantity,
      purchasePriceAtSale: purchasePrice,
      sellingPriceAtSale: sellingPrice,
      totalPrice,
      profit,
      date: getLocalDateString(),
      timestamp: Date.now(),
      customerId,
      customerName,
      paymentType,
    };
    db.saveSales([newSale, ...sales]);
    return newSale;
  },

  syncWithCloud: async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // سحب المنتجات
      const pSnap = await getDocs(collection(db_firestore, `users/${user.uid}/data/products`));
      const cloudProducts = pSnap.docs.map(d => d.data() as Product);
      if (cloudProducts.length > 0) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cloudProducts));
      }

      // سحب العملاء
      const cSnap = await getDocs(collection(db_firestore, `users/${user.uid}/data/customers`));
      const cloudCustomers = cSnap.docs.map(d => d.data() as Customer);
      if (cloudCustomers.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cloudCustomers));
      }

      // سحب المبيعات
      const sSnap = await getDocs(collection(db_firestore, `users/${user.uid}/data/sales`));
      const cloudSales = sSnap.docs.map(d => d.data() as Sale).sort((a,b) => b.timestamp - a.timestamp);
      if (cloudSales.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(cloudSales));
      }

      window.dispatchEvent(new CustomEvent('storage'));
      window.dispatchEvent(new CustomEvent('cloud-sync-complete'));
    } catch (e) {
      console.error("Cloud sync error:", e);
    }
  }
};
