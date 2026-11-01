// Сборка для образа headless (webSite/headless/): фронтенд выгружается статикой
// в out/, её отдаёт NestJS. Без переменной всё как раньше. Собирается только
// в Docker: промежуточная сборка всё равно пишет в .next и затирает кеш
// работающего `next dev` — `distDir` от этого не спасает, он меняет только out/.
const isStaticExport = process.env.NEXT_OUTPUT === 'export';

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  ...(isStaticExport && { output: 'export' }),
  // Ant Design и его зависимости публикуются как ESM. Next 14 (pages router) на SSR
  // подключает node_modules через require, и без транспиляции падает с
  // "Cannot use import statement outside a module" в @ant-design/colors.
  transpilePackages: [
    'antd',
    '@ant-design/icons',
    '@ant-design/icons-svg',
    '@ant-design/colors',
    '@ant-design/fast-color',
    '@ant-design/cssinjs',
    '@ant-design/cssinjs-utils',
    '@ant-design/react-slick',
    'rc-cascader',
    'rc-checkbox',
    'rc-collapse',
    'rc-dialog',
    'rc-drawer',
    'rc-dropdown',
    'rc-field-form',
    'rc-image',
    'rc-input',
    'rc-input-number',
    'rc-mentions',
    'rc-menu',
    'rc-motion',
    'rc-notification',
    'rc-pagination',
    'rc-picker',
    'rc-progress',
    'rc-rate',
    'rc-resize-observer',
    'rc-segmented',
    'rc-select',
    'rc-slider',
    'rc-steps',
    'rc-switch',
    'rc-table',
    'rc-tabs',
    'rc-textarea',
    'rc-tooltip',
    'rc-tree',
    'rc-tree-select',
    'rc-upload',
    'rc-util',
    'rc-virtual-list',
    // Документация внешнего API («Настройки → API»): ESM-пакет, как и antd
    '@scalar/api-reference-react',
  ],
};
