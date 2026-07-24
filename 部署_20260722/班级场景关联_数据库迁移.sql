-- 班级-场景关联表
-- 管理员创建班级时选择该班包含哪些场景
CREATE TABLE IF NOT EXISTS class_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES coaching_classes(id) ON DELETE CASCADE,
  scene_id VARCHAR(50) NOT NULL,
  sort_order INT DEFAULT 0,
  UNIQUE(class_id, scene_id)
);

CREATE INDEX IF NOT EXISTS idx_class_scenes_class ON class_scenes(class_id);
