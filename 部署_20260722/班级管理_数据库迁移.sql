-- ============================================================
-- 班级管理功能 · 数据库迁移
-- 2026-07-21 · 妙搭 PostgreSQL
-- ============================================================

-- 1. 新建班级表
CREATE TABLE IF NOT EXISTS coaching_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name VARCHAR(100) NOT NULL,
  admin_user_id VARCHAR(50) NOT NULL,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  project_company VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  _created_by VARCHAR(50),
  _updated_at TIMESTAMP,
  _updated_by VARCHAR(50)
);

-- 2. 新建班级-学员关联表（N:N，一个学员可属于多个班级）
CREATE TABLE IF NOT EXISTS class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES coaching_classes(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- 3. coaching_sessions 新增班级外键
ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES coaching_classes(id);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_class_members_user ON class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_class ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON coaching_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_invite ON coaching_classes(invite_code);
