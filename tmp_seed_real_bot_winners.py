import paramiko

HOST = "166.88.141.54"
PORT = 22
USERNAME = "root"
PASSWORD = "N2w2E8G5U1E3bcA6f1A4"

remote_command = r'''cd /www/wwwroot/bdcs2-app && node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const targetBotCounts = new Map([
  [27, 5],
  [30, 12],
  [31, 8],
]);

const botNamePool = [
  '小北', '阿辰', '夜影', '星尘', '流火', '青柠', '南风', '川海', '晨曦', '子安',
  '白泽', '雨墨', '霜刃', '苍狼', '逐月', '鲸落', '林深', '阿曜', '飞羽', '无双',
  '墨城', '长歌', '小宇', '风吟', '九川', '海棠', '初七', '远山', '白夜', '惊鸿',
];

const BOT_PLAYER_ID_OFFSET = 1000000000;

function buildBotPlayerId(participantId) {
  return BOT_PLAYER_ID_OFFSET + Number(participantId);
}

function loadDatabaseUrl() {
  const candidates = ['.env', '.env.production', '.env.local'];
  let databaseUrl = process.env.DATABASE_URL || '';
  for (const file of candidates) {
    if (databaseUrl) break;
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key === 'DATABASE_URL') {
        databaseUrl = value;
        break;
      }
    }
  }
  return databaseUrl;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeBotNames(roomId, count) {
  const result = [];
  for (let i = 0; i < count; i += 1) {
    const base = botNamePool[i % botNamePool.length];
    result.push(`${base}${String(roomId).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`);
  }
  return result;
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  console.error('DATABASE_URL_NOT_FOUND');
  process.exit(2);
}

const conn = await mysql.createConnection(databaseUrl);
try {
  const roomIds = [...targetBotCounts.keys()];
  const roomIdList = roomIds.join(',');

  const [rooms] = await conn.query(`
    SELECT id, title, status, participantCount, botCount, totalPrizes, totalValue, endAt
    FROM rollRooms
    WHERE id IN (${roomIdList})
    ORDER BY id
  `);
  const [prizes] = await conn.query(`
    SELECT id, rollRoomId, name, value, quantity
    FROM rollRoomPrizes
    WHERE rollRoomId IN (${roomIdList})
    ORDER BY rollRoomId, id
  `);
  const [participants] = await conn.query(`
    SELECT id, rollRoomId, playerId, isBot, botNickname, botAvatar, createdAt
    FROM rollParticipants
    WHERE rollRoomId IN (${roomIdList})
    ORDER BY id
  `);
  const [winners] = await conn.query(`
    SELECT id, rollRoomId, prizeId, playerId, isBot, nicknameSnapshot, isDesignated, createdAt
    FROM rollWinners
    WHERE rollRoomId IN (${roomIdList})
    ORDER BY id
  `);

  const backupDir = path.posix.join('/www/wwwroot/bdcs2-app-backups', 'manual_roll_room_real_bot_seed');
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const backupPath = path.posix.join(backupDir, `roll_room_real_bot_seed_${stamp}.json`);
  await conn.query(`CREATE TABLE IF NOT EXISTS rollRoomBotSeedBackups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backupPath VARCHAR(500) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify({ rooms, prizes, participants, winners }, null, 2), 'utf8');
  await conn.query('INSERT INTO rollRoomBotSeedBackups (backupPath) VALUES (?)', [backupPath]);

  const participantByRoom = new Map();
  const winnerByRoom = new Map();
  const prizeByRoom = new Map();
  for (const row of participants) {
    const key = Number(row.rollRoomId);
    const list = participantByRoom.get(key) || [];
    list.push(row);
    participantByRoom.set(key, list);
  }
  for (const row of winners) {
    const key = Number(row.rollRoomId);
    const list = winnerByRoom.get(key) || [];
    list.push(row);
    winnerByRoom.set(key, list);
  }
  for (const row of prizes) {
    const key = Number(row.rollRoomId);
    const list = prizeByRoom.get(key) || [];
    list.push(row);
    prizeByRoom.set(key, list);
  }

  const results = [];
  for (const room of rooms) {
    const roomId = Number(room.id);
    const existingParticipants = participantByRoom.get(roomId) || [];
    const existingWinners = winnerByRoom.get(roomId) || [];
    const roomPrizes = prizeByRoom.get(roomId) || [];
    const targetCount = Number(targetBotCounts.get(roomId) || 0);

    if (room.status !== 'ended') {
      results.push({ roomId, title: room.title, skipped: true, reason: 'not_ended' });
      continue;
    }
    if (existingParticipants.length > 0 || existingWinners.length > 0) {
      results.push({
        roomId,
        title: room.title,
        skipped: true,
        reason: 'already_has_records',
        existingParticipants: existingParticipants.length,
        existingWinners: existingWinners.length,
      });
      continue;
    }
    if (roomPrizes.length === 0) {
      results.push({ roomId, title: room.title, skipped: true, reason: 'no_prizes' });
      continue;
    }

    const botNames = makeBotNames(roomId, targetCount);
    const endAt = new Date(room.endAt);
    const participantValues = botNames.map((botName, index) => {
      const createdAt = new Date(endAt.getTime() - (targetCount - index) * 3 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      return [roomId, 0, 1, botName, '', createdAt];
    });

    const participantPlayerIdByName = new Map();
    if (participantValues.length > 0) {
      await conn.query(
        'INSERT INTO rollParticipants (rollRoomId, playerId, isBot, botNickname, botAvatar, createdAt) VALUES ?',
        [participantValues]
      );
      const [insertedParticipants] = await conn.query(
        `SELECT id, botNickname, playerId FROM rollParticipants WHERE rollRoomId = ? AND isBot = 1 ORDER BY id`,
        [roomId]
      );
      for (const row of insertedParticipants) {
        const nextPlayerId = buildBotPlayerId(row.id);
        if (Number(row.playerId || 0) !== nextPlayerId) {
          await conn.query('UPDATE rollParticipants SET playerId = ? WHERE id = ?', [nextPlayerId, row.id]);
        }
        participantPlayerIdByName.set(row.botNickname, nextPlayerId);
      }
      await conn.query(
        'UPDATE rollRooms SET participantCount = participantCount + ?, botCount = botCount + ? WHERE id = ?',
        [participantValues.length, participantValues.length, roomId]
      );
    }

    const prizeSlots = [];
    for (const prize of roomPrizes) {
      const quantity = Math.max(0, Number(prize.quantity || 0));
      for (let i = 0; i < quantity; i += 1) {
        prizeSlots.push({ prizeId: Number(prize.id), prizeName: prize.name, prizeValue: Number(prize.value || 0) });
      }
    }

    const shuffledSlots = shuffle(prizeSlots);
    const shuffledBots = shuffle(botNames);
    const winnerCount = Math.min(shuffledSlots.length, shuffledBots.length);
    const winnerValues = [];
    const assigned = [];
    for (let i = 0; i < winnerCount; i += 1) {
      const createdAt = new Date(endAt.getTime() - (winnerCount - i) * 20 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      winnerValues.push([roomId, shuffledSlots[i].prizeId, participantPlayerIdByName.get(shuffledBots[i]) || 0, 1, shuffledBots[i], 0, createdAt]);
      assigned.push({ botNickname: shuffledBots[i], prizeId: shuffledSlots[i].prizeId, prizeName: shuffledSlots[i].prizeName, prizeValue: shuffledSlots[i].prizeValue });
    }

    if (winnerValues.length > 0) {
      await conn.query(
        'INSERT INTO rollWinners (rollRoomId, prizeId, playerId, isBot, nicknameSnapshot, isDesignated, createdAt) VALUES ?',
        [winnerValues]
      );
    }

    results.push({
      roomId,
      title: room.title,
      addedBots: participantValues.length,
      addedBotWinners: winnerValues.length,
      newParticipantCount: Number(room.participantCount || 0) + participantValues.length,
      newBotCount: Number(room.botCount || 0) + participantValues.length,
      assignedWinners: assigned,
    });
  }

  console.log(JSON.stringify({ backupPath, results }, null, 2));
} finally {
  await conn.end();
}
NODE'''

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
try:
    stdin, stdout, stderr = client.exec_command(remote_command, timeout=180)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(out, end='' if out.endswith('\n') else '\n')
    if err:
        print(err, end='' if err.endswith('\n') else '\n')
    if exit_code != 0:
        raise RuntimeError(f'remote seed failed: {exit_code}')
finally:
    client.close()
