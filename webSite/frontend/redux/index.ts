import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk, { ThunkDispatch } from 'redux-thunk';
import { composeWithDevTools } from '@redux-devtools/extension';
import { authReducer } from './reducers/authReducer';
import { contentEditorNewReducer } from './reducers/contentEditorNewReducer';
import { filesReducer } from './reducers/filesReducer';
import { settingsReducer } from './reducers/settingsReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  // Данные редактора контента: записи и настройки списков по ключу списка
  contentEditorNew: contentEditorNewReducer,
  // Файлы пользователя одним списком: их читают раздел «Файлы» и поле файла в карточке
  files: filesReducer,
  // Настройки сайта, как они лежат в базе
  settings: settingsReducer,
});

export const store = createStore(rootReducer, composeWithDevTools(applyMiddleware(thunk)));

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<RootState, unknown, any>;
