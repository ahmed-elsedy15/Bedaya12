
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
}

const STORAGE_KEYS = {
  PRODUCTS: 'salesphere_products',
  SALES: 'salesphere_sales',
  CUSTOMERS: 'salesphere_customers',
};

// اسم الحدث المخصص للتنبيه بتحديث البيانات
export const DB_UPDATE_EVENT = 'salesphere-db-updated';

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
    return (Number(sale.sellingPriceAtSale) - Number(sale.purchasePriceAtSale)) * Number(sale.quantitySold) - (Number(sale.discount) || 0);
  }
  const product = products.find(p => p.id === sale.productId);
  if (product) {
    const sell = Number(product.sellingPrice) || Number(product.price) || 0;
    const buy = Number(product.purchasePrice) || 0;
    return (sell - buy) * Number(sale.quantitySold) - (Number(sale.discount) || 0);
  }
  return 0;
};

export const db = {
  notify: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT));
      // التوافق مع التبويبات الأخرى
      window.dispatchEvent(new Event('storage'));
    }
  },

  getProducts: (): Product[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const parsed = stored ? JSON.parse(stored) : [];
      return parsed.map((p: any) => ({
        ...p,
        quantity: Number(p.quantity) || 0,
        purchasePrice: Number(p.purchasePrice) || 0,
        sellingPrice: Number(p.sellingPrice) || Number(p.price) || 0,
        price: Number(p.sellingPrice) || Number(p.price) || 0
      }));
    } catch (e) {
      console.error("Failed to parse products", e);
      return [];
    }
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    db.notify();
  },

  getSales: (): Sale[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SALES);
      const parsed = stored ? JSON.parse(stored) : [];
      return parsed.map((s: any) => ({
        ...s,
        quantitySold: Number(s.quantitySold) || 0,
        totalPrice: Number(s.totalPrice) || 0,
        profit: Number(s.profit) || 0,
        discount: Number(s.discount) || 0,
        timestamp: Number(s.timestamp) || Date.now()
      }));
    } catch (e) {
      console.error("Failed to parse sales", e);
      return [];
    }
  },

  saveSales: (sales: Sale[]) => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    db.notify();
  },

  getCustomers: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const parsed = stored ? JSON.parse(stored) : [];
      return parsed.map((c: any) => ({
        ...c,
        totalDebt: Number(c.totalDebt) || 0
      }));
    } catch (e) {
      console.error("Failed to parse customers", e);
      return [];
    }
  },

  saveCustomers: (customers: Customer[]) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    db.notify();
  },

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'price'>) => {
    const products = db.getProducts();
    const newProduct: Product = {
      ...product,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      quantity: Number(product.quantity),
      price: Number(product.sellingPrice),
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
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
        if (updates.sellingPrice !== undefined) merged.price = Number(updates.sellingPrice);
        if (updates.quantity !== undefined) merged.quantity = Number(updates.quantity);
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
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      totalDebt: 0,
      createdAt: Date.now(),
    };
    db.saveCustomers([newCustomer, ...customers]);
    return newCustomer;
  },

  updateCustomerDebt: (id: string, amount: number) => {
    const customers = db.getCustomers();
    const updated = customers.map(c => {
      if (c.id === id) return { ...c, totalDebt: (Number(c.totalDebt) || 0) + Number(amount) };
      return c;
    });
    db.saveCustomers(updated);
  },

  recordSale: (productId: string, quantity: number, paymentType: 'cash' | 'credit' = 'cash', customerId?: string, discount: number = 0) => {
    const products = db.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product || Number(product.quantity) < Number(quantity)) throw new Error('Insufficient stock');

    const sellingPrice = Number(product.sellingPrice) || 0;
    const purchasePrice = Number(product.purchasePrice) || 0;
    const qty = Number(quantity);
    const dsc = Number(discount) || 0;
    
    const totalPrice = (sellingPrice * qty) - dsc;
    const profit = ((sellingPrice - purchasePrice) * qty) - dsc;

    // تحديث المخزون باستخدام دالة موحدة
    db.updateProduct(productId, { quantity: Number(product.quantity) - qty });

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
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      productId,
      productName: product.name,
      quantitySold: qty,
      purchasePriceAtSale: purchasePrice,
      sellingPriceAtSale: sellingPrice,
      totalPrice,
      profit,
      date: getLocalDateString(),
      timestamp: Date.now(),
      customerId,
      customerName,
      paymentType,
      discount: dsc
    };
    db.saveSales([newSale, ...sales]);
    return newSale;
  },

  returnSale: (saleId: string) => {
    const sales = db.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    // 1. إعادة الكمية للمخزون - استخدام دالة updateProduct لضمان التحديث الصحيح
    const products = db.getProducts();
    const product = products.find(p => p.id === sale.productId);
    
    if (product) {
      const newQuantity = Number(product.quantity) + Number(sale.quantitySold);
      db.updateProduct(sale.productId, { quantity: newQuantity });
    }

    // 2. تعديل مديونية العميل إذا كان البيع آجلاً
    if (sale.paymentType === 'credit' && sale.customerId) {
      db.updateCustomerDebt(sale.customerId, -Number(sale.totalPrice));
    }

    // 3. حذف سجل البيع
    const updatedSales = sales.filter(s => s.id !== saleId);
    db.saveSales(updatedSales);
    
    // إرسال تنبيه نهائي للتأكد من تحديث كل الواجهات
    db.notify();
  },

  importAll: (data: any) => {
    if (data.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    if (data.sales) localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(data.sales));
    if (data.customers) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
    db.notify();
  }
};
