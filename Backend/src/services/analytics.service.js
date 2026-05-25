class AnalyticsService {
  average(values = []) {
    const valid = values.filter((value) => Number.isFinite(value));
    if (!valid.length) {
      return 0;
    }

    return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2));
  }

  rollingAverage(values = [], size = 3) {
    const valid = values.filter((value) => Number.isFinite(value));
    return this.average(valid.slice(-size));
  }

  detectImprovement(values = []) {
    const valid = values.filter((value) => Number.isFinite(value));
    if (valid.length < 2) {
      return { delta: 0, improving: false, consistency: 0 };
    }

    const firstHalf = valid.slice(0, Math.ceil(valid.length / 2));
    const secondHalf = valid.slice(Math.floor(valid.length / 2));
    const delta = Number((this.average(secondHalf) - this.average(firstHalf)).toFixed(2));
    const variance = this.average(valid.map((value) => Math.abs(value - this.average(valid))));
    const consistency = Number(Math.max(0, 100 - variance).toFixed(2));

    return {
      delta,
      improving: delta > 3,
      consistency,
    };
  }

  detectWeakTopics(topicPerformance = []) {
    return [...topicPerformance]
      .sort((a, b) => (a.averageScore || 0) - (b.averageScore || 0))
      .slice(0, 3);
  }

  detectStrongTopics(topicPerformance = []) {
    return [...topicPerformance]
      .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
      .slice(0, 3);
  }

  buildLearningRecommendations({ weakTopics = [], weaknesses = [] }) {
    const topicRecommendations = weakTopics.map((entry) => `Revisit ${entry.topic} with timed drills and one implementation project.`);
    const weaknessRecommendations = weaknesses.slice(0, 3).map((item) => `Practice targeted exercises for ${item}.`);
    return [...new Set([...topicRecommendations, ...weaknessRecommendations])].slice(0, 6);
  }

  calculateEmployabilityScore(profile, progress, resume) {
    const interviewPerformance = progress?.averageScore || 0;
    
    let verifiedSkillsScores = [];
    if (profile?.verifiedSkills) {
      if (profile.verifiedSkills instanceof Map) {
        verifiedSkillsScores = [...profile.verifiedSkills.values()];
      } else {
        verifiedSkillsScores = Object.values(profile.verifiedSkills);
      }
    }
    const verifiedSkills = verifiedSkillsScores.length ? this.average(verifiedSkillsScores) : 50;

    const resumeQuality = resume?.aiAnalysis?.resumeQualityScore || 50;

    const topicPerformance = progress?.topicPerformance || [];
    const confidenceScores = topicPerformance.map(t => t.confidenceAverage).filter(Boolean);
    const communication = confidenceScores.length ? this.average(confidenceScores) : 50;

    const projectDepth = Math.min(100, (profile?.projects?.length || 0) * 33.3);

    const score = Math.round(
      (interviewPerformance * 0.35) +
      (verifiedSkills * 0.20) +
      (resumeQuality * 0.15) +
      (communication * 0.15) +
      (projectDepth * 0.15)
    );

    return {
      overallScore: Math.min(100, Math.max(0, score)),
      breakdown: {
        interviewPerformance,
        verifiedSkills,
        resumeQuality,
        communication,
        projectDepth
      }
    };
  }

  buildDashboardSummary(progress, sessions = [], profile = null, resume = null) {
    const topicPerformance = progress?.topicPerformance || [];
    const strongestTopic = this.detectStrongTopics(topicPerformance)[0]?.topic || 'N/A';
    const weakestTopic = this.detectWeakTopics(topicPerformance)[0]?.topic || 'N/A';

    const employability = this.calculateEmployabilityScore(profile, progress, resume);

    // Compute mock rolling employability scores over sessions to show trends
    const trends = sessions.map((session, idx) => {
      const rollingAverageSession = this.average(sessions.slice(0, idx + 1).map((s) => s.score));
      const rollingComm = this.average(sessions.slice(0, idx + 1).map((s) => s.communicationScore || s.score));
      const rollingScore = Math.round(
        (rollingAverageSession * 0.35) +
        (verifiedSkills * 0.20) +
        (resumeQuality * 0.15) +
        (rollingComm * 0.15) +
        (projectDepth * 0.15)
      );

      return {
        label: new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        employability: Math.min(100, Math.max(20, rollingScore))
      };
    });

    return {
      totalInterviews: progress?.interviewsTaken || 0,
      averageScore: progress?.averageScore || 0,
      bestScore: progress?.bestScore || 0,
      latestScore: progress?.latestScore || 0,
      strongestTopic,
      weakestTopic,
      employability,
      employabilityTrends: trends.length ? trends : [{ label: 'Onboarding', employability: employability.overallScore }],
      scoreProgression: sessions.map((session) => ({
        label: new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: session.score || 0,
        technicalScore: session.technicalScore || 0,
        communicationScore: session.communicationScore || 0,
      })),
      topicPerformance: topicPerformance.map((entry) => ({
        topic: entry.topic,
        averageScore: entry.averageScore,
        confidenceAverage: entry.confidenceAverage || 0,
        interviewsTaken: entry.interviewsTaken || 0,
      })),
      confidenceTrend: (progress?.recentInterviews || []).map((entry) => ({
        label: new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        confidence: entry.confidenceScore || 0,
      })),
      improvementGraph: (progress?.recentInterviews || []).map((entry, index, list) => ({
        label: `${index + 1}`,
        score: entry.score,
        movingAverage: this.average(list.slice(Math.max(0, index - 2), index + 1).map((item) => item.score)),
      })),
      learningRecommendations: this.buildLearningRecommendations({
        weakTopics: this.detectWeakTopics(topicPerformance),
        weaknesses: sessions[0]?.weaknesses || [],
      }),
    };
  }
}

module.exports = new AnalyticsService();
