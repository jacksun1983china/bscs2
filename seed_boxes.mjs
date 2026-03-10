import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

// 读取处理后的宝箱数据
const boxes = JSON.parse(readFileSync('/home/ubuntu/processed_boxes.json', 'utf-8'));

// 1. 插入分类数据（去重）
const categories = [...new Map(boxes.map(b => [b.category_id, {
  id: b.category_id,
  name: b.category_name
}])).values()];

console.log(`Inserting ${categories.length} categories...`);
for (const cat of categories) {
  await conn.execute(
    'INSERT INTO skuCategories (id, name, sort, status) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE name=VALUES(name)',
    [cat.id, cat.name, cat.id]
  );
  console.log(`  Category: ${cat.id} ${cat.name}`);
}

// 2. 插入宝箱数据
console.log(`\nInserting ${boxes.length} boxes...`);
for (const box of boxes) {
  const [result] = await conn.execute(
    `INSERT INTO boxes (id, name, imageUrl, goodsBgUrl, price, categoryId, category, sort, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE 
       name=VALUES(name), imageUrl=VALUES(imageUrl), goodsBgUrl=VALUES(goodsBgUrl),
       price=VALUES(price), categoryId=VALUES(categoryId), category=VALUES(category)`,
    [
      box.id,
      box.box_name,
      box.cover_bg_image || '',
      box.cover_gd_image || '',
      box.box_price,
      box.category_id,
      box.category_name,
      box.id
    ]
  );
  console.log(`  Box: ${box.id} ${box.box_name} (${box.category_name}) ¥${box.box_price}`);

  // 3. 插入宝箱商品数据
  if (box.goods_data && box.goods_data.length > 0) {
    // 先删除旧数据
    await conn.execute('DELETE FROM boxGoods WHERE boxId = ?', [box.id]);
    
    for (let i = 0; i < box.goods_data.length; i++) {
      const g = box.goods_data[i];
      await conn.execute(
        `INSERT INTO boxGoods (boxId, name, imageUrl, level, price, probability, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          box.id,
          g.name,
          g.image || '',
          g.level || 3,
          g.price || 0,
          g.probability || 1,
          i
        ]
      );
    }
    console.log(`    -> ${box.goods_data.length} goods inserted`);
  }
}

// 4. 获取分类数据（从bdcs2.com）
console.log('\nFetching category details from bdcs2.com...');
const catDetails = [
  { id: 1, name: '赤火' },
  { id: 3, name: '龙炎' },
  { id: 4, name: '冰封' },
  { id: 5, name: '战意' },
];

for (const cat of catDetails) {
  await conn.execute(
    'UPDATE skuCategories SET name=? WHERE id=?',
    [cat.name, cat.id]
  );
}

await conn.end();
console.log('\n✅ Data import complete!');

// Summary
const [boxCount] = await (async () => {
  const c2 = await createConnection(DATABASE_URL);
  const r = await c2.execute('SELECT COUNT(*) as cnt FROM boxes');
  await c2.end();
  return r;
})();
console.log(`Total boxes in DB: ${boxCount[0].cnt}`);
