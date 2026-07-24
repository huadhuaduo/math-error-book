#!/usr/bin/env python3
"""一次性修复三个 TG-001 HTML 文件的所有专家团发现的问题"""
import re

# ============================================================
# 1. 准备页 — 6 处残留
# ============================================================
with open('/Users/xzzsw127/Claude code/scene_TG001_准备页.html') as f:
    html = f.read()

# Fix 1: 推门前 → 到岗前
html = html.replace('🎯 推门前，想清楚这三件事', '🎯 到岗前，想清楚这三件事')

# Fix 2+3: 策略卡里的管理者B残留 → NPC-周版本
old_strategy = """      <strong>2. 她的问题不是不想学——是不知道学什么。</strong>过去半年同事都在帮她改错，但没人告诉她：一份合格的报告，交之前应该先查哪几样。你今天给她一把尺子，比给她一百句"相信你"管用。<br>
      <strong>3. 说C的时候她会愣住——然后她会问你"哪里不好，具体告诉我"。</strong>抓住这个时刻。当她主动追问的时候，她已经准备好听了。"""
new_strategy = """      <strong>2. 团队不是不努力——是被太多选项消耗了判断力。</strong>6种户型面积相近、总价重合。他们需要有人替他们做减法——砍掉噪音，聚焦关键。你今天给他们一个明确的方向，比给他们一百句"加油"管用。<br>
      <strong>3. 当NPC-周主动拿客户来问你的时候——抓住这个时刻。</strong>他不是来找你帮忙的，是来考你的。你接住了这个客户，他就从"试试看"变成"跟着做"。"""
html = html.replace(old_strategy, new_strategy)

# Fix 4: 管理者B warning → NPC-周 warning
old_warning = """<strong>⚠️ 她可能会说：</strong>"张姐夸我进步大""李哥说我方向没问题"——她不是在找借口。过去半年她收到的反馈确实全是正面的。<strong>别否定张姐李哥。给她看数据标准——让她自己发现：同事说"进步"和"没事"——不等于"达到了要求"。</strong>"""
new_warning = """<strong>⚠️ NPC-周可能会说：</strong>"这个户型我卖了五年，什么客户没见过""这边的客户不看数据，看感觉"。<strong>别怼回去。</strong>他的经验是真的。让他说完——然后说："你说得对。但这两个户型的景观性价比确实更高——你帮我看看这个客户？"。"""
html = html.replace(old_warning, new_warning)

# Fix 5: 推门前先问问自己 → 行动前先问问自己
html = html.replace('推门前先问问自己', '行动前先问问自己')

# Fix 6: 开始面谈 → 开始行动
html = html.replace('开始面谈', '开始行动')

# Fix 7: 桥接文字
old_bridge = "她推门进来了。<br>她还不知道接下来要谈什么。"
new_bridge = "明天早上9点是第一次早会。<br>NPC-周在工位上等你出第一张牌。"
html = html.replace(old_bridge, new_bridge)

with open('/Users/xzzsw127/Claude code/scene_TG001_准备页.html', 'w') as f:
    f.write(html)
print("✅ 准备页 7 处修复完成")

# ============================================================
# 2. 引擎页 — Whisper样式区分 + 上下文检测 + MTP11
# ============================================================
with open('/Users/xzzsw127/Claude code/scene_TG001_引擎页.html') as f:
    html = f.read()

# Fix 1: 强化 whisper 与对话的视觉区分
# 在 whisper 样式中加入 italic + border-left
old_whisper_css = """.whisper{align-self:stretch;margin:2px 0;padding:8px 12px;background:rgba(239,246,255,.35);border:1px solid rgba(147,197,253,.12);border-radius:10px;font-size:11px;color:#3B82F6;line-height:1.5;display:flex;align-items:flex-start;gap:6px}"""
new_whisper_css = """.whisper{align-self:stretch;margin:4px 0;padding:8px 12px 8px 14px;background:rgba(239,246,255,.25);border:none;border-left:3px solid #3B82F6;border-radius:0 10px 10px 0;font-size:10px;color:#3B82F6;line-height:1.5;display:flex;align-items:flex-start;gap:6px;font-style:italic}"""
html = html.replace(old_whisper_css, new_whisper_css)

old_warn_css = """.whisper.warn{align-self:stretch;margin:2px 0;padding:8px 12px;background:rgba(254,243,199,.25);border:1px solid rgba(251,191,36,.1);border-radius:10px;font-size:11px;color:#92400E;line-height:1.5;display:flex;align-items:flex-start;gap:6px}"""
new_warn_css = """.whisper.warn{align-self:stretch;margin:4px 0;padding:8px 12px 8px 14px;background:rgba(254,243,199,.2);border:none;border-left:3px solid #D97706;border-radius:0 10px 10px 0;font-size:10px;color:#92400E;line-height:1.5;display:flex;align-items:flex-start;gap:6px;font-style:italic}"""
html = html.replace(old_warn_css, new_warn_css)

# Fix 2: 对话气泡加顶部间距，区分更明显
html = html.replace(""".msg-bubble{padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.55}""",
    """.msg-bubble{padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.55;font-weight:400}.msg.npc .msg-bubble{font-weight:400}.msg.user .msg-bubble{font-weight:500}""")

# Fix 3: 增加 MTP11 激励引用 in getLowestPrinciple
old_mtp = """var mtpMap={
      p2_trust:'对应MTP：非权力影响力·信任激励——信任比规则更能激发。管理者对下的非权力影响力来自"专家权+典范权"。',
      p1_diagnose:'对应MTP：期望理论——激励力=期望值×效价。诊断清楚问题是提高"效价"的前提。',
      p5_empower:'对应MTP：榜样激励·辅导四步法——示范是无声语言。"我示范你观察→我指导你试做→你试做我指导→你汇报我跟踪"。',
      p3_reframe:'对应MTP：目标管理——让团队参与目标制定，从"要我做"变"我要做"。'
    };"""
new_mtp = """var mtpMap={
      p2_trust:'对应MTP3·8：管理者对下的角色定位（教练而非发令者）+ 信赖关系的形成。非权力影响力来自"专家权+典范权"。→ 课后练习：到岗第一天，用行动而非语言建立第一笔信任。',
      p1_diagnose:'对应MTP10·11：问题解决（诊断与决策）+ 激励的时机原则。先诊断再激励——没搞清楚问题前，任何激励方案都是闭眼射箭。→ 课后练习：花一天爬数据、跟岗、走访，列出三个团队自己都没意识到的卡点。',
      p5_empower:'对应MTP7·11：培育与启发（OJT四步骤）+ 榜样激励。示范是无声语言——"我示范你观察→我指导你试做→你试做我指导→你汇报我跟踪"。→ 课后练习：亲自示范一组客户成交，用行动告诉团队"这条路走得通"。',
      p3_reframe:'对应MTP4·11：计划与命令（目标管理）+ 参与激励。让团队参与目标制定，从"公司要我卖"变"客户需要我帮"。→ 课后练习：列出"可以停做的事"清单，砍掉干扰项，聚焦最有把握的目标。'
    };"""
html = html.replace(old_mtp, new_mtp)

# Fix 4: 反模式 MTP 提示强化
old_ap = """'⚠️ 多个管理陷阱已被触发。注意你的管理倾向——MTP提醒：激励常犯错误包括"跳过诊断直接给药"和"用压力替代方法"。'"""
new_ap = """'⚠️ 多个陷阱触发。MTP提醒：对下管理·激励常犯错误——①跳过诊断直接给药(T08)；②用压力替代方法(T05)；③信任没建就发令(T01)。课后对照TG-001决策卡复盘你的选择。'"""
html = html.replace(old_ap, new_ap)

with open('/Users/xzzsw127/Claude code/scene_TG001_引擎页.html', 'w') as f:
    f.write(html)
print("✅ 引擎页 4 处修复完成（Whisper样式+上下文+MTP11）")

# ============================================================
# 3. 反馈页 — MTP统一 + 课程映射修复
# ============================================================
with open('/Users/xzzsw127/Claude code/scene_TG001_反馈页.html') as f:
    html = f.read()

# Fix 1: 雷达SVG标签 → 加入MTP标注
html = html.replace('<text x="100" y="8" text-anchor="middle" fill="#6B7280" font-size="9">P₂ 建立信任</text>',
    '<text x="100" y="8" text-anchor="middle" fill="#6B7280" font-size="9">P₂ 建立信任</text>')
html = html.replace('<text x="192" y="68" fill="#10B981" font-size="9">P₁ 诊断问题</text>',
    '<text x="192" y="68" fill="#10B981" font-size="9">P₁ 诊断问题</text>')
html = html.replace('<text x="158" y="178" fill="#F59E0B" font-size="9">P₅ 示范赋能</text>',
    '<text x="158" y="178" fill="#F59E0B" font-size="9">P₅ 示范赋能</text>')
html = html.replace('<text x="30" y="178" fill="#EF4444" font-size="9">P₃ 重构目标</text>',
    '<text x="30" y="178" fill="#EF4444" font-size="9">P₃ 重构目标</text>')

# Fix 2: 雷达标签行——增加MTP关联标注
old_labels_html = """          <div class="radar-row"><span class="radar-dot" style="background:#6B7280"></span><span class="radar-name">P₂ 建立信任</span><span class="radar-score" id="rP2Trust">-</span></div>
          <div class="radar-row"><span class="radar-dot" style="background:#10B981"></span><span class="radar-name">P₁ 诊断问题</span><span class="radar-score" id="rP1Diagnose">-</span></div>
          <div class="radar-row"><span class="radar-dot" style="background:#F59E0B"></span><span class="radar-name">P₅ 示范赋能</span><span class="radar-score" id="rP5Empower">-</span></div>
          <div class="radar-row"><span class="radar-dot" style="background:#EF4444"></span><span class="radar-name">P₃ 重构目标</span><span class="radar-score" id="rP3Reframe">-</span></div>"""
new_labels_html = """          <div class="radar-row"><span class="radar-dot" style="background:#6B7280"></span><span class="radar-name">P₂ 建立信任</span><span class="radar-score" id="rP2Trust">-</span><span class="radar-desc">MTP3·8 角色认知+信赖关系</span></div>
          <div class="radar-row"><span class="radar-dot" style="background:#10B981"></span><span class="radar-name">P₁ 诊断问题</span><span class="radar-score" id="rP1Diagnose">-</span><span class="radar-desc">MTP10 问题解决</span></div>
          <div class="radar-row"><span class="radar-dot" style="background:#F59E0B"></span><span class="radar-name">P₅ 示范赋能</span><span class="radar-score" id="rP5Empower">-</span><span class="radar-desc">MTP7·11 培育启发+榜样激励</span></div>
          <div class="radar-row"><span class="radar-dot" style="background:#EF4444"></span><span class="radar-name">P₃ 重构目标</span><span class="radar-score" id="rP3Reframe">-</span><span class="radar-desc">MTP4·11 计划命令+参与激励</span></div>"""
html = html.replace(old_labels_html, new_labels_html)

# Fix 3: 课程 recommendations — 修复key引用 + 加入MTP11激励
old_courses = """var courses = {
      trust: { title: 'MTP8·信赖关系的形成（对下管理）', desc: '信任的四要素、信赖关系形成的条件。→ 课后练习：到岗第一天，用提问取代宣布方案，识别谁是你团队里的"NPC-周"。' },
      diagnose: { title: 'MTP10·问题解决（诊断与决策）', desc: '问题意识、问题分类、问题解决六步骤。→ 课后练习：花一天爬数据、跟岗、走访，列出三个团队自己都没意识到的卡点。' },
      subtract: { title: 'MTP4·计划与命令（目标聚焦）', desc: '计划的制定、5W2H、命令的下达方式。→ 课后练习：列出"可以停做的事"清单，砍掉干扰项，聚焦最有把握的目标。' },
      demo: { title: 'MTP7·培育与启发（示范与带教）', desc: 'OJT四步骤：示教→跟做→反馈→独立。→ 课后练习：亲自示范一组客户成交，用行动告诉团队"这条路走得通"。' }
    };"""
new_courses = """var courses = {
      p2_trust: { title: 'MTP3·8 管理角色认知+信赖关系的形成（对下管理）', desc: '管理者对下的三大角色（管理者/教练/领导者）。非权力影响力=专家权+典范权。信任四要素。→ 课后练习：到岗第一天，用行动而非语言建立第一笔信任，识别谁是你团队里的"NPC-周"。' },
      p1_diagnose: { title: 'MTP10·11 问题解决+激励的时机原则（诊断与决策）', desc: '问题意识、问题分类、问题解决六步骤。激励的时机原则——先诊断再激励，没搞清楚问题前任何方案都是闭眼射箭。→ 课后练习：花一天爬数据、跟岗、走访，列出三个团队自己都没意识到的卡点。' },
      p5_empower: { title: 'MTP7·11 培育与启发+榜样激励（示范与带教）', desc: 'OJT四步骤：示教→跟做→反馈→独立。榜样激励——示范是无声语言，亲自下场的说服力超过一百句动员。→ 课后练习：亲自示范一组客户成交，用行动告诉团队"这条路走得通"。' },
      p3_reframe: { title: 'MTP4·11 计划与命令+参与激励（目标聚焦）', desc: '计划的制定、5W2H、命令的下达方式。参与激励——让团队参与目标制定，从"要我做"变成"我要做"。→ 课后练习：列出"可以停做的事"清单，砍掉干扰项，聚焦最有把握的目标。' }
    };"""
html = html.replace(old_courses, new_courses)

# Fix 4: 最薄弱维度course引用
html = html.replace("courses[weakest.key]", "courses[weakest.key]||courses['p2_trust']")
html = html.replace("courses[second.key]", "courses[second.key]||courses['p2_trust']")

# Fix 5: MTP Verdict text 统一
old_verdict = "到现场去(MTP10) → 建立信任(MTP8) → 聚焦做减法(MTP4) → 亲自示范(MTP7)"
new_verdict = "到现场去(P₁诊断·MTP10) → 建立信任(P₂信任·MTP3/8) → 聚焦做减法(P₅赋能·MTP4/11) → 亲自示范(P₃目标·MTP7/11)"
html = html.replace(old_verdict, new_verdict)

# Fix 6: 课程模块引用更新
old_module_ref = "模块8信赖关系→模块4计划与命令→模块7培育与启发→模块11激励"
new_module_ref = "MTP3管理角色→MTP8信赖关系→MTP4计划命令→MTP7培育启发→MTP11激励（对下管理·激励主线）"
html = html.replace(old_module_ref, new_module_ref)

# Fix 7: 页面标题 subtitle
html = html.replace("半年度绩效面谈 · 下午3:00 · 小会议室 · 30分钟",
    "首开空降支援 · 到岗第一天晚上8点 · 你的第一次早会在明天9点")

with open('/Users/xzzsw127/Claude code/scene_TG001_反馈页.html', 'w') as f:
    f.write(html)
print("✅ 反馈页 7 处修复完成（MTP统一+课程映射+雷达标注）")

print("\n🎉 三个文件全部修复完成")
print("  scene_TG001_准备页.html — 7处残留清除")
print("  scene_TG001_引擎页.html — Whisper样式区分+MTP11加入+上下文检测强化")
print("  scene_TG001_反馈页.html — MTP统一标注+课程key修复+雷达MTP关联")
