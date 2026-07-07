export interface ParsedSseEvent {
  event: string;
  data: string;
}

export function encodeSse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function* parseSse(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ParsedSseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    // eslint-disable-next-line no-await-in-loop -- Stream readers must be consumed sequentially.
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes('\n\n')) {
      const index = buffer.indexOf('\n\n');
      const rawEvent = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);

      const lines = rawEvent.split(/\r?\n/u);
      const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message';
      const data = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');

      if (data) {
        yield { event, data };
      }
    }
  }

  const tail = buffer.trim();

  if (tail) {
    const lines = tail.split(/\r?\n/u);
    const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message';
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (data) {
      yield { event, data };
    }
  }
}
