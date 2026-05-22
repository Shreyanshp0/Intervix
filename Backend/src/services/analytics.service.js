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

  buildDashboardSummary(progress, sessions = []) {
    const topicPerformance = progress?.topicPerformance || [];
    const strongestTopic = this.detectStrongTopics(topicPerformance)[0]?.topic || 'N/A';
    const weakestTopic = this.detectWeakTopics(topicPerformance)[0]?.topic || 'N/A';

    return {
      totalInterviews: progress?.interviewsTaken || 0,
      averageScore: progress?.averageScore || 0,
      bestScore: progress?.bestScore || 0,
      latestScore: progress?.latestScore || 0,
      strongestTopic,
      weakestTopic,
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
