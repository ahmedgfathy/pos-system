const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
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

app.get('/api/products', async (req, res) => {
  try {
    const db = await connectToMongo();
    const { search, category } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
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

app.post('/api/products', async (req, res) => {
  try {
    const { name, barcode, qr_code, price, cost, stock, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const db = await connectToMongo();
    const id = uuidv4();
    const product = {
      id,
      name,
      barcode: barcode || null,
      qr_code: qr_code || null,
      price,
      cost: cost || 0,
      stock: stock || 0,
      category: category || null,
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
    const { name, barcode, qr_code, price, cost, stock, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const db = await connectToMongo();
    const updatedProduct = {
      name,
      barcode: barcode || null,
      qr_code: qr_code || null,
      price,
      cost: cost ?? 0,
      stock: stock ?? 0,
      category: category || null,
      updated_at: new Date(),
    };

    const result = await db.collection('products').findOneAndUpdate(
      { id: req.params.id },
      { $set: updatedProduct },
      { returnDocument: 'after' }
    );

    if (!result.value) return res.status(404).json({ error: 'Product not found' });
    res.json(result.value);
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
    let total = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await db.collection('products').findOne({ $or: [{ id: item.productId }, { barcode: item.productId }] });
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock: ${product.name} (available: ${product.stock})`);

      const subtotal = product.price * item.quantity;
      total += subtotal;
      saleItems.push({
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity: item.quantity,
        price: product.price,
        subtotal,
      });
    }

    for (const saleItem of saleItems) {
      await db.collection('products').updateOne({ id: saleItem.product_id }, { $inc: { stock: -saleItem.quantity }, $set: { updated_at: new Date() } });
      await db.collection('inventory_transactions').insertOne({
        product_id: saleItem.product_id,
        product_name: saleItem.product_name,
        type: 'out',
        quantity: saleItem.quantity,
        notes: `Sale #${saleId.slice(0, 8)}`,
        created_at: new Date(),
      });
      await db.collection('accounting_entries').insertOne({
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
      total,
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
    const { productId, type, quantity, notes } = req.body;
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
      product_id: product.id,
      product_name: product.name,
      type,
      quantity,
      notes: notes || `Adjustment: ${type === 'in' ? '+' : '-'}${quantity}`,
      created_at: new Date(),
    });

    if (type === 'in') {
      await db.collection('accounting_entries').insertOne({
        type: 'asset',
        description: `Stock added: ${product.name} x${quantity}`,
        amount: quantity * product.cost,
        reference_id: product.id,
        reference_type: 'inventory',
        created_at: new Date(),
      });
    }

    res.json(updated.value);
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
    const user = await db.collection('users').findOne({ username, password }, { projection: { _id: 0, id: 1, username: 1, role: 1 } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const db = await connectToMongo();
    const categories = await db.collection('products').distinct('category', { category: { $ne: null } });
    res.json(categories.sort());
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
