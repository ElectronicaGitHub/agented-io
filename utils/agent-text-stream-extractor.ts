interface ExtractedString {
  value: string;
  complete: boolean;
  endIndex: number;
}

/**
 * Conservatively extracts text from streamed `actions[type=text].text` JSON.
 * It emits nothing until an object is positively identified as a text action,
 * so function parameters and agent instructions cannot leak to UI consumers.
 */
export class AgentTextStreamExtractor {
  private raw = '';
  private emitted = '';

  push(rawDelta: string): string {
    this.raw += rawDelta;
    const visible = this.extractVisibleText();
    const delta = visible.startsWith(this.emitted)
      ? visible.slice(this.emitted.length)
      : '';
    this.emitted = visible;
    return delta;
  }

  reset(): void {
    this.raw = '';
    this.emitted = '';
  }

  private extractVisibleText(): string {
    const values: string[] = [];
    const prefix = /"type"\s*:\s*"text"(?:(?:"(?:\\.|[^"\\])*")|[^}])*?"text"\s*:\s*"/g;
    let match: RegExpExecArray | null;

    while ((match = prefix.exec(this.raw)) !== null) {
      const extracted = this.readJsonString(match.index + match[0].length);
      values.push(extracted.value);
      if (!extracted.complete) break;
      prefix.lastIndex = extracted.endIndex;
    }

    return values.join('\n');
  }

  private readJsonString(startIndex: number): ExtractedString {
    let value = '';
    let escaped = false;

    for (let index = startIndex; index < this.raw.length; index += 1) {
      const char = this.raw[index];
      if (!escaped) {
        if (char === '"') return { value, complete: true, endIndex: index + 1 };
        if (char === '\\') {
          escaped = true;
        } else {
          value += char;
        }
        continue;
      }

      if (char === 'u') {
        const hex = this.raw.slice(index + 1, index + 5);
        if (hex.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) {
          return { value, complete: false, endIndex: this.raw.length };
        }
        value += String.fromCharCode(parseInt(hex, 16));
        index += 4;
      } else {
        const escapes: Record<string, string> = {
          '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t',
        };
        value += escapes[char] ?? char;
      }
      escaped = false;
    }

    return { value, complete: false, endIndex: this.raw.length };
  }
}
