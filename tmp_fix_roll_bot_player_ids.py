import paramiko

HOST = "166.88.141.54"
PORT = 22
USERNAME = "root"
PASSWORD = "N2w2E8G5U1E3bcA6f1A4"

remote_command = r'''cd /www/wwwroot/bdcs2-app && node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

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

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  console.error('DATABASE_URL_NOT_FOUND');
  process.exit(2);
}

const conn = await mysql.createConnection(databaseUrl);
try {
  const [participantsBefore] = await conn.query(`
    SELECT id, rollRoomId, playerId, isBot, botNickname, createdAt
    FROM rollParticipants
    WHERE isBot = 1
    ORDER BY rollRoomId, id
  `);
  const [winnersBefore] = await conn.query(`
    SELECT id, rollRoomId, prizeId, playerId, isBot, nicknameSnapshot, createdAt
    FROM rollWinners
    WHERE isBot = 1
    ORDER BY rollRoomId, id
  `);

  const backupDir = path.posix.join('/www/wwwroot/bdcs2-app-backups', 'manual_roll_bot_player_id_fix');
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const backupPath = path.posix.join(backupDir, `roll_bot_player_id_fix_${stamp}.json`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify({ participantsBefore, winnersBefore }, null, 2), 'utf8');

  const participantUpdates = [];
  const participantPlayerIdByRoomAndName = new Map();
  for (const row of participantsBefore) {
    const newPlayerId = buildBotPlayerId(row.id);
    if (Number(row.playerId || 0) !== newPlayerId) {
      await conn.query('UPDATE rollParticipants SET playerId = ? WHERE id = ?', [newPlayerId, row.id]);
      participantUpdates.push({
        id: Number(row.id),
        rollRoomId: Number(row.rollRoomId),
        botNickname: row.botNickname,
        oldPlayerId: Number(row.playerId || 0),
        newPlayerId,
      });
    }
    participantPlayerIdByRoomAndName.set(`${row.rollRoomId}__${row.botNickname || ''}`, newPlayerId);
  }

  const winnerUpdates = [];
  const winnerMisses = [];
  for (const row of winnersBefore) {
    const key = `${row.rollRoomId}__${row.nicknameSnapshot || ''}`;
    const mappedPlayerId = participantPlayerIdByRoomAndName.get(key);
    if (!mappedPlayerId) {
      winnerMisses.push({
        id: Number(row.id),
        rollRoomId: Number(row.rollRoomId),
        nicknameSnapshot: row.nicknameSnapshot,
        oldPlayerId: Number(row.playerId || 0),
      });
      continue;
    }
    if (Number(row.playerId || 0) !== mappedPlayerId) {
      await conn.query('UPDATE rollWinners SET playerId = ? WHERE id = ?', [mappedPlayerId, row.id]);
      winnerUpdates.push({
        id: Number(row.id),
        rollRoomId: Number(row.rollRoomId),
        nicknameSnapshot: row.nicknameSnapshot,
        oldPlayerId: Number(row.playerId || 0),
        newPlayerId: mappedPlayerId,
      });
    }
  }

  const [participantsAfter] = await conn.query(`
    SELECT rollRoomId, COUNT(*) AS totalBots,
           SUM(CASE WHEN playerId > 0 THEN 1 ELSE 0 END) AS botsWithPlayerId,
           MIN(playerId) AS minPlayerId,
           MAX(playerId) AS maxPlayerId
    FROM rollParticipants
    WHERE isBot = 1
    GROUP BY rollRoomId
    ORDER BY rollRoomId
  `);
  const [winnersAfter] = await conn.query(`
    SELECT rollRoomId, COUNT(*) AS totalBotWinners,
           SUM(CASE WHEN playerId > 0 THEN 1 ELSE 0 END) AS botWinnersWithPlayerId,
           MIN(playerId) AS minPlayerId,
           MAX(playerId) AS maxPlayerId
    FROM rollWinners
    WHERE isBot = 1
    GROUP BY rollRoomId
    ORDER BY rollRoomId
  `);

  console.log(JSON.stringify({
    backupPath,
    participantUpdates,
    winnerUpdates,
    winnerMisses,
    participantsAfter,
    winnersAfter,
  }, null, 2));
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
        raise RuntimeError(f'remote fix failed: {exit_code}')
finally:
    client.close()
