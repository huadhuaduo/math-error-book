/**
 * 安全条件求值器
 *
 * 替代 eval() —— 用结构化 ConditionClause 数组做安全比对
 * 原则：不执行任何用户输入的字符串作为代码
 *
 * 用法：
 *   evaluateConditions(conditions, ctx)
 *   conditions: [{field:"bizMentioned", expect:true}, {field:"strategySet", expect:false}]
 *   等价于: ctx.bizMentioned === true && ctx.strategySet === false
 *
 *   evaluateConditionGroups(groups, ctx)
 *   groups: [[{...}], [{...}, {...}]]
 *   外层OR，内层AND
 */

import type { ConditionClause } from './场景卡数据协议_v2.0';

/**
 * 求值一组条件（AND关系）
 * 所有子句都为真时返回 true
 */
export function evaluateConditions(
  conditions: ConditionClause[],
  ctx: Record<string, boolean>
): boolean {
  if (conditions.length === 0) return true; // 空数组=无条件触发
  for (const clause of conditions) {
    const actual = ctx[clause.field] ?? false;
    if (actual !== clause.expect) return false;
  }
  return true;
}

/**
 * 求值条件组（OR of ANDs）
 * 任意一组子句全为真时返回 true
 */
export function evaluateConditionGroups(
  groups: ConditionClause[][],
  ctx: Record<string, boolean>
): boolean {
  if (groups.length === 0) return false;
  for (const group of groups) {
    if (evaluateConditions(group, ctx)) return true;
  }
  return false;
}

/**
 * 从用户输入更新上下文变量
 * 使用 sceneConfig.prompt_rules.context_vars 的正则规则
 */
export function updateContextFromInput(
  text: string,
  contextVars: Array<{ name: string; pattern: string }>,
  ctx: Record<string, boolean>
): Record<string, boolean> {
  const updated = { ...ctx };
  for (const cv of contextVars) {
    if (new RegExp(cv.pattern).test(text)) {
      updated[cv.name] = true;
    }
  }
  return updated;
}
