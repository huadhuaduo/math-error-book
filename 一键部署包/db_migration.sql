-- ============================================================
-- 三智能体架构 · 数据库迁移（只加字段·不改已有结构）
-- 在 PostgreSQL 中执行
-- ============================================================

-- 1. coaching_scenes 表加字段
ALTER TABLE coaching_scenes
  ADD COLUMN IF NOT EXISTS scenario_card JSONB,
  ADD COLUMN IF NOT EXISTS d_vector JSONB,
  ADD COLUMN IF NOT EXISTS p_sequence TEXT,
  ADD COLUMN IF NOT EXISTS progression_chain TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

COMMENT ON COLUMN coaching_scenes.scenario_card IS '场景卡完整JSON';
COMMENT ON COLUMN coaching_scenes.d_vector IS 'D向量 {D1,D2,D3,D4,D5,D5_crack_type}';
COMMENT ON COLUMN coaching_scenes.p_sequence IS 'P步骤序列 如 P2→P5→P6';
COMMENT ON COLUMN coaching_scenes.progression_chain IS '递进链 如 信任→方向→信心';

-- 2. coaching_sessions 表加字段
ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS decision_path JSONB,
  ADD COLUMN IF NOT EXISTS scenario_id TEXT,
  ADD COLUMN IF NOT EXISTS golden_path_match_rate REAL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

COMMENT ON COLUMN coaching_sessions.decision_path IS '决策路径 {decisions:[],golden_path_match_rate}';
COMMENT ON COLUMN coaching_sessions.golden_path_match_rate IS '最佳路径匹配率 0到1';

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_scenes_status ON coaching_scenes(status);
CREATE INDEX IF NOT EXISTS idx_sessions_scenario ON coaching_sessions(scenario_id);
