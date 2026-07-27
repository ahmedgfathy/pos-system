const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { connectToMongo } = require('./db');
const { seedDatabase } = require('./seed');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'POS System Backend API is running.',
    frontend_url: 'http://localhost:8080',
    endpoints: [
      '/api/auth/login',
      '/api/products',
      '/api/sales',
      '/api/inventory/transactions',
      '/api/accounting/summary'
    ]
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const db = await connectToMongo();
    await db.admin().ping();
    res.json({
      status: 'ok',
      database: 'mongodb',
      databaseName: db.databaseName,
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'mongodb',
      error: err.message,
    });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const db = await connectToMongo();
    const { search, category } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { qr_code: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    const products = await db.collection('products').find(filter).sort({ name: 1 }).toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/lookup/:code', async (req, res) => {
  try {
    const db = await connectToMongo();
    const product = await db.collection('products').findOne({
      $or: [{ barcode: req.params.code }, { qr_code: req.params.code }],
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/auto-lookup/:code', async (req, res) => {
  try {
    const db = await connectToMongo();
    const code = req.params.code;
    const existing = await db.collection('products').findOne({
      $or: [{ barcode: code }, { qr_code: code }],
    });
    if (existing) {
      return res.json({ foundInDb: true, product: existing });
    }

    let onlineData = null;
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
      if (response.ok) {
        const json = await response.json();
        if (json.status === 1 && json.product) {
          const p = json.product;
          onlineData = {
            name: p.product_name || p.product_name_en || p.brands || `Item #${code.slice(-6)}`,
            category: p.categories_tags?.[0]?.replace('en:', '').replace(/-/g, ' ') || p.categories || 'General',
            image: p.image_url || p.image_front_url || null,
            brand: p.brands || '',
            description: p.generic_name || p.ingredients_text || '',
          };
        }
      }
    } catch (_) {}

    if (!onlineData) {
      onlineData = {
        name: `Scanned Item (${code.slice(-4)})`,
        category: 'General',
        image: null,
        brand: '',
        description: `Auto-detected code ${code}`,
      };
    }

    const rawCategory = onlineData.category || 'General';
    const categoryName = rawCategory
      .split(',')[0]
      .replace(/[_\-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
      .slice(0, 30);

    const price = Math.round((Math.random() * 15 + 3) * 100) / 100;
    const cost = Math.round((price * 0.6) * 100) / 100;

    res.json({
      foundInDb: false,
      product: {
        name: onlineData.name,
        barcode: code,
        category: categoryName || 'General',
        price,
        cost,
        stock: 20,
        image: onlineData.image,
        description: onlineData.description,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const db = await connectToMongo();
    const product = await db.collection('products').findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function normalizeProduct(body, current = {}) {
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    sku: String(body.sku || current.sku || `SKU-${Date.now()}`).trim(),
    name: String(body.name || current.name || '').trim(),
    description: String(body.description ?? current.description ?? '').trim(),
    barcode: body.barcode?.trim() || null,
    qr_code: body.qr_code?.trim() || current.qr_code || null,
    category_id: body.category_id || current.category_id || null,
    category: body.category?.trim() || current.category || null,
    unit_id: body.unit_id || current.unit_id || 'unit-piece',
    unit: body.unit?.trim() || current.unit || 'pc',
    price: number(body.price, current.price),
    cost: number(body.cost, current.cost),
    tax_rate: number(body.tax_rate, current.tax_rate ?? 0),
    stock: number(body.stock, current.stock),
    minimum_stock: number(body.minimum_stock, current.minimum_stock ?? 0),
    maximum_stock: body.maximum_stock === '' || body.maximum_stock == null
      ? (current.maximum_stock ?? null)
      : number(body.maximum_stock),
    supplier_id: body.supplier_id || current.supplier_id || null,
    brand: String(body.brand ?? current.brand ?? '').trim(),
    location: String(body.location ?? current.location ?? '').trim(),
    active: body.active ?? current.active ?? true,
  };
}

async function hydrateProductReferences(db, values) {
  if (values.category) {
    const category = await db.collection('categories').findOneAndUpdate(
      { name: values.category },
      {
        $setOnInsert: {
          id: uuidv4(),
          name: values.category,
          description: '',
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    values.category_id = category.id;
  }

  const unit = await db.collection('units').findOne({ symbol: values.unit, active: true })
    || await db.collection('units').findOne({ symbol: 'pc', active: true });
  if (unit) {
    values.unit_id = unit.id;
    values.unit = unit.symbol;
  }
  return values;
}

app.post('/api/products', async (req, res) => {
  try {
    const values = normalizeProduct(req.body);
    if (!values.name || req.body.price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const db = await connectToMongo();
    const id = uuidv4();
    const product = {
      id,
      ...values,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection('products').insertOne(product);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const db = await connectToMongo();
    const product = await db.collection('products').findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const saleCount = await db.collection('sales').countDocuments({ 'items.product_id': req.params.id });
    if (saleCount > 0) {
      return res.status(400).json({ error: 'Cannot delete product with existing sales history' });
    }

    await db.collection('inventory_transactions').deleteMany({ product_id: req.params.id });
    await db.collection('accounting_entries').deleteMany({ reference_id: req.params.id });
    await db.collection('products').deleteOne({ id: req.params.id });

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const db = await connectToMongo();
    await hydrateProductReferences(db, values);
    const current = await db.collection('products').findOne({ id: req.params.id });
    if (!current) return res.status(404).json({ error: 'Product not found' });
    const values = normalizeProduct(req.body, current);
    await hydrateProductReferences(db, values);
    if (!values.name || values.price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const updatedProduct = {
      ...values,
      updated_at: new Date(),
    };

    const result = await db.collection('products').findOneAndUpdate(
      { id: req.params.id },
      { $set: updatedProduct },
      { returnDocument: 'after' }
    );

    if (!result) return res.status(404).json({ error: 'Product not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { items, payment_method = 'cash' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in sale' });
    }

    const db = await connectToMongo();
    const saleId = uuidv4();
    let subtotal = 0;
    let taxTotal = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await db.collection('products').findOne({ $or: [{ id: item.productId }, { barcode: item.productId }] });
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock: ${product.name} (available: ${product.stock})`);

      const lineSubtotal = product.price * item.quantity;
      const lineTax = lineSubtotal * ((product.tax_rate || 0) / 100);
      subtotal += lineSubtotal;
      taxTotal += lineTax;
      saleItems.push({
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        sku: product.sku,
        unit: product.unit,
        quantity: item.quantity,
        price: product.price,
        cost: product.cost || 0,
        tax_rate: product.tax_rate || 0,
        subtotal: lineSubtotal,
        tax: lineTax,
      });
    }

    for (const saleItem of saleItems) {
      await db.collection('products').updateOne({ id: saleItem.product_id }, { $inc: { stock: -saleItem.quantity }, $set: { updated_at: new Date() } });
      await db.collection('inventory_transactions').insertOne({
        product_id: saleItem.product_id,
        product_name: saleItem.product_name,
        id: uuidv4(),
        type: 'sale',
        quantity: saleItem.quantity,
        unit_cost: saleItem.cost,
        reference_id: saleId,
        notes: `Sale #${saleId.slice(0, 8)}`,
        created_by: req.body.cashier_id || null,
        created_at: new Date(),
      });
      await db.collection('accounting_entries').insertOne({
        id: uuidv4(),
        type: 'revenue',
        description: `Sale Revenue: ${saleItem.product_name} x${saleItem.quantity}`,
        amount: saleItem.subtotal,
        reference_id: saleId,
        reference_type: 'sale',
        created_at: new Date(),
      });

      const product = await db.collection('products').findOne({ id: saleItem.product_id });
      if (product && product.cost > 0) {
        await db.collection('accounting_entries').insertOne({
          id: uuidv4(),
          type: 'expense',
          description: `Cost of Goods: ${saleItem.product_name} x${saleItem.quantity}`,
          amount: product.cost * saleItem.quantity,
          reference_id: saleId,
          reference_type: 'cogs',
          created_at: new Date(),
        });
      }
    }

    const sale = {
      id: saleId,
      invoice_number: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${saleId.slice(0, 6).toUpperCase()}`,
      cashier_id: req.body.cashier_id || null,
      subtotal,
      tax_total: taxTotal,
      total: subtotal + taxTotal,
      payment_method,
      status: 'completed',
      created_at: new Date(),
      items: saleItems,
    };

    await db.collection('sales').insertOne(sale);
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    const db = await connectToMongo();
    const sales = await db.collection('sales').find({}).sort({ created_at: -1 }).limit(100).toArray();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sales/:id', async (req, res) => {
  try {
    const db = await connectToMongo();
    const sale = await db.collection('sales').findOne({ id: req.params.id });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/transactions', async (req, res) => {
  try {
    const db = await connectToMongo();
    const transactions = await db.collection('inventory_transactions').find({}).sort({ created_at: -1 }).limit(100).toArray();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/adjust', async (req, res) => {
  try {
    const { productId, type, quantity, notes, userId } = req.body;
    const db = await connectToMongo();

    const product = await db.collection('products').findOne({ $or: [{ id: productId }, { barcode: productId }] });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (type !== 'in' && type !== 'out') {
      return res.status(400).json({ error: 'Invalid adjustment type' });
    }

    if (type === 'out' && product.stock < quantity) {
      throw new Error(`Insufficient stock to remove ${quantity}`);
    }

    const delta = type === 'in' ? quantity : -quantity;
    const updated = await db.collection('products').findOneAndUpdate(
      { id: product.id },
      { $inc: { stock: delta }, $set: { updated_at: new Date() } },
      { returnDocument: 'after' }
    );

    await db.collection('inventory_transactions').insertOne({
      id: uuidv4(),
      product_id: product.id,
      product_name: product.name,
      type: type === 'in' ? 'adjustment_in' : 'adjustment_out',
      quantity,
      unit_cost: product.cost || 0,
      reference_id: null,
      notes: notes || `Adjustment: ${type === 'in' ? '+' : '-'}${quantity}`,
      created_by: userId || null,
      created_at: new Date(),
    });

    if (type === 'in') {
      await db.collection('accounting_entries').insertOne({
        id: uuidv4(),
        type: 'asset',
        description: `Stock added: ${product.name} x${quantity}`,
        amount: quantity * product.cost,
        reference_id: product.id,
        reference_type: 'inventory',
        created_at: new Date(),
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/accounting/entries', async (req, res) => {
  try {
    const db = await connectToMongo();
    const entries = await db.collection('accounting_entries').find({}).sort({ created_at: -1 }).limit(100).toArray();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accounting/summary', async (req, res) => {
  try {
    const db = await connectToMongo();
    const byType = await db.collection('accounting_entries').aggregate([
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', total: 1, count: 1 } },
    ]).toArray();

    const salesSummary = await db.collection('sales').aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]).toArray();

    res.json({ byType, totalSales: salesSummary[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await connectToMongo();
    const user = await db.collection('users').findOne({ username, active: true });
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await db.collection('users').updateOne({ id: user.id }, { $set: { last_login_at: new Date(), updated_at: new Date() } });
    const { password_hash, _id, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const db = await connectToMongo();
    const categories = await db.collection('categories').find({ active: true }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/units', async (req, res) => {
  try {
    const db = await connectToMongo();
    res.json(await db.collection('units').find({ active: true }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/suppliers', async (req, res) => {
  try {
    const db = await connectToMongo();
    res.json(await db.collection('suppliers').find({ active: true }, { projection: { _id: 0 } }).sort({ name: 1 }).toArray());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/database/summary', async (req, res) => {
  try {
    const db = await connectToMongo();
    const collections = ['products', 'users', 'categories', 'units', 'suppliers', 'sales', 'inventory_transactions', 'accounting_entries', 'system_settings'];
    const counts = Object.fromEntries(await Promise.all(collections.map(async (name) => [name, await db.collection(name).countDocuments()])));
    res.json({ database: db.databaseName, collections: counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

seedDatabase().catch((err) => {
  console.error('Seed initialization failed:', err.message);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`POS Backend running on http://0.0.0.0:${PORT}`);
});
