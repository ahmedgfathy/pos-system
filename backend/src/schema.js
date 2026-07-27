const COLLECTIONS = {
  products: {
    required: ['id', 'sku', 'name', 'unit_id', 'price', 'cost', 'stock', 'active', 'created_at', 'updated_at'],
    properties: {
      id: { bsonType: 'string' },
      sku: { bsonType: 'string' },
      name: { bsonType: 'string' },
      description: { bsonType: 'string' },
      barcode: { bsonType: ['string', 'null'] },
      qr_code: { bsonType: ['string', 'null'] },
      category_id: { bsonType: ['string', 'null'] },
      category: { bsonType: ['string', 'null'] },
      unit_id: { bsonType: 'string' },
      unit: { bsonType: 'string' },
      price: { bsonType: 'number', minimum: 0 },
      cost: { bsonType: 'number', minimum: 0 },
      tax_rate: { bsonType: 'number', minimum: 0 },
      stock: { bsonType: 'number', minimum: 0 },
      minimum_stock: { bsonType: 'number', minimum: 0 },
      maximum_stock: { bsonType: ['number', 'null'], minimum: 0 },
      supplier_id: { bsonType: ['string', 'null'] },
      brand: { bsonType: 'string' },
      location: { bsonType: 'string' },
      active: { bsonType: 'bool' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
  users: {
    required: ['id', 'username', 'password_hash', 'full_name', 'role', 'active', 'created_at', 'updated_at'],
    properties: {
      id: { bsonType: 'string' },
      username: { bsonType: 'string' },
      password_hash: { bsonType: 'string' },
      full_name: { bsonType: 'string' },
      email: { bsonType: ['string', 'null'] },
      phone: { bsonType: ['string', 'null'] },
      role: { enum: ['admin', 'manager', 'cashier'] },
      permissions: { bsonType: 'array', items: { bsonType: 'string' } },
      active: { bsonType: 'bool' },
      last_login_at: { bsonType: ['date', 'null'] },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
  categories: {
    required: ['id', 'name', 'active', 'created_at', 'updated_at'],
    properties: {
      id: { bsonType: 'string' },
      name: { bsonType: 'string' },
      description: { bsonType: 'string' },
      active: { bsonType: 'bool' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
  units: {
    required: ['id', 'name', 'symbol', 'allow_decimal', 'active', 'created_at', 'updated_at'],
    properties: {
      id: { bsonType: 'string' },
      name: { bsonType: 'string' },
      symbol: { bsonType: 'string' },
      allow_decimal: { bsonType: 'bool' },
      active: { bsonType: 'bool' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
  suppliers: {
    required: ['id', 'name', 'active', 'created_at', 'updated_at'],
    properties: {
      id: { bsonType: 'string' },
      name: { bsonType: 'string' },
      contact_name: { bsonType: 'string' },
      email: { bsonType: ['string', 'null'] },
      phone: { bsonType: ['string', 'null'] },
      address: { bsonType: 'string' },
      tax_number: { bsonType: ['string', 'null'] },
      active: { bsonType: 'bool' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
  sales: {
    required: ['id', 'invoice_number', 'items', 'subtotal', 'tax_total', 'total', 'payment_method', 'status', 'created_at'],
    properties: {
      id: { bsonType: 'string' },
      invoice_number: { bsonType: 'string' },
      cashier_id: { bsonType: ['string', 'null'] },
      items: { bsonType: 'array' },
      subtotal: { bsonType: 'number', minimum: 0 },
      tax_total: { bsonType: 'number', minimum: 0 },
      total: { bsonType: 'number', minimum: 0 },
      payment_method: { enum: ['cash', 'card', 'mobile', 'mixed'] },
      status: { enum: ['completed', 'voided', 'refunded'] },
      created_at: { bsonType: 'date' },
    },
  },
  inventory_transactions: {
    required: ['id', 'product_id', 'product_name', 'type', 'quantity', 'created_at'],
    properties: {
      id: { bsonType: 'string' },
      product_id: { bsonType: 'string' },
      product_name: { bsonType: 'string' },
      type: { enum: ['opening', 'purchase', 'sale', 'adjustment_in', 'adjustment_out', 'return'] },
      quantity: { bsonType: 'number', minimum: 0 },
      unit_cost: { bsonType: 'number', minimum: 0 },
      reference_id: { bsonType: ['string', 'null'] },
      notes: { bsonType: 'string' },
      created_by: { bsonType: ['string', 'null'] },
      created_at: { bsonType: 'date' },
    },
  },
  accounting_entries: {
    required: ['id', 'type', 'description', 'amount', 'created_at'],
    properties: {
      id: { bsonType: 'string' },
      type: { enum: ['revenue', 'expense', 'asset', 'liability', 'equity'] },
      description: { bsonType: 'string' },
      amount: { bsonType: 'number' },
      reference_id: { bsonType: ['string', 'null'] },
      reference_type: { bsonType: ['string', 'null'] },
      created_at: { bsonType: 'date' },
    },
  },
  system_settings: {
    required: ['key', 'value', 'updated_at'],
    properties: {
      key: { bsonType: 'string' },
      value: {},
      updated_at: { bsonType: 'date' },
    },
  },
};

const INDEXES = {
  products: [
    [{ id: 1 }, { unique: true }],
    [{ sku: 1 }, { unique: true }],
    [{ barcode: 1 }, { sparse: true }],
    [{ qr_code: 1 }, { sparse: true }],
    [{ name: 'text', description: 'text', brand: 'text' }, { name: 'product_search' }],
    [{ category_id: 1, active: 1 }, {}],
  ],
  users: [[{ id: 1 }, { unique: true }], [{ username: 1 }, { unique: true }], [{ role: 1, active: 1 }, {}]],
  categories: [[{ id: 1 }, { unique: true }], [{ name: 1 }, { unique: true }]],
  units: [[{ id: 1 }, { unique: true }], [{ symbol: 1 }, { unique: true }]],
  suppliers: [[{ id: 1 }, { unique: true }], [{ name: 1 }, { unique: true }]],
  sales: [[{ id: 1 }, { unique: true }], [{ invoice_number: 1 }, { unique: true }], [{ created_at: -1 }, {}]],
  inventory_transactions: [[{ id: 1 }, { unique: true }], [{ product_id: 1, created_at: -1 }, {}]],
  accounting_entries: [[{ id: 1 }, { unique: true }], [{ type: 1, created_at: -1 }, {}]],
  system_settings: [[{ key: 1 }, { unique: true }]],
};

async function ensureDatabaseSchema(db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));

  for (const [name, definition] of Object.entries(COLLECTIONS)) {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: definition.required,
        properties: definition.properties,
      },
    };

    if (!existing.has(name)) {
      await db.createCollection(name, { validator, validationLevel: 'moderate', validationAction: 'error' });
    } else {
      await db.command({
        collMod: name,
        validator,
        validationLevel: 'moderate',
        validationAction: 'error',
      });
    }

    for (const [keys, options] of INDEXES[name] || []) {
      await db.collection(name).createIndex(keys, options);
    }
  }
}

module.exports = { COLLECTIONS, ensureDatabaseSchema };
