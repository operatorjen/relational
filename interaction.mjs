import { RelationalState } from './relational_state.mjs'
import { InteractionPatterns } from './interaction_patterns.mjs'

export class Interaction {
  constructor(sourceAgent, targetAgent) {
    this.source = sourceAgent
    this.target = targetAgent
    this.state = new RelationalState()
    this.interactionPatterns = new InteractionPatterns()
    this.sharedHistory = []
    this.lastUpdated = Date.now()
  }
  
  updateFromSpeakerInteraction(interaction) {
    const impact = this._calculateSpeakerImpact(interaction)
    this.state.update(impact)
    this.interactionPatterns.recordSpeakerAction(interaction)
    this.sharedHistory.push({ type: 'speaker_action', interaction, impact, timestamp: Date.now() })
    this.lastUpdated = Date.now()
  }
  
  updateFromListenerInteraction(interaction) {
    const perception = this._calculateListenerPerception(interaction)
    this.state.update(perception)
    this.interactionPatterns.recordListenerExperience(interaction)
    this.sharedHistory.push({ type: 'listener_experience', interaction, perception, timestamp: Date.now() })
    this.lastUpdated = Date.now()
  }
  
  _calculateSpeakerImpact(interaction) {
    const impact = {}
    if (interaction.memeticInfluence?.type === 'stance_adoption') impact.trust = 0.1 
    if (this._isVulnerabilityDisplayed(interaction)) {
      impact.trust = 0.15
      impact.comfort = 0.1
    }
    const movement = interaction.movement || {}
    if (movement.intensity > 0.7) impact.energy = 0.05
    if (this._detectsAlignment(interaction)) impact.alignment = 0.1
    impact.familiarity = 0.02
    return impact
  }
  
  _calculateListenerPerception(interaction) {
    const perception = {}
    if (interaction.memeticInfluence?.type === 'stance_adoption') perception.trust = 0.08
    if (this._isContradictionDetected(interaction)) {
      perception.trust = -0.2
      perception.alignment = -0.15
    }
    const movement = interaction.movement || {}
    if (movement.synchrony > 0.6) {
      perception.comfort = 0.1
      perception.resonance = 0.08
    }
    return perception
  }
  
 _isVulnerabilityDisplayed(interaction) {
    const text = interaction.input || interaction.content?.text || ''
    return text.includes('I feel') || text.includes('uncertain') || text.includes('not sure')
  }

  _isContradictionDetected(interaction) {
    const text = interaction.input || interaction.content?.text || ''
    const hD = text.toLowerCase().includes('disagree')
    const hRC = text.toLowerCase().includes('preventing progress') || text.toLowerCase().includes('ignoring') || text.toLowerCase().includes('inconclusive')
    const hN = text.match(/\b(no|not|never)\b/gi)
    const hB = text.includes('but') || text.includes('however')
    return hD || hRC || (hN && hN.length > 1) || hB
  }

  _detectsAlignment(interaction) {
    const text = interaction.input || interaction.content?.text || ''
    const lower = text.toLowerCase()
    return lower.includes('agree') || lower.includes('balanced approach') || lower.includes('makes sense') || lower.includes('understand your concerns') || lower.includes('appreciate you acknowledging')
  }
    
  shouldEngage() {
    const w = this.state.calculateEngagementWillingness()
    const eC = this.state.calculateInteractionEnergyCost()
    return w > eC
  }
  
  getPersonalizationContext() {
    return {
      stance: this.state.getCurrentStance(),
      trustLevel: this.state.trust,
      comfortLevel: this.state.comfort,
      sharedMemories: this.sharedHistory.slice(-3),
      interactionStyle: this.interactionPatterns.getDominantStyle(),
      engagementWillingness: this.state.calculateEngagementWillingness()
    }
  }
}