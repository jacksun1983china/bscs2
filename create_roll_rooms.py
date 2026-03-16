#!/usr/bin/env python3
"""
批量创建10个Roll房间，通过管理后台API
每个房间使用不同的图片、不同的规则
"""
import base64
import json
import requests
import os
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"

# 先登录管理员获取cookie
session = requests.Session()

# 图片文件路径
IMG_DIR = "/home/ubuntu/bscs2/roll_images"

def img_to_base64(filename):
    path = os.path.join(IMG_DIR, filename)
    if not os.path.exists(path):
        print(f"Warning: {path} not found")
        return ""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

# 10个不同主题的Roll房间配置
rooms = [
    {
        "title": "【传说】龙之传说ROLL房",
        "avatar": "awp_dragon_lore.png",
        "threshold": 0,
        "maxParticipants": 200,
        "start_offset_hours": 0,
        "end_offset_hours": 72,
        "prizes": [
            {"name": "AWP | 龙之传说 (崭新出厂)", "value": 8888.00, "quantity": 1, "coinType": "shopCoin", "image": "awp_dragon_lore.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 888", "value": 888.00, "quantity": 2, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "商城金币 188", "value": 188.00, "quantity": 5, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
    {
        "title": "【限时】蝴蝶刀狂欢ROLL房",
        "avatar": "butterfly_fade.jpg",
        "threshold": 100,
        "maxParticipants": 100,
        "start_offset_hours": 0,
        "end_offset_hours": 48,
        "prizes": [
            {"name": "蝴蝶刀 | 渐变 (崭新出厂)", "value": 3200.00, "quantity": 1, "coinType": "shopCoin", "image": "butterfly_fade.jpg", "prizeType": "item", "itemCategory": "roll"},
            {"name": "蝴蝶刀 | 暗夜 (略有磨损)", "value": 1500.00, "quantity": 1, "coinType": "shopCoin", "image": "butterfly_night.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 200", "value": 200.00, "quantity": 3, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
    {
        "title": "AK-47 精英对决ROLL房",
        "avatar": "ak47_case_hardened.png",
        "threshold": 50,
        "maxParticipants": 150,
        "start_offset_hours": 0,
        "end_offset_hours": 96,
        "prizes": [
            {"name": "AK-47 | 表面淬火 (崭新出厂)", "value": 2500.00, "quantity": 1, "coinType": "shopCoin", "image": "ak47_case_hardened.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "AK-47 | 二西莫夫 (略有磨损)", "value": 680.00, "quantity": 2, "coinType": "shopCoin", "image": "ak47_asiimov.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 100", "value": 100.00, "quantity": 5, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
    {
        "title": "【VIP专属】手套珍藏ROLL房",
        "avatar": "gloves_superconductor.png",
        "threshold": 500,
        "maxParticipants": 30,
        "start_offset_hours": 0,
        "end_offset_hours": 120,
        "prizes": [
            {"name": "运动手套 | 超导体 (崭新出厂)", "value": 5500.00, "quantity": 1, "coinType": "shopCoin", "image": "gloves_superconductor.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "运动手套 | 树篱迷宫 (略有磨损)", "value": 2200.00, "quantity": 1, "coinType": "shopCoin", "image": "gloves_hedge_maze.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 500", "value": 500.00, "quantity": 2, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
    {
        "title": "新手福利ROLL房",
        "avatar": "deagle_blaze.png",
        "threshold": 0,
        "maxParticipants": 500,
        "start_offset_hours": 0,
        "end_offset_hours": 168,
        "prizes": [
            {"name": "沙漠之鹰 | 炽焰 (崭新出厂)", "value": 850.00, "quantity": 1, "coinType": "shopCoin", "image": "deagle_blaze.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 50", "value": 50.00, "quantity": 10, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "商城金币 20", "value": 20.00, "quantity": 20, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
    {
        "title": "M4A4 咆哮ROLL房",
        "avatar": "m4a4_howl.png",
        "threshold": 200,
        "maxParticipants": 80,
        "start_offset_hours": 0,
        "end_offset_hours": 72,
        "prizes": [
            {"name": "M4A4 | 咆哮 (崭新出厂)", "value": 6000.00, "quantity": 1, "coinType": "shopCoin", "image": "m4a4_howl.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 300", "value": 300.00, "quantity": 3, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "商城金币 100", "value": 100.00, "quantity": 5, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
    {
        "title": "【周末特惠】爪子刀ROLL房",
        "avatar": "karambit_emerald.webp",
        "threshold": 300,
        "maxParticipants": 50,
        "start_offset_hours": 0,
        "end_offset_hours": 48,
        "prizes": [
            {"name": "爪子刀 | 翡翠 (崭新出厂)", "value": 12000.00, "quantity": 1, "coinType": "shopCoin", "image": "karambit_emerald.webp", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 1000", "value": 1000.00, "quantity": 1, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "商城金币 500", "value": 500.00, "quantity": 2, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
    {
        "title": "USP-S 精准射击ROLL房",
        "avatar": "usps_kill_confirmed.jpg",
        "threshold": 0,
        "maxParticipants": 300,
        "start_offset_hours": 0,
        "end_offset_hours": 96,
        "prizes": [
            {"name": "USP-S | 击杀确认 (崭新出厂)", "value": 450.00, "quantity": 2, "coinType": "shopCoin", "image": "usps_kill_confirmed.jpg", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 80", "value": 80.00, "quantity": 5, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "商城金币 30", "value": 30.00, "quantity": 10, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
    {
        "title": "【充值返利】金币大放送ROLL房",
        "avatar": "ak47_asiimov.png",
        "threshold": 100,
        "maxParticipants": 200,
        "start_offset_hours": 0,
        "end_offset_hours": 72,
        "prizes": [
            {"name": "商城金币 2000", "value": 2000.00, "quantity": 1, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "商城金币 500", "value": 500.00, "quantity": 3, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "商城金币 100", "value": 100.00, "quantity": 10, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "AK-47 | 二西莫夫 (略有磨损)", "value": 680.00, "quantity": 1, "coinType": "shopCoin", "image": "ak47_asiimov.png", "prizeType": "item", "itemCategory": "roll"},
        ]
    },
    {
        "title": "【每日签到】幸运ROLL房",
        "avatar": "gloves_hedge_maze.png",
        "threshold": 0,
        "maxParticipants": 1000,
        "start_offset_hours": 0,
        "end_offset_hours": 24,
        "prizes": [
            {"name": "运动手套 | 树篱迷宫 (略有磨损)", "value": 2200.00, "quantity": 1, "coinType": "shopCoin", "image": "gloves_hedge_maze.png", "prizeType": "item", "itemCategory": "roll"},
            {"name": "商城金币 10", "value": 10.00, "quantity": 50, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
            {"name": "商城金币 5", "value": 5.00, "quantity": 100, "coinType": "shopCoin", "image": "", "prizeType": "coin", "itemCategory": "roll"},
        ]
    },
]

# 通过管理后台API创建房间
# 先登录管理员
print("=== 登录管理员 ===")
login_url = f"{BASE_URL}/api/trpc/admin.login"
login_body = {"json": {"account": "admin", "password": "admin123"}}
login_resp = session.post(login_url, json=login_body, timeout=10)
if login_resp.status_code == 200:
    print("✅ 管理员登录成功")
    # cookie已自动保存在session中
else:
    print(f"❌ 管理员登录失败: {login_resp.status_code} {login_resp.text[:200]}")
    exit(1)

print("\n=== 开始创建10个Roll房间 ===\n")

for i, room in enumerate(rooms):
    now = datetime.now()
    start_at = (now + timedelta(hours=room["start_offset_hours"])).strftime("%Y-%m-%dT%H:%M:%S")
    end_at = (now + timedelta(hours=room["end_offset_hours"])).strftime("%Y-%m-%dT%H:%M:%S")
    
    avatar_b64 = img_to_base64(room["avatar"]) if room["avatar"] else ""
    
    prizes = []
    for p in room["prizes"]:
        prize_img = img_to_base64(p["image"]) if p.get("image") else ""
        prizes.append({
            "name": p["name"],
            "value": p["value"],
            "quantity": p["quantity"],
            "coinType": p["coinType"],
            "imageBase64": prize_img,
            "prizeType": p["prizeType"],
            "itemCategory": p["itemCategory"],
        })
    
    payload = {
        "title": room["title"],
        "avatarBase64": avatar_b64,
        "threshold": room["threshold"],
        "maxParticipants": room["maxParticipants"],
        "startAt": start_at,
        "endAt": end_at,
        "prizes": prizes,
    }
    
    # TRPC mutation call
    url = f"{BASE_URL}/api/trpc/admin.createRollRoom"
    body = {"json": payload}
    
    try:
        resp = session.post(url, json=body, timeout=30)
        if resp.status_code == 200:
            result = resp.json()
            if "result" in result and "data" in result["result"]:
                room_id = result["result"]["data"].get("json", {}).get("roomId", "?")
                print(f"✅ [{i+1}/10] 创建成功: {room['title']} (ID: {room_id})")
            else:
                print(f"✅ [{i+1}/10] 创建成功: {room['title']}")
        else:
            print(f"❌ [{i+1}/10] 创建失败: {room['title']} - HTTP {resp.status_code}")
            print(f"   Response: {resp.text[:200]}")
    except Exception as e:
        print(f"❌ [{i+1}/10] 创建异常: {room['title']} - {e}")

print("\n=== 完成 ===")
