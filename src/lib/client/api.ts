// Browser side of the API routes. Never imports the Llama client: all Llama calls happen on the server.
export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as T & { error?: { code: string; message: string } };
    if (!response.ok) {
      return {
        ok: false,
        code: json.error?.code ?? 'unknown',
        message: json.error?.message ?? 'حدث خطأ غير متوقع. حاول مرة أخرى.',
      };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, code: 'network', message: 'تعذّر الاتصال بالخادم. تحقق من الاتصال ثم حاول مجددًا.' };
  }
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
