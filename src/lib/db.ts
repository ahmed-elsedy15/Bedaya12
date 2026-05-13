export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  createdAt: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantitySold: number;
  totalPrice: number;
  date: string; // ISO String (YYYY-MM-DD)
  timestamp: number;
}

const STORAGE_KEYS = {
  PRODUCTS: 'salesphere_products',
  SALES: 'salesphere_sales',
};

export const db = {
  getProducts: (): Product[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : [];
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getSales: (): Sale[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.SALES);
    return stored ? JSON.parse(stored) : [];
  },

  saveSales: (sales: Sale[]) => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  },

  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => {
    const products = db.getProducts();
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    db.saveProducts([newProduct, ...products]);
    return newProduct;
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    const products = db.getProducts();
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    db.saveProducts(updated);
  },

  deleteProduct: (id: string) => {
    const products = db.getProducts();
    db.saveProducts(products.filter((p) => p.id !== id));
  },

  recordSale: (productId: string, quantity: number) => {
    const products = db.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product || product.quantity < quantity) throw new Error('Insufficient stock');

    // Update Product Stock
    db.updateProduct(productId, { quantity: product.quantity - quantity });

    // Record Sale
    const sales = db.getSales();
    const newSale: Sale = {
      id: crypto.randomUUID(),
      productId,
      productName: product.name,
      quantitySold: quantity,
      totalPrice: product.price * quantity,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };
    db.saveSales([newSale, ...sales]);
    return newSale;
  },
};
