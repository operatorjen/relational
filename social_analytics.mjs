export class SocialAnalytics {
  constructor() {
    this.turnData = []
    this.metrics = { totalEngagement: 0, totalPersonalization: 0, turnCount: 0 }
  }

  recordTurn(tR) {
    const engagement = tR.personalizedResponses.reduce((sum, response) => {
      return sum + (response.engagementWillingness || 0.5)
    }, 0) / (tR.personalizedResponses.length || 1)
    this.turnData.push({
      timestamp: Date.now(),
      engagement,
      personalizationCount: tR.personalizedResponses.length,
      socialDynamics: tR.socialDynamics
    })
    this.metrics.totalEngagement += engagement
    this.metrics.totalPersonalization += tR.personalizedResponses.length
    this.metrics.turnCount++
    if (this.turnData.length > 100) this.turnData.shift()
  }

  getAverageEngagement() { return this.metrics.turnCount > 0 ? this.metrics.totalEngagement / this.metrics.turnCount : 0 }

  getPersonalizationRate() { return this.metrics.turnCount > 0 ? this.metrics.totalPersonalization / this.metrics.turnCount : 0 }

  getSummary() {
    const rT = this.turnData.slice(-20)
    const rE = rT.reduce((sum, turn) => sum + turn.engagement, 0) / (rT.length || 1)
    return {
      averageEngagement: this.getAverageEngagement(),
      recentEngagement: rE,
      personalizationRate: this.getPersonalizationRate(),
      turnCount: this.metrics.turnCount,
      trend: this._calculateTrend()
    }
  }

  _calculateTrend() {
    if (this.turnData.length < 10) return 'stable'
    const r = this.turnData.slice(-10)
    const o = this.turnData.slice(-20, -10)
    const rA = r.reduce((sum, turn) => sum + turn.engagement, 0) / r.length
    const oA = o.reduce((sum, turn) => sum + turn.engagement, 0) / o.length
    if (rA > oA + 0.1) return 'improving'
    if (rA < oA - 0.1) return 'declining'
    return 'stable'
  }
}