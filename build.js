// Database script: creates + seeds the SQLite database, then assembles dist/ for Netlify.
const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE partners(id INTEGER PRIMARY KEY, name TEXT, kind TEXT);
    CREATE TABLE products(id INTEGER PRIMARY KEY, sku TEXT, name TEXT, icon TEXT, uom TEXT,
                          tracking TEXT, price REAL, stock INTEGER DEFAULT 0);
    CREATE TABLE moves(id INTEGER PRIMARY KEY, type TEXT, partner_id INTEGER, product_id INTEGER,
                       qty INTEGER, status TEXT DEFAULT 'draft', created TEXT DEFAULT CURRENT_TIMESTAMP);
  `);
  const partners = [['Karachi Wholesale Traders','vendor'],['Indus Packaging Co.','vendor'],['Lahore Tech Supply','vendor'],
                    ['Hassan Retail Store','customer'],['Bahria Office Mart','customer'],['Campus Stationery Hub','customer']];
  partners.forEach(p => db.run('INSERT INTO partners(name,kind) VALUES(?,?)', p));
  const products = [['LAP-001','Laptop 14"','💻','Units','Serial',145000],['MOU-002','Wireless Mouse','🖱️','Units','None',1800],
    ['KEY-003','Mechanical Keyboard','⌨️','Units','None',7500],['MON-004','27" Monitor','🖥️','Units','Serial',46000],
    ['HDP-005','Headphones','🎧','Units','None',9200],['USB-006','USB-C Hub','🔌','Units','Lots',3400],
    ['CAM-007','HD Webcam','📷','Units','None',5200],['PAP-008','A4 Paper Ream','📄','Units','Lots',1250]];
  products.forEach(p => db.run('INSERT INTO products(sku,name,icon,uom,tracking,price) VALUES(?,?,?,?,?,?)', p));
  // opening validated receipts and deliveries
  [[1,1,1,40],[1,2,2,300],[1,3,3,120],[1,1,4,25],[1,2,5,80],[1,3,6,150],[1,3,7,60],[1,2,8,500],
   [2,4,1,12],[2,5,2,90],[2,6,8,140],[2,4,5,15]].forEach(([t,p,pr,q]) =>
    db.run("INSERT INTO moves(type,partner_id,product_id,qty,status) VALUES(?,?,?,?,'done')", [t===1?'receipt':'delivery', p, pr, q]));
  // stock is derived from validated moves
  db.run(`UPDATE products SET stock=(SELECT COALESCE(SUM(CASE type WHEN 'receipt' THEN qty ELSE -qty END),0)
          FROM moves WHERE product_id=products.id AND status='done')`);

  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/inventory.db', Buffer.from(db.export()));
  fs.copyFileSync('index.html', 'dist/index.html');
  // embedded copy so the site also works when index.html is opened by double-click
  const js = 'window.DB_B64="' + Buffer.from(db.export()).toString('base64') + '";';
  fs.writeFileSync('dist/inventory-data.js', js);
  fs.writeFileSync('inventory-data.js', js);
  const n = db.exec('SELECT COUNT(*), SUM(stock) FROM products')[0].values[0];
  console.log(`Database built: ${n[0]} products, ${n[1]} units in stock -> dist/inventory.db`);
})();
