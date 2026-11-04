import { MAX_LOGO_SIZE, logoProblem, logoUrlOf, parseLogo } from './logo';

const dataUri = (mimeType: string, body: Buffer) =>
  `data:${mimeType};base64,${body.toString('base64')}`;

describe('логотип панели', () => {
  const png = dataUri('image/png', Buffer.from('картинка'));

  it('разбирает data URI в тип и содержимое', () => {
    expect(parseLogo(png)).toEqual({ mimeType: 'image/png', body: Buffer.from('картинка') });
    expect(parseLogo('https://example.com/logo.png')).toBeNull();
    expect(parseLogo('data:image/png,не-base64')).toBeNull();
  });

  it('принимает картинку нужного типа и веса', () => {
    expect(logoProblem(png)).toBeNull();
    expect(logoProblem(dataUri('image/svg+xml', Buffer.from('<svg/>')))).toBeNull();
  });

  it('не принимает не картинку, пустое и тяжёлое', () => {
    expect(logoProblem(dataUri('text/html', Buffer.from('<script>')))).toMatch(/PNG/);
    expect(logoProblem('data:image/png;base64,')).toMatch(/не прочитался/);
    expect(logoProblem('просто текст')).toMatch(/не прочитался/);
    expect(logoProblem(dataUri('image/png', Buffer.alloc(MAX_LOGO_SIZE + 1)))).toMatch(/512/);
  });

  it('адрес меняется вместе с картинкой, своего нет — пусто', () => {
    const other = dataUri('image/png', Buffer.from('другая'));
    expect(logoUrlOf(png)).toMatch(/^\/api\/settings\/logo\?v=[0-9a-f]{12}$/);
    expect(logoUrlOf(png)).not.toBe(logoUrlOf(other));
    expect(logoUrlOf('')).toBe('');
  });
});
