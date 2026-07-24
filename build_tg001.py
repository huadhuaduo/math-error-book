#!/usr/bin/env python3
"""Build TG-001 HTML files from PR2 templates + TG-001 JSON data"""
import json, re, os

BASE = "/Users/xzzsw127/Claude code"
OUT = BASE

# Load TG-001 scenario data
with open(f"{BASE}/案例库/TG-001_首开倒计时.json") as f:
    tg = json.load(f)

ctx = tg["context"]
dps = tg["decision_points"]
old_zhou = ctx["team_state"]["key_individuals"][0]
lp = old_zhou["language_profile"]

# ============================================================
# FILE 1: 准备页
# ============================================================
with open(f"{BASE}/scene_PR2_准备页_叙事版.html") as f:
    html = f.read()

# --- Meta & title ---
html = html.replace("<title>准备 · 管理者B · 绩效面谈</title>", "<title>准备 · NPC-周 · 首开空降</title>")
html = html.replace("半年度绩效面谈 · 下午3:00 · 小会议室 · 30分钟", "首开空降支援 · 到岗第一天 · 晚上8点 · 临时工位")

# --- Avatar ---
html = html.replace('<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#93C5FD,#3B82F6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;flex-shrink:0;box-shadow:0 4px 16px rgba(59,130,246,.2)">林</div>',
    '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#F59E0B,#D97706);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;flex-shrink:0;box-shadow:0 4px 16px rgba(245,158,11,.2)">周</div>')

# --- Name & role ---
html = html.replace("<p style=\"font-size:15px;font-weight:700;color:#1C1917;margin-bottom:1px\">管理者B</p>",
    "<p style=\"font-size:15px;font-weight:700;color:#1C1917;margin-bottom:1px\">NPC-周</p>")
html = html.replace("<p style=\"font-size:11px;color:#A8A29E\">2022届通用胜任力 · 25岁 · 你带了她两年</p>",
    "<p style=\"font-size:11px;color:#A8A29E\">最资深的销售 · 司龄5年 · 团队都看他的态度</p>")

# --- H1 ---
html = html.replace("她推门时脸上带着笑。<br>她不知道等待她的是C。",
    "你到岗第一天晚上8点。<br>明天早上9点是第一次早会。")

# --- Story paragraphs (replace all) ---
story_html = f"""<p class=\"story\">
    你是被紧急派往新项目支援的销售管理者。项目示范区已开放一周，来访量很高，但认筹转化远未达预期。首开定在<strong>20天后</strong>，127套房源涉及6种户型——多户型面积相近、总价重合，客户对比周期长。销售团队已连续高强度作战一个多月。
  </p>
  <p class=\"story\">
    你是一个<strong>空降过来的支援者</strong>，不是他们的直属上级。项目原负责人仍在位，但已默许你主导。团队8个人——6个销售，1个销管，1个策划。早会上没人说话，眼神无光。你进办公室时有人迅速关掉招聘网站。
  </p>
  <p class=\"story\">
    最资深的NPC-周，司龄5年，这个项目他比谁都熟。他在看你——是那种不动声色的看。你说什么他都听着，但那双眼睛在问：<strong>你是真有本事，还是只会画饼？</strong>其他销售看他的态度。他不点头，没人动。
  </p>
  <p class=\"story\">
    到岗第一天晚上8点，你坐在临时工位上翻完了过去一个月的来访登记。6种户型的数据在纸上混成一团。你知道问题在哪——产品聚焦不够，销售被太多选择消耗了判断力。但你不能一上来就说"听我的"——你连户型都还没爬完。
  </p>
  <p class=\"story\">
    明天早上9点是第一次早会。你最需要的不是口才——是<strong>先做一件让NPC-周抬头看你的事</strong>。不是开会，不是约谈。是让他们看到：这个空降的人，至少懂业务。
  </p>"""

# Replace all story paragraphs
html = re.sub(r'<p class="story">.*?</p>', '', html, flags=re.DOTALL)
# Insert new story after H1
html = html.replace('</h1>', '</h1>\n' + story_html)

# --- Strategy card ---
strategy = f"""<div style="background:rgba(239,246,255,.3);border:1px solid rgba(147,197,253,.15);border-radius:14px;padding:14px 16px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;color:#3B82F6;letter-spacing:.06em;margin-bottom:6px">🎯 推门前，想清楚这三件事</div>
    <p style="font-size:12px;color:#1C1917;line-height:1.75;margin:0">
      <strong>1. NPC-周不反对你——他需要看到你值得跟。</strong>5年销售，这个项目他比谁都熟。别上来就说"新策略"。先让他看到你爬了楼、看了户型、比对了数据。用行动建立第一笔信任。<br>
      <strong>2. 团队不是不努力——是被太多选项消耗了判断力。</strong>6种户型面积相近、总价重合，客户在沙盘前反复比较，销售在6个户型之间疲于奔命。他们需要有人替他们做减法——砍掉噪音，聚焦关键。<br>
      <strong>3. 信心是传染的——但传染的前提是有人先得了。</strong>策略方向定了之后，别靠讲道理让团队信。亲自做成一单。当NPC-周看到你真的促成了认筹，他会从"试试看"变成"跟着做"。
    </p>
    <p style="font-size:11px;color:#92400E;line-height:1.5;margin:10px 0 0">
      <strong>⚠️ NPC-周可能会说：</strong>"这个户型我卖了五年，什么客户没见过""这边的客户不看数据，看感觉"。<strong>别怼回去。</strong>他的经验是真的。让他说，听完之后说："你说的对——但这两个户型的景观性价比确实更高，你帮我看看这个客户？"
    </p>
  </div>"""
html = re.sub(r'<div style="background:rgba\(239,246,255.*?</div>\s*</div>\s*<div style="display:grid', strategy + '\n<div style="display:grid', html, flags=re.DOTALL)

# --- Self-assessment: 五原则 → 3 P步骤 ---
# Find and replace the self-rate section
self_rate_new = """<div class="check-label">自评基线 · 1-10 分（推门前先问问自己）</div>
  <div class="self-rate">
    <div class="rate-item"><span>建立信任</span><input type="number" min="1" max="10" value="5" id="rate1"></div>
    <div class="rate-item"><span>诊断问题</span><input type="number" min="1" max="10" value="5" id="rate2"></div>
    <div class="rate-item"><span>示范赋能</span><input type="number" min="1" max="10" value="5" id="rate3"></div>
  </div>"""
html = re.sub(r'<div class="check-label">.*?</div>\s*<div class="self-rate">.*?</div>', self_rate_new, html, flags=re.DOTALL)

# --- Process line ---
html = html.replace("前期准备 → 营造氛围 → 员工自评 → 绩效诊断 → 下阶段目标",
    "建立信任 → 诊断问题 → 做减法 → 打样示范")

# --- Success yardstick ---
yardstick = """<div class="check-label">成功标尺 · 什么算"做对了"</div>
  <div class="check-block">
    NPC-周在第三天之前，主动拿一个客户来问你："领导，你帮我看看这个"。<br>
    团队在聚焦户型后，第一周认筹转化率有可感知的提升。<br>
    你亲自打样的那组客户——哪怕没成交——团队有人来问："你是怎么说的？"
  </div>"""
html = re.sub(r'<div class="check-label">成功标尺.*?</div>\s*<div class="check-block">.*?</div>', yardstick, html, flags=re.DOTALL)

# --- Opening box ---
html = re.sub(r'<div class="opening-box">.*?</div>',
    f'<div class="opening-box">到岗第一天晚上8点，临时工位。桌上堆着过去一个月的来访登记表和成交数据。窗外售楼处已经关了灯。<br><strong>明天早上9点是第一次早会。你准备做什么？</strong></div>', html, flags=re.DOTALL)

with open(f"{OUT}/scene_TG001_准备页.html", "w") as f:
    f.write(html)
print("✅ scene_TG001_准备页.html")

# ============================================================
# FILE 2: 引擎页
# ============================================================
print("Building 引擎页 (large file, may take a moment)...")
with open(f"{BASE}/scene_PR2_引擎驱动版_v7.html") as f:
    html = f.read()

html = html.replace("<title>对话 · 管理者B · 绩效面谈</title>", "<title>对话 · NPC-周 · 首开空降</title>")
html = html.replace('<div class="npc-av">林</div>', '<div class="npc-av">周</div>')
html = html.replace('<span class="npc-name">管理者B</span>', '<span class="npc-name">NPC-周</span>')
html = html.replace("background:linear-gradient(135deg,#93C5FD,#3B82F6)", "background:linear-gradient(135deg,#F59E0B,#D97706)")

# State dot
html = html.replace('<span class="state-dot" id="stateDot" style="background:#16A34A"></span><span id="stateTxt">在听你说话</span>',
    '<span class="state-dot" id="stateDot" style="background:#F59E0B"></span><span id="stateTxt">观望</span>')
html = html.replace('<span class="phase-label" id="phaseLabel">前期准备</span>',
    '<span class="phase-label" id="phaseLabel">建立信任</span>')

# Opening scene note
html = html.replace("下午3点 · 小会议室 · 你推门进去",
    "到岗第一天 · 晚上8点 · 临时工位")
html = html.replace("（她推门进来，脸上带着笑，在你对面坐下。昨天刚交了一份市场调研报告——提前了两天。她不知道今天要谈绩效结果。）",
    "（NPC-周从工位上抬头看了你一眼——没有站起来，也没有特别打招呼。桌上摊着几份来访登记表，旁边是一个喝了一半的保温杯。他在这里坐了五年。）")

# Initial whisper
html = html.replace("先聊两句让她放松。不用急着说等级——<strong>这场对话不是审判。</strong>",
    "NPC-周在观望你。别一上来就说'新策略'——<strong>先做一件让他觉得你懂业务的事。</strong>")

# Side panel state text
html = html.replace("心情不错。她还不知道今天要谈什么。",
    "在观望。他见过太多空降的领导——先看你是真有本事还是只会画饼。")

# Phase labels
html = html.replace("前期准备 → 营造氛围 → 员工自评 → 绩效诊断 → 下阶段目标",
    "建立信任 → 诊断问题 → 做减法 → 打样示范")

# Side principles (五原则 → P步骤)
side_principles_new = """<div class="side-pr"><span>P₂ 建立信任</span><div class="side-pr-bar"><div class="side-pr-fill" id="barTrust" style="width:35%;background:#F59E0B"></div></div><span class="side-pr-score" id="scoreTrust">35</span></div>
        <div class="side-pr"><span>P₁ 诊断问题</span><div class="side-pr-bar"><div class="side-pr-fill" id="barDiagnose" style="width:40%;background:#10B981"></div></div><span class="side-pr-score" id="scoreDiagnose">40</span></div>
        <div class="side-pr"><span>P₅ 示范赋能</span><div class="side-pr-bar"><div class="side-pr-fill" id="barEmpower" style="width:30%;background:#3B82F6"></div></div><span class="side-pr-score" id="scoreEmpower">30</span></div>
        <div class="side-pr"><span>P₃ 重构目标</span><div class="side-pr-bar"><div class="side-pr-fill" id="barReframe" style="width:40%;background:#8B5CF6"></div></div><span class="side-pr-score" id="scoreReframe">40</span></div>"""
html = re.sub(r'<div class="side-pr"><span>①建立信任</span>.*?</div>\s*<div class="side-pr"><span>⑤积极结束</span>.*?</div>', side_principles_new, html, flags=re.DOTALL)

with open(f"{OUT}/scene_TG001_引擎页.html", "w") as f:
    f.write(html)
print("✅ scene_TG001_引擎页.html")

# ============================================================
# FILE 3: 反馈页
# ============================================================
print("Building 反馈页...")
with open(f"{BASE}/scene_PR2_反馈页_v22.html") as f:
    html = f.read()

html = html.replace("<title>反馈 · 管理者B · 绩效面谈</title>", "<title>反馈 · NPC-周 · 首开空降</title>")

# Radar labels (五原则 → P步骤)
for old, new in [
    ("①建立信任", "P₂ 建立信任"),
    ("②说明目的", "P₁ 诊断问题"),
    ("③鼓励说话", "P₅ 示范赋能"),
    ("④认真倾听", "P₃ 重构目标"),
    ("⑤积极结束", "P₆ 反馈闭环"),
]:
    html = html.replace(old, new)

# Verdict text
html = html.replace("半年度绩效面谈", "首开空降支援")
html = html.replace("管理者B", "NPC-周")

# Course recommendations
html = html.replace("绩效面谈", "团队激励")
html = html.replace("五原则", "P步骤")

with open(f"{OUT}/scene_TG001_反馈页.html", "w") as f:
    f.write(html)
print("✅ scene_TG001_反馈页.html")

print("\n🎉 Done. 3 files created in:", OUT)
