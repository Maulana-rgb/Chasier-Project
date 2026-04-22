import express from 'express'
import session from 'express-session'
import MySQLStoreFactory from 'express-mysql-session'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const port = Number(process.env.PORT) || 3001

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dimsum_cashier',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
}

const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-me'

const pool = mysql.createPool(dbConfig)
const MySQLStore = MySQLStoreFactory(session)
const sessionStore = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: 60_000,
    expiration: 1000 * 60 * 60 * 24 * 7,
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data',
      },
    },
  },
  pool
)

const app = express()
app.disable('x-powered-by')
const corsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Vary', 'Origin')
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  next()
})
app.use(express.json({ limit: '1mb' }))
app.use(
  session({
    name: 'sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(process.env.COOKIE_SECURE) || process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
)

const requireAuth = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'UNAUTHORIZED' })
  next()
}

const requireOwner = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ error: 'UNAUTHORIZED' })
  if (req.session.user.role !== 'owner') return res.status(403).json({ error: 'FORBIDDEN' })
  next()
}

let dbReady = false
let dbInitError = null
let dbInitPromise = null

const ensureDbReady = async () => {
  if (dbReady) return true
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await ensureSchema()
      await seedIfEmpty()
      dbReady = true
      dbInitError = null
      return true
    })().catch((err) => {
      dbReady = false
      dbInitError = err
      dbInitPromise = null
      throw err
    })
  }
  return dbInitPromise
}

const requireDb = async (req, res, next) => {
  try {
    await ensureDbReady()
    next()
  } catch {
    res.status(503).json({ error: 'DB_UNAVAILABLE' })
  }
}

const columnExists = async (tableName, columnName) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :t AND COLUMN_NAME = :c`,
    { db: dbConfig.database, t: tableName, c: columnName }
  )
  return Number(row?.c) > 0
}

const addColumnIfMissing = async (tableName, columnName, columnSql) => {
  const exists = await columnExists(tableName, columnName)
  if (exists) return
  await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnSql}`)
}

const indexExists = async (tableName, indexName) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :t AND INDEX_NAME = :i`,
    { db: dbConfig.database, t: tableName, i: indexName }
  )
  return Number(row?.c) > 0
}

const addIndexIfMissing = async (tableName, indexName, indexSql) => {
  const exists = await indexExists(tableName, indexName)
  if (exists) return
  await pool.query(`ALTER TABLE \`${tableName}\` ADD ${indexSql}`)
}

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('owner','cashier') NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(128) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS add_ons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(128) NOT NULL UNIQUE,
      price INT NOT NULL DEFAULT 0,
      hpp INT NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      price INT NOT NULL DEFAULT 0,
      hpp INT NOT NULL DEFAULT 0,
      category_id INT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_menus_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await addColumnIfMissing('menus', 'image_mime', '`image_mime` VARCHAR(64) NULL')
  await addColumnIfMissing('menus', 'image_blob', '`image_blob` MEDIUMBLOB NULL')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_add_ons (
      menu_id INT NOT NULL,
      add_on_id INT NOT NULL,
      PRIMARY KEY (menu_id, add_on_id),
      CONSTRAINT fk_mao_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
      CONSTRAINT fk_mao_addon FOREIGN KEY (add_on_id) REFERENCES add_ons(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shifts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      opened_at DATETIME NOT NULL,
      opening_balance INT NOT NULL DEFAULT 0,
      closed_at DATETIME NULL,
      closing_cash INT NULL,
      cash_sales INT NOT NULL DEFAULT 0,
      qris_sales INT NOT NULL DEFAULT 0,
      expected_cash INT NOT NULL DEFAULT 0,
      difference INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tx_sequences (
      ym CHAR(6) PRIMARY KEY,
      last_seq INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      public_id VARCHAR(16) NULL,
      shift_id BIGINT NULL,
      date DATETIME NOT NULL,
      payment_method ENUM('Cash','QRIS') NOT NULL,
      customer_name VARCHAR(128) NULL,
      subtotal INT NOT NULL DEFAULT 0,
      total INT NOT NULL DEFAULT 0,
      cash_amount INT NULL,
      change_amount INT NULL,
      CONSTRAINT fk_tx_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
      UNIQUE KEY uq_transactions_public_id (public_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await addColumnIfMissing('transactions', 'public_id', '`public_id` VARCHAR(16) NULL')
  await addIndexIfMissing('transactions', 'uq_transactions_public_id', 'UNIQUE KEY uq_transactions_public_id (`public_id`)')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      transaction_id BIGINT NOT NULL,
      menu_id INT NULL,
      name VARCHAR(128) NOT NULL,
      price INT NOT NULL DEFAULT 0,
      hpp INT NOT NULL DEFAULT 0,
      qty INT NOT NULL DEFAULT 1,
      CONSTRAINT fk_ti_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaction_item_addons (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      transaction_item_id BIGINT NOT NULL,
      add_on_id INT NULL,
      name VARCHAR(128) NOT NULL,
      price INT NOT NULL DEFAULT 0,
      hpp INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_tia_item FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

const seedIfEmpty = async () => {
  const [[userCountRow]] = await pool.query('SELECT COUNT(*) AS c FROM users')
  if (Number(userCountRow.c) === 0) {
    const ownerHash = await bcrypt.hash('owner123', 10)
    const cashierHash = await bcrypt.hash('kasir123', 10)
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (:u1,:p1,:r1), (:u2,:p2,:r2)',
      { u1: 'owner', p1: ownerHash, r1: 'owner', u2: 'kasir', p2: cashierHash, r2: 'cashier' }
    )
  }

  const [[catCountRow]] = await pool.query('SELECT COUNT(*) AS c FROM categories')
  if (Number(catCountRow.c) === 0) {
    await pool.query(
      'INSERT INTO categories (name) VALUES (:a),(:b),(:c),(:d),(:e)',
      { a: 'Dimsum Steamed', b: 'Dimsum Fried', c: 'Bakpao', d: 'Minuman', e: 'Lainnya' }
    )
  }

  const [[addOnCountRow]] = await pool.query('SELECT COUNT(*) AS c FROM add_ons')
  if (Number(addOnCountRow.c) === 0) {
    await pool.query(
      'INSERT INTO add_ons (name, price, hpp) VALUES (:n1,:p1,:h1),(:n2,:p2,:h2),(:n3,:p3,:h3)',
      {
        n1: 'Extra Saus',
        p1: 2000,
        h1: 700,
        n2: 'Extra Chili Oil',
        p2: 3000,
        h2: 1200,
        n3: 'Extra Mayonnaise',
        p3: 2500,
        h3: 1000,
      }
    )
  }

  const [[menuCountRow]] = await pool.query('SELECT COUNT(*) AS c FROM menus')
  if (Number(menuCountRow.c) === 0) {
    const [catRows] = await pool.query('SELECT id, name FROM categories')
    const catIdByName = Object.fromEntries(catRows.map(r => [r.name, r.id]))
    await pool.query(
      `INSERT INTO menus (name, price, hpp, category_id) VALUES
      (:n1,:p1,:h1,:c1),
      (:n2,:p2,:h2,:c2),
      (:n3,:p3,:h3,:c3),
      (:n4,:p4,:h4,:c4)`,
      {
        n1: 'Siomay Ayam',
        p1: 15000,
        h1: 8000,
        c1: catIdByName['Dimsum Steamed'] || null,
        n2: 'Hakau Udang',
        p2: 18000,
        h2: 10000,
        c2: catIdByName['Dimsum Steamed'] || null,
        n3: 'Pangsit Goreng',
        p3: 12000,
        h3: 6500,
        c3: catIdByName['Dimsum Fried'] || null,
        n4: 'Bakpao Telur Asin',
        p4: 20000,
        h4: 12000,
        c4: catIdByName['Bakpao'] || null,
      }
    )
  }
}

const getOpenShiftId = async () => {
  const [rows] = await pool.query('SELECT id FROM shifts WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1')
  return rows.length ? Number(rows[0].id) : null
}

const getBootstrapData = async () => {
  const [categoriesRows] = await pool.query('SELECT id, name FROM categories ORDER BY name ASC')
  const categories = categoriesRows.map(r => r.name)

  const [addOnRows] = await pool.query('SELECT id, name, price, hpp FROM add_ons WHERE active = 1 ORDER BY id ASC')
  const addOns = addOnRows.map(r => ({
    id: Number(r.id),
    name: r.name,
    price: Number(r.price) || 0,
    hpp: Number(r.hpp) || 0,
  }))

  const [menuRows] = await pool.query(
    `SELECT m.id, m.name, m.price, m.hpp, m.image_mime, m.image_blob, c.name AS category
     FROM menus m
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE m.active = 1
     ORDER BY m.id ASC`
  )
  const [menuAddOnRows] = await pool.query('SELECT menu_id, add_on_id FROM menu_add_ons')
  const addOnIdsByMenuId = new Map()
  menuAddOnRows.forEach(r => {
    const menuId = Number(r.menu_id)
    const addOnId = Number(r.add_on_id)
    const prev = addOnIdsByMenuId.get(menuId) || []
    prev.push(addOnId)
    addOnIdsByMenuId.set(menuId, prev)
  })
  const menus = menuRows.map(r => ({
    id: Number(r.id),
    name: r.name,
    price: Number(r.price) || 0,
    hpp: Number(r.hpp) || 0,
    category: r.category || 'Lainnya',
    addOnIds: addOnIdsByMenuId.get(Number(r.id)) || [],
    image: r.image_blob ? `data:${r.image_mime || 'image/jpeg'};base64,${Buffer.from(r.image_blob).toString('base64')}` : null,
  }))

  const [shiftsRows] = await pool.query(
    `SELECT id, opened_at, opening_balance, closed_at, closing_cash, cash_sales, qris_sales, expected_cash, difference
     FROM shifts ORDER BY opened_at DESC`
  )
  const shifts = shiftsRows.map(r => ({
    id: Number(r.id),
    openedAt: new Date(r.opened_at).toISOString(),
    openingBalance: Number(r.opening_balance) || 0,
    closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : null,
    closingCash: r.closing_cash === null ? null : Number(r.closing_cash) || 0,
    cashSales: Number(r.cash_sales) || 0,
    qrisSales: Number(r.qris_sales) || 0,
    expectedCash: Number(r.expected_cash) || 0,
    difference: Number(r.difference) || 0,
  }))

  const [txRows] = await pool.query(
    `SELECT id, public_id, shift_id, date, payment_method, customer_name, subtotal, total, cash_amount, change_amount
     FROM transactions ORDER BY date DESC`
  )

  const txIds = txRows.map(r => Number(r.id))
  let itemsByTx = new Map()
  let addOnsByItem = new Map()
  if (txIds.length) {
    const [itemRows] = await pool.query(
      `SELECT id, transaction_id, menu_id, name, price, hpp, qty
       FROM transaction_items
       WHERE transaction_id IN (${txIds.map(() => '?').join(',')})
       ORDER BY id ASC`,
      txIds
    )
    const itemIds = itemRows.map(r => Number(r.id))

    itemsByTx = new Map()
    itemRows.forEach(r => {
      const txId = Number(r.transaction_id)
      const prev = itemsByTx.get(txId) || []
      prev.push({
        id: Number(r.id),
        menuId: r.menu_id === null ? null : Number(r.menu_id),
        name: r.name,
        price: Number(r.price) || 0,
        hpp: Number(r.hpp) || 0,
        qty: Number(r.qty) || 0,
        addOns: [],
      })
      itemsByTx.set(txId, prev)
    })

    if (itemIds.length) {
      const [addonRows] = await pool.query(
        `SELECT transaction_item_id, add_on_id, name, price, hpp
         FROM transaction_item_addons
         WHERE transaction_item_id IN (${itemIds.map(() => '?').join(',')})
         ORDER BY id ASC`,
        itemIds
      )
      addOnsByItem = new Map()
      addonRows.forEach(r => {
        const itemId = Number(r.transaction_item_id)
        const prev = addOnsByItem.get(itemId) || []
        prev.push({
          id: r.add_on_id === null ? null : Number(r.add_on_id),
          name: r.name,
          price: Number(r.price) || 0,
          hpp: Number(r.hpp) || 0,
        })
        addOnsByItem.set(itemId, prev)
      })
    }
  }

  const transactions = txRows.map(r => {
    const txId = Number(r.id)
    const items = (itemsByTx.get(txId) || []).map(i => ({
      ...i,
      addOns: addOnsByItem.get(i.id) || [],
    }))
    return {
      id: txId,
      publicId: r.public_id || null,
      shiftId: r.shift_id === null ? null : Number(r.shift_id),
      date: new Date(r.date).toISOString(),
      paymentMethod: r.payment_method,
      customerName: r.customer_name || '',
      subtotal: Number(r.subtotal) || 0,
      total: Number(r.total) || 0,
      cashAmount: r.cash_amount === null ? null : Number(r.cash_amount) || 0,
      changeAmount: r.change_amount === null ? null : Number(r.change_amount) || 0,
      items,
    }
  })

  const openShiftId = await getOpenShiftId()
  return { categories, menus, addOns, shifts, openShiftId, transactions }
}

app.get('/api/health', async (req, res) => {
  try {
    await ensureDbReady()
  } catch {
    // ignore
  }
  res.json({
    ok: true,
    db: {
      ok: dbReady,
      error: dbInitError ? String(dbInitError?.code || dbInitError?.message || dbInitError) : null,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
    },
  })
})

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.session?.user || null })
})

app.post('/api/auth/login', requireDb, async (req, res) => {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')
  if (!username || !password) return res.status(400).json({ error: 'INVALID_INPUT' })

  const [rows] = await pool.query('SELECT id, username, password_hash, role FROM users WHERE username = :u LIMIT 1', { u: username })
  if (!rows.length) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })

  const user = rows[0]
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })

  req.session.user = { id: Number(user.id), username: user.username, role: user.role }
  res.json({ user: req.session.user })
})

app.post('/api/auth/logout', (req, res) => {
  req.session?.destroy(() => {
    res.json({ ok: true })
  })
})

app.get('/api/bootstrap', requireDb, requireAuth, async (req, res) => {
  const data = await getBootstrapData()
  if (req.session.user?.role === 'owner') {
    const [rows] = await pool.query(`SELECT id, username, role, created_at FROM users WHERE role = 'cashier' ORDER BY id ASC`)
    data.users = rows.map(r => ({
      id: Number(r.id),
      username: r.username,
      role: r.role,
      createdAt: new Date(r.created_at).toISOString(),
    }))
  }
  res.json({ ...data, user: req.session.user })
})

app.get('/api/users', requireDb, requireOwner, async (req, res) => {
  const [rows] = await pool.query(`SELECT id, username, role, created_at FROM users WHERE role = 'cashier' ORDER BY id ASC`)
  res.json({
    users: rows.map(r => ({
      id: Number(r.id),
      username: r.username,
      role: r.role,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  })
})

app.post('/api/users', requireDb, requireOwner, async (req, res) => {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')
  const role = String(req.body?.role || '').trim()
  if (!username || !password) return res.status(400).json({ error: 'INVALID_INPUT' })
  if (role !== 'owner' && role !== 'cashier') return res.status(400).json({ error: 'INVALID_ROLE' })

  const passwordHash = await bcrypt.hash(password, 10)
  try {
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (:u,:p,:r)',
      { u: username, p: passwordHash, r: role }
    )
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'USERNAME_TAKEN' })
    return res.status(500).json({ error: 'SERVER_ERROR' })
  }

  const [rows] = await pool.query(`SELECT id, username, role, created_at FROM users WHERE role = 'cashier' ORDER BY id ASC`)
  res.json({
    users: rows.map(r => ({
      id: Number(r.id),
      username: r.username,
      role: r.role,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  })
})

app.patch('/api/users/:id/password', requireDb, requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  const password = String(req.body?.password || '')
  if (!id || !password) return res.status(400).json({ error: 'INVALID_INPUT' })
  const passwordHash = await bcrypt.hash(password, 10)
  await pool.query('UPDATE users SET password_hash = :p WHERE id = :id', { id, p: passwordHash })
  res.json({ ok: true })
})

app.post('/api/users/:id/reset-password', requireDb, requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'INVALID_INPUT' })
  const provided = req.body?.password === undefined ? null : String(req.body?.password || '')
  const tempPassword = provided || Math.random().toString(36).slice(2, 10)
  const passwordHash = await bcrypt.hash(tempPassword, 10)
  await pool.query('UPDATE users SET password_hash = :p WHERE id = :id', { id, p: passwordHash })
  res.json({ ok: true, tempPassword })
})

app.post('/api/categories', requireDb, requireOwner, async (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'INVALID_INPUT' })
  await pool.query('INSERT INTO categories (name) VALUES (:n)', { n: name })
  const data = await getBootstrapData()
  res.json(data)
})

app.patch('/api/categories', requireDb, requireOwner, async (req, res) => {
  const oldName = String(req.body?.oldName || '').trim()
  const newName = String(req.body?.newName || '').trim()
  if (!oldName || !newName) return res.status(400).json({ error: 'INVALID_INPUT' })
  await pool.query('UPDATE categories SET name = :next WHERE name = :prev', { prev: oldName, next: newName })
  const data = await getBootstrapData()
  res.json(data)
})

app.delete('/api/categories', requireDb, requireOwner, async (req, res) => {
  const name = String(req.query?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'INVALID_INPUT' })
  if (name === 'Lainnya') return res.status(400).json({ error: 'PROTECTED' })
  const [rows] = await pool.query('SELECT id FROM categories WHERE name = :n LIMIT 1', { n: name })
  if (rows.length) {
    const id = Number(rows[0].id)
    const [otherRows] = await pool.query('SELECT id FROM categories WHERE name = :n LIMIT 1', { n: 'Lainnya' })
    const otherId = otherRows.length ? Number(otherRows[0].id) : null
    await pool.query('UPDATE menus SET category_id = :other WHERE category_id = :id', { other: otherId, id })
    await pool.query('DELETE FROM categories WHERE id = :id', { id })
  }
  const data = await getBootstrapData()
  res.json(data)
})

app.post('/api/addons', requireDb, requireOwner, async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const price = Number(req.body?.price) || 0
  const hpp = Number(req.body?.hpp) || 0
  if (!name) return res.status(400).json({ error: 'INVALID_INPUT' })
  await pool.query('INSERT INTO add_ons (name, price, hpp) VALUES (:n,:p,:h)', { n: name, p: price, h: hpp })
  const data = await getBootstrapData()
  res.json(data)
})

app.put('/api/addons/:id', requireDb, requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  const name = String(req.body?.name || '').trim()
  const price = Number(req.body?.price) || 0
  const hpp = Number(req.body?.hpp) || 0
  if (!id || !name) return res.status(400).json({ error: 'INVALID_INPUT' })
  await pool.query('UPDATE add_ons SET name = :n, price = :p, hpp = :h WHERE id = :id', { id, n: name, p: price, h: hpp })
  const data = await getBootstrapData()
  res.json(data)
})

app.delete('/api/addons/:id', requireDb, requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'INVALID_INPUT' })
  await pool.query('UPDATE add_ons SET active = 0 WHERE id = :id', { id })
  await pool.query('DELETE FROM menu_add_ons WHERE add_on_id = :id', { id })
  const data = await getBootstrapData()
  res.json(data)
})

app.post('/api/menus', requireDb, requireOwner, async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const price = Number(req.body?.price) || 0
  const hpp = Number(req.body?.hpp) || 0
  const category = String(req.body?.category || '').trim() || 'Lainnya'
  const addOnIds = Array.isArray(req.body?.addOnIds) ? req.body.addOnIds.map(Number).filter(Boolean) : []
  const image = req.body?.image === undefined ? null : req.body?.image
  if (!name) return res.status(400).json({ error: 'INVALID_INPUT' })

  const [catRows] = await pool.query('SELECT id FROM categories WHERE name = :n LIMIT 1', { n: category })
  let categoryId = catRows.length ? Number(catRows[0].id) : null
  if (!categoryId) {
    const [result] = await pool.query('INSERT INTO categories (name) VALUES (:n)', { n: category })
    categoryId = Number(result.insertId)
  }

  let imageMime = null
  let imageBlob = null
  if (typeof image === 'string' && image.startsWith('data:')) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return res.status(400).json({ error: 'INVALID_IMAGE' })
    imageMime = match[1]
    const b64 = match[2]
    if (b64.length > 200_000) return res.status(413).json({ error: 'IMAGE_TOO_LARGE' })
    imageBlob = Buffer.from(b64, 'base64')
  }

  const [result] = await pool.query(
    'INSERT INTO menus (name, price, hpp, category_id, image_mime, image_blob) VALUES (:n,:p,:h,:c,:im,:ib)',
    { n: name, p: price, h: hpp, c: categoryId, im: imageMime, ib: imageBlob }
  )
  const menuId = Number(result.insertId)

  if (addOnIds.length) {
    const values = addOnIds.map((id) => [menuId, id])
    await pool.query('INSERT IGNORE INTO menu_add_ons (menu_id, add_on_id) VALUES ?', [values])
  }

  const data = await getBootstrapData()
  res.json(data)
})

app.put('/api/menus/:id', requireDb, requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  const name = String(req.body?.name || '').trim()
  const price = Number(req.body?.price) || 0
  const hpp = Number(req.body?.hpp) || 0
  const category = String(req.body?.category || '').trim() || 'Lainnya'
  const addOnIds = Array.isArray(req.body?.addOnIds) ? req.body.addOnIds.map(Number).filter(Boolean) : []
  const image = req.body?.image === undefined ? undefined : req.body?.image
  if (!id || !name) return res.status(400).json({ error: 'INVALID_INPUT' })

  const [catRows] = await pool.query('SELECT id FROM categories WHERE name = :n LIMIT 1', { n: category })
  let categoryId = catRows.length ? Number(catRows[0].id) : null
  if (!categoryId) {
    const [result] = await pool.query('INSERT INTO categories (name) VALUES (:n)', { n: category })
    categoryId = Number(result.insertId)
  }

  let imageMime = null
  let imageBlob = null
  let imageSql = ''
  if (image === null) {
    imageSql = ', image_mime = NULL, image_blob = NULL'
  } else if (typeof image === 'string' && image.startsWith('data:')) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return res.status(400).json({ error: 'INVALID_IMAGE' })
    imageMime = match[1]
    const b64 = match[2]
    if (b64.length > 200_000) return res.status(413).json({ error: 'IMAGE_TOO_LARGE' })
    imageBlob = Buffer.from(b64, 'base64')
    imageSql = ', image_mime = :im, image_blob = :ib'
  }

  await pool.query(
    `UPDATE menus SET name = :n, price = :p, hpp = :h, category_id = :c${imageSql} WHERE id = :id`,
    { id, n: name, p: price, h: hpp, c: categoryId, im: imageMime, ib: imageBlob }
  )

  await pool.query('DELETE FROM menu_add_ons WHERE menu_id = :id', { id })
  if (addOnIds.length) {
    const values = addOnIds.map((aid) => [id, aid])
    await pool.query('INSERT IGNORE INTO menu_add_ons (menu_id, add_on_id) VALUES ?', [values])
  }

  const data = await getBootstrapData()
  res.json(data)
})

app.delete('/api/menus/:id', requireDb, requireOwner, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'INVALID_INPUT' })
  await pool.query('UPDATE menus SET active = 0 WHERE id = :id', { id })
  await pool.query('DELETE FROM menu_add_ons WHERE menu_id = :id', { id })
  const data = await getBootstrapData()
  res.json(data)
})

app.post('/api/shifts/open', requireDb, requireAuth, async (req, res) => {
  const openingBalance = Number(req.body?.openingBalance) || 0
  const openId = await getOpenShiftId()
  if (openId) return res.status(409).json({ error: 'SHIFT_ALREADY_OPEN' })
  const [result] = await pool.query('INSERT INTO shifts (opened_at, opening_balance) VALUES (NOW(), :o)', { o: openingBalance })
  res.json({ shiftId: Number(result.insertId) })
})

app.post('/api/shifts/close', requireDb, requireAuth, async (req, res) => {
  const closingCash = Number(req.body?.closingCash) || 0
  const shiftId = await getOpenShiftId()
  if (!shiftId) return res.status(409).json({ error: 'NO_OPEN_SHIFT' })

  const [txRows] = await pool.query(
    'SELECT payment_method, total FROM transactions WHERE shift_id = :id',
    { id: shiftId }
  )
  const cashSales = txRows.filter(r => r.payment_method === 'Cash').reduce((acc, r) => acc + (Number(r.total) || 0), 0)
  const qrisSales = txRows.filter(r => r.payment_method === 'QRIS').reduce((acc, r) => acc + (Number(r.total) || 0), 0)

  const [[shiftRow]] = await pool.query('SELECT opening_balance FROM shifts WHERE id = :id', { id: shiftId })
  const opening = Number(shiftRow?.opening_balance) || 0
  const expectedCash = opening + cashSales
  const difference = closingCash - expectedCash

  await pool.query(
    `UPDATE shifts SET
      closed_at = NOW(),
      closing_cash = :c,
      cash_sales = :cs,
      qris_sales = :qs,
      expected_cash = :e,
      difference = :d
     WHERE id = :id`,
    { id: shiftId, c: closingCash, cs: cashSales, qs: qrisSales, e: expectedCash, d: difference }
  )

  res.json({ shiftId, openingBalance: opening, cashSales, qrisSales, closingCash, difference })
})

app.post('/api/transactions', requireDb, requireAuth, async (req, res) => {
  const paymentMethod = String(req.body?.paymentMethod || '')
  const customerName = String(req.body?.customerName || '').trim()
  const subtotal = Number(req.body?.subtotal) || 0
  const total = Number(req.body?.total) || 0
  const cashAmount = req.body?.cashAmount === '' || req.body?.cashAmount === null ? null : Number(req.body?.cashAmount) || 0
  const changeAmount = req.body?.changeAmount === '' || req.body?.changeAmount === null ? null : Number(req.body?.changeAmount) || 0
  const items = Array.isArray(req.body?.items) ? req.body.items : []

  if (paymentMethod !== 'Cash' && paymentMethod !== 'QRIS') return res.status(400).json({ error: 'INVALID_INPUT' })
  if (!items.length) return res.status(400).json({ error: 'EMPTY_ITEMS' })

  const shiftId = await getOpenShiftId()
  if (!shiftId) return res.status(409).json({ error: 'NO_OPEN_SHIFT' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [[nowRow]] = await conn.query(`SELECT DATE_FORMAT(NOW(), '%y%m%d') AS ymd, DATE_FORMAT(NOW(), '%Y%m') AS ym`)
    const ymd = String(nowRow?.ymd || '')
    const ym = String(nowRow?.ym || '')

    await conn.query(
      `INSERT INTO tx_sequences (ym, last_seq)
       VALUES (:ym, 0)
       ON DUPLICATE KEY UPDATE last_seq = last_seq`,
      { ym }
    )
    await conn.query('UPDATE tx_sequences SET last_seq = LAST_INSERT_ID(last_seq + 1) WHERE ym = :ym', { ym })
    const [[seqRow]] = await conn.query('SELECT LAST_INSERT_ID() AS seq')
    const seq = Number(seqRow?.seq) || 1
    const publicId = `${ymd}-${String(seq).padStart(3, '0')}`

    const [txResult] = await conn.query(
      `INSERT INTO transactions (public_id, shift_id, date, payment_method, customer_name, subtotal, total, cash_amount, change_amount)
       VALUES (:pid, :s, NOW(), :pm, :cn, :st, :t, :ca, :ch)`,
      { pid: publicId, s: shiftId, pm: paymentMethod, cn: customerName || null, st: subtotal, t: total, ca: cashAmount, ch: changeAmount }
    )
    const txId = Number(txResult.insertId)

    for (const item of items) {
      const menuId = item?.menuId ? Number(item.menuId) : item?.id ? Number(item.id) : null
      const name = String(item?.name || '').trim()
      const price = Number(item?.price) || 0
      const hpp = Number(item?.hpp) || 0
      const qty = Math.max(1, Number(item?.qty) || 1)
      if (!name) continue

      const [itemResult] = await conn.query(
        `INSERT INTO transaction_items (transaction_id, menu_id, name, price, hpp, qty)
         VALUES (:tx, :mid, :n, :p, :h, :q)`,
        { tx: txId, mid: menuId, n: name, p: price, h: hpp, q: qty }
      )
      const itemId = Number(itemResult.insertId)

      const addOns = Array.isArray(item?.addOns) ? item.addOns : []
      for (const addOn of addOns) {
        const addOnId = addOn?.id ? Number(addOn.id) : null
        const addOnName = String(addOn?.name || '').trim()
        const addOnPrice = Number(addOn?.price) || 0
        const addOnHpp = Number(addOn?.hpp) || 0
        if (!addOnName) continue
        await conn.query(
          `INSERT INTO transaction_item_addons (transaction_item_id, add_on_id, name, price, hpp)
           VALUES (:ti, :aid, :n, :p, :h)`,
          { ti: itemId, aid: addOnId, n: addOnName, p: addOnPrice, h: addOnHpp }
        )
      }
    }

    await conn.commit()
    const data = await getBootstrapData()
    res.json({ ...data, createdTransactionId: txId })
  } catch {
    await conn.rollback()
    res.status(500).json({ error: 'SERVER_ERROR' })
  } finally {
    conn.release()
  }
})

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', method: req.method, path: req.originalUrl })
})

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)

  const status = Number(err?.status) || 500
  if (status === 400 && err instanceof SyntaxError) {
    return res.status(400).json({ error: 'INVALID_JSON' })
  }

  process.stderr.write(`${err?.stack || err}\n`)
  res.status(500).json({ error: 'SERVER_ERROR' })
})

const start = async () => {
  app.listen(port, () => {
    process.stdout.write(`server listening on ${port}\n`)
  })
  ensureDbReady().catch(() => {})
}

start().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`)
  process.exit(1)
})
