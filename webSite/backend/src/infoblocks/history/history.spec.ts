import { HistoryAction } from './history.model';
import { HistoryService } from './history.service';

/** Сервис с подменёнными репозиториями: проверяем правила, а не SQL. */
function setup(settings: { isHistoryEnabled: boolean } | null) {
  const historyRepo = { create: jest.fn() };
  const userRepo = { findByPk: jest.fn(async () => ({ name: 'Иван', email: 'ivan@example.com' })) };
  const settingsRepo = { findOne: jest.fn(async () => settings) };

  const service = new HistoryService(
    historyRepo as never,
    userRepo as never,
    settingsRepo as never,
  );
  return { service, historyRepo, settingsRepo };
}

const params = {
  userId: 1,
  entity: 'pages',
  entityId: '2',
  action: HistoryAction.Update,
  before: { name: 'О компании' },
  after: { name: 'О нас' },
  author: { id: 1, email: 'ivan@example.com', ip: null },
};

describe('HistoryService.record', () => {
  it('пишет правку, пока журнал списка включён', async () => {
    const { service, historyRepo } = setup({ isHistoryEnabled: true });
    await service.record(params);
    expect(historyRepo.create).toHaveBeenCalledTimes(1);
  });

  it('у списка без сохранённых настроек журнал ведётся', async () => {
    const { service, historyRepo } = setup(null);
    await service.record(params);
    expect(historyRepo.create).toHaveBeenCalledTimes(1);
  });

  it('журнал выключен в настройках списка — правка не пишется', async () => {
    const { service, historyRepo, settingsRepo } = setup({ isHistoryEnabled: false });
    await service.record(params);
    expect(historyRepo.create).not.toHaveBeenCalled();
    // Настройки ищутся по ключу списка — он же тип записи в журнале
    expect(settingsRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ listKey: 'pages' }) }),
    );
  });

  it('правка без отличий не пишется и настроек не спрашивает', async () => {
    const { service, historyRepo, settingsRepo } = setup({ isHistoryEnabled: true });
    await service.record({ ...params, after: params.before });
    expect(historyRepo.create).not.toHaveBeenCalled();
    expect(settingsRepo.findOne).not.toHaveBeenCalled();
  });
});

describe('HistoryService.clear', () => {
  it('весь журнал списка — правки всех: журнал общий, как и записи', async () => {
    const historyRepo = { destroy: jest.fn(async () => 7) };
    const service = new HistoryService(historyRepo as never, {} as never, {} as never);
    await expect(service.clear('pages')).resolves.toBe(7);
    expect(historyRepo.destroy).toHaveBeenCalledWith({ where: { entity: 'pages' } });
  });

  it('с ключом записи — только её история', async () => {
    const historyRepo = { destroy: jest.fn(async () => 2) };
    const service = new HistoryService(historyRepo as never, {} as never, {} as never);
    await service.clear('pages', '2');
    expect(historyRepo.destroy).toHaveBeenCalledWith({
      where: { entity: 'pages', entityId: '2' },
    });
  });
});
