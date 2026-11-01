import { contentDisposition, isInlineMime } from './file-disposition';
import { buildObjectKey } from './file-key';
import { decodeOriginalName } from './files.service';

describe('buildObjectKey', () => {
  const june = new Date('2026-06-05T10:00:00.000Z');

  it('раскладывает по владельцу, году и месяцу', () => {
    expect(buildObjectKey(7, 'banner.png', june)).toMatch(
      /^7\/2026\/06\/[0-9a-f]{12}-banner\.png$/,
    );
  });

  it('переводит кириллицу в латиницу', () => {
    expect(buildObjectKey(1, 'Баннер главной.PNG', june)).toMatch(
      /^1\/2026\/06\/[0-9a-f]{12}-banner-glavnoy\.png$/,
    );
  });

  it('даёт разные ключи двум файлам с одинаковым именем', () => {
    expect(buildObjectKey(1, 'banner.png', june)).not.toBe(buildObjectKey(1, 'banner.png', june));
  });

  it('не оставляет файл без имени, даже если от него ничего не осталось', () => {
    expect(buildObjectKey(1, '★★★.png', june)).toMatch(/-file\.png$/);
  });

  it('берёт только последний сегмент пути и не тащит расширение-мусор', () => {
    expect(buildObjectKey(1, 'C:\\Users\\Иван\\отчёт.pdf', june)).toMatch(/-otchet\.pdf$/);
    expect(buildObjectKey(1, 'архив.tar.slishkomdlinnoerasshirenie', june)).toMatch(
      /-arhiv-tar-slishkomdlinnoerasshirenie$/,
    );
  });
});

describe('contentDisposition', () => {
  it('показывает картинку и pdf', () => {
    expect(isInlineMime('image/png')).toBe(true);
    expect(isInlineMime('application/pdf')).toBe(true);
    expect(isInlineMime('video/mp4')).toBe(true);
  });

  it('отдаёт вложением то, что браузер может исполнить', () => {
    expect(isInlineMime('text/html')).toBe(false);
    // SVG — картинка, но со скриптом внутри: на origin панели ему не место
    expect(isInlineMime('image/svg+xml')).toBe(false);
  });

  it('пишет имя обоими способами: ASCII и RFC 5987', () => {
    expect(contentDisposition('image/png', 'Баннер.png')).toBe(
      "inline; filename=\"______.png\"; filename*=UTF-8''%D0%91%D0%B0%D0%BD%D0%BD%D0%B5%D1%80.png",
    );
  });

  it('не даёт именем файла разломать сам заголовок', () => {
    const header = contentDisposition('text/html', 'a";x=y\r\nX-Evil: 1.html');
    expect(header.startsWith('attachment; filename="')).toBe(true);
    expect(header).not.toContain('\r');
    expect(header).not.toContain('\n');
    // В ASCII-имени не должно остаться кавычки: она закрыла бы filename раньше времени
    expect(header.match(/filename="([^"]*)"/)?.[1]).toBe('a__x=y__X-Evil: 1.html');
  });
});

describe('decodeOriginalName', () => {
  it('оставляет ASCII как есть', () => {
    expect(decodeOriginalName('banner.png')).toBe('banner.png');
  });

  it('чинит кириллицу, прочитанную как latin1', () => {
    const asMulterReadsIt = Buffer.from('Баннер.png', 'utf8').toString('latin1');
    expect(decodeOriginalName(asMulterReadsIt)).toBe('Баннер.png');
  });
});
