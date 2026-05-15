
"use client"

import { db_firestore } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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

const syncToCloud = async (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  const userId = localStorage.getItem('salesphere_uid');
  if (userId) {
    try {
      setDoc(doc(db_firestore, 'users', userId, 'data', key), { items: data }, { merge: true })
        .catch(e => {
          if (e.code === 'unavailable') return;
          console.error(`Cloud sync failed for ${key}:`, e);
        });
    } catch (e) {}
  }
};

export const db = {
  getProducts: (): Product[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : [];
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    syncToCloud('products', products);
  },

  getSales: (): Sale[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.SALES);
    return stored ? JSON.parse(stored) : [];
  },

  saveSales: (sales: Sale[]) => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    syncToCloud('sales', sales);
  },

  getCustomers: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return stored ? JSON.parse(stored) : [];
  },

  saveCustomers: (customers: Customer[]) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    syncToCloud('customers', customers);
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

  pullFromCloud: async (userId: string) => {
    const keys = ['products', 'sales', 'customers'];
    let hasChanges = false;
    
    for (const key of keys) {
      try {
        const docSnap = await getDoc(doc(db_firestore, 'users', userId, 'data', key));
        if (docSnap.exists()) {
          const cloudItems = docSnap.data().items;
          const localItems = JSON.parse(localStorage.getItem(`salesphere_${key}`) || '[]');
          
          if (JSON.stringify(cloudItems) !== JSON.stringify(localItems)) {
            localStorage.setItem(`salesphere_${key}`, JSON.stringify(cloudItems));
            hasChanges = true;
          }
        }
      } catch (e: any) {
        if (e.code === 'unavailable') continue;
        console.error(`Pull failed for ${key}:`, e);
      }
    }
    
    if (hasChanges) {
      window.dispatchEvent(new CustomEvent('cloud-sync-complete'));
    }
  },

  clearLocalData: () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem('salesphere_uid');
    window.dispatchEvent(new CustomEvent('cloud-sync-complete'));
  }
};
