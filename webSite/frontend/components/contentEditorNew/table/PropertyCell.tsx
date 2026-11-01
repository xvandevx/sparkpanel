import { FileThumb } from '../ui';
import type { PropertyCellContent } from './propertyValue';

/** Ячейка свойства: превью картинок рядком, остальное — текстом. */
export default function PropertyCell({ content }: { content: PropertyCellContent }) {
  if (content.images.length === 0) return <>{content.text}</>;
  return (
    <div className="flex flex-wrap gap-1">
      {content.images.map((url) => (
        <FileThumb key={url} url={url} isImage size={32} />
      ))}
    </div>
  );
}
