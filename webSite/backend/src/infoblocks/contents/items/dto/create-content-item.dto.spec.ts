import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CONTENT_CODE_PATTERN } from '../../dto/create-content.dto';
import { CONTENT_ITEM_CODE_PATTERN, CreateContentItemDto } from './create-content-item.dto';
import { UpdateContentItemDto } from './update-content-item.dto';

describe('код элемента типа контента', () => {
  it.each(['', 'opening', 'kuzov-2020', '2024-po-nast-', 'a-', '7'])('«%s» — можно', (code) =>
    expect(CONTENT_ITEM_CODE_PATTERN.test(code)).toBe(true));

  it.each(['-a', 'a--b', 'a--', '-', 'po-nast--', 'Po-nast', 'po_nast_', 'a b'])('«%s» — нельзя', (code) =>
    expect(CONTENT_ITEM_CODE_PATTERN.test(code)).toBe(false));

  it('у самого типа контента дефис на конце по-прежнему нельзя', () =>
    expect(CONTENT_CODE_PATTERN.test('2024-po-nast-')).toBe(false));

  it('создание и правка элемента принимают код с дефисом на конце', async () => {
    const created = plainToInstance(CreateContentItemDto, { name: 'Кузов', code: '2024-po-nast-' });
    const updated = plainToInstance(UpdateContentItemDto, { code: ' 2024-po-nast- ' });
    expect(await validate(created)).toEqual([]);
    expect(await validate(updated)).toEqual([]);
    expect(updated.code).toBe('2024-po-nast-');
  });

  it('два дефиса — 400 с понятным текстом', async () => {
    const [error] = await validate(plainToInstance(CreateContentItemDto, { name: 'Кузов', code: 'po--nast' }));
    expect(Object.values(error.constraints ?? {})).toContain(
      'Код может содержать строчные латинские буквы, цифры и дефис между ними или в конце',
    );
  });
});
