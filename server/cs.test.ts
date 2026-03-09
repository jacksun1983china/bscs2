/**
 * cs.test.ts — 客服系统核心功能测试
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  createCsAgent,
  getCsAgentByUsername,
  getCsAgentById,
  updateCsAgentStatus,
  createCsSession,
  getCsSessionById,
  getActiveSessionByPlayer,
  getAllCsSessions,
  assignSessionToAgent,
  closeCsSession,
  sendCsMessage,
  getCsMessages,
  updateSessionLastMessage,
  clearAgentUnread,
  clearPlayerUnread,
  createCsQuickReply,
  getCsQuickReplies,
  deleteCsQuickReply,
} from './db';

const TEST_PLAYER_ID = 99001;
const TEST_AGENT_USERNAME = `test_agent_${Date.now()}`;

describe('客服坐席管理', () => {
  let agentId: number;

  it('应能创建客服坐席', async () => {
    const agent = await createCsAgent({
      name: '测试客服',
      username: TEST_AGENT_USERNAME,
      password: 'test123456',
      maxSessions: 5,
    });
    expect(agent).toBeDefined();
    expect(agent?.username).toBe(TEST_AGENT_USERNAME);
    agentId = agent!.id;
  });

  it('应能按用户名查找坐席', async () => {
    const agent = await getCsAgentByUsername(TEST_AGENT_USERNAME);
    expect(agent).toBeDefined();
    expect(agent?.name).toBe('测试客服');
  });

  it('应能更新坐席状态', async () => {
    if (!agentId) return;
    await updateCsAgentStatus(agentId, 'online');
    const agent = await getCsAgentById(agentId);
    expect(agent?.status).toBe('online');
  });
});

describe('客服会话管理', () => {
  let sessionId: number;
  let agentId: number;

  beforeAll(async () => {
    const agent = await createCsAgent({
      name: '会话测试客服',
      username: `session_agent_${Date.now()}`,
      password: 'test123456',
    });
    agentId = agent!.id;
  });

  it('应能为玩家创建会话', async () => {
    const session = await createCsSession(TEST_PLAYER_ID, '测试问题');
    expect(session).toBeDefined();
    expect(session?.playerId).toBe(TEST_PLAYER_ID);
    expect(session?.status).toBe('waiting');
    sessionId = session!.id;
  });

  it('应能获取玩家的活跃会话', async () => {
    const session = await getActiveSessionByPlayer(TEST_PLAYER_ID);
    expect(session).toBeDefined();
    expect(session?.id).toBe(sessionId);
  });

  it('应能获取等待中的会话列表', async () => {
    const sessions = await getAllCsSessions('waiting');
    expect(Array.isArray(sessions)).toBe(true);
    const found = sessions.find(s => s.id === sessionId);
    expect(found).toBeDefined();
  });

  it('应能将会话分配给坐席', async () => {
    if (!sessionId || !agentId) return;
    await assignSessionToAgent(sessionId, agentId);
    const session = await getCsSessionById(sessionId);
    expect(session?.agentId).toBe(agentId);
    expect(session?.status).toBe('active');
  });

  it('应能关闭会话', async () => {
    if (!sessionId) return;
    await closeCsSession(sessionId, '测试关闭');
    const session = await getCsSessionById(sessionId);
    expect(session?.status).toBe('closed');
  });
});

describe('客服消息系统', () => {
  let sessionId: number;

  beforeAll(async () => {
    const session = await createCsSession(TEST_PLAYER_ID + 1, '消息测试');
    sessionId = session!.id;
  });

  it('应能发送消息', async () => {
    const msg = await sendCsMessage({
      sessionId,
      senderType: 'player',
      senderId: TEST_PLAYER_ID + 1,
      senderName: '测试玩家',
      content: '你好，我有问题',
    });
    expect(msg).toBeDefined();
    expect(msg?.content).toBe('你好，我有问题');
  });

  it('应能获取会话消息列表', async () => {
    const msgs = await getCsMessages(sessionId);
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('应能更新会话最后消息', async () => {
    await updateSessionLastMessage(sessionId, '最新消息', 1, 0);
    const session = await getCsSessionById(sessionId);
    expect(session?.lastMessage).toBe('最新消息');
    expect(session?.agentUnread).toBe(1);
  });

  it('应能清除坐席未读数', async () => {
    await clearAgentUnread(sessionId);
    const session = await getCsSessionById(sessionId);
    expect(session?.agentUnread).toBe(0);
  });
});

describe('快捷回复管理', () => {
  let replyId: number;

  it('应能创建快捷回复', async () => {
    const reply = await createCsQuickReply({
      category: '通用',
      title: '欢迎语',
      content: '您好！欢迎使用在线客服，请问有什么可以帮助您？',
      sort: 1,
    });
    expect(reply).toBeDefined();
    expect(reply?.title).toBe('欢迎语');
    replyId = reply!.id;
  });

  it('应能获取快捷回复列表', async () => {
    const replies = await getCsQuickReplies();
    expect(Array.isArray(replies)).toBe(true);
    expect(replies.length).toBeGreaterThan(0);
  });

  it('应能删除快捷回复', async () => {
    if (!replyId) return;
    await deleteCsQuickReply(replyId);
    const replies = await getCsQuickReplies();
    const found = replies.find(r => r.id === replyId);
    expect(found).toBeUndefined();
  });
});
