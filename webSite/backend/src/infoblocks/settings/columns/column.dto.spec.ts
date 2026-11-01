import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveInfoblockColumnsDto } from './column.dto';

/** Сообщения ошибок проверки вида таблицы — плоским списком. */
const errorsOf = async (body: unknown): Promise<string[]> => {
  const errors = await validate(plainToInstance(SaveInfoblockColumnsDto, body));
  const flat = (list: typeof errors): string[] =>
    list.flatMap((error) => [
      ...Object.values(error.constraints ?? {}),
      ...flat(error.children ?? []),
    ]);
  return flat(errors);
};

describe('SaveInfoblockColumnsDto', () => {
  it('принимает поля записи и свойства, ширина необязательна', async () => {
    expect(
      await errorsOf({
        columns: [{ key: 'name', width: 320 }, { key: 'isActive', width: null }, { key: 'property-12' }],
      }),
    ).toEqual([]);
  });

  // Таблица из одних значков действий ни о чём не говорит
  it('не принимает вид без колонок', async () => {
    expect(await errorsOf({ columns: [] })).toContain('Оставьте хотя бы одну колонку');
  });

  it('не принимает одну колонку дважды', async () => {
    expect(await errorsOf({ columns: [{ key: 'name' }, { key: 'name' }] })).toContain(
      'Колонка указана дважды',
    );
  });

  it('проверяет вид ключа и пределы ширины', async () => {
    expect(await errorsOf({ columns: [{ key: '1name' }] })).toContain('Неверный ключ колонки');
    expect(await errorsOf({ columns: [{ key: 'name', width: 10 }] })).toContain(
      'Ширина колонки — не меньше 40 px',
    );
    expect(await errorsOf({ columns: [{ key: 'name', width: 5000 }] })).toContain(
      'Ширина колонки — не больше 2000 px',
    );
  });
});
