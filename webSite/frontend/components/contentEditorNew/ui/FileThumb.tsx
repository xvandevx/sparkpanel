import { EyeOutlined, FileOutlined } from '@ant-design/icons';
import { Image, theme } from 'antd';

/**
 * Превью файла: картинка — уменьшенным оригиналом, остальное — значком.
 * Одно на поле файла в карточке, таблицу файлов и выбор из загруженных:
 * рядом они должны выглядеть одинаково.
 *
 * Картинка по клику открывается на весь экран (просмотр antd: увеличить,
 * повернуть, закрыть). При наведении — только значок: подпись «Просмотр»
 * в превью на 32 px не помещается.
 */
export default function FileThumb({
  url,
  isImage,
  size = 40,
}: {
  url: string;
  isImage: boolean;
  /** Сторона квадрата, px */
  size?: number;
}) {
  const { token } = theme.useToken();

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: token.borderRadius,
        background: token.colorFillTertiary,
        color: token.colorTextTertiary,
        overflow: 'hidden',
      }}
    >
      {isImage ? (
        // Клик по превью открывает просмотр и не должен заодно открыть карточку
        // строки или выбрать файл
        <span onClick={(event) => event.stopPropagation()}>
          <Image
            src={url}
            alt=""
            width={size}
            height={size}
            style={{ objectFit: 'cover' }}
            preview={{ cover: <EyeOutlined /> }}
          />
        </span>
      ) : (
        <FileOutlined />
      )}
    </div>
  );
}
