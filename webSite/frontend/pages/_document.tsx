import Document, {
  DocumentContext,
  DocumentInitialProps,
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import type { DocumentProps } from 'next/document';

/**
 * Ant Design генерирует стили в рантайме (css-in-js). Без этого шага сервер отдаёт
 * разметку без стилей: страница моргает «голым» HTML и ловит расхождение с клиентом.
 * Поэтому на сервере собираем стили в кэш и вклеиваем их в <head>.
 */
const MyDocument = ({ styles }: DocumentProps & { styles?: React.ReactElement }) => (
  <Html lang="ru">
    <Head>{styles}</Head>
    <body>
      <Main />
      <NextScript />
    </body>
  </Html>
);

MyDocument.getInitialProps = async (ctx: DocumentContext): Promise<DocumentInitialProps> => {
  const cache = createCache();
  const originalRenderPage = ctx.renderPage;

  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) => (props) => (
        <StyleProvider cache={cache}>
          <App {...props} />
        </StyleProvider>
      ),
    });

  const initialProps = await Document.getInitialProps(ctx);
  const style = extractStyle(cache, true);

  return {
    ...initialProps,
    styles: (
      <>
        {initialProps.styles}
        <style dangerouslySetInnerHTML={{ __html: style }} />
      </>
    ),
  };
};

export default MyDocument;
