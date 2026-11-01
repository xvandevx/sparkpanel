# Обратная связь (отложено)

Раздел «Обратная связь» («Формы» и «Поля форм») скрыт из панели до возвращения.
Бэкенд не тронут: `infoblocks/forms/` живёт и отвечает.

Вернуть:

- `components/forms/`, `logic/forms/`, `api/forms.ts`, `api/formFields.ts` — на те же
  места во `frontend/`, страницы `routes/admin/forms/` — в `pages/admin/forms/`;
- в `api/index.ts` — `formFieldsApi` и `formsApi`;
- в `logic/listSettings/listKeys.ts` — `forms: 'forms'` и `formFields: 'form-fields'`;
- в `config/navigation.ts` — пункт «Обратная связь» (иконка `FormOutlined`)
  с подменю `/admin/forms` и `/admin/forms/fields`, после «Товаров».

В бэкенде заодно вернуть формы и поля форм в выбор списка для привязки
к контенту — две строки `top(FORMS_LIST, …)` и `top(FORM_FIELDS_LIST, …)`
в `findSources` (`backend/src/infoblocks/settings/links/link-targets.service.ts`).
