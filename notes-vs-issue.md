# VS 截断问题分析

经过代码审查，ArenaRoom.tsx 中 PlayerSeat 之间没有独立的 VS 文字元素。
"VS 文字截断"可能是指：
1. 胜利/平局标签（👑 胜利 / 🤝 平局）被截断 - 已有 whiteSpace: 'nowrap'
2. 昵称被截断 - 有 overflow: hidden + textOverflow: ellipsis
3. 开场动画中的 VS 特效

需要在竞技场房间中实际查看。由于无法登录查看竞技场房间，先处理其他确定的bug。

# 回收金币浮点精度问题
需要在 Backpack.tsx 中找到回收金币显示的地方，确保 toFixed(2)
