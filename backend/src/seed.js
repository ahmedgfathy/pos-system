const { v4: uuidv4 } = require('uuid');
const { connectToMongo } = require('./db');

async function seedDatabase() {
  const db = await connectToMongo();
  const productsCollection = db.collection('products');
  const inventoryCollection = db.collection('inventory_transactions');
  const accountingCollection = db.collection('accounting_entries');
  const usersCollection = db.collection('users');

  const productCount = await productsCollection.countDocuments();
  if (productCount > 0) {
    console.log('Database already seeded, skipping...');
    return { seeded: false, products: productCount };
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

  const docs = products.map((product) => ({
    id: uuidv4(),
    name: product.name,
    barcode: product.barcode,
    qr_code: null,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    category: product.category,
    created_at: new Date(),
    updated_at: new Date(),
  }));

  await productsCollection.insertMany(docs);

  await inventoryCollection.insertMany(docs.map((product) => ({
    product_id: product.id,
    product_name: product.name,
    type: 'in',
    quantity: product.stock,
    notes: 'Initial stock',
    created_at: new Date(),
  })));

  await accountingCollection.insertMany(docs.map((product) => ({
    type: 'asset',
    description: `Initial stock: ${product.name} x${product.stock}`,
    amount: product.stock * product.cost,
    reference_type: 'inventory',
    created_at: new Date(),
  })));

  await usersCollection.insertMany([
    { id: uuidv4(), username: 'admin', password: 'admin123', role: 'admin', created_at: new Date() },
    { id: uuidv4(), username: 'cashier', password: 'cashier123', role: 'cashier', created_at: new Date() },
  ]);

  console.log('Database seeded successfully!');
  console.log('Products:', docs.length);
  console.log('Users: admin/admin123, cashier/cashier123');
  return { seeded: true, products: docs.length, users: 2 };
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Seed error:', err.message);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
