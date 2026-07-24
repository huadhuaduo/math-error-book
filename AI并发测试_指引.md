# AI 插件并发上限确认 · 测试指引

## 方法一：查低代码平台管理后台（最快）

1. 打开低代码平台管理后台
2. 找到 AI 插件管理页面
3. 查这三个插件的配置：

| 插件名 | QPS 上限？ | 超时时间？ |
|--------|----------|-----------|
| `scenario_card_smart_generate_v19_1` | ？ | ？ |
| `mdp_coach_ai_conversation_reply_1` | ？ | ？ |
| `ai_coach_analysis_report_1` | ？ | ？ |

**截图发给我**，我来判断是否需要启动 B 路线（预生成 NPC 回应池）。

## 方法二：如果不能直接查——手动压测

在低代码平台上新建一个页面，粘贴下面的 HTML，打开后点"开始测试"。它会连续发 20 次对话请求，统计成功率和响应时间。

```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>AI并发测试</title>
<style>body{font-family:system-ui;padding:40px;max-width:600px;margin:0 auto}
.result{font-size:12px;line-height:1.8;margin:10px 0;padding:8px;border-radius:8px;background:#f5f5f5}
.pass{color:green}.fail{color:red}</style></head><body>
<h2>AI 插件并发测试</h2>
<p>点击按钮后，会连续发送 20 次对话请求。观察成功率和响应时间。</p>
<button id="start" style="padding:12px 28px;font-size:16px;border-radius:8px;border:none;background:#5B9A8B;color:#fff;cursor:pointer">开始测试（20次并发）</button>
<div id="output"></div>
<script>
document.getElementById('start').addEventListener('click', async function() {
  var output = document.getElementById('output');
  output.innerHTML = '<p>测试中…</p>';
  var results = [];
  var plugin = window.capabilityClient.load('mdp_coach_ai_conversation_reply_1');

  for (var i = 1; i <= 20; i++) {
    var start = Date.now();
    try {
      var result = await plugin.call('textGenerate', {
        system_prompt: '你是NPC-周。简单回应即可。',
        user_message_history: JSON.stringify([{role:'user',content:'你好'}])
      });
      var ms = Date.now() - start;
      results.push({n:i, ok:true, ms:ms});
      output.innerHTML += '<div class="result"><span class="pass">✅ 第'+i+'次</span> — '+ms+'ms</div>';
    } catch(e) {
      var ms = Date.now() - start;
      results.push({n:i, ok:false, ms:ms, err:e.message});
      output.innerHTML += '<div class="result"><span class="fail">❌ 第'+i+'次失败</span> — '+ms+'ms — '+e.message+'</div>';
    }
    // 间隔 200ms，模拟多人同时请求
    if (i < 20) await new Promise(r => setTimeout(r, 200));
  }

  var ok = results.filter(r => r.ok).length;
  var avgMs = Math.round(results.filter(r => r.ok).reduce((a,b) => a + b.ms, 0) / ok);
  var maxMs = Math.max(...results.map(r => r.ms));
  output.innerHTML += '<hr><p><strong>结果：'+ok+'/20 成功，平均 '+avgMs+'ms，最慢 '+maxMs+'ms</strong></p>';
  if (ok < 15) output.innerHTML += '<p class="fail">⚠️ 成功率低于75%，高并发下AI插件可能撑不住。建议启动B路线（预生成NPC回应池）。</p>';
  else if (maxMs > 10000) output.innerHTML += '<p class="fail">⚠️ 最慢响应超10秒，用户体验差。建议加NPC等待提示。</p>';
  else output.innerHTML += '<p class="pass">✅ 通过。20次并发基本正常。</p>';
});
</script></body></html>
```

## 判断标准

| 指标 | 正常 | 需优化 | 需B路线 |
|------|------|--------|---------|
| 成功率 | ≥90% | 75-89% | <75% |
| 最慢响应 | <5秒 | 5-10秒 | >10秒 |
| QPS 上限 | ≥20 | 10-19 | <10 |

**如果 QPS < 20 或成功率 < 75%：启动 B 路线——预生成 NPC 回应池（每个决策点预生成 5-8 个 NPC 回应变体存入 JSON，前端直接读取，只有"自定义回应"才调 AI 插件）。**
