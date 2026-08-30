export type VadDiagnosticCategory = 'environmental' | 'vad_behavior' | 'audio_device' | 'context' | 'unknown'
export type VadDiagnosticSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type VadDiagnosticConfidence = 'low' | 'medium' | 'high'

export type VadClassification = {
  eventId: string
  eventName: string
  timestamp: string | null
  category: VadDiagnosticCategory
  subtype: string
  detection: string
  likelyCause: string
  vadImpact: string
  severity: VadDiagnosticSeverity
  confidence: VadDiagnosticConfidence
  explanation: string
  evidence: Record<string, unknown>
}

export type ClassifiableVadEvent = {
  id: string
  name: string
  timestamp: string | null
  payload: unknown
}

type Metadata = Record<string, unknown>
type StoredValue = { eventId: string; field: string; value: string }

function isRecord(value: unknown): value is Metadata {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function metadata(event: ClassifiableVadEvent): Metadata {
  return isRecord(event.payload) ? event.payload : {}
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function getString(data: Metadata, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = stringValue(data[key])
    if (value) return value
  }
  return null
}

function getNumber(data: Metadata, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = numberValue(data[key])
    if (value != null) return value
  }
  return null
}

function getBoolean(data: Metadata, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const value = booleanValue(data[key])
    if (value != null) return value
  }
  return null
}

function hasWord(value: string | null, ...words: string[]): boolean {
  const normalized = value?.toLowerCase() ?? ''
  return words.some((word) => normalized.includes(word))
}

function normalizedName(name: string): string {
  return name.toLowerCase().replaceAll('-', '_')
}

function eventIs(event: ClassifiableVadEvent, ...names: string[]): boolean {
  const name = normalizedName(event.name)
  return names.some((candidate) => name === candidate || name.endsWith(`_${candidate}`))
}

function evidenceFor(data: Metadata, fields: Array<[string, ...string[]]>): Record<string, unknown> {
  const evidence: Record<string, unknown> = {}
  for (const [label, ...keys] of fields) {
    for (const key of keys) {
      if (key in data && data[key] !== undefined && data[key] !== null) {
        evidence[label] = data[key]
        break
      }
    }
  }
  return evidence
}

function exactStoredFields(data: Metadata, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(
    keys.flatMap((key) => (key in data && data[key] != null ? [[key, data[key]]] : []))
  )
}

function latestStoredString(
  events: ClassifiableVadEvent[],
  beforeIndex: number,
  ...keys: string[]
): StoredValue | null {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const data = metadata(events[index])
    for (const field of keys) {
      const value = stringValue(data[field])
      if (value) return { eventId: events[index].id, field, value }
    }
  }
  return null
}

const FINAL_FAILURE_OUTCOMES = new Set([
  'failed',
  'failure',
  'error',
  'terminal_failure',
  'recording_failed',
  'submission_failed',
  'session_failed',
])

function isFinalFailureOutcome(value: string | null): boolean {
  return value ? FINAL_FAILURE_OUTCOMES.has(value.toLowerCase().replaceAll('-', '_').trim()) : false
}

function classification(
  event: ClassifiableVadEvent,
  values: Omit<VadClassification, 'eventId' | 'eventName' | 'timestamp'>
): VadClassification {
  return {
    eventId: event.id,
    eventName: event.name,
    timestamp: event.timestamp,
    ...values,
  }
}

function explicitImpact(events: ClassifiableVadEvent[]): {
  impact: string | null
  severity: VadDiagnosticSeverity | null
} {
  const lastEvent = events[events.length - 1]
  const current = lastEvent ? metadata(lastEvent) : {}
  const impact = getString(current, 'vadImpact', 'vad_impact', 'impact', 'userImpact', 'user_impact')
  if (impact) {
    const normalized = impact.toLowerCase()
    return {
      impact,
      severity: hasWord(normalized, 'prevent', 'fail', 'blocked') ? 'high' : hasWord(normalized, 'delay') ? 'high' : 'medium',
    }
  }

  const prevented = getBoolean(current, 'automaticSubmissionPrevented', 'automatic_submission_prevented', 'submissionPrevented')
  if (prevented === true) return { impact: 'Automatic submission prevented', severity: 'high' }
  const delayed = getBoolean(current, 'automaticSubmissionDelayed', 'automatic_submission_delayed', 'submissionDelayed')
  if (delayed === true) return { impact: 'Automatic submission delayed', severity: 'high' }
  const outcome = getString(current, 'submissionOutcome', 'submission_outcome', 'recordingOutcome', 'recording_outcome')
  if (isFinalFailureOutcome(outcome)) {
    return { impact: 'Recording or submission failed', severity: 'critical' }
  }
  const userImpact = getBoolean(current, 'userImpact', 'user_impact', 'affectedVAD', 'affected_vad')
  if (userImpact === false) return { impact: 'No apparent VAD impact', severity: 'low' }
  if (userImpact === true) return { impact: 'User-visible VAD impact', severity: 'high' }
  return { impact: null, severity: null }
}

function routeValues(data: Metadata): { oldRoute: string | null; newRoute: string | null; route: string | null } {
  return {
    oldRoute: getString(data, 'oldAudioInputRoute', 'old_audio_input_route', 'oldAudioOutputRoute', 'old_audio_output_route'),
    newRoute: getString(data, 'newAudioInputRoute', 'new_audio_input_route', 'newAudioOutputRoute', 'new_audio_output_route'),
    route: getString(data, 'audioRoute', 'audio_route', 'audioInputRoute', 'audio_input_route', 'audioOutputRoute', 'audio_output_route'),
  }
}

function noiseFloorChange(events: ClassifiableVadEvent[], eventIndex: number): { previousEventId: string; previous: number; current: number; delta: number } | null {
  const current = getNumber(metadata(events[eventIndex]), 'noiseFloor', 'noise_floor')
  if (current == null) return null
  for (let index = eventIndex - 1; index >= 0; index -= 1) {
    const previous = getNumber(metadata(events[index]), 'noiseFloor', 'noise_floor')
    if (previous != null) return { previousEventId: events[index].id, previous, current, delta: Math.round((current - previous) * 10) / 10 }
  }
  return null
}

function isNoiseEvent(event: ClassifiableVadEvent): boolean {
  const name = normalizedName(event.name)
  const data = metadata(event)
  return (
    name.includes('noise') ||
    hasWord(getString(data, 'reason', 'anomalyReason'), 'noise', 'spike', 'acoustic')
  )
}

function isMeterEvent(event: ClassifiableVadEvent): boolean {
  return normalizedName(event.name).includes('meter')
}

function isRouteEvent(event: ClassifiableVadEvent): boolean {
  const data = metadata(event)
  const route = routeValues(data)
  return eventIs(event, 'audio_route', 'route_change') || route.oldRoute != null || route.newRoute != null
}

function isTerminalFailure(event: ClassifiableVadEvent): boolean {
  const data = metadata(event)
  const outcome = getString(data, 'submissionOutcome', 'submission_outcome', 'recordingOutcome', 'recording_outcome')
  const name = normalizedName(event.name)
  return (
    ['recording_failed', 'submission_failed', 'session_failed', 'telemetry_failed'].some(
      (candidate) => name === candidate || name.endsWith(`_${candidate}`)
    ) ||
    isFinalFailureOutcome(outcome) ||
    getBoolean(data, 'sessionFailed', 'session_failed', 'recordingFailed', 'recording_failed') === true
  )
}

function confidenceFor(evidence: Record<string, unknown>, minimum = 2): VadDiagnosticConfidence {
  const count = Object.keys(evidence).length
  return count >= minimum ? 'high' : count > 0 ? 'medium' : 'low'
}

export function classifyVadEvent(
  event: ClassifiableVadEvent,
  surroundingEvents: ClassifiableVadEvent[] = [event]
): VadClassification | null {
  const events = surroundingEvents.length ? surroundingEvents : [event]
  const eventIndex = Math.max(0, events.findIndex((candidate) => candidate.id === event.id))
  const data = metadata(event)
  const route = routeValues(data)
  const currentContext = getString(
    data,
    'connectionContext',
    'connection_context',
    'context',
    'environment',
    'locationContext',
    'location_context'
  )
  const priorContext = currentContext ? null : latestStoredString(
    events,
    eventIndex,
    'connectionContext',
    'connection_context',
    'context',
    'environment',
    'locationContext',
    'location_context'
  )
  const context = currentContext ?? priorContext?.value ?? null
  const currentProfile = getString(data, 'profile', 'vadProfile', 'vad_profile')
  const priorProfile = currentProfile ? null : latestStoredString(events, eventIndex, 'profile', 'vadProfile', 'vad_profile')
  const profile = currentProfile ?? priorProfile?.value ?? null
  const currentContextRoute = route.route ?? route.newRoute
  const priorRoute = currentContextRoute ? null : latestStoredString(
    events,
    eventIndex,
    'audioRoute',
    'audio_route',
    'audioInputRoute',
    'audio_input_route',
    'audioOutputRoute',
    'audio_output_route',
    'newAudioInputRoute',
    'new_audio_input_route'
  )
  const contextRoute = currentContextRoute ?? priorRoute?.value ?? null
  const priorContextEvidence = {
    ...(priorContext ? { contextSourceEventId: priorContext.eventId, [priorContext.field]: priorContext.value } : {}),
    ...(priorProfile ? { profileSourceEventId: priorProfile.eventId, [priorProfile.field]: priorProfile.value } : {}),
    ...(priorRoute ? { audioRouteSourceEventId: priorRoute.eventId, [priorRoute.field]: priorRoute.value } : {}),
  }
  const currentContextEvidence = {
    sourceEventId: event.id,
    ...exactStoredFields(data, [
      'connectionContext',
      'connection_context',
      'context',
      'environment',
      'locationContext',
      'location_context',
      'profile',
      'vadProfile',
      'vad_profile',
      'audioRoute',
      'audio_route',
      'audioInputRoute',
      'audio_input_route',
      'audioOutputRoute',
      'audio_output_route',
      'newAudioInputRoute',
      'new_audio_input_route',
      'newAudioOutputRoute',
      'new_audio_output_route',
    ]),
  }
  const impact = explicitImpact(events)
  const terminalFailure = isTerminalFailure(event)

  if (!isNoiseEvent(event) && !isMeterEvent(event) && !isRouteEvent(event) && !terminalFailure && !eventIs(
    event,
    'vad_anomaly',
    'speech_start',
    'speech_end_candidate',
    'silence_timer_cancel',
    'silence_timer_fired',
    'automatic_submission',
    'recording_stop'
  )) {
    return null
  }

  if (terminalFailure) {
    const evidence = {
      event: event.name,
      ...evidenceFor(data, [
        ['submissionOutcome', 'submissionOutcome', 'submission_outcome', 'recordingOutcome', 'recording_outcome'],
        ['error', 'error', 'errorMessage', 'error_message', 'reason'],
      ]),
    }
    return classification(event, {
      category: 'unknown',
      subtype: 'unknown',
      detection: 'A recording or telemetry failure was stored.',
      likelyCause: 'Unknown',
      vadImpact: impact.impact ?? 'Recording or session completion was not successful.',
      severity: 'critical',
      confidence: confidenceFor(evidence),
      explanation: 'A terminal failure is recorded, but the available fields do not establish a more specific cause.',
      evidence,
    })
  }

  if (isRouteEvent(event)) {
    const evidence = {
      event: event.name,
      ...evidenceFor(data, [
        ['oldAudioInputRoute', 'oldAudioInputRoute', 'old_audio_input_route'],
        ['newAudioInputRoute', 'newAudioInputRoute', 'new_audio_input_route'],
        ['oldAudioOutputRoute', 'oldAudioOutputRoute', 'old_audio_output_route'],
        ['newAudioOutputRoute', 'newAudioOutputRoute', 'new_audio_output_route'],
        ['oldVADProfile', 'oldVADProfile', 'old_vad_profile'],
        ['newVADProfile', 'newVADProfile', 'new_vad_profile'],
        ['noiseFloorReset', 'noiseFloorReset', 'noise_floor_reset'],
      ]),
    }
    const bluetooth = [route.oldRoute, route.newRoute, route.route].some((value) => hasWord(value, 'bluetooth', 'airpod', 'hearing-aid'))
    const transitionRoutes = [route.oldRoute, route.newRoute].filter((value): value is string => value != null)
    const unknown = transitionRoutes.length > 0
      ? transitionRoutes.some((value) => value.toUpperCase() === 'UNKNOWN')
      : !route.route || route.route.toUpperCase() === 'UNKNOWN'
    if (bluetooth && !unknown && route.oldRoute && route.newRoute && route.oldRoute !== route.newRoute) {
      return classification(event, {
        category: 'audio_device',
        subtype: 'bluetooth_route_change',
        detection: 'The audio route changed to or from a Bluetooth device.',
        likelyCause: 'Bluetooth audio route',
        vadImpact: impact.impact ?? 'Unknown',
        severity: impact.severity ?? 'low',
        confidence: confidenceFor(evidence, 2),
        explanation: `Audio routing changed${route.newRoute ? ` to ${route.newRoute}` : ''}; the event alone does not prove a VAD failure.`,
        evidence,
      })
    }
    if (unknown) {
      return classification(event, {
        category: 'audio_device',
        subtype: 'audio_route_unknown',
        detection: 'An audio route event has a missing or UNKNOWN route.',
        likelyCause: 'Unknown audio device context',
        vadImpact: impact.impact ?? 'Unknown',
        severity: impact.severity ?? 'info',
        confidence: confidenceFor(evidence),
        explanation: 'The stored route context is incomplete, so no more specific device diagnosis is supported.',
        evidence,
      })
    }
  }

  const speechState = getString(data, 'speechState', 'speech_state')
  const speechStreak = getNumber(data, 'speechStreak', 'speech_streak')
  const speechDetected = getBoolean(data, 'speechDetected', 'speech_detected')
  const cancellationCount =
    getNumber(data, 'cancellationCount', 'cancellation_count', 'silenceTimerCancellations', 'silence_timer_cancellations')
  const cancellationEventIds = events
    .filter((candidate) => eventIs(candidate, 'silence_timer_cancel'))
    .map((candidate) => candidate.id)
  const repeatedCancellation =
    (cancellationCount != null && cancellationCount >= 2) ||
    cancellationEventIds.length >= 2
  const validSpeech = speechDetected === true || (speechStreak != null && speechStreak > 0)
  const reason = getString(data, 'reason', 'anomalyReason', 'anomaly_reason')

  if (
    repeatedCancellation &&
    (speechDetected === false || speechStreak === 0)
  ) {
    const evidence = {
      event: event.name,
      ...(cancellationEventIds.length >= 2 ? { cancellationEventIds } : {}),
      ...evidenceFor(data, [
        ['reason', 'reason', 'anomalyReason', 'anomaly_reason'],
        ['speechState', 'speechState', 'speech_state'],
        ['speechStreak', 'speechStreak', 'speech_streak'],
        ['speechDetected', 'speechDetected', 'speech_detected'],
        ['cancellationCount', 'cancellationCount', 'cancellation_count', 'silenceTimerCancellations', 'silence_timer_cancellations'],
        ['silenceTimerState', 'silenceTimerState', 'silence_timer_state'],
        ['automaticSubmissionPrevented', 'automaticSubmissionPrevented', 'automatic_submission_prevented', 'submissionPrevented'],
        ['automaticSubmissionDelayed', 'automaticSubmissionDelayed', 'automatic_submission_delayed', 'submissionDelayed'],
      ]),
    }
    return classification(event, {
      category: 'vad_behavior',
      subtype: 'false_speech_continuation',
      detection: 'Speech remained active while valid speech evidence was absent and the silence timer was repeatedly cancelled.',
      likelyCause: 'VAD interpreted environmental or device audio as continuing speech',
      vadImpact: impact.impact ?? 'Unknown',
      severity: impact.severity ?? 'medium',
      confidence: confidenceFor(evidence, 3),
      explanation: 'Repeated timer cancellation with an inactive speech streak indicates a possible false continuation; impact is only elevated when stored submission evidence supports it.',
      evidence,
    })
  }

  if (
    eventIs(event, 'speech_start') &&
    (getBoolean(data, 'falsePositive', 'false_positive') === true || getBoolean(data, 'validSpeech', 'valid_speech') === false)
  ) {
    const evidence = { event: event.name, ...evidenceFor(data, [['falsePositive', 'falsePositive', 'false_positive'], ['validSpeech', 'validSpeech', 'valid_speech'], ['speechStreak', 'speechStreak', 'speech_streak']]) }
    return classification(event, {
      category: 'vad_behavior',
      subtype: 'false_speech_start',
      detection: 'Speech start was recorded without valid speech evidence.',
      likelyCause: 'Environmental or device audio was interpreted as speech',
      vadImpact: impact.impact ?? 'Unknown',
      severity: impact.severity ?? 'medium',
      confidence: confidenceFor(evidence),
      explanation: 'The stored validity flag marks this speech start as false.',
      evidence,
    })
  }

  if (eventIs(event, 'speech_end_candidate') && (hasWord(reason, 'reject', 'candidate') || getBoolean(data, 'accepted', 'speechAccepted') === false)) {
    const evidence = { event: event.name, ...evidenceFor(data, [['reason', 'reason', 'anomalyReason'], ['accepted', 'accepted', 'speechAccepted'], ['speechStreak', 'speechStreak', 'speech_streak']]) }
    return classification(event, {
      category: 'vad_behavior',
      subtype: 'speech_candidate_rejected',
      detection: 'A speech-end candidate was rejected.',
      likelyCause: 'Insufficient or unstable speech evidence',
      vadImpact: impact.impact ?? 'Unknown',
      severity: impact.severity ?? 'medium',
      confidence: confidenceFor(evidence),
      explanation: 'The candidate rejection is explicit in the stored event fields.',
      evidence,
    })
  }

  if (getBoolean(data, 'missedSpeech', 'missed_speech') === true || hasWord(reason, 'missed speech', 'speech not detected')) {
    const evidence = { event: event.name, ...evidenceFor(data, [['reason', 'reason', 'anomalyReason'], ['missedSpeech', 'missedSpeech', 'missed_speech'], ['speechDetected', 'speechDetected', 'speech_detected'], ['speechStreak', 'speechStreak', 'speech_streak']]) }
    return classification(event, {
      category: 'vad_behavior',
      subtype: 'missed_speech',
      detection: 'Stored telemetry explicitly reports speech that VAD did not detect.',
      likelyCause: 'Insufficient speech signal or VAD evidence',
      vadImpact: impact.impact ?? 'Delayed speech detection',
      severity: impact.severity ?? 'medium',
      confidence: confidenceFor(evidence, 2),
      explanation: 'This diagnosis is used only when the telemetry explicitly marks missed speech.',
      evidence,
    })
  }

  if (eventIs(event, 'silence_timer_fired') || (eventIs(event, 'recording_stop') && hasWord(getString(data, 'trigger', 'termination'), 'silence', 'timeout'))) {
    const evidence = { event: event.name, ...evidenceFor(data, [['trigger', 'trigger', 'termination'], ['silenceTimerState', 'silenceTimerState', 'silence_timer_state'], ['recordingDuration', 'recordingDuration', 'recording_duration']]) }
    return classification(event, {
      category: 'vad_behavior',
      subtype: 'silence_timeout',
      detection: 'The silence timer ended the recording path.',
      likelyCause: 'No qualifying speech was observed before the stored timeout.',
      vadImpact: impact.impact ?? (validSpeech ? 'Premature speech end' : 'Unknown'),
      severity: impact.severity ?? 'medium',
      confidence: confidenceFor(evidence),
      explanation: 'A stored silence trigger indicates a timeout, but it does not by itself prove a VAD defect.',
      evidence,
    })
  }

  const floorChange = noiseFloorChange(events, eventIndex)
  const currentLevel = getNumber(data, 'meteringValue', 'metering_value', 'currentLevel', 'current_level', 'level')
  const minLevel = getNumber(data, 'minMetering', 'min_metering', 'minLevel')
  const maxLevel = getNumber(data, 'maxMetering', 'max_metering', 'maxLevel')
  const duration = getNumber(data, 'durationMs', 'duration_ms', 'durationSeconds', 'recordingDuration', 'recording_duration')
  const range = minLevel != null && maxLevel != null ? maxLevel - minLevel : null
  const transient = hasWord(event.name, 'transient', 'spike', 'burst') || hasWord(reason, 'transient', 'spike', 'burst') || (range != null && range >= 30 && duration != null && duration < 3000)
  const sustained = hasWord(event.name, 'sustained', 'pattern') || hasWord(reason, 'sustained', 'continuous', 'vehicle', 'noise') || (duration != null && duration >= 5000)

  if (floorChange && floorChange.delta >= 10) {
    const evidence = {
      event: event.name,
      priorNoiseFloorEventId: floorChange.previousEventId,
      noiseFloorBefore: floorChange.previous,
      noiseFloorAfter: floorChange.current,
      noiseFloorDelta: floorChange.delta,
      ...evidenceFor(data, [['duration', 'durationMs', 'duration_ms', 'durationSeconds', 'recordingDuration', 'recording_duration'], ['audioRoute', 'audioRoute', 'audio_route', 'audioInputRoute', 'audio_input_route'], ['profile', 'profile', 'vadProfile', 'vad_profile']]),
    }
    return classification(event, {
      category: 'environmental',
      subtype: 'noise_floor_rise',
      detection: `Noise floor increased by ${Math.abs(floorChange.delta)} dB.`,
      likelyCause: hasWord(context, 'car', 'auto', 'vehicle', 'automotive') ? 'Vehicle or automotive noise' : 'Environmental noise',
      vadImpact: impact.impact ?? 'No apparent VAD impact',
      severity: impact.severity ?? 'low',
      confidence: confidenceFor(evidence, 3),
      explanation: 'The current noise-floor value is at least 10 dB above the previous stored value; this is not treated as a VAD failure without impact evidence.',
      evidence,
    })
  }

  if (
    (range != null && range >= 40 && duration != null && duration >= 3000) ||
    hasWord(reason, 'unstable', 'instability', 'fluctuat')
  ) {
    const evidence = { event: event.name, ...evidenceFor(data, [['minMetering', 'minMetering', 'min_metering', 'minLevel'], ['maxMetering', 'maxMetering', 'max_metering', 'maxLevel'], ['averageMetering', 'averageMetering', 'average_metering', 'avgLevel'], ['reason', 'reason', 'anomalyReason'], ['duration', 'durationMs', 'duration_ms', 'durationSeconds']]) }
    return classification(event, {
      category: 'audio_device',
      subtype: 'audio_level_instability',
      detection: 'Stored audio levels vary substantially within the measured window.',
      likelyCause: 'Unstable audio input or device gain',
      vadImpact: impact.impact ?? 'Unknown',
      severity: impact.severity ?? 'medium',
      confidence: confidenceFor(evidence, 3),
      explanation: 'A wide stored metering range supports input instability, but does not identify a specific device fault.',
      evidence,
    })
  }

  if (floorChange && Math.abs(floorChange.delta) >= 3) {
    const evidence = { event: event.name, priorNoiseFloorEventId: floorChange.previousEventId, noiseFloorBefore: floorChange.previous, noiseFloorAfter: floorChange.current, noiseFloorDelta: floorChange.delta, ...evidenceFor(data, [['profile', 'profile', 'vadProfile', 'vad_profile'], ['audioRoute', 'audioRoute', 'audio_route']]) }
    return classification(event, {
      category: 'environmental',
      subtype: 'noise_floor_shift',
      detection: `Noise floor shifted by ${Math.abs(floorChange.delta)} dB.`,
      likelyCause: 'Environmental audio variation',
      vadImpact: impact.impact ?? 'No apparent VAD impact',
      severity: impact.severity ?? 'info',
      confidence: confidenceFor(evidence, 3),
      explanation: 'A smaller noise-floor shift is observable, but the stored telemetry does not establish user impact.',
      evidence,
    })
  }

  if (transient) {
    const evidence = { event: event.name, ...evidenceFor(data, [['meteringValue', 'meteringValue', 'metering_value', 'currentLevel', 'current_level', 'level'], ['minMetering', 'minMetering', 'min_metering', 'minLevel'], ['maxMetering', 'maxMetering', 'max_metering', 'maxLevel'], ['duration', 'durationMs', 'duration_ms', 'durationSeconds']]) }
    return classification(event, {
      category: 'environmental',
      subtype: 'transient_noise',
      detection: 'A short-lived audio spike was recorded.',
      likelyCause: 'Transient environmental sound',
      vadImpact: impact.impact ?? 'No apparent VAD impact',
      severity: impact.severity ?? 'low',
      confidence: confidenceFor(evidence),
      explanation: 'The stored level range and short duration support a transient acoustic event rather than sustained VAD failure.',
      evidence,
    })
  }

  if (sustained || isNoiseEvent(event)) {
    const automotive = hasWord(context, 'car', 'auto', 'vehicle', 'automotive') || hasWord(profile, 'automotive') || hasWord(contextRoute, 'car', 'auto')
    const outdoor = hasWord(context, 'outdoor', 'outside', 'open-air')
    const evidence = {
      event: event.name,
      ...currentContextEvidence,
      ...priorContextEvidence,
      ...evidenceFor(data, [
        ['reason', 'reason', 'anomalyReason', 'anomaly_reason'],
        ['duration', 'durationMs', 'duration_ms', 'durationSeconds', 'recordingDuration', 'recording_duration'],
        ['noiseFloor', 'noiseFloor', 'noise_floor'],
        ['speechStreak', 'speechStreak', 'speech_streak'],
        ['audioRoute', 'audioRoute', 'audio_route', 'audioInputRoute', 'audio_input_route'],
        ['connectionContext', 'connectionContext', 'connection_context', 'context', 'environment'],
        ['profile', 'profile', 'vadProfile', 'vad_profile'],
      ]),
    }
    if (automotive || outdoor) {
      const subtype = automotive ? 'automotive_noise' : 'outdoor_noise'
      return classification(event, {
        category: 'context',
        subtype,
        detection: automotive ? 'Noise was recorded in an automotive context.' : 'Noise was recorded in an outdoor context.',
        likelyCause: automotive ? 'Vehicle motion or automotive environment' : 'Outdoor environmental sound',
        vadImpact: impact.impact ?? 'No apparent VAD impact',
        severity: impact.severity ?? 'low',
        confidence: confidenceFor(evidence, 2),
        explanation: 'Stored context supports the environmental setting; it does not alone demonstrate a VAD problem.',
        evidence,
      })
    }
    return classification(event, {
      category: 'environmental',
      subtype: sustained ? 'sustained_noise' : 'sustained_noise',
      detection: 'Environmental noise persisted in the stored audio diagnostics.',
      likelyCause: 'Environmental noise',
      vadImpact: impact.impact ?? 'No apparent VAD impact',
      severity: impact.severity ?? 'low',
      confidence: confidenceFor(evidence),
      explanation: 'The telemetry records noise, but no user-impacting VAD outcome is inferred without explicit submission or impact evidence.',
      evidence,
    })
  }

  if (eventIs(event, 'vad_anomaly')) {
    const evidence = { event: event.name, ...evidenceFor(data, [['reason', 'reason', 'anomalyReason', 'anomaly_reason'], ['speechDetected', 'speechDetected', 'speech_detected'], ['speechStreak', 'speechStreak', 'speech_streak'], ['cancellationCount', 'cancellationCount', 'cancellation_count']]) }
    if (getBoolean(data, 'contextUnknown', 'context_unknown') === true || hasWord(reason, 'unknown context')) {
      return classification(event, {
        category: 'context',
        subtype: 'unknown_context',
        detection: 'An anomaly was recorded without usable environmental context.',
        likelyCause: 'Unknown',
        vadImpact: impact.impact ?? 'Unknown',
        severity: impact.severity ?? 'info',
        confidence: confidenceFor(evidence),
        explanation: 'The stored event explicitly identifies missing context, so no environmental cause is inferred.',
        evidence,
      })
    }
    return classification(event, {
      category: 'unknown',
      subtype: 'unknown',
      detection: 'A VAD anomaly event was stored.',
      likelyCause: 'Unknown',
      vadImpact: impact.impact ?? 'Unknown',
      severity: impact.severity ?? 'info',
      confidence: confidenceFor(evidence),
      explanation: 'The event is marked as anomalous, but its stored fields do not support a more specific deterministic rule.',
      evidence,
    })
  }

  return null
}
