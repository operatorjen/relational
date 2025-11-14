import { Interaction } from './interaction.mjs'

export class RelationalMesh {
  constructor(agents) {
    this.agents = new Map(agents.map(a => [a.id, a]))
    this.interactions = new Map()
    this.history = []
    this._initializeMesh()
  }

  _initializeMesh() {
    for (const [idA, agentA] of this.agents) {
      for (const [idB, agentB] of this.agents) {
        if (idA === idB) continue
        const key = this._getKey(idA, idB)
        this.interactions.set(key, new Interaction(agentA, agentB))
      }
    }
  }

  _getKey(agentAId, agentBId) { return `${agentAId}->${agentBId}` }

  updateFromInteraction(event) {
    const { speaker, listeners, content } = event
    const movement = event.movement ?? content?.movement
    const mI = event.mI ?? content?.mI
    for (const l of listeners) {
      const key = this._getKey(speaker, l), interaction = this.interactions.get(key)
      if (interaction) interaction.updateFromSpeakerInteraction({ content, movement, mI })
      const rK = this._getKey(l, speaker), rI = this.interactions.get(rK)
      if (rI) rI.updateFromListenerInteraction({ content, movement, mI })
    }
    this.history.push(event)
    return this.calculateSocialDynamics()
  }

  getInteraction(agentAId, agentBId) { return this.interactions.get(this._getKey(agentAId, agentBId)) }

  getAgentInteractions(agentId) {
    const results = []
    for (const [key, interaction] of this.interactions) { if (key.startsWith(`${agentId}->`)) results.push(interaction) }
    return results
  }

  getAgentRelationals(agentId) { return this.getAgentInteractions(agentId) }

  _calculateCohesion() {
    let totalTrust = 0, count = 0
    for (const interaction of this.interactions.values()) {
      totalTrust += interaction.state.trust
      count++
    }
    return count > 0 ? totalTrust / count : 0
  }

  _calculateTrustDistribution() {
    const trusts = Array.from(this.interactions.values()).map(interaction => interaction.state.trust)
    if (trusts.length === 0) { return { mean: 0, min: 0, max: 0, variance: 0 } }
    return {
      mean: trusts.reduce((a, b) => a + b, 0) / trusts.length,
      min: Math.min(...trusts),
      max: Math.max(...trusts),
      variance: this._calculateVariance(trusts)
    }
  }

  _calculateSocialEnergy() {
    let totalEnergy = 0, count = 0
    for (const interaction of this.interactions.values()) {
      totalEnergy += interaction.state.energy
      count++
    }
    return count > 0 ? totalEnergy / count : 0
  }

  _calculateConflictLevel() {
    let conflicts = 0, total = 0
    for (const interaction of this.interactions.values()) {
      const patterns = interaction.interactionPatterns
      conflicts += patterns.getPatternFrequency('conflict')
      total += patterns.getPatternFrequency('alignment') + 1
    }
    return total > 0 ? conflicts / total : 0
  }

  _calculateVariance(values) {
    if (!values.length) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    return values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  }

  calculateSocialDynamics() {
    return {
      networkCohesion: this._calculateCohesion(),
      trustDistribution: this._calculateTrustDistribution(),
      socialEnergy: this._calculateSocialEnergy(),
      conflictLevel: this._calculateConflictLevel()
    }
  }
}