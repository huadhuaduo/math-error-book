-- ============================================================
-- 三智能体架构 · 数据库迁移
-- 基于已有 coaching_scenes 和 coaching_sessions 表
-- 只加字段，不改已有结构
-- ============================================================

-- 1. coaching_scenes：场景卡存储
ALTER TABLE coaching_scenes
  ADD COLUMN IF NOT EXISTS scenario_card JSONB,
  ADD COLUMN IF NOT EXISTS d_vector JSONB,
  ADD COLUMN IF NOT EXISTS p_sequence TEXT,
  ADD COLUMN IF NOT EXISTS progression_chain TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

COMMENT ON COLUMN coaching_scenes.scenario_card IS '场景卡完整JSON·符合协议v1.1';
COMMENT ON COLUMN coaching_scenes.d_vector IS 'D向量{D1_morale_root,D2_pressure_mode,D3_experience_mix,D4_incentive_resource,D5_trust_base,D5_crack_type}';
COMMENT ON COLUMN coaching_scenes.p_sequence IS 'P步骤序列·如P₂→P₅→P₆';
COMMENT ON COLUMN coaching_scenes.progression_chain IS '递进链·如信任建立→方向减法→信心打样';
COMMENT ON COLUMN coaching_scenes.status IS 'draft|verified|deployed';

-- 2. coaching_sessions：决策路径存储
ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS decision_path JSONB,
  ADD COLUMN IF NOT EXISTS scenario_id TEXT,
  ADD COLUMN IF NOT EXISTS golden_path_match_rate REAL;

COMMENT ON COLUMN coaching_sessions.decision_path IS '决策路径{decisions:[{dp_id,selected_option,is_correct,trap_type,timestamp}],golden_path_match_rate}';
COMMENT ON COLUMN coaching_sessions.golden_path_match_rate IS '最佳路径匹配率·0到1';

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_coaching_scenes_status ON coaching_scenes(status);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_scenario_id ON coaching_sessions(scenario_id);
