export class RelationalState {
  constructor(iS = {}) {
    this.trust = iS.trust ?? Math.random()
    this.comfort = iS.comfort ?? Math.random()
    this.alignment = iS.alignment ?? Math.random()
    this.familiarity = iS.familiarity ?? Math.random()
    this.energy = iS.energy ?? Math.random()
    this.resonance = iS.resonance ?? Math.random()
    this.stability = iS.stability ?? Math.random()
    this.weights = {
      trust: iS.weights?.trust ?? 0.3,
      comfort: iS.weights?.comfort ?? 0.25,
      energy: iS.weights?.energy ?? 0.2,
      alignment: iS.weights?.alignment ?? 0.15,
      familiarity: iS.weights?.familiarity ?? 0.1
    }
    this.history = []
    this.lastUpdate = Date.now()
  }

  update(updates) {
    this.history.push({
      timestamp: Date.now(),
      state: this.snapshot(),
      updates
    })
    if (this.history.length > 100) this.history.shift()
    const inertia = 0.7
    Object.keys(updates).forEach(key => {
      if (this[key] !== undefined) {
        const change = updates[key] * (1 - inertia)
        this[key] = this._clamp(this[key] + change, key)
      }
    })
    this.lastUpdate = Date.now()
    return this.snapshot()
  }

  getCurrentStance() {
    if (this.trust < 0.3 || this.comfort < 0.3) return 'defensive'
    if (this.trust < 0.6 || this.comfort < 0.6) return 'cautious' 
    if (this.trust < 0.8 || this.comfort < 0.8) return 'collaborative'
    return 'intimate'
  }

  calculateEngagementWillingness() {
    return (
      this.trust * this.weights.trust + this.comfort * this.weights.comfort +
      (this.energy > 0 ? this.energy : 0) * this.weights.energy + this.alignment * this.weights.alignment + this.familiarity * this.weights.familiarity
    )
  }

  calculateInteractionEnergyCost() {
    const baseCost = 0.3
    const trustReduction = (1 - this.trust) * 0.4
    const comfortReduction = (1 - this.comfort) * 0.3
    const energyPenalty = this.energy < 0 ? Math.abs(this.energy) * 0.3 : 0
    return baseCost + trustReduction + comfortReduction + energyPenalty
  }

  getTrend(depth = 10) {
    if (this.history.length < 1) return 'stable'
    const recent = this.history.slice(-depth)
    const previous = recent[0].state
    const current = {
      trust: this.trust,
      comfort: this.comfort,
      alignment: this.alignment,
      familiarity: this.familiarity,
      energy: this.energy,
      resonance: this.resonance,
      stability: this.stability
    }
    let improvements = 0, declines = 0
    Object.keys(current).forEach(key => {
      if (typeof current[key] !== 'number' || key === 'stability') return
      const prevVal = typeof previous[key] === 'number' ? previous[key] : current[key]
      if (current[key] > prevVal + 0.05) improvements++
      else if (current[key] < prevVal - 0.05) declines++
    })
    if (improvements > declines * 2) return 'improving'
    if (declines > improvements * 2) return 'deteriorating'
    return 'stable'
  }

  snapshot() {
    return {
      trust: this.trust,
      comfort: this.comfort,
      alignment: this.alignment,
      familiarity: this.familiarity,
      energy: this.energy,
      resonance: this.resonance,
      stability: this.stability,
      stance: this.getCurrentStance(),
      willingness: this.calculateEngagementWillingness(),
      energyCost: this.calculateInteractionEnergyCost(),
      trend: this.getTrend()
    }
  }

  _clamp(value, dimension) {
    const ranges = {
      trust: [0, 1],
      comfort: [0, 1],
      alignment: [0, 1],
      familiarity: [0, 1],
      energy: [-1, 1],
      resonance: [0, 1],
      stability: [0, 1]
    }
    const [min, max] = ranges[dimension] || [0, 1]
    return Math.max(min, Math.min(max, value))
  }
}