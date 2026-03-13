import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rooms] = await conn.execute("SELECT id, roomNo, status, currentPlayers, maxPlayers, currentRound, rounds FROM arenaRooms WHERE roomNo = '239173'");
console.log('Room:', JSON.stringify(rooms, null, 2));

if (rooms.length > 0) {
  const roomId = rooms[0].id;
  const [players] = await conn.execute("SELECT id, roomId, playerId, nickname, seatNo FROM arenaRoomPlayers WHERE roomId = ?", [roomId]);
  console.log('Players:', JSON.stringify(players, null, 2));
  
  const [results] = await conn.execute("SELECT id, roomId, roundNo, playerId, goodsName, goodsValue FROM arenaRoundResults WHERE roomId = ? ORDER BY roundNo, playerId", [roomId]);
  console.log('Round results:', JSON.stringify(results, null, 2));
}

await conn.end();
