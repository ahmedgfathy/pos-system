const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

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

app.get('/api/products', (req, res) => {
  try {
    const { search, category } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR barcode LIKE ? OR qr_code LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY name';
    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/lookup/:code', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ? OR qr_code = ?')
      .get(req.params.code, req.params.code);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/auto-lookup/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const existing = db.prepare('SELECT * FROM products WHERE barcode = ? OR qr_code = ?').get(code, code);
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
      .replace(/\b\w/g, c => c.toUpperCase())
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
        price: price,
        cost: cost,
        stock: 20,
        image: onlineData.image,
        description: onlineData.description,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, barcode, qr_code, price, cost, stock, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const id = uuidv4();
    db.prepare(`
      INSERT INTO products (id, name, barcode, qr_code, price, cost, stock, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, barcode || null, qr_code || null, price, cost || 0, stock || 0, category || null);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const inSale = db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?').get(req.params.id);
    if (inSale.count > 0) {
      return res.status(400).json({ error: 'Cannot delete product with existing sales history' });
    }

    db.prepare('DELETE FROM inventory_transactions WHERE product_id = ?').run(req.params.id);
    db.prepare('DELETE FROM accounting_entries WHERE reference_id = ?').run(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { name, barcode, qr_code, price, cost, stock, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    db.prepare(`
      UPDATE products SET name=?, barcode=?, qr_code=?, price=?, cost=?, stock=?, category=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      name,
      barcode || null,
      qr_code || null,
      price,
      cost ?? 0,
      stock ?? 0,
      category || null,
      req.params.id
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', (req, res) => {
  try {
    const { items, payment_method = 'cash' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in sale' });
    }

    const saleId = uuidv4();
    let total = 0;

    const saleItems = items.map(item => {
      const product = db.prepare('SELECT * FROM products WHERE id = ? OR barcode = ?').get(item.productId, item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock: ${product.name} (available: ${product.stock})`);

      const subtotal = product.price * item.quantity;
      total += subtotal;
      return { product, quantity: item.quantity, price: product.price, subtotal };
    });

    const doSale = db.transaction(() => {
      db.prepare('INSERT INTO sales (id, total, payment_method) VALUES (?, ?, ?)')
        .run(saleId, total, payment_method);

      for (const si of saleItems) {
        db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)')
          .run(saleId, si.product.id, si.quantity, si.price, si.subtotal);

        db.prepare('UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(si.quantity, si.product.id);

        db.prepare('INSERT INTO inventory_transactions (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)')
          .run(si.product.id, 'out', si.quantity, `Sale #${saleId.slice(0, 8)}`);

        db.prepare(`INSERT INTO accounting_entries (type, description, amount, reference_id, reference_type)
          VALUES ('revenue', ?, ?, ?, 'sale')`)
          .run(`Sale Revenue: ${si.product.name} x${si.quantity}`, si.subtotal, saleId);

        if (si.product.cost > 0) {
          db.prepare(`INSERT INTO accounting_entries (type, description, amount, reference_id, reference_type)
            VALUES ('expense', ?, ?, ?, 'cogs')`)
            .run(`Cost of Goods: ${si.product.name} x${si.quantity}`, si.product.cost * si.quantity, saleId);
        }
      }
    });

    doSale();

    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    const items_out = db.prepare(`
      SELECT si.*, p.name as product_name, p.barcode
      FROM sale_items si JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(saleId);

    res.status(201).json({ ...sale, items: items_out });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sales', (req, res) => {
  try {
    const sales = db.prepare('SELECT * FROM sales ORDER BY created_at DESC LIMIT 100').all();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sales/:id', (req, res) => {
  try {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.barcode
      FROM sale_items si JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(req.params.id);

    res.json({ ...sale, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/transactions', (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT it.*, p.name as product_name
      FROM inventory_transactions it JOIN products p ON it.product_id = p.id
      ORDER BY it.created_at DESC LIMIT 100
    `).all();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/adjust', (req, res) => {
  try {
    const { productId, type, quantity, notes } = req.body;

    const product = db.prepare('SELECT * FROM products WHERE id = ? OR barcode = ?').get(productId, productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const adjust = db.transaction(() => {
      if (type === 'in') {
        db.prepare('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(quantity, product.id);
      } else {
        if (product.stock < quantity) throw new Error(`Insufficient stock to remove ${quantity}`);
        db.prepare('UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(quantity, product.id);
      }

      db.prepare('INSERT INTO inventory_transactions (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)')
        .run(product.id, type, quantity, notes || `Adjustment: ${type === 'in' ? '+' : '-'}${quantity}`);

      if (type === 'in') {
        db.prepare(`INSERT INTO accounting_entries (type, description, amount, reference_id, reference_type)
          VALUES ('asset', ?, ?, ?, 'inventory')`)
          .run(`Stock added: ${product.name} x${quantity}`, quantity * product.cost, product.id);
      }
    });

    adjust();

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/accounting/entries', (req, res) => {
  try {
    const entries = db.prepare('SELECT * FROM accounting_entries ORDER BY created_at DESC LIMIT 100').all();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accounting/summary', (req, res) => {
  try {
    const byType = db.prepare(`
      SELECT type, SUM(amount) as total, COUNT(*) as count
      FROM accounting_entries GROUP BY type
    `).all();

    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM sales").get();

    res.json({ byType, totalSales: totalRevenue.total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?')
      .get(username, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category'
    ).all();
    res.json(categories.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`POS Backend running on http://0.0.0.0:${PORT}`);
});
