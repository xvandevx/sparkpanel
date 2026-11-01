import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveInfoblockFiltersDto } from './filter.dto';

/** Сообщения ошибок проверки набора полей фильтра — плоским списком. */
const errorsOf = async (body: unknown): Promise<string[]> => {
  const errors = await validate(plainToInstance(SaveInfoblockFiltersDto, body));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
};

describe('SaveInfoblockFiltersDto', () => {
  it('принимает поля записи и свойства', async () => {
    expect(await errorsOf({ keys: ['name', 'isActive', 'property-12'] })).toEqual([]);
  });

  // Пустой набор — это «фильтра нет», а не ошибка
  it('принимает пустой набор', async () => {
    expect(await errorsOf({ keys: [] })).toEqual([]);
  });

  it('не принимает одно поле дважды', async () => {
    expect(await errorsOf({ keys: ['name', 'name'] })).toContain('Поле фильтра указано дважды');
  });

  it('проверяет вид ключа', async () => {
    expect(await errorsOf({ keys: ['1name'] })).toContain('Неверный ключ поля фильтра');
  });
});
