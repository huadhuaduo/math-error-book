// 追加到 server/modules/coaching/coaching.controller.ts
// 加在已有端点的最后一个 } 前面

  @NeedLogin()
  @Post('seed-scenarios')
  async seedScenarios(@Body() body: { scenarios: any[] }) {
    const results = [];
    for (const card of body.scenarios) {
      const scene = await this.coachingService.createScenarioCard({
        scenarioCard: card,
        dVector: card.meta.d_vector,
        pSequence: card.meta.p_sequence,
        progressionChain: card.meta.progression_chain,
        title: card.meta.title,
      });
      results.push({ id: scene.id, title: card.meta.title });
    }
    return { seeded: results.length, scenarios: results };
  }
