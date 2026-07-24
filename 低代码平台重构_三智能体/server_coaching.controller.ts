// ============================================================
// 追加到 server/modules/coaching/coaching.controller.ts
// 在已有 CoachingController 类中新增以下端点
// ============================================================

import { Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { NeedLogin } from '../../common/guards/need-login.guard';
import { CoachingService } from './coaching.service';

@Controller('api/coaching')
export class CoachingController {
  constructor(
    private readonly coachingService: CoachingService,
  ) {}

  // ====== 🆕 场景卡 CRUD ======

  /** 创建场景卡 */
  @NeedLogin()
  @Post('scenario-cards')
  async createScenarioCard(@Body() body: {
    scenarioCard: any;
    dVector: any;
    pSequence: string;
    progressionChain: string;
    title?: string;
  }) {
    const scene = await this.coachingService.createScenarioCard(body);
    return { id: scene.id, ...scene };
  }

  /** 读取场景卡 */
  @NeedLogin()
  @Get('scenario-cards/:id')
  async getScenarioCard(@Param('id') id: string) {
    const scene = await this.coachingService.getScenarioCard(id);
    if (!scene) {
      return { error: '场景不存在', status: 404 };
    }
    return scene;
  }

  /** 列出所有场景卡 */
  @NeedLogin()
  @Get('scenario-cards')
  async listScenarioCards() {
    return this.coachingService.listScenarioCards();
  }

  // ====== 🆕 会话决策路径 ======

  /** 创建会话（带决策路径） */
  @NeedLogin()
  @Post('sessions/with-decision-path')
  async createSessionWithDecisionPath(
    @Req() req: any,
    @Body() body: { sceneId: string; decisionPath?: any },
  ) {
    const { userId } = req.userContext;
    const session = await this.coachingService.createSessionWithDecisionPath(
      userId,
      body.sceneId,
      body.decisionPath || {
        decisions: [],
        started_at: new Date().toISOString(),
        golden_path_match_rate: 0,
      },
    );
    return { id: session.id, ...session };
  }

  /** 更新会话决策路径 */
  @NeedLogin()
  @Patch('sessions/:id/decision-path')
  async updateDecisionPath(
    @Param('id') id: string,
    @Body() body: { decisionPath: any },
  ) {
    const session = await this.coachingService.updateDecisionPath(id, body.decisionPath);
    return session;
  }

  /** 读取会话（含决策路径） */
  @NeedLogin()
  @Get('sessions/:id/decision-path')
  async getSessionDecisionPath(@Param('id') id: string) {
    const session = await this.coachingService.getSessionWithDecisionPath(id);
    if (!session) {
      return { error: '会话不存在', status: 404 };
    }
    return session;
  }
}
