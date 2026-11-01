import type { AppProps } from 'next/app';
import Head from 'next/head';
import { App as AntApp, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { Provider } from 'react-redux';
import { appTheme } from '../config/theme';
import { store } from '../redux';
import 'antd/dist/reset.css';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      {/* AntApp даёт компонентам контекст message/notification/modal */}
      <ConfigProvider theme={appTheme} locale={ruRU}>
        <AntApp>
          <Head>
            <title>SparkPanel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </Head>
          <Component {...pageProps} />
        </AntApp>
      </ConfigProvider>
    </Provider>
  );
}
