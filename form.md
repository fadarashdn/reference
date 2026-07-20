# @brdp/ui/form — System Reference

> Purpose: this file is a self-contained reference for an LLM (or a developer) to generate
> new **business elements**, form field configs, and form usages that are 100% consistent
> with the real `@brdp/ui/form` implementation. It documents only what actually exists in
> the current source (`controlled-form.tsx`, `form.tsx`, `form-builder.tsx`, `form-field.tsx`,
> `form-fields-renderer.tsx`, `form-fields-row.tsx`, `use-query-params.ts`, `use-hotkeys.ts`).
> Anything not in this file should NOT be assumed to exist.

---

## 1. Import surface

```ts
import FormGenerator, { useControlledForm } from "@brdp/ui/form";
import type { FormField, BaseFormField, BusinessElementFieldsProps } from "@brdp/ui/form";
```

- `FormGenerator` = the `FormBuilder` component, **compounded** with every registered
  business element as a static property (e.g. `FormGenerator.AmountField`,
  `FormGenerator.IBANField`, `FormGenerator.CollapseField`, ...).
- `useControlledForm<TForm>({ id })` = hook for programmatic form control
  (`setFieldsValue`, `getFieldValue`, `validateFields`, etc.) + a `<ControlledForm />`
  component bound to that form instance.
- Never import `Form`, `Input`, `Select`, etc. from `antd` directly in feature code.
  The only allowed direct `antd` import anywhere in the app is
  `import { App } from "antd"` (for `App.useApp()` — modal/message/notification context).

---

## 2. Two ways to render a form

### 2.1 Direct (uncontrolled) usage
```tsx
<FormGenerator
  id="userForm"
  fields={fields}
  initialValues={{ active: true }}
  onSubmit={(values) => { /* ... */ }}
/>
```

### 2.2 Controlled usage (preferred for anything non-trivial)
```tsx
const { ControlledForm, setFieldsValue, getFieldValue, validateFields } =
  useControlledForm<MyFormType>({ id: "my-form" });

<ControlledForm
  fields={fields}
  onSubmit={handleSubmit}
  isSubmitting={saving}
  readOnly={viewMode}
/>
```

`useControlledForm` never takes `id` as a bare string argument — it's
`{ id: string; disabledForm?: boolean }`.

---

## 3. `useControlledForm` — full API

```ts
type ControlledFormHookOptions = {
  id: string;
  disabledForm?: boolean;     // lets toggleFormDisable() control it later
  confirmBeforeClose?: boolean; // reserved, not implemented yet
};
```

Returned object:

| Method | Signature | Notes |
|---|---|---|
| `ControlledForm` | `(props: Omit<FormBuilderPropsType<TForm>, "id" \| "drill">) => JSX` | memoized on `isDisabled` |
| `fieldWatch` | `(name, options?: { preserve?: boolean }) => value` | ⚠️ avoid in field configs — causes extra re-renders / has crashed the app in some contexts. Use `dependencies` + `hidden`/`disabled` callbacks instead. Only use `fieldWatch` for logic that lives **outside** field config (e.g. an effect that calls `setFieldsValue` on multiple fields). |
| `getFieldValue` | `(name) => unknown` | |
| `getFieldsValue` | `(names: KeyOfFields[] \| true) => Partial<TForm>` | pass `true` for all fields, esp. on first render |
| `setFieldsValue` | `(source: RecursivePartial<TForm>) => void` | |
| `resetFields` | `(names?: KeyOfFields[]) => void` | remounts fields under `Form.Item` |
| `submit` | `() => void` | |
| `toggleFormDisable` | `(newStatus?: boolean) => void` | only meaningful if `disabledForm` was set |
| `validateFields` | `(nameList: KeyOfFields[]) => Promise<TForm>` | `{ dirty: true, recursive: true }` |
| `validateAllFields` | `() => Promise<TForm>` | |
| `getFieldError` | `(name) => string[]` | |
| `isFieldTouched` | `(name) => boolean` | |
| `isFieldsTouched` | `() => boolean` | |
| `isFieldsValidating` | `(nameList) => boolean` | |
| `clearAllErrors` | `() => void` | |
| `validateRequiredGroup` | `(groupName, fields, errorMessage?) => Promise<void>` | see §7 |
| `clearRequiredGroupErrors` | `(groupName, fields) => void` | |
| `getAllParams` | from `useQueryParams` | current URL query params, typed |

`KeyOfFields = NamePath<TForm> | \`__${string}\`` — the `__` prefix pattern lets you declare
non-data fields (dividers, layout-only business elements) without polluting `TForm`.

---

## 4. `FormBuilder` / `FormGenerator` props

```ts
type FormBuilderPropsType<Fields, HeaderActionDataType = unknown> = {
  title?: string;
  drill?: FormInstance;           // internal — set by useControlledForm
  id: string;
  fields: FormField<Fields>[];
  initialValues?: Partial<Fields>;
  onSubmit?: (fields: Fields) => void;
  reset?: boolean;                // default true — shows reset/cancel button
  submitLabel?: string;
  onReset?: () => void;
  resetLabel?: string;
  compact?: boolean;              // smaller label font, tighter spacing
  isLoading?: boolean;            // Spin overlay over the whole form
  isSubmitting?: boolean;         // submit button loading + disabled
  isSubmitDisabled?: boolean;     // disables submit AND removes onFinish handler
  disabled?: boolean;
  readOnly?: boolean;             // "-" for empty values, no placeholders/suffixes
  formHeaderActions?: ActionBarBuilderType<HeaderActionDataType>[];
  submitButtonIcon?: React.ReactNode;
  autoSyncWithQueryParams?: boolean; // see §8
  access?: boolean;               // if false, submit shows a "no access" modal.error()
  formType?: "GET" | "PUT" | "POST" | "PATCH" | "DELETE"; // "DELETE" => danger submit button + delete label default
};
```

Key submit-button behavior:
- `submitLabel` wins; otherwise `formType === "DELETE"` → `"brdpManagement.actionDelete"`,
  else `"brdpManagement.submit"`.
- Submit button is `danger` when `formType === "DELETE"`.

Key reset-button behavior (see also team convention below):
- Shown when `reset !== false && !readOnly`.
- **Search/filter forms (form + table)**: `onReset` should clear filters, reset pagination,
  and refetch — it must **not** close the modal.
- **Create/Edit forms inside a modal**: `onReset` should close the modal (cancel semantics).
  Use `resetLabel={messages("brdpManagement.cancel")}` in that case.

---

## 5. Field config types (`FormField<Fields>` union)

Every field extends `BaseFormField<Fields>`:

```ts
type BaseFormField<Fields, NameOfFields = keyof Fields | `__${string}`> = {
  name: NameOfFields;
  label: string;
  validation?: { rules: GetProps<typeof Form.Item>["rules"] };
  dependencies?: NameOfFields[];
  tooltip?: string;
  extra?: string;
  hasFeedback?: boolean;
  layout?: { span?: 1 | 2 | 3 | 4; offset?: 0 | 1 | 2 | 3; endPoint?: boolean };
  disabled?: boolean | ((options: { values: Partial<Fields> }) => boolean);
  hidden?: boolean | ((options: { values: Partial<Fields> }) => boolean);
  readOnly?: boolean;
  requiredGroup?: string;
};
```

### Available `type`s and their `options`

| `type` | `data` required? | `options` highlights |
|---|---|---|
| `"business"` | no | `element`, `options.returnFormat`, `options.staticData`, `options.placeholder`, `options.extraProps` |
| `"select"` | yes — `{ static: [...] }` (flat or grouped) | `initialValue`, `searchable`, `multiple`, `maxCount`, `onSearch`, `onSelect`, `onClear`, `dataMapper`, `tags` |
| `"cascader"` | yes — `CascaderProps["options"]` | `searchable`, `multiple`, `maxCount`, `placeholder` |
| `"input"` | no | `prefix`, `suffix`, `placeholder`, `direction: "ltr" \| "rtl"`, `initialValue` |
| `"password"` | no | `placeholder` |
| `"checkbox"` | no | (uses `label` as the checkbox text) |
| `"numeric"` | no | `placeholder`, `prefix`, `suffix` |
| `"textarea"` | no | `maxLength`, `placeholder`, `direction`, `rows` |
| `"time-picker"` | no | `disabledDate`, `minDate`, `maxDate`, `placeholder` |
| `"range-date-picker"` | no | `disabledDate`, `minDate`, `maxDate`, `placeholder: [string, string]` |
| `"radio-button"` | yes — `{ static: [...] }` | — |
| `"tree-select"` | yes — `TreeSelectProps["treeData"]` | `placeholder`, `treeCheckable`, `showIcon`, `expandAll`, `treeLine`, `showLeafIcon`, `multiple` |
| `"divider"` | no | `orientation: "left" \| "right" \| "center"` |

`select`/`cascader`/`tree-select` all use a shared search-matching utility
(`globalSearchFilter`) against a joined string of `title`/`label`/`value`
(or `treeNode.title/label/value`) — don't hand-roll `filterOption` from scratch unless
you need custom matching.

---

## 6. Business elements — how the "business" field type works

### 6.1 Runtime contract

```ts
export type BusinessElementFieldsProps<
  ExtraProps extends object = object,
  StaticData extends object = object,
> = {
  id: string;
  name: string;
  value?: unknown;
  onChange?: (value: unknown) => void;
  validation?: unknown;
  form: FormInstance;
  options?: FormBusinessField<never, ExtraProps, StaticData>["options"] &
    Partial<Omit<FormBusinessField<never, ExtraProps, StaticData>, "element" | "options">> & {
      disabled?: boolean;
      hidden?: boolean;
    };
};
```

Field config:

```ts
type FormBusinessField<Fields, ExtraProps extends object = object, StaticData extends object = object> =
  BaseFormField<Fields> & {
    type: "business";
    element: BusinessElementsRepositoryTypes[keyof BusinessElementsRepositoryTypes]
      | React.ElementType<BusinessElementFieldsProps<Partial<ExtraProps>, StaticData>>;
    options?: {
      returnFormat?: {
        type: "string" | "object" | "fn";
        template: string | object | ((data: unknown) => null | number | string | object);
      };
      staticData?: StaticData;
      placeholder?: string;
      extraProps?: ExtraProps;
    };
  };
```

`RenderBusinessElement` (internal, in `form-fields-renderer.tsx`) does:

```ts
React.createElement(element, {
  id, name, value, onChange, validation, form,
  options: { ...field.options, ...restField }, // restField = disabled/hidden/etc merged in
});
```

So **every** business element receives `id`, `name`, `value`, `onChange`, `form`, and
`options` (which itself carries `extraProps`, `readOnly`, `disabled`, `hidden`,
`placeholder`, `returnFormat`, `staticData`).

### 6.2 Anatomy of a new business element (template)

```tsx
// business-elements/my-field/my-field.tsx
import { Input } from "antd"; // ❌ NOT ALLOWED — see rule below, illustrative only
import type { BusinessElementFieldsProps } from "@brdp/ui/form";

type MyFieldExtraProps = {
  placeholder?: string;
};

const MyField: React.FC<BusinessElementFieldsProps<MyFieldExtraProps>> = (props) => {
  const { value, onChange, options, id, name } = props;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <Input // in real code: the @brdp/ui equivalent, never raw antd Input
      id={id}
      name={name}
      value={value as string}
      readOnly={options?.readOnly}
      disabled={options?.disabled}
      hidden={options?.hidden}
      placeholder={options?.extraProps?.placeholder}
      onChange={handleChange}
    />
  );
};

MyField.displayName = "MyField"; // REQUIRED — used for the brdp-business-{name} className

export default MyField;
```

**Rules for any new business element:**
1. `React.FC<BusinessElementFieldsProps<ExtraProps, StaticData?>>` — always generic over
   its own `ExtraProps` type (a `type`, never an `interface`).
2. Set `.displayName` — the renderer uses it to build
   `brdp-business-{displayName}` on the wrapping `Form.Item`.
3. Read config from `options.extraProps`, never from a bare second prop — the renderer
   always nests custom config under `options.extraProps`.
4. Respect `options.readOnly`, `options.disabled`, `options.hidden` explicitly — the
   renderer does NOT wrap business elements the way it wraps native `input`/`select`;
   the element itself is responsible for its own readOnly rendering
   (commonly: render a `"-"`/plain text node when `options.readOnly && !value`).
5. Cast `value` once at the top: `const items = (value as T[]) ?? []` — `value` is typed
   `unknown` by design.
6. Call `onChange?.(...)` — never mutate `form` directly from inside a business element
   unless you also need `form.setFieldsValue` for a *sibling* field (see §6.4).
7. Wrap risky/expensive derived values in `useMemo`; don't wrap `messages()` calls in
   `useMemo` — `messages()` is a cheap `Map.get()`.
8. Monetary values must stay `string` typed end-to-end (never `Number()` them — risk of
   exceeding `MAX_SAFE_INTEGER`). Pass strings straight into `addCommaToAmount`.
9. Dates: convert with `ISOToJalaaliDate` / `ISOToJalaaliDateTime` for display and
   `jalaaliToISO` / `jalaaliDateTimeToISO` before sending to the API. Never mix a second
   date library in ad hoc.
10. All user-facing text goes through the message/i18n function
    (`const messages = getFormatMessage(); messages("namespace.key")`) — never a
    hardcoded literal string in JSX or validators.

### 6.3 Registering a new business element

Two files change:

1. In the aggregator `form.tsx`:
```ts
import MyField from "./business-elements/my-field/my-field";
// ...
export type BusinessElementsRepositoryTypes = {
  // ...existing entries
  MyField: typeof MyField;
};
// ...
FormGenerator.MyField = MyField;
```
2. Usage anywhere in the app:
```tsx
{
  name: "someField",
  type: "business",
  label: messages("module.someFieldLabel"),
  element: FormGenerator.MyField,
  options: { extraProps: { placeholder: messages("module.placeholder") } },
}
```

There are exactly two valid import shapes for consuming business/form elements in feature
code:
```ts
import FormGenerator from "@brdp/ui/form";              // FormGenerator.AmountField
import { BusinessElements } from "@brdp/engine";          // BusinessElements.CustomerSearchField
```
Never a bare named import like `import { AmountField } from "@brdp/ui/form"`.

### 6.4 Business elements that need sibling-field context

If a business element must react to *another* field's value (e.g. a date picker whose
`minDate`/`maxDate` comes from another field's name), use `Form.useWatch` against the
`form` instance passed in as a prop — this is the one place `Form.useWatch` inside a
business element is expected, because the business element owns that cross-field logic
internally (see `DatePickerField`-style pattern: `extraProps.minDate` is a field *name*
string, watched via `Form.useWatch(minDateFieldName, form)`).

For anything that needs to set **other fields'** values as a side effect (auto-fill), do
it from the parent component via `useControlledForm().setFieldsValue(...)`, triggered
inside a `hidden`/`disabled` callback on a field with the right `dependencies` (see §6.5),
**not** inside the business element itself.

### 6.5 The "hidden as a side-effect hook" pattern

`hidden`/`disabled` callbacks receive `{ values }`, where `values` only contains the keys
listed in that field's own `dependencies` array (this is intentional — the renderer's
`Form.useWatch` selector filters to just `field.dependencies`). This is the supported way
to react to another field's change without `fieldWatch`:

```tsx
{
  name: "nickname",
  type: "input",
  dependencies: ["name"],
  hidden: ({ values }) => {
    if (values.name === "arash") {
      setFieldsValue({ nickname: "fada", city: values.name });
    }
    return false; // not actually hidden — used purely as a change hook
  },
},
```

If you need more than one source field, list all of them in `dependencies`; anything not
listed there will be `undefined` inside `values`, even if it exists on the form.

---

## 7. Required groups

```ts
{
  name: "nationalId",
  requiredGroup: "identity",
  // ...
},
{
  name: "passport",
  requiredGroup: "identity",
  // ...
}
```

- Fields sharing a `requiredGroup` render a **blue** asterisk (not the red "required"
  asterisk) via `enhancedRequiredMark` / `CustomizedRequiredMark`.
- Enforce it yourself before submit:
```ts
await validateRequiredGroup("identity", fields, messages("module.needOneOfIdentity"));
```
- Clear it manually with `clearRequiredGroupErrors("identity", fields)` when the group
  becomes satisfied by other means (e.g. programmatic fill).

---

## 8. `autoSyncWithQueryParams`

When `true` on `FormBuilder`/`FormGenerator`:
- On submit, every non-`disabled`/non-`readOnly`/non-`hidden` field's value is written to
  the URL query string via `updateParams` (wrapped in `flushSync`).
- On mount, `initialValues` is merged with existing query params for fields that exist in
  `fields`, are not `hidden`/`disabled`/`readOnly`, and have a non-empty value.
- On reset, `removeAllParams()` is called (also wrapped in `flushSync`) before your
  `onReset` runs.
- Values are normalized through the query-param layer's own coercion
  (`convertedValue` in `use-query-params.ts`): numeric-looking strings that are safe
  integers become numbers, `"true"/"false"` become booleans, empty/`"undefined"`/`"null"`
  strings collapse to `undefined`. Keep this in mind if a field's value shape is sensitive
  (e.g. leading-zero codes) — don't rely on autoSync for those without extra normalization.

---

## 9. Layout system

```ts
layout?: {
  span?: 1 | 2 | 3 | 4;   // 1 = 25% width (desktop), up to 4 = 100%
  offset?: 0 | 1 | 2 | 3; // left margin, in the same 1-4 unit scale
  endPoint?: true;        // forces a new row after this field
};
```

- Fields are grouped into rows by `groupFields` — a new row starts right after any field
  with `layout.endPoint: true`.
- Responsive breakpoints: `xs` always full width; `md` full width once `span >= 2`,
  otherwise half; `lg` uses the literal `span * 6` out of 24 grid columns.
- `withBorder` (used internally e.g. by `CollapseField` in read-only mode) draws a
  vertical divider between columns that don't fill out their row.

---

## 10. Read-only mode

Setting `readOnly` (on the form, or per-field) triggers:
- `layout="horizontal"` instead of `"vertical"` for that `Form.Item`.
- Empty string/nullish/empty-array `initialValues` become `"-"` (form-level, via
  `initializedWithDashIfEmpty`), recursively for nested arrays/objects.
- Native `input` fields get a tooltip + ellipsis treatment if the read-only value is long
  relative to its `layout.span`.
- Business elements must implement their own read-only rendering (there is no generic
  wrapper) — the common convention is:
  ```tsx
  return options?.readOnly && !value ? "-" : <ActualInput ... />;
  ```

---

## 11. Table-as-business-element pattern

When a business element is actually a table used inside a form (e.g. a proof/receive
list), follow the established convention:
- Extract it into its own component named for the domain (`SanctionApproveTable`,
  `ReceiveAmountTable`, ...), still typed as
  `React.FC<BusinessElementFieldsProps<ExtraProps>>`.
- Config always flows through `options.extraProps` — same as any other business element.
- If rows need full objects on submit (not just keys), track two separate states:
  `selectedRowKeys` and `selectedRows` — don't try to derive one from the other inline.
- Confirmation for row actions (enable/disable, delete, etc.) uses
  `ActionConfirmMessage` with an `identifiers` array — never a bare `<Typography>` for
  a confirm dialog's body.
- Enable/disable-style toggles get two distinct row actions
  (`enableX` / `disableX`), each with its own `permissionField` — not a single combined
  toggle action.

---

## 12. Nested/dynamic fields

- `CollapseField` (`type: "business"`, `element: FormGenerator.CollapseField`) takes
  `options.extraProps.fields: FormField<SubFields>[]` and renders them via the same
  `FormFieldsRow` recursively. `FormBuilder.fieldsList` flattens these nested fields so
  `initialValues`/`autoSyncWithQueryParams` still see them.
  - ⚠️ Fields nested inside `CollapseField` may not reliably receive form context for
    validation — validate those at the parent form level instead of relying on the
    nested `Form.Item`'s own rules.
- `NestedDynamicField` / `DynamicListField` — consumer passes only declarative
  `extraProps` config (e.g. `fields`, `addButtonLabel`); all add/remove/render logic
  lives inside the component. Don't reimplement `Form.List` add/remove logic at the call
  site.

---

## 13. Validators — conventions

- Validator signature is always `(rule, value)` — **never** a third `{ values }`
  parameter. If you need another field's value inside a validator, call
  `form.getFieldValue(...)` (or the enclosing `getFieldValue` from `useControlledForm`)
  inside the validator body instead of expecting it to be injected.
- Don't rely on antd's built-in `pattern` rule in this codebase — it has proven
  unreliable here; write a `validator` function instead, even for pure-regex checks.
- Standalone validators exported by business elements follow this shape:
  ```ts
  export const xValidationRules = (errorMsg?: string): RuleObject[] => {
    const messages = getFormatMessage();
    return [{
      validator: (_: any, value: string) => {
        if (!value) return Promise.resolve();
        if (/* invalid */) return Promise.reject(errorMsg ?? messages("module.invalidX"));
        return Promise.resolve();
      },
    }];
  };
  ```

---

## 14. General TypeScript/JS conventions applying to all of the above

- `type` only — never `interface` (only acceptable exception: extremely rare cases where
  TS genuinely requires it, e.g. declaration merging).
- `??` over `||` for nullish fallbacks; parenthesize when combined with a ternary:
  `a ?? (b ? fn() : undefined)`.
- No custom hooks for one-off inline logic — prefer direct inline logic inside the
  component unless there's a clear, reusable need.
- Comments: single-line, minimal, functional — no verbose/redundant explanations.
- Commit messages: English, conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`).

---

## 15. Quick checklist — adding a new business element

- [ ] File under `business-elements/<kebab-name>/<kebab-name>.tsx`
- [ ] `type ExtraProps = { ... }` (no `interface`)
- [ ] `React.FC<BusinessElementFieldsProps<ExtraProps>>`
- [ ] `.displayName` set
- [ ] Reads config only from `options.extraProps`
- [ ] Handles `options.readOnly` / `options.disabled` / `options.hidden` itself
- [ ] All strings via `getFormatMessage()` — nothing hardcoded
- [ ] No direct `antd` import (only `@brdp/ui` primitives, or `import { App } from "antd"`
      if `App.useApp()` is genuinely needed)
- [ ] Monetary values kept as `string`; Jalali dates via `ISOToJalaaliDate*`/`jalaaliToISO`
- [ ] Registered in `form.tsx`: added to `BusinessElementsRepositoryTypes` + imported +
      `FormGenerator.X = X`
- [ ] If it's a table business element: `extraProps` pattern, separate
      `selectedRowKeys`/`selectedRows` state if full objects are needed,
      `ActionConfirmMessage` for destructive row actions
- [ ] Export any validator rules as a separate named function, `(rule, value)` signature
      only
