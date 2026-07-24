// ============================================================
// 追加到 server/modules/coaching/coaching.service.ts
// 在已有 CoachingService 类中新增以下方法
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE_DATABASE, PostgresJsDatabase } from '../../database/drizzle.provider';
import { coachingScenes, coachingSessions } from '../../database/schema';

@Injectable()
export class CoachingService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ====== 已有方法（保持不变） ======
  // getAllScenes, createSession, updateSession, mapSceneToDto ...

  // ====== 🆕 新增：场景卡 CRUD ======

  /** 创建场景卡（含完整 JSON） */
  async createScenarioCard(data: {
    scenarioCard: any;
    dVector: any;
    pSequence: string;
    progressionChain: string;
    title?: string;
  }) {
    const [scene] = await this.db
      .insert(coachingScenes)
      .values({
        scenarioContext: data.scenarioCard.context,
        aiCharacter: data.scenarioCard.context,
        scenarioCard: data.scenarioCard,
        dVector: data.dVector,
        pSequence: data.pSequence,
        progressionChain: data.progressionChain,
        status: 'draft',
      } as any)
      .returning();
    return scene;
  }

  /** 读取场景卡 */
  async getScenarioCard(sceneId: string) {
    const [scene] = await this.db
      .select()
      .from(coachingScenes)
      .where(eq(coachingScenes.id, sceneId));

    if (!scene) return null;

    return {
      ...scene,
      scenarioCard: typeof scene.scenarioCard === 'string'
        ? JSON.parse(scene.scenarioCard as string)
        : scene.scenarioCard,
      dVector: typeof scene.dVector === 'string'
        ? JSON.parse(scene.dVector as string)
        : scene.dVector,
    };
  }

  /** 列出所有场景卡（按创建时间倒序） */
  async listScenarioCards() {
    const results = await this.db
      .select()
      .from(coachingScenes)
      .orderBy(desc(coachingScenes.createdAt));
    return results.map(s => ({
      ...s,
      scenarioCard: typeof s.scenarioCard === 'string'
        ? JSON.parse(s.scenarioCard as string)
        : s.scenarioCard,
    }));
  }

  /** 更新场景卡状态 */
  async updateScenarioStatus(sceneId: string, status: string) {
    await this.db
      .update(coachingScenes)
      .set({ status, updatedAt: new Date() } as any)
      .where(eq(coachingScenes.id, sceneId));
  }

  // ====== 🆕 新增：会话决策路径 ======

  /** 创建带决策路径的会话 */
  async createSessionWithDecisionPath(
    userId: string,
    sceneId: string,
    decisionPath: any,
  ) {
    const [session] = await this.db
      .insert(coachingSessions)
      .values({
        userId,
        sceneId,
        scenarioId: sceneId,
        messages: [],
        decisionPath,
        status: 'active',
      } as any)
      .returning();
    return session;
  }

  /** 更新会话的决策路径 */
  async updateDecisionPath(sessionId: string, decisionPath: any) {
    const goldenPathMatchRate = decisionPath.decisions?.length > 0
      ? decisionPath.decisions.filter((d: any) => d.is_correct).length / decisionPath.decisions.length
      : 0;

    const [session] = await this.db
      .update(coachingSessions)
      .set({
        decisionPath,
        goldenPathMatchRate,
        completedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(coachingSessions.id, sessionId))
      .returning();
    return session;
  }

  /** 读取会话的决策路径 */
  async getSessionWithDecisionPath(sessionId: string) {
    const [session] = await this.db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.id, sessionId));

    if (!session) return null;

    return {
      ...session,
      decisionPath: typeof session.decisionPath === 'string'
        ? JSON.parse(session.decisionPath as string)
        : session.decisionPath,
    };
  }
}
