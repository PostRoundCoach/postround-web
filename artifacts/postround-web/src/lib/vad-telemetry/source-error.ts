type SourceError = {
  code?: string | null
  message?: string | null
}

export function classifyVadSourceError(error: SourceError | null | undefined): {
  status: 503
  message: string
} {
  const code = error?.code ?? ''
  const message = error?.message ?? ''

  if (code === '42P01') {
    return {
      status: 503,
      message: 'VAD telemetry table is not installed in the configured Supabase project',
    }
  }

  if (
    ['42703', 'PGRST204', 'PGRST205'].includes(code) ||
    /column|schema cache|relationship|does not exist/i.test(message)
  ) {
    return {
      status: 503,
      message:
        'VAD telemetry schema is incompatible with the established contract (user_id, client_round_id, hole_number, source, event_type, created_at, metadata)',
    }
  }

  if (code === '42501' || /permission|forbidden|not authorized/i.test(message)) {
    return {
      status: 503,
      message: 'VAD telemetry source access was denied by Supabase',
    }
  }

  return {
    status: 503,
    message: 'VAD telemetry source query failed; check the configured Supabase project and server credentials',
  }
}