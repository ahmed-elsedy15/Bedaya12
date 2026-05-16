
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
  getProducts: (): Product[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const parsed = stored ? JSON.parse(stored) : [];
    // التأكد من أن الكميات أرقام
    return parsed.map((p: any) => ({
      ...p,
      quantity: Number(p.quantity) || 0,
      purchasePrice: Number(p.purchasePrice) || 0,
      sellingPrice: Number(p.sellingPrice) || Number(p.price) || 0,
      price: Number(p.sellingPrice) || Number(p.price) || 0
    }));
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('storage'));
  },

  getSales: (): Sale[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.SALES);
    return stored ? JSON.parse(stored) : [];
  },

  saveSales: (sales: Sale[]) => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    window.dispatchEvent(new CustomEvent('storage'));
  },

  getCustomers: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const parsed = stored ? JSON.parse(stored) : [];
    return parsed.map((c: any) => ({
      ...c,
      totalDebt: Number(c.totalDebt) || 0
    }));
  },

  saveCustomers: (customers: Customer[]) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new CustomEvent('storage'));
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

    // تحديث المخزون
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
      id: crypto.randomUUID(),
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

    // 1. إعادة الكمية للمخزون
    const products = db.getProducts();
    const updatedProducts = products.map(p => {
      if (p.id === sale.productId) {
        return { 
          ...p, 
          quantity: Number(p.quantity) + Number(sale.quantitySold) 
        };
      }
      return p;
    });
    db.saveProducts(updatedProducts);

    // 2. تعديل مديونية العميل إذا كان البيع آجلاً
    if (sale.paymentType === 'credit' && sale.customerId) {
      db.updateCustomerDebt(sale.customerId, -Number(sale.totalPrice));
    }

    // 3. حذف سجل البيع
    const updatedSales = sales.filter(s => s.id !== saleId);
    db.saveSales(updatedSales);
    
    // إرسال حدث للتنبيه بوجود تغيير
    window.dispatchEvent(new CustomEvent('storage'));
  },

  importAll: (data: any) => {
    if (data.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    if (data.sales) localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(data.sales));
    if (data.customers) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
    window.dispatchEvent(new CustomEvent('storage'));
  }
};
