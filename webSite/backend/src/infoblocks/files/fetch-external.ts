import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import {
  externalFileName,
  isExternalUrl,
} from '../settings/properties/property';

/** Скачанный внешний файл — то же, что multer отдаёт о загруженном. */
export interface FetchedFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

const TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;

/**
 * Скачать внешний файл, чтобы положить его в своё хранилище («Забрать
 * в хранилище» у внешней ссылки в карточке). Адрес набирает пользователь,
 * а качает сервер, поэтому во внутреннюю сеть не ходим: адрес, который
 * указывает на loopback, частную сеть или метаданные облака, — 400, и так же
 * на каждом шаге переадресации (их ведём сами, а не `fetch`).
 */
export async function fetchExternal(
  url: string,
  maxSize: number,
): Promise<FetchedFile> {
  let current = url;
  for (let step = 0; step <= MAX_REDIRECTS; step += 1) {
    if (!isExternalUrl(current))
      throw new BadRequestException('Адрес файла — только http(s)://');
    await assertPublicHost(new URL(current).hostname);

    const response = await request(current);
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get('location')
    ) {
      current = new URL(
        response.headers.get('location') as string,
        current,
      ).toString();
      continue;
    }
    if (!response.ok)
      throw new BadRequestException(
        `Файл не скачался: сервер ответил ${response.status}`,
      );

    const length = Number(response.headers.get('content-length'));
    if (length > maxSize) throw new BadRequestException(tooLarge(maxSize));

    return {
      name: nameOf(response.headers.get('content-disposition'), current),
      mimeType:
        (response.headers.get('content-type') ?? '').split(';')[0].trim() ||
        'application/octet-stream',
      buffer: await readLimited(response, maxSize),
    };
  }
  throw new BadRequestException(
    'Файл не скачался: слишком много переадресаций',
  );
}

async function request(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new BadRequestException(
      `Файл не скачался: ${error instanceof Error ? error.message : error}`,
    );
  }
}

/** Тело — не больше предела: заголовку длины верить нельзя, его может и не быть. */
async function readLimited(
  response: Response,
  maxSize: number,
): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxSize) {
      await reader.cancel();
      throw new BadRequestException(tooLarge(maxSize));
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

const tooLarge = (maxSize: number) =>
  `Файл больше ${Math.round(maxSize / 1024 / 1024)} МБ`;

/** Имя — из `Content-Disposition`, иначе последний кусок пути; пустое — «file». */
function nameOf(disposition: string | null, url: string): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  try {
    if (encoded) return decodeURIComponent(encoded);
  } catch {
    // битая кодировка — берём имя попроще
  }
  return (plain ?? externalFileName(url)).trim() || 'file';
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [host]
    : await lookup(host, { all: true }).then(
        (list) => list.map((item) => item.address),
        () => {
          throw new BadRequestException(
            `Файл не скачался: адрес «${host}» не найден`,
          );
        },
      );
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new BadRequestException('Из внутренней сети файлы не забираем');
  }
}

/** Адрес не из интернета: loopback, частные сети, link-local (метаданные облака), CGNAT. */
export function isPrivateAddress(address: string): boolean {
  const v4 = address.startsWith('::ffff:') ? address.slice(7) : address;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  return (
    v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)
  );
}
