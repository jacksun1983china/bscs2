-- 删除现有Roll房间数据
DELETE FROM rollRoomPrizes;
DELETE FROM rollRooms;

-- CDN URLs
-- awp_dragon_lore: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/QlgzxpHfieNgfOvG.png
-- butterfly_fade: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/YHghCcNuLhenIpHN.jpg
-- ak47_case_hardened: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/ywfHKldzjWpaJRfg.png
-- gloves_superconductor: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/PtkwXXTJRPsMjOef.png
-- deagle_blaze: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/qQphbWXICEvvuxuX.png
-- m4a4_howl: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/wYqmCFohXSiRdScu.png
-- karambit_emerald: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/MFgvlSfdCsfqjydk.webp
-- usps_kill_confirmed: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/KZruMRfXQhbIVFSK.jpg
-- gloves_hedge_maze: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/IvtwxXKFrnZaybJB.png
-- ak47_asiimov: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/LWYIDUYHImTbyGqL.png
-- butterfly_night: https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/ampDKhUstQSVIKgg.png

-- Room 1: 龙之传说ROLL房 (免费, 200人, 72小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('【传说】龙之传说ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/QlgzxpHfieNgfOvG.png', 0.00, 200, NOW(), DATE_ADD(NOW(), INTERVAL 72 HOUR), 'pending', 10152.00, 8, 'admin');
SET @r1 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r1, 'AWP | 龙之传说 (崭新出厂)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/QlgzxpHfieNgfOvG.png', 8888.00, 1, 'shopCoin', 'item', 'roll'),
(@r1, '商城金币 888', '', 888.00, 2, 'shopCoin', 'coin', 'roll'),
(@r1, '商城金币 188', '', 188.00, 5, 'shopCoin', 'coin', 'roll');

-- Room 2: 蝴蝶刀狂欢ROLL房 (100门槛, 100人, 48小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('【限时】蝴蝶刀狂欢ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/YHghCcNuLhenIpHN.jpg', 100.00, 100, NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR), 'pending', 5300.00, 5, 'admin');
SET @r2 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r2, '蝴蝶刀 | 渐变 (崭新出厂)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/YHghCcNuLhenIpHN.jpg', 3200.00, 1, 'shopCoin', 'item', 'roll'),
(@r2, '蝴蝶刀 | 暗夜 (略有磨损)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/ampDKhUstQSVIKgg.png', 1500.00, 1, 'shopCoin', 'item', 'roll'),
(@r2, '商城金币 200', '', 200.00, 3, 'shopCoin', 'coin', 'roll');

-- Room 3: AK-47精英对决ROLL房 (50门槛, 150人, 96小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('AK-47 精英对决ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/ywfHKldzjWpaJRfg.png', 50.00, 150, NOW(), DATE_ADD(NOW(), INTERVAL 96 HOUR), 'pending', 4360.00, 8, 'admin');
SET @r3 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r3, 'AK-47 | 表面淬火 (崭新出厂)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/ywfHKldzjWpaJRfg.png', 2500.00, 1, 'shopCoin', 'item', 'roll'),
(@r3, 'AK-47 | 二西莫夫 (略有磨损)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/LWYIDUYHImTbyGqL.png', 680.00, 2, 'shopCoin', 'item', 'roll'),
(@r3, '商城金币 100', '', 100.00, 5, 'shopCoin', 'coin', 'roll');

-- Room 4: VIP专属手套珍藏ROLL房 (500门槛, 30人, 120小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('【VIP专属】手套珍藏ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/PtkwXXTJRPsMjOef.png', 500.00, 30, NOW(), DATE_ADD(NOW(), INTERVAL 120 HOUR), 'pending', 8700.00, 4, 'admin');
SET @r4 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r4, '运动手套 | 超导体 (崭新出厂)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/PtkwXXTJRPsMjOef.png', 5500.00, 1, 'shopCoin', 'item', 'roll'),
(@r4, '运动手套 | 树篱迷宫 (略有磨损)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/IvtwxXKFrnZaybJB.png', 2200.00, 1, 'shopCoin', 'item', 'roll'),
(@r4, '商城金币 500', '', 500.00, 2, 'shopCoin', 'coin', 'roll');

-- Room 5: 新手福利ROLL房 (免费, 500人, 168小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('新手福利ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/qQphbWXICEvvuxuX.png', 0.00, 500, NOW(), DATE_ADD(NOW(), INTERVAL 168 HOUR), 'pending', 1750.00, 31, 'admin');
SET @r5 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r5, '沙漠之鹰 | 炽焰 (崭新出厂)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/qQphbWXICEvvuxuX.png', 850.00, 1, 'shopCoin', 'item', 'roll'),
(@r5, '商城金币 50', '', 50.00, 10, 'shopCoin', 'coin', 'roll'),
(@r5, '商城金币 20', '', 20.00, 20, 'shopCoin', 'coin', 'roll');

-- Room 6: M4A4咆哮ROLL房 (200门槛, 80人, 72小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('M4A4 咆哮ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/wYqmCFohXSiRdScu.png', 200.00, 80, NOW(), DATE_ADD(NOW(), INTERVAL 72 HOUR), 'pending', 7400.00, 9, 'admin');
SET @r6 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r6, 'M4A4 | 咆哮 (崭新出厂)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/wYqmCFohXSiRdScu.png', 6000.00, 1, 'shopCoin', 'item', 'roll'),
(@r6, '商城金币 300', '', 300.00, 3, 'shopCoin', 'coin', 'roll'),
(@r6, '商城金币 100', '', 100.00, 5, 'shopCoin', 'coin', 'roll');

-- Room 7: 爪子刀ROLL房 (300门槛, 50人, 48小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('【周末特惠】爪子刀ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/MFgvlSfdCsfqjydk.webp', 300.00, 50, NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR), 'pending', 14000.00, 4, 'admin');
SET @r7 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r7, '爪子刀 | 翡翠 (崭新出厂)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/MFgvlSfdCsfqjydk.webp', 12000.00, 1, 'shopCoin', 'item', 'roll'),
(@r7, '商城金币 1000', '', 1000.00, 1, 'shopCoin', 'coin', 'roll'),
(@r7, '商城金币 500', '', 500.00, 2, 'shopCoin', 'coin', 'roll');

-- Room 8: USP-S精准射击ROLL房 (免费, 300人, 96小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('USP-S 精准射击ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/KZruMRfXQhbIVFSK.jpg', 0.00, 300, NOW(), DATE_ADD(NOW(), INTERVAL 96 HOUR), 'pending', 1600.00, 17, 'admin');
SET @r8 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r8, 'USP-S | 击杀确认 (崭新出厂)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/KZruMRfXQhbIVFSK.jpg', 450.00, 2, 'shopCoin', 'item', 'roll'),
(@r8, '商城金币 80', '', 80.00, 5, 'shopCoin', 'coin', 'roll'),
(@r8, '商城金币 30', '', 30.00, 10, 'shopCoin', 'coin', 'roll');

-- Room 9: 金币大放送ROLL房 (100门槛, 200人, 72小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('【充值返利】金币大放送ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/LWYIDUYHImTbyGqL.png', 100.00, 200, NOW(), DATE_ADD(NOW(), INTERVAL 72 HOUR), 'pending', 5180.00, 15, 'admin');
SET @r9 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r9, '商城金币 2000', '', 2000.00, 1, 'shopCoin', 'coin', 'roll'),
(@r9, '商城金币 500', '', 500.00, 3, 'shopCoin', 'coin', 'roll'),
(@r9, '商城金币 100', '', 100.00, 10, 'shopCoin', 'coin', 'roll'),
(@r9, 'AK-47 | 二西莫夫 (略有磨损)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/LWYIDUYHImTbyGqL.png', 680.00, 1, 'shopCoin', 'item', 'roll');

-- Room 10: 每日签到幸运ROLL房 (免费, 1000人, 24小时)
INSERT INTO rollRooms (title, avatarUrl, threshold, maxParticipants, startAt, endAt, status, totalValue, totalPrizes, createdBy)
VALUES ('【每日签到】幸运ROLL房', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/IvtwxXKFrnZaybJB.png', 0.00, 1000, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), 'pending', 2700.00, 151, 'admin');
SET @r10 = LAST_INSERT_ID();
INSERT INTO rollRoomPrizes (rollRoomId, name, imageUrl, value, quantity, coinType, prizeType, itemCategory) VALUES
(@r10, '运动手套 | 树篱迷宫 (略有磨损)', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663439837567/IvtwxXKFrnZaybJB.png', 2200.00, 1, 'shopCoin', 'item', 'roll'),
(@r10, '商城金币 10', '', 10.00, 50, 'shopCoin', 'coin', 'roll'),
(@r10, '商城金币 5', '', 5.00, 100, 'shopCoin', 'coin', 'roll');

-- 验证
SELECT id, title, threshold, maxParticipants, totalValue, totalPrizes, status FROM rollRooms ORDER BY id;
SELECT rollRoomId, name, value, quantity, prizeType FROM rollRoomPrizes ORDER BY rollRoomId, id;
