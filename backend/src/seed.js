const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (existingProducts.count > 0) {
  console.log('Database already seeded, skipping...');
  process.exit(0);
}

const products = [
  { name: 'Coca-Cola 330ml', barcode: '5449000000996', price: 2.50, cost: 1.20, stock: 100, category: 'Beverages' },
  { name: 'Water 500ml', barcode: '5901234123457', price: 1.50, cost: 0.50, stock: 200, category: 'Beverages' },
  { name: 'Bread Loaf', barcode: '1234567890123', price: 3.00, cost: 1.80, stock: 50, category: 'Bakery' },
  { name: 'Milk 1L', barcode: '2345678901234', price: 4.50, cost: 3.00, stock: 30, category: 'Dairy' },
  { name: 'Eggs 12pk', barcode: '3456789012345', price: 6.00, cost: 4.00, stock: 40, category: 'Dairy' },
  { name: 'Rice 1kg', barcode: '4567890123456', price: 8.00, cost: 5.50, stock: 25, category: 'Grains' },
  { name: 'Cooking Oil 1L', barcode: '5678901234567', price: 12.00, cost: 8.00, stock: 20, category: 'Cooking' },
  { name: 'Sugar 1kg', barcode: '6789012345678', price: 5.00, cost: 3.50, stock: 35, category: 'Baking' },
  { name: 'Coffee 200g', barcode: '7890123456789', price: 15.00, cost: 10.00, stock: 15, category: 'Beverages' },
  { name: 'Tea Bags 100pk', barcode: '8901234567890', price: 7.50, cost: 5.00, stock: 20, category: 'Beverages' },
  { name: 'Test Product', barcode: 'TEST001', price: 9.99, cost: 5.00, stock: 50, category: 'General' },
];

const insertProduct = db.prepare(`
  INSERT INTO products (id, name, barcode, price, cost, stock, category)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertInventory = db.prepare(`
  INSERT INTO inventory_transactions (product_id, type, quantity, notes)
  VALUES (?, 'in', ?, 'Initial stock')
`);

const insertAccounting = db.prepare(`
  INSERT INTO accounting_entries (type, description, amount, reference_type)
  VALUES ('asset', ?, ?, 'inventory')
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, username, password, role)
  VALUES (?, ?, ?, ?)
`);

const transaction = db.transaction(() => {
  for (const p of products) {
    const id = uuidv4();
    insertProduct.run(id, p.name, p.barcode, p.price, p.cost, p.stock, p.category);
    insertInventory.run(id, p.stock);
    insertAccounting.run(`Initial stock: ${p.name} x${p.stock}`, p.stock * p.cost);
  }

  insertUser.run(uuidv4(), 'admin', 'admin123', 'admin');
  insertUser.run(uuidv4(), 'cashier', 'cashier123', 'cashier');
});

try {
  transaction();
  console.log('Database seeded successfully!');
  console.log('Products:', products.length);
  console.log('Users: admin/admin123, cashier/cashier123');
} catch (err) {
  console.error('Seed error:', err.message);
}
