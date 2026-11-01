import { contentDisposition, isInlineMime } from './file-disposition';
import { fileCode, objectKeyOf } from './file-key';
import { decodeOriginalName } from './files.service';

describe('fileCode', () => {
  it('оставляет латиницу, расширение — в нижнем регистре', () => {
    expect(fileCode('banner.PNG')).toBe('banner.png');
  });

  it('переводит кириллицу в латиницу', () => {
    expect(fileCode('Вопросы и ответы — десктоп.pdf')).toBe('voprosy-i-otvety-desktop.pdf');
  });

  it('не оставляет файл без имени, даже если от него ничего не осталось', () => {
    expect(fileCode('★★★.png')).toBe('file.png');
  });

  it('берёт только последний сегмент пути и не тащит расширение-мусор', () => {
    expect(fileCode('C:\\Users\\Иван\\отчёт.pdf')).toBe('otchet.pdf');
    expect(fileCode('архив.tar.slishkomdlinnoerasshirenie')).toBe(
      'arhiv-tar-slishkomdlinnoerasshirenie',
    );
  });
});

describe('objectKeyOf', () => {
  it('раскладывает по папкам из номера, по две цифры', () => {
    expect(objectKeyOf(78, 'otchet.pdf')).toBe('00/00/78/otchet.pdf');
    expect(objectKeyOf(123456, 'a.png')).toBe('12/34/56/a.png');
  });

  it('с 7 знаков не путает номера', () => {
    expect(objectKeyOf(1000000, 'a.png')).toBe('10/00/000/a.png');
    expect(objectKeyOf(100000, 'a.png')).toBe('10/00/00/a.png');
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
