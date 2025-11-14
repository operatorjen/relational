import { Taste } from 'taste'

export class SocialTaste {
  constructor(agents, relationalMesh, tasteConfig = {}) {
    this.agents = agents
    this.relationalMesh = relationalMesh
    this.tasteConfig = tasteConfig
    this.internalTastes = new Map()
    for (const agent of agents) {
      this.internalTastes.set(agent.id, new Taste(
        agent.name || agent.id,
        agent.themePacks || {},
        agent.motifConfig || {},
        agent.initState || {},
        tasteConfig.ProjectionsCtor
      ))
    }
  }

  processTurn(speakerId, input, context) {
    const sT = this.internalTastes.get(speakerId)
    if (!sT) throw new Error(`No Taste instance found for agent: ${speakerId}`)
    const iS = this.relationalMesh.getAgentInteractions(speakerId)
    const bR = sT.speak(input, 1, this._buildConversationContext(context))
    const rC = iS.map(i => ({
      target: i.target.id,
      context: i.getPersonalizationContext(),
      shouldEngage: i.shouldEngage()
    }))
    const pR = rC.filter(rc => rc.shouldEngage).map(rc => this._personalizeForInteraction(bR, rc))
    const iE = {
      speaker: speakerId,
      listeners: rC.map(rc => rc.target),
      input,
      content: bR,
      movement: bR.movement,
      memeticInfluence: bR.memeticInfluence,
      interactions: rC,
      timestamp: Date.now()
    }
    const sD = this.relationalMesh.updateFromInteraction(iE)
    return {
      baseResponse: bR,
      personalizedResponses: pR, 
      socialDynamics: sD,
      interactionStates: rC
    }
  }

  _buildConversationContext(baseContext) { return { ...baseContext } }

  _personalizeForInteraction(baseResponse, iC) {
    const pT = this._adaptTextForInteraction(baseResponse.text, iC)
    const pM = this._adaptMovementForInteraction(baseResponse.movement, iC)
    return {
      target: iC.target,
      text: pT,
      movement: pM,
      disclosureLevel: iC.context.trustLevel,
      strategicIntent: iC.context.interactionStyle,
      engagementWillingness: iC.context.engagementWillingness
    }
  }

  _adaptTextForInteraction(text, iC) {
    const { stance, trustLevel, comfortLevel } = iC.context
    if (stance === 'defensive' && trustLevel < 0.3) {
      return this._makeMoreGuarded(text)
    } else if (stance === 'intimate' && trustLevel > 0.8) {
      return this._makeMorePersonal(text, iC.target)
    } else if (stance === 'collaborative' && comfortLevel > 0.6) {
      return this._makeMoreCollaborative(text)
    }
    return text
  }

  _adaptMovementForInteraction(movement, iC) {
    const { stance, trustLevel } = iC.context
    const aM = { ...movement }
    if (stance === 'defensive') {
      aM.amplitude = movement.amplitude * 0.7
      aM.fluidity = movement.fluidity * 0.8
    } else if (stance === 'intimate') {
      aM.amplitude = movement.amplitude * 1.1
      aM.synchrony = trustLevel
    }
    aM.interactionStance = stance
    aM.trustLevel = trustLevel
    return aM
  }

  _makeMoreGuarded(text) {
    return text.replace(/I feel/g, 'I am considering').replace(/I believe/g, 'It seems').replace(/definitely/g, 'possibly')
  }
  _makeMorePersonal(text, targetName) { return `${text} ${this._getPersonalSuffix(targetName)}` }

  _makeMoreCollaborative(text) { return text.replace(/I/g, 'We').replace(/my/g, 'our').replace(/me/g, 'us') }

  _getPersonalSuffix(targetName) {
    const suffixes = [
      `- what are your thoughts, ${targetName}?`,
      `, ${targetName}.`,
      `... your perspective, ${targetName}?`,
      `, as we discussed, ${targetName}.`
    ]
    return suffixes[Math.floor(Math.random() * suffixes.length)]
  }
}