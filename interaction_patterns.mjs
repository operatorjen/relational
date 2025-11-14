export class InteractionPatterns {
  constructor() {
    this.patterns = {
      vulnerability: [], conflict: [], alignment: [], creativity: [],
      repetition: [], escalation: [], resolution: []
    }
    this.styleProfile = {
      directness: 0.5,
      emotionality: 0.5,
      formality: 0.5,
      creativity: 0.5
    }
  }

  recordSpeakerAction(interaction) {
    this._analyzePattern(interaction, 'speaker')
    this._updateStyleProfile(interaction)
  }

  recordListenerExperience(interaction) { this._analyzePattern(interaction, 'listener') }

  _analyzePattern(interaction, role) {
    const a = this._analyzeInteraction(interaction)  
    Object.keys(a.patterns).forEach(patternType => {
      if (a.patterns[patternType]) {
        this.patterns[patternType].push({
          interaction, role,
          strength: analysis.strength,
          timestamp: Date.now()
        })
        if (this.patterns[patternType].length > 50) this.patterns[patternType].shift()
      }
    })
  }

  _analyzeInteraction(interaction) {
    const patterns = { vulnerability: this._detectVulnerability(interaction), conflict: this._detectConflict(interaction) }
    return { patterns }
  }

  _detectVulnerability(interaction) {
    const text = interaction.content?.text || ''
    const movement = interaction.movement || {}
    const vI = [
      text.includes('I feel') || text.includes('I struggle'),
      text.includes('uncertain') || text.includes('not sure'),
      movement.fluidity > 0.8,
      interaction.memeticInfluence?.type === 'stance_adoption'
    ]  
    return vI.filter(Boolean).length >= 2
  }

  _detectConflict(interaction) {
    const text = interaction.content?.text || ''
    const conflictIndicators = [
      text.includes('but') || text.includes('however'),
      text.includes('disagree') || text.includes('different'),
      text.match(/no\b|not\b/gi)?.length > 1
    ]   
    return conflictIndicators.filter(Boolean).length >= 2
  }

  _updateStyleProfile(interaction) {
    const { text, movement } = interaction.content || {}
    if (text) {
      const wC = text.split(' ').length
      this.styleProfile.directness = this._movingAverage(this.styleProfile.directness, wC < 10 ? 0.8 : 0.3)
      const eW = text.match(/\b(feel|love|hate|wonder|hope|fear)\b/gi)
      this.styleProfile.emotionality = this._movingAverage(this.styleProfile.emotionality, eW ? 0.7 : 0.3)
    }  
    if (movement) this.styleProfile.creativity = this._movingAverage(this.styleProfile.creativity, movement.complexity || 0.5)
  }

  getDominantStyle() {
    const max = Math.max(...Object.values(this.styleProfile))
    return Object.keys(this.styleProfile).find(key => this.styleProfile[key] === max)
  }

  getPatternFrequency(patternType, timeWindow = 300000) {
    const recent = this.patterns[patternType].filter(p => (Date.now()) - p.timestamp < timeWindow)
    return recent.length
  }

  _movingAverage(current, newValue, weight = 0.1) { return current * (1 - weight) + newValue * weight }
}