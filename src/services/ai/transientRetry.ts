type ErrorDetails = {
  status?: number;
  providerStatus?: number;
  code?: string;
  message: string;
};

type RetryClassification = {
  retryable: boolean;
  kind: 'network' | 'http' | 'non_retryable';
  status?: number;
  code?: string;
};

const RETRYABLE_HTTP_STATUSES = new Set([502, 503, 504]);
const NON_RETRYABLE_CODES = new Set([
  'AUTH_ERROR',
  'INVALID_PAYLOAD',
  'GEMINI_KEY_MISSING',
  'GEMINI_INVALID_RESPONSE',
  'GEMINI_QUOTA',
]);
const RETRY_DELAY_MS = 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseBody(value: unknown): Record<string, unknown> | undefined {
  if (isRecord(value)) return value;
  if (typeof value !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function getErrorDetails(error: unknown): Promise<ErrorDetails> {
  if (!isRecord(error)) return { message: error instanceof Error ? error.message : String(error) };
  const context = error.context;
  let status: number | undefined;
  let rawBody: unknown;

  if (context instanceof Response) {
    status = context.status;
    try {
      rawBody = await context.clone().json();
    } catch {
      rawBody = undefined;
    }
  } else if (isRecord(context)) {
    status = typeof context.status === 'number' ? context.status : undefined;
    rawBody = context.body;
  }

  const body = parseBody(rawBody) ?? {};
  const provider = isRecord(body.provider) ? body.provider : {};
  const providerStatus = typeof provider.httpStatus === 'number' ? provider.httpStatus : undefined;
  return {
    status,
    providerStatus,
    code: typeof body.code === 'string' ? body.code.toUpperCase() : undefined,
    message: [error.message, body.error, body.message]
      .filter((item): item is string => typeof item === 'string')
      .join(' '),
  };
}

async function classifyRetry(error: unknown): Promise<RetryClassification> {
  const details = await getErrorDetails(error);
  if (details.code && NON_RETRYABLE_CODES.has(details.code)) {
    return { retryable: false, kind: 'non_retryable', status: details.status ?? details.providerStatus, code: details.code };
  }

  // A provider quota/configuration response is authoritative even when the
  // Edge Function wraps it in a different HTTP status.
  if (details.providerStatus !== undefined && !RETRYABLE_HTTP_STATUSES.has(details.providerStatus)) {
    return { retryable: false, kind: 'non_retryable', status: details.providerStatus, code: details.code };
  }
  if (details.status !== undefined) {
    return {
      retryable: RETRYABLE_HTTP_STATUSES.has(details.status),
      kind: 'http',
      status: details.status,
      code: details.code,
    };
  }
  if (details.providerStatus !== undefined) {
    return {
      retryable: RETRYABLE_HTTP_STATUSES.has(details.providerStatus),
      kind: 'http',
      status: details.providerStatus,
      code: details.code,
    };
  }

  const networkOrTimeout = /network request failed|failed to fetch|fetch failed|failed to send.*edge function|could not reach.*edge function|load failed|network error|timed?\s*out|timeout|aborterror|edge function.*unavailable/i.test(details.message);
  return { retryable: networkOrTimeout, kind: networkOrTimeout ? 'network' : 'non_retryable', code: details.code };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries a single transient AI request once; callers should wrap generation, not cache lookups. */
export async function withTransientRetry<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
  if (__DEV__) console.info(`[${operationName}] attempt`, { number: 1 });
  try {
    const result = await operation();
    if (__DEV__) console.info(`[${operationName}] attempt result`, { number: 1, success: true });
    return result;
  } catch (firstError) {
    const classification = await classifyRetry(firstError);
    if (__DEV__) console.info(`[${operationName}] attempt result`, {
      number: 1,
      success: false,
      retryable: classification.retryable,
      kind: classification.kind,
      status: classification.status,
      code: classification.code,
    });
    if (!classification.retryable) throw firstError;

    if (__DEV__) console.info(`[${operationName}] automatic retry started`, { number: 2, delayMs: RETRY_DELAY_MS });
    await delay(RETRY_DELAY_MS);
    try {
      const result = await operation();
      if (__DEV__) console.info(`[${operationName}] automatic retry result`, { number: 2, success: true });
      return result;
    } catch (secondError) {
      const secondClassification = await classifyRetry(secondError);
      if (__DEV__) console.info(`[${operationName}] automatic retry result`, {
        number: 2,
        success: false,
        retryable: secondClassification.retryable,
        kind: secondClassification.kind,
        status: secondClassification.status,
        code: secondClassification.code,
      });
      throw secondError;
    }
  }
}
