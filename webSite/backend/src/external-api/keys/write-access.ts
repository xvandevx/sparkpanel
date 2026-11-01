/** Права ключа на запись: пишет ли и куда. */
export interface WriteRights {
  isWritable: boolean;
  /** Ключи списков, куда можно писать; null — во все */
  writeLists: string[] | null;
}

/** Можно ли ключу писать в список. Читать он может всегда — здесь только запись. */
export const canWrite = (rights: WriteRights, listKey: string): boolean =>
  rights.isWritable && (rights.writeLists === null || rights.writeLists.includes(listKey));
