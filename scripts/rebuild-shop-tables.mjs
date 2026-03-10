import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

await conn.execute('DROP TABLE IF EXISTS `shopOrders`');
await conn.execute('DROP TABLE IF EXISTS `shopItems`');

await conn.execute(`
  CREATE TABLE \`shopItems\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`templateId\` varchar(50) NOT NULL DEFAULT '',
    \`typeId\` varchar(50) NOT NULL DEFAULT '',
    \`typeName\` varchar(100) NOT NULL DEFAULT '',
    \`typeHashName\` varchar(200) NOT NULL DEFAULT '',
    \`weaponId\` int NOT NULL DEFAULT 0,
    \`weaponHashName\` varchar(200) NOT NULL DEFAULT '',
    \`templateHashName\` varchar(200) NOT NULL DEFAULT '',
    \`templateName\` varchar(300) NOT NULL DEFAULT '',
    \`iconUrl\` varchar(500) NOT NULL DEFAULT '',
    \`exteriorName\` varchar(100) NOT NULL DEFAULT '',
    \`rarityName\` varchar(100) NOT NULL DEFAULT '',
    \`minSellPrice\` decimal(15,2) NOT NULL DEFAULT '0.00',
    \`fastShippingMinSellPrice\` decimal(15,2) NOT NULL DEFAULT '0.00',
    \`referencePrice\` decimal(15,2) NOT NULL DEFAULT '0.00',
    \`sellNum\` int NOT NULL DEFAULT 0,
    \`enabled\` int NOT NULL DEFAULT 1,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`shopItems_id\` PRIMARY KEY(\`id\`)
  )
`);

await conn.execute(`
  CREATE TABLE \`shopOrders\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`playerId\` int NOT NULL,
    \`shopItemId\` int NOT NULL,
    \`orderNo\` varchar(100) NOT NULL DEFAULT '',
    \`price\` decimal(10,2) NOT NULL DEFAULT '0.00',
    \`status\` varchar(20) NOT NULL DEFAULT 'pending',
    \`itemName\` varchar(200) NOT NULL DEFAULT '',
    \`itemIcon\` varchar(500) NOT NULL DEFAULT '',
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`shopOrders_id\` PRIMARY KEY(\`id\`)
  )
`);

console.log('shopItems and shopOrders tables created successfully');
await conn.end();
