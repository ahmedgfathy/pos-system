const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { connectToMongo, closeMongo } = require('./db');

const now = () => new Date();

async function upsertBy(collection, filter, document) {
  const result = await collection.findOneAndUpdate(
    filter,
    { $setOnInsert: document },
    { upsert: true, returnDocument: 'after' }
  );
  return result;
}

async function seedDatabase() {
  const db = await connectToMongo();
  const unitsCollection = db.collection('units');
  const categoriesCollection = db.collection('categories');
  const suppliersCollection = db.collection('suppliers');
  const productsCollection = db.collection('products');
  const usersCollection = db.collection('users');

  const unitDefinitions = [
    { name: 'Piece', symbol: 'pc', allow_decimal: false },
    { name: 'Kilogram', symbol: 'kg', allow_decimal: true },
    { name: 'Liter', symbol: 'L', allow_decimal: true },
    { name: 'Pack', symbol: 'pack', allow_decimal: false },
    { name: 'Box', symbol: 'box', allow_decimal: false },
  ];
  const units = {};
  for (const unit of unitDefinitions) {
    const document = await upsertBy(unitsCollection, { symbol: unit.symbol }, {
      id: uuidv4(), ...unit, active: true, created_at: now(), updated_at: now(),
    });
    units[unit.symbol] = document;
  }

  const categoryDefinitions = [
    ['Beverages', 'Soft drinks, water, tea and coffee'],
    ['Bakery', 'Fresh bread and baked goods'],
    ['Dairy', 'Milk, eggs and refrigerated dairy'],
    ['Groceries', 'Rice, sugar, oil and pantry essentials'],
    ['Snacks', 'Chips, biscuits and confectionery'],
    ['Household', 'Cleaning and household supplies'],
  ];
  const categories = {};
  for (const [name, description] of categoryDefinitions) {
    const document = await upsertBy(categoriesCollection, { name }, {
      id: uuidv4(), name, description, active: true, created_at: now(), updated_at: now(),
    });
    categories[name] = document;
  }

  const supplierDefinitions = [
    {
      name: 'Cairo Wholesale Foods',
      contact_name: 'Mona Hassan',
      email: 'orders@cairowholesale.example',
      phone: '+20 100 555 0101',
      address: 'Nasr City, Cairo',
      tax_number: 'EG-100200300',
    },
    {
      name: 'Nile Distribution',
      contact_name: 'Omar Adel',
      email: 'sales@niledistribution.example',
      phone: '+20 111 555 0202',
      address: 'Giza, Egypt',
      tax_number: 'EG-400500600',
    },
  ];
  const suppliers = {};
  for (const supplier of supplierDefinitions) {
    const document = await upsertBy(suppliersCollection, { name: supplier.name }, {
      id: uuidv4(), ...supplier, active: true, created_at: now(), updated_at: now(),
    });
    suppliers[supplier.name] = document;
  }

  const productDefinitions = [
    ['SKU-1001', 'Coca-Cola 330ml', 'Classic carbonated soft drink can.', '5449000000996', 'Beverages', 'pc', 18.00, 12.50, 120, 24, 'Coca-Cola', 'A-01'],
    ['SKU-1002', 'Mineral Water 500ml', 'Still drinking water in a 500ml bottle.', '6223001234567', 'Beverages', 'pc', 10.00, 6.00, 180, 36, 'Nile Water', 'A-02'],
    ['SKU-1003', 'Whole Milk 1L', 'Pasteurized full-fat milk, one liter.', '6223002234566', 'Dairy', 'L', 42.00, 32.00, 45, 12, 'Fresh Day', 'B-01'],
    ['SKU-1004', 'White Bread Loaf', 'Fresh sliced white sandwich bread.', '6223003234565', 'Bakery', 'pc', 25.00, 17.00, 35, 10, 'Daily Bake', 'B-02'],
    ['SKU-1005', 'Large Eggs 12 Pack', 'Twelve farm-fresh large eggs.', '6223004234564', 'Dairy', 'pack', 85.00, 68.00, 28, 8, 'Farm House', 'B-03'],
    ['SKU-1006', 'Egyptian Rice 1kg', 'Premium short-grain Egyptian rice.', '6223005234563', 'Groceries', 'kg', 48.00, 36.00, 60, 15, 'El Doha', 'C-01'],
    ['SKU-1007', 'Sunflower Oil 1L', 'Refined sunflower cooking oil.', '6223006234562', 'Groceries', 'L', 95.00, 78.00, 40, 10, 'Crystal', 'C-02'],
    ['SKU-1008', 'White Sugar 1kg', 'Fine granulated white sugar.', '6223007234561', 'Groceries', 'kg', 40.00, 31.00, 75, 15, 'Sweet Egypt', 'C-03'],
    ['SKU-1009', 'Black Tea 100 Bags', 'Box of 100 black tea bags.', '6223008234560', 'Beverages', 'box', 92.00, 70.00, 32, 8, 'Tea Time', 'A-03'],
    ['SKU-1010', 'Potato Chips Salted', 'Classic salted potato chips, 70g.', '6223009234559', 'Snacks', 'pc', 20.00, 13.00, 90, 20, 'Crunch', 'D-01'],
    ['SKU-1011', 'Chocolate Biscuits', 'Chocolate-filled biscuit pack.', '6223010234558', 'Snacks', 'pack', 30.00, 21.00, 55, 12, 'Bisco', 'D-02'],
    ['SKU-1012', 'Dishwashing Liquid 650ml', 'Lemon scented concentrated dish soap.', '6223011234557', 'Household', 'pc', 58.00, 43.00, 24, 6, 'Clean Home', 'E-01'],
  ];

  const products = [];
  for (let index = 0; index < productDefinitions.length; index += 1) {
    const [sku, name, description, barcode, categoryName, unitSymbol, price, cost, stock, minimumStock, brand, location] = productDefinitions[index];
    const supplier = index % 2 === 0 ? suppliers['Cairo Wholesale Foods'] : suppliers['Nile Distribution'];
    const document = await upsertBy(productsCollection, { sku }, {
      id: uuidv4(),
      sku,
      name,
      description,
      barcode,
      qr_code: `SELLIT:${sku}`,
      category_id: categories[categoryName].id,
      category: categoryName,
      unit_id: units[unitSymbol].id,
      unit: unitSymbol,
      price,
      cost,
      tax_rate: 14,
      stock,
      minimum_stock: minimumStock,
      maximum_stock: stock * 3,
      supplier_id: supplier.id,
      brand,
      location,
      active: true,
      created_at: now(),
      updated_at: now(),
    });
    products.push(document);
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  const cashierPasswordHash = await bcrypt.hash('cashier123', 10);
  const managerPasswordHash = await bcrypt.hash('manager123', 10);
  const userDefinitions = [
    {
      username: 'admin',
      password_hash: passwordHash,
      full_name: 'System Administrator',
      email: 'admin@sellit.local',
      phone: null,
      role: 'admin',
      permissions: ['*'],
    },
    {
      username: 'manager',
      password_hash: managerPasswordHash,
      full_name: 'Store Manager',
      email: 'manager@sellit.local',
      phone: null,
      role: 'manager',
      permissions: ['products.read', 'products.write', 'inventory.write', 'sales.read', 'reports.read'],
    },
    {
      username: 'cashier',
      password_hash: cashierPasswordHash,
      full_name: 'Demo Cashier',
      email: 'cashier@sellit.local',
      phone: null,
      role: 'cashier',
      permissions: ['products.read', 'sales.write', 'sales.read'],
    },
  ];
  for (const user of userDefinitions) {
    await upsertBy(usersCollection, { username: user.username }, {
      id: uuidv4(),
      ...user,
      active: true,
      last_login_at: null,
      created_at: now(),
      updated_at: now(),
    });
  }

  const inventoryCollection = db.collection('inventory_transactions');
  const accountingCollection = db.collection('accounting_entries');
  for (const product of products) {
    const seedReference = `opening:${product.sku}`;
    await upsertBy(inventoryCollection, { reference_id: seedReference }, {
      id: uuidv4(),
      product_id: product.id,
      product_name: product.name,
      type: 'opening',
      quantity: product.stock,
      unit_cost: product.cost,
      reference_id: seedReference,
      notes: 'Demo opening stock',
      created_by: null,
      created_at: now(),
    });
    await upsertBy(accountingCollection, { reference_id: seedReference }, {
      id: uuidv4(),
      type: 'asset',
      description: `Opening stock: ${product.name} x ${product.stock} ${product.unit}`,
      amount: product.stock * product.cost,
      reference_id: seedReference,
      reference_type: 'inventory',
      created_at: now(),
    });
  }

  await db.collection('system_settings').updateOne(
    { key: 'store' },
    {
      $set: {
        value: {
          name: 'Sell-It Demo Store',
          currency: 'EGP',
          tax_rate: 14,
          low_stock_enabled: true,
          receipt_footer: 'Thank you for shopping with us.',
        },
        updated_at: now(),
      },
    },
    { upsert: true }
  );

  const counts = {};
  for (const name of ['products', 'users', 'categories', 'units', 'suppliers', 'sales', 'inventory_transactions', 'accounting_entries', 'system_settings']) {
    counts[name] = await db.collection(name).countDocuments();
  }

  console.log('MongoDB schema and demo data are ready:', counts);
  return counts;
}

if (require.main === module) {
  seedDatabase()
    .catch((err) => {
      console.error('Seed error:', err.message);
      process.exitCode = 1;
    })
    .finally(() => closeMongo());
}

module.exports = { seedDatabase };
