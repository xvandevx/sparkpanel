import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/auth.types';

/** Ошибка маршрута панели — как её отдал раздел: код и текст для ассистента. */
export class PanelError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Порт, на котором слушает сам сервер: локально 3402, в контейнере 3010 (см. `main.ts`). */
const selfUrl = (): string => `http://127.0.0.1:${Number(process.env.PORT ?? 3402)}/api`;

/**
 * Маршруты панели от имени владельца токена MCP. Ассистент делает ровно то,
 * что сделал бы этот пользователь в браузере, — теми же маршрутами, с теми же
 * гардами, проверками DTO, правилами разделов и журналом. Поэтому у MCP нет
 * своих правил записи: всё, что умеет и чего не позволяет панель, — оттуда.
 *
 * JWT выпускается на минуту, наружу не уходит. В нём `via` — откуда правка:
 * журнал подписывает её «email · MCP «токен»».
 */
@Injectable()
export class PanelClient {
  constructor(private readonly jwt: JwtService) {}

  async get<T>(user: JwtPayload, path: string, query: Record<string, string | number | boolean | undefined> = {}) {
    const params = Object.entries(query).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined);
    const search = params.length > 0 ? '?' + new URLSearchParams(params.map(([key, value]) => [key, String(value)])) : '';
    return this.send<T>(user, 'GET', path + search);
  }

  post<T>(user: JwtPayload, path: string, body?: unknown) {
    return this.send<T>(user, 'POST', path, body);
  }

  patch<T>(user: JwtPayload, path: string, body: unknown) {
    return this.send<T>(user, 'PATCH', path, body);
  }

  put<T>(user: JwtPayload, path: string, body: unknown) {
    return this.send<T>(user, 'PUT', path, body);
  }

  delete<T>(user: JwtPayload, path: string) {
    return this.send<T>(user, 'DELETE', path);
  }

  /** Загрузка файла — multipart, как из раздела «Файлы». */
  upload<T>(user: JwtPayload, path: string, file: { name: string; mimeType: string; content: Buffer }, fields: Record<string, string>) {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    form.append('file', new Blob([file.content], { type: file.mimeType }), file.name);
    return this.send<T>(user, 'POST', path, form);
  }

  private async send<T>(user: JwtPayload, method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.jwt.signAsync({ id: user.id, email: user.email, isRoot: user.isRoot, via: user.via }, { expiresIn: '1m' });
    const isForm = body instanceof FormData;
    const response = await fetch(selfUrl() + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    const text = await response.text();
    const data = text === '' ? undefined : parseJson(text);
    if (!response.ok) throw new PanelError(response.status, errorText(data, response.status));
    return data as T;
  }
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/** Текст ошибки Nest: `message` строкой или списком ошибок DTO. */
const errorText = (data: unknown, status: number): string => {
  const message = (data as { message?: unknown } | undefined)?.message;
  if (Array.isArray(message)) return message.join('; ');
  if (typeof message === 'string') return message;
  return `Ошибка ${status}`;
};
