import { SocialTaste } from './social_taste.mjs'
import { Interaction } from './interaction.mjs'
import { RelationalMesh } from './relational_mesh.mjs'
import { RelationalState } from './relational_state.mjs'
import { InteractionPatterns } from './interaction_patterns.mjs'
import { SocialAnalytics } from './social_analytics.mjs'

export class Relational {
  constructor(agents = [], config = {}) {
    this.agents = agents.length ? new Map(agents.map(agent => [agent.id, agent])) : []
    this.config = {
      enablePersistence: true,
      analysisInterval: 5000,
      maxHistorySize: 1000,
      ...config
    }
    this.mesh = new RelationalMesh(Array.from(this.agents.values()))
    this.socialTaste = new SocialTaste(Array.from(this.agents.values()), this.mesh, config.tasteConfig)
    this.conversationHistory = []
    this.socialAnalytics = new SocialAnalytics()
    this.isRunning = false
  }

  async processTurn(speakerId, input = '', context = {}) {
    if (!this.agents.has(speakerId)) throw new Error(`Unknown agent: ${speakerId}`)
    const tR = this.socialTaste.processTurn(speakerId, input, context)
    this.conversationHistory.push({
      timestamp: Date.now(),
      speakerId,
      input,
      context,
      result: tR
    })
    if (this.conversationHistory.length > this.config.maxHistorySize) this.conversationHistory.shift()
    this.socialAnalytics.recordTurn(tR)
    return tR
  }

  getInteraction(agentAId, agentBId) {
    const i = this.mesh.getInteraction(agentAId, agentBId)
    if (!i) throw new Error(`No interaction found between ${agentAId} and ${agentBId}`)
    return {
      ...i.getPersonalizationContext(),
      state: i.state.snapshot(),
      patterns: i.interactionPatterns,
      history: i.sharedHistory.slice(-10)
    }
  }

  getAgentInteractions(agentId) {
    const i = this.mesh.getAgentInteractions(agentId)
    return i.map(it => ({ target: it.target.id, ...it.getPersonalizationContext(), state: it.state.snapshot() }))
  }

  getSocialDynamics() {
    const dy = this.mesh.calculateSocialDynamics(), a = this.socialAnalytics.getSummary()
    return {
      ...dy,
      analytics: a,
      networkHealth: this._calculateNetworkHealth(dy),
      activeRelationships: this._getActiveInteractionCount(),
      conversationMetrics: this._getConversationMetrics()
    }
  }

  updateInteractionState(agentAId, agentBId, updates) {
    const i = this.mesh.getInteraction(agentAId, agentBId)
    if (!i) throw new Error(`No interaction found between ${agentAId} and ${agentBId}`)
    i.state.update(updates)
    return i.state.snapshot()
  }

  addAgent(agent, initialInteractions = {}) {
    if (this.agents.has(agent.id)) throw new Error(`Agent ${agent.id} already exists`)
    this.agents.set(agent.id, agent)
    this.mesh.addAgent(agent)
    Object.entries(initialInteractions).forEach(([otherAgentId, state]) => {
      if (this.agents.has(otherAgentId)) {
        const interaction = this.mesh.getInteraction(agent.id, otherAgentId)
        if (interaction && state) interaction.state.update(state)
      }
    })
    return this.getAgentInteractions(agent.id)
  }

  removeAgent(agentId) {
    if (!this.agents.has(agentId)) throw new Error(`Agent ${agentId} not found`)
    this.agents.delete(agentId)
    this.mesh.removeAgent(agentId)
    this.conversationHistory = this.conversationHistory.filter(entry => entry.speakerId !== agentId)
  }

  getSpeakingRecommendations() {
    const rs = [] 
    for (const [agentId] of this.agents) {
      const iS = this.mesh.getAgentInteractions(agentId)
      const eS = iS.reduce((score, it) => { return score + it.state.calculateEngagementWillingness() }, 0) / (iS.length || 1)    
      const sN = this._calculateSocialNeed(iS)
      const cB = this._calculateConversationBalance(agentId)   
      rs.push({
        agentId,
        score: eS * 0.4 + sN * 0.4 + cB * 0.2,
        engagementScore: eS,
        socialNeed: sN,
        conversationBalance: cB,
        recommended: eS > 0.6 && sN > 0.5
      })
    }  
    return rs.sort((a, b) => b.score - a.score)
  }

  exportState() {
    const state = {
      timestamp: Date.now(),
      agents: Array.from(this.agents.keys()),
      interactions: {},
      socialDynamics: this.getSocialDynamics(),
      conversationStats: this._getConversationMetrics()
    }
    for (const [agentId] of this.agents) {
      const iS = this.mesh.getAgentInteractions(agentId)
      state.interactions[agentId] = {}
      for (const i of iS) {
        state.interactions[agentId][i.target.id] = {
          state: i.state.snapshot(),
          patterns: i.interactionPatterns,
          historySize: i.sharedHistory.length
        }
      }
    }
    return state
  }

  importState(state) {
    if (!state || !state.agents || !state.interactions) throw new Error('Invalid state format')
    this.conversationHistory = []
    this.socialAnalytics = new SocialAnalytics()
    this.mesh.importState(state)  
    return this.getSocialDynamics()
  }

  getDiagnostics() {
    const baseDiagnostics = {
      agentCount: this.agents.size,
      interactionCount: this.mesh.interactions.size,
      historySize: this.conversationHistory.length,
      memoryUsage: this._estimateMemoryUsage(),
      recentActivity: this.conversationHistory.slice(-5).map(entry => ({
        speaker: entry.speakerId,
        timestamp: entry.timestamp,
        hadPersonalization: entry.result.personalizedResponses.length > 0
      }))
    }
    const dy = this.getSocialDynamics()
    const health = this._getSystemHealth(baseDiagnostics, dy)
    return { ...baseDiagnostics, health }
  }

  destroy() {
    if (this.analysisTimer) clearInterval(this.analysisTimer)
    this.isRunning = false
  }

  _calculateNetworkHealth(dynamics) {
    const { networkCohesion, socialEnergy, conflictLevel } = dynamics
    return (networkCohesion * 0.4 + (1 - conflictLevel) * 0.4 + (socialEnergy > 0 ? socialEnergy * 0.2 : 0))
  }

  _getActiveInteractionCount() {
    let active = 0
    for (const interaction of this.mesh.interactions.values()) { if (interaction.state.calculateEngagementWillingness() > 0.3) active++ }
    return active
  }

  _getConversationMetrics() {
    const rT = this.conversationHistory.slice(-20), pT = rT.filter(turn => turn.result.personalizedResponses.length > 0).length
    return {
      totalTurns: this.conversationHistory.length,
      recentTurns: rT.length,
      personalizationRate: rT.length > 0 ? pT / rT.length : 0,
      averageEngagement: this.socialAnalytics.getAverageEngagement(),
      turnFrequency: this._calculateTurnFrequency()
    }
  }

  _calculateSocialNeed(iS) {
    if (iS.length === 0) return 1.0
    const aW = iS.reduce((sum, i) => { return sum + i.state.calculateEngagementWillingness() }, 0) / iS.length
    return 1 - aW
  }

  _calculateConversationBalance(agentId) {
    const rT = this.conversationHistory.slice(-10), aT = rT.filter(turn => turn.speakerId === agentId).length
    return 1 - (aT / rT.length || 0)
  }

  _calculateTurnFrequency() {
    if (this.conversationHistory.length < 2) return 0
    const rT = this.conversationHistory.slice(-10)
    if (rT.length < 2) return 0
    const tS = rT[rT.length - 1].timestamp - rT[0].timestamp
    return rT.length / (tS / 1000)
  }

  _estimateMemoryUsage() {
    const iS = this.mesh.interactions.size * 1024, h = this.conversationHistory.length * 512
    return (iS + h) / 1024 / 1024
  }

  _getSystemHealth(dg, dy) {
    let h = 1.0
    if (dg.memoryUsage > 10) h -= 0.2
    if (dy.networkHealth < 0.5) h -= 0.3
    if (dg.recentActivity.length === 0) h -= 0.2
    return Math.max(0, h)
  }
}

export function createRelationalModule(agents, config = {}) { return new Relational(agents, config) }

export const RelationalUtils = {
  createAgentConfig(id, overrides = {}) {
    return {
      id,
      name: id,
      plasticity: 0.6,
      energy: 0.7,
      socialStyle: 'balanced',
      ...overrides
    }
  },

  calculateCompatibility(agentA, agentB, i = null) {
    const bS = 1 - Math.abs(agentA.plasticity - agentB.plasticity)
    if (i) {
      const iB = i.state.trust * 0.3 + i.state.alignment * 0.2
      return (bS * 0.7) + (iB * 0.3)
    }
    return bS
  },

  generateNetworkData(rM) {
    const agents = Array.from(rM.agents.keys())
    const nodes = agents.map(agentId => ({
      id: agentId,
      group: 1,
      size: rM.getAgentInteractions(agentId).length
    }))
    const links = []
    for (const agentId of agents) {
      const interactions = rM.getAgentInteractions(agentId)
      for (const interaction of interactions) {
        links.push({
          source: agentId,
          target: interaction.target,
          trust: interaction.state.trust,
          comfort: interaction.state.comfort
        })
      }
    }
    return { nodes, links }
  }
}

export {
  SocialTaste,
  Interaction,
  RelationalMesh,
  RelationalState,
  InteractionPatterns
}

export default Relational