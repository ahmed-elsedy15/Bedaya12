
"use client"

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
  type: 'regular' | 'special';
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
  discount: number;
  debtAmount: number; 
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  PRODUCTS: 'salesphere_products',
  SALES: 'salesphere_sales',
  CUSTOMERS: 'salesphere_customers',
  PAYMENTS: 'salesphere_payments',
};

export const DB_UPDATE_EVENT = 'salesphere-db-updated';

export const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getRealizedSaleProfit = (sale: Sale) => {
  const totalPrice = Number(sale.totalPrice) || 0;
  if (totalPrice === 0) return 0;
  
  const debt = Number(sale.debtAmount) || 0;
  const paidCash = totalPrice - debt;
  const ratio = paidCash / totalPrice;
  
  const totalExpectedProfit = Number(sale.profit) || 0;
  return totalExpectedProfit * ratio;
};

export const getRealizedSaleRevenue = (sale: Sale) => {
  const totalPrice = Number(sale.totalPrice) || 0;
  const debt = Number(sale.debtAmount) || 0;
  return totalPrice - debt;
};

export const db = {
  notify: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT));
      window.dispatchEvent(new Event('storage'));
    }
  },

  getProducts: (): Product[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  getSales: (): Sale[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SALES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  getCustomers: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  getPayments: (): Payment[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'price'>) => {
    const products = db.getProducts();
    const newProduct: Product = {
      ...product,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      quantity: Number(product.quantity),
      price: Number(product.sellingPrice),
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([newProduct, ...products]));
    db.notify();
    return newProduct;
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    const products = db.getProducts();
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates, price: updates.sellingPrice ?? p.sellingPrice } : p));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    db.notify();
  },

  deleteProduct: (id: string) => {
    const products = db.getProducts();
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products.filter((p) => p.id !== id)));
    db.notify();
  },

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalDebt'>) => {
    const customers = db.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      totalDebt: 0,
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([newCustomer, ...customers]));
    db.notify();
    return newCustomer;
  },

  updateCustomerDebt: (id: string, amount: number) => {
    const customers = db.getCustomers();
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    if (amount < 0) {
      const payments = db.getPayments();
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        customerId: id,
        customerName: customer.name,
        amount: Math.abs(amount),
        date: getLocalDateString(),
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([newPayment, ...payments]));
    }

    const updated = customers.map(c => (c.id === id ? { ...c, totalDebt: Number(c.totalDebt) + Number(amount) } : c));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    db.notify();
  },

  recordSale: (productId: string, quantity: number, paymentType: 'cash' | 'credit' = 'cash', customerId?: string, discount: number = 0, debtAmount: number = 0, manualCustomerName?: string) => {
    const products = db.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product || Number(product.quantity) < Number(quantity)) throw new Error('Insufficient stock');

    const qty = Number(quantity);
    const dsc = Number(discount);
    const debt = Number(debtAmount);
    
    const updatedProducts = products.map(p => p.id === productId ? { ...p, quantity: Number(p.quantity) - qty } : p);

    let customerName = manualCustomerName;
    const customersList = db.getCustomers();
    
    if (customerId) {
      const customer = customersList.find(c => c.id === customerId);
      if (customer) {
        customerName = customer.name;
        if (paymentType === 'credit' && debt > 0) {
          const updatedCusts = customersList.map(c => (c.id === customerId ? { ...c, totalDebt: Number(c.totalDebt) + debt } : c));
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCusts));
        }
      }
    }

    const newSale: Sale = {
      id: crypto.randomUUID(),
      productId,
      productName: product.name,
      quantitySold: qty,
      purchasePriceAtSale: Number(product.purchasePrice),
      sellingPriceAtSale: Number(product.sellingPrice),
      totalPrice: (Number(product.sellingPrice) * qty) - dsc,
      profit: ((Number(product.sellingPrice) - Number(product.purchasePrice)) * qty) - dsc,
      date: getLocalDateString(),
      timestamp: Date.now(),
      customerId,
      customerName: customerName || undefined,
      paymentType,
      discount: dsc,
      debtAmount: paymentType === 'credit' ? debt : 0
    };

    const sales = db.getSales();
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([newSale, ...sales]));
    
    db.notify();
    return newSale;
  },

  returnSale: (saleId: string) => {
    const sales = db.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return false;

    const products = db.getProducts();
    const customers = db.getCustomers();

    // 1. إعادة البضاعة للمخزون (زيادة الكمية)
    const updatedProducts = products.map(p => 
      p.id === sale.productId ? { ...p, quantity: Number(p.quantity) + Number(sale.quantitySold) } : p
    );

    // 2. خصم مديونية العميل (إذا كان هناك دين)
    let updatedCustomers = [...customers];
    if (sale.customerId && Number(sale.debtAmount) > 0) {
      updatedCustomers = customers.map(c => 
        c.id === sale.customerId ? { ...c, totalDebt: Math.max(0, Number(c.totalDebt) - Number(sale.debtAmount)) } : c
      );
    }

    // 3. حذف العملية من سجل المبيعات
    const updatedSales = sales.filter(s => s.id !== saleId);

    // 4. حفظ الكل في خطوة واحدة لضمان التزامن
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(updatedSales));
    
    db.notify();
    return true;
  },

  importAll: (data: any) => {
    if (data.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    if (data.sales) localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(data.sales));
    if (data.customers) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
    if (data.payments) localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(data.payments));
    db.notify();
  }
};
