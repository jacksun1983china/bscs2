# Bug分析

## Bug 1: 平局时文字显示不正确

### 根因
在多处计算 gameOverData 时，没有检测平局情况。代码只检查 `isWinner: (playerTotals[p.playerId] ?? 0) === maxVal`，当所有玩家总价值相同时，所有人都被标记为 `isWinner=true`，但没有设置 `isDraw=true`。

### 影响位置
1. 行 947-957: roomDetail 加载时的初始化
2. 行 1010-1020: roomDetail status 变化时
3. 行 1212-1222: 回放完成时的 finishReplay
4. 行 1284-1294: handleSlotDone 回放模式最后一轮
5. 行 1350-1361: handleSlotDone 正常模式 pendingGameOver 消费

### 修复方案
在每处计算 overPlayers 后，检查是否所有玩家的 isWinner 都为 true（或所有总价值相同），如果是则设置 isDraw=true，并将所有玩家的 isWinner 设为 false。

## Bug 2: 最后一轮SLOT动画不播放

### 根因
SSE `game_over` 消息在最后一轮 `round_result` 之后几乎同时到达。当 game_over 到达时：
- 行 810: `if (!spinningRef.current && !revealingRef.current && pendingSpinRef.current.length === 0 && !showIntroRef.current)`
- 如果最后一轮的 round_result 刚设置了 spinning=true，但 React 还没更新 spinningRef，game_over 可能认为 SLOT 空闲，直接触发结束（延迟2.5s）。
- 或者，最后一轮 spinning 完成后 reveal 展示中（2.2s），game_over 的 2.5s 延迟到期，直接覆盖了 reveal 动画。

实际上更可能的情况是：game_over 的 setTimeout 2500ms 和最后一轮 reveal 的 setTimeout 2200ms 存在竞争。game_over 在 spinning=false 时到达（因为 round_result 还没来），直接走了 2.5s 延迟分支，然后 round_result 到达开始转，但 2.5s 后 game_over 强制触发结束。

### 修复方案
game_over 的"空闲"分支也应该检查是否还有未完成的轮次。如果 liveRoundsReceived < totalRounds，说明还有轮次没到，应该缓存而不是直接触发。
