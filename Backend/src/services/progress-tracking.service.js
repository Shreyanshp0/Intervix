const UserProgress = require('../models/UserProgress');
const InterviewSession = require('../models/InterviewSession');
const analyticsService = require('./analytics.service');

class ProgressTrackingService {
  async getOrCreate(userId) {
    let progress = await UserProgress.findOne({ userId });
    if (!progress) {
      progress = await UserProgress.create({ userId });
    }
    return progress;
  }

  upsertTopicPerformance(topicPerformance = [], session) {
    const normalizedTopic = session.topic.trim().toLowerCase();
    let existing = topicPerformance.find((entry) => entry.topic.toLowerCase() === normalizedTopic);

    if (!existing) {
      existing = {
        topic: session.topic,
        interviewsTaken: 0,
        averageScore: 0,
        bestScore: 0,
        latestScore: 0,
        confidenceAverage: 0,
      };
      topicPerformance.push(existing);
    }

    existing.interviewsTaken += 1;
    existing.latestScore = session.score || 0;
    existing.bestScore = Math.max(existing.bestScore || 0, session.score || 0);
    existing.averageScore = Number(
      (((existing.averageScore || 0) * (existing.interviewsTaken - 1) + (session.score || 0)) / existing.interviewsTaken).toFixed(2)
    );
    existing.confidenceAverage = Number(
      (((existing.confidenceAverage || 0) * (existing.interviewsTaken - 1) + (session.confidenceScore || 0)) / existing.interviewsTaken).toFixed(2)
    );
  }

  async updateAfterInterview(session) {
    const progress = await this.getOrCreate(session.userId);
    const previousRecent = [...(progress.recentInterviews || [])];

    progress.interviewsTaken += 1;
    progress.latestScore = session.score || 0;
    progress.bestScore = Math.max(progress.bestScore || 0, session.score || 0);
    progress.averageScore = Number(
      (((progress.averageScore || 0) * (progress.interviewsTaken - 1) + (session.score || 0)) / progress.interviewsTaken).toFixed(2)
    );

    this.upsertTopicPerformance(progress.topicPerformance, session);

    progress.recentInterviews.unshift({
      sessionId: session._id,
      topic: session.topic,
      score: session.score || 0,
      confidenceScore: session.confidenceScore || 0,
      completedAt: session.endedAt || new Date(),
    });
    progress.recentInterviews = progress.recentInterviews.slice(0, 12);

    const scoreTrend = analyticsService.detectImprovement(progress.recentInterviews.map((entry) => entry.score).reverse());
    const previousConfidence = previousRecent[0]?.confidenceScore || 0;
    progress.improvementMetrics = {
      scoreDelta: scoreTrend.delta,
      confidenceDelta: Number(((session.confidenceScore || 0) - previousConfidence).toFixed(2)),
      consistency: scoreTrend.consistency,
      improving: scoreTrend.improving,
    };

    await progress.save();
    return progress;
  }

  async getDashboardData(userId) {
    const progress = await this.getOrCreate(userId);
    const sessions = await InterviewSession.find({
      userId,
      status: { $in: ['completed', 'expired'] },
      reportGeneratedAt: { $exists: true },
    })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    return analyticsService.buildDashboardSummary(progress.toObject(), sessions);
  }
}

module.exports = new ProgressTrackingService();
