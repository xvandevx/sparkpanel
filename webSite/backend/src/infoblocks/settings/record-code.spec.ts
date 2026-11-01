import { BadRequestException, ConflictException } from '@nestjs/common';
import { assertRecordCode, codeError } from './record-code';

const NONE = { useCode: false, codeRequired: true, codeUnique: true };
const OPTIONAL = { useCode: true, codeRequired: false, codeUnique: false };
const REQUIRED = { useCode: true, codeRequired: true, codeUnique: false };
const UNIQUE = { useCode: true, codeRequired: true, codeUnique: true };

describe('код записи по настройкам списка', () => {
  it('без настроек, при «Нет» и «Необязательном» правил нет', () => {
    expect(codeError(null, '', true)).toBeNull();
    expect(codeError(NONE, '', true)).toBeNull();
    expect(codeError(OPTIONAL, '', true)).toBeNull();
    // Уникальность без обязательности не проверяется — её так и не выбрать
    expect(codeError({ ...OPTIONAL, codeUnique: true }, 'news', true)).toBeNull();
  });

  it('обязательный: пустой и из пробелов — ошибка 400', () => {
    expect(codeError(REQUIRED, '', false)).toMatchObject({ isConflict: false });
    expect(codeError(REQUIRED, '  ', false)).toMatchObject({ isConflict: false });
    expect(codeError(REQUIRED, 'news', true)).toBeNull();
  });

  it('обязательный и уникальный: занятый код — 409', () => {
    expect(codeError(UNIQUE, 'news', true)).toMatchObject({ isConflict: true });
    expect(codeError(UNIQUE, 'news', false)).toBeNull();
  });
});

describe('assertRecordCode', () => {
  it('занятость спрашивает только у уникального и непустого кода', async () => {
    const isTaken = jest.fn().mockResolvedValue(true);
    await assertRecordCode(REQUIRED, 'news', isTaken);
    await assertRecordCode(OPTIONAL, 'news', isTaken);
    expect(isTaken).not.toHaveBeenCalled();

    await expect(assertRecordCode(UNIQUE, ' news ', isTaken)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(isTaken).toHaveBeenCalledWith('news');
  });

  it('пустой обязательный — BadRequest, занятость не спрашивается', async () => {
    const isTaken = jest.fn().mockResolvedValue(true);
    await expect(assertRecordCode(UNIQUE, '', isTaken)).rejects.toBeInstanceOf(BadRequestException);
    expect(isTaken).not.toHaveBeenCalled();
  });
});
