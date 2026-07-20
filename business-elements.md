# @brdp/ui/form — Business Elements Catalog

> Companion to `brdp-form-system.md`. That file documents the *system* (how business
> elements plug into `FormGenerator`); this file catalogs the **actual existing business
> elements** so an LLM can reuse/extend them correctly instead of re-inventing them.
>
> Important distinction: the "never import antd directly" rule applies to **feature/app
> code** that consumes `@brdp/ui`. The business elements documented below live *inside*
> `@brdp/ui/form/business-elements/**` — they are the implementation layer that wraps
> antd. Direct `antd` imports (`Input`, `Select`, `Transfer`, `List`, `Checkbox`, `Space`,
> `Flex`, `Form`, `Button`) are expected and correct **only** at this layer, never in a
> page/module/modal.

Each entry lists: file location, purpose, `ExtraProps` type, the shape of `value`,
gotchas, and a ready-to-use field config.

---

## Shared conventions across all elements below

- CSS is authored as CSS Modules: `./x.module.css` + a generated `./x.module.css.d.ts`
  (auto-generated — never hand-edit the `.d.ts`). Import as `import styles from
  "./x.module.css"` and reference via `styles.xxx` or `styles["kebab-key"]`.
- Component-local message dictionaries use `defineMessages({...}) ` from `@brdp/utils`
  (see `transfer-messages.ts`) when a business element owns a nontrivial set of its own
  strings. Shared/generic strings still go through the flat-key form
  `messages("brdpManagement.xxx")` from `getFormatMessage()`. Both are valid; use
  `defineMessages` when the element has ≥2-3 element-specific strings worth grouping in
  their own file, otherwise inline flat keys are fine.
- All still: `type` only, `.displayName` required, config lives under
  `options.extraProps`, `options.readOnly`/`options.disabled`/`options.hidden` handled by
  the element itself.

---

## 1. `TransferField`

**Files:** `transfer-field.tsx`, `transfer-body-renderer.tsx`, `transfer-list-item.tsx`,
`transfer-messages.ts`, `sortable-context.tsx` (shared), `transfer.module.css`

**Purpose:** dual-list transfer control (available ↔ selected), optionally draggable to
reorder the selected side, optionally checkbox-selectable.

```ts
export type RecordType = { key: string; title: string };

export enum TransferType {
  ClickDrag = "ClickDrag",
  CheckDrag = "CheckDrag",
  Click = "Click",
  Check = "Check",
}

export type TransferFieldExtraProps = {
  data: RecordType[];          // the full source dataset
  variant: TransferType;
  showSearch: boolean;
  dragIcon: ReactNode;
  isRequired: boolean;
  validateOnSubmit?: boolean;
};
```

- **`value`** shape: `RecordType[]` — the selected items (not just keys).
- **Variant semantics** (from the `variant` name):
  - Contains `"Click"` → clicking an item moves it (one-way move via click).
  - Contains `"Check"` → checkbox-based selection + the built-in transfer arrows.
  - Contains `"Drag"` → the **target** (left) list becomes drag-sortable via `@dnd-kit`.
- Error state: when `isRequired && validateOnSubmit && targetKeys.length === 0`, the
  underlying `AntTransfer` gets `status="error"` — this is a **visual** cue only; pair it
  with a real `validation.rules` entry if you need actual form-level blocking.
- Search filtering is custom (`item.title.trim().includes(searchValue.trim())`), not
  wired to `showSearch` state in the current file — `searchValues` is local `useState`
  without a setter update path shown; treat `showSearch` as controlling the built-in antd
  search box only, and don't assume the custom filteredItems search is currently active
  end-to-end without wiring a setter.
- Internal helper components (`TransferBodyRenderer`, `TransferListItem`, `DragHandle`,
  `SortableListItem` from `sortable-context.tsx`) are **not** separate business elements
  — don't register or use them directly in a field config.
- ⚠️ There are **two different `SortableListItem` implementations** in this codebase:
  - `sortable-context.tsx`'s `SortableListItem` — minimal, context-based drag handle,
    used only by `TransferField`'s drag variant.
  - `sortable-list-item.tsx`'s `SortableListItem` — richer (expand icon, disabled/dragging
    classes), used only by `SortableField` (§3).
  They are **not interchangeable** — pick the one that matches the component you're
  extending.

**Usage:**
```tsx
{
  name: "selectedBranches",
  type: "business",
  label: messages("module.selectedBranches"),
  element: FormGenerator.TransferField,
  options: {
    extraProps: {
      data: branchOptions, // RecordType[]
      variant: TransferType.CheckDrag,
      showSearch: true,
      dragIcon: <IconsList.DragIcon />,
      isRequired: true,
      validateOnSubmit: submitted,
    },
  },
}
```

---

## 2. `TagField`

**File:** `tag-field.tsx`, `tag-field.module.css`

**Purpose:** read-only-style status/label tag, driven by a `parser` function that maps
the raw field `value` to a color/icon/label.

```ts
type ParserResult = { color: TagColorType; icon?: React.ReactNode; label?: React.ReactNode };
type TagExtraProps = { parser?: (value: unknown) => ParserResult };
```

- If `parser` is omitted, defaults to `{ color: "default" }` and renders `value` as-is.
- Built-in label fallback when `parser` returns no `label`: `"success"` →
  `messages("brdpManagement.has")`, `"error"` → `messages("brdpManagement.doesNotHave")`,
  otherwise the raw `value`.
- Built-in icon fallback when `parser` returns no `icon`: `"success"` → `TickSimpleIcon`,
  `"error"` → `CrossIcon`.
- Special case: `options?.readOnly && value === "-"` renders a plain `<strong>-</strong>`
  instead of a tag — this is the standard "empty in read-only" convention for this
  element specifically (compare with the generic `"-"` string convention in §10 of the
  system doc).

**Usage:**
```tsx
{
  name: "statusCode",
  type: "business",
  label: messages("module.status"),
  element: FormGenerator.TagField,
  readOnly: true,
  options: {
    extraProps: {
      parser: (value) => {
        if (value === "APPROVED") return { color: "success", label: messages("module.approved") };
        if (value === "REJECTED") return { color: "error", label: messages("module.rejected") };
        return { color: "default" };
      },
    },
  },
}
```

---

## 3. `SortableField`

**Files:** `sortable-field.tsx`, `sortable-list-item.tsx`, `sortable-utils.ts`,
`sortable-field.module.css`

**Purpose:** plain drag-to-reorder list (no transfer, no selection) — for when you just
need to let the user reorder an array field.

```ts
export type SortableFieldProps = {
  loading?: boolean;
  renderItemKey?: string; // key of each value-item to render as the list-item label
};
```

- **`value`** must be `Array<Record<string, unknown>>`. On mount, each item is tagged
  with a stable internal `_sortableKey` (via `generateUuidV4()`) if it doesn't already
  have one — this key is stripped again before calling `onChange` (consumer never sees
  `_sortableKey`).
- If `value` isn't an array, or `renderItemKey` is missing, it logs a **console error**
  via `logValueError` / `logRenderItemKeyError` from `sortable-utils.ts` (dev-time
  guard, not a thrown exception) — always pass both correctly.
- Individual items can carry their own `disabled: true` to lock that row's drag handle
  even when the field overall isn't disabled.
- Respects `options.disabled` and `options.readOnly` by disabling the whole
  `SortableContext`.

**Usage:**
```tsx
{
  name: "priorityList",
  type: "business",
  label: messages("module.priorityList"),
  element: FormGenerator.SortableField,
  options: {
    extraProps: { renderItemKey: "label", loading: isFetchingList },
  },
}
```

---

## 4. `ShahabCodeField`

**File:** `shahab-code-field.tsx`

**Purpose:** 16-digit "شاهاب" code input — digits-only, fixed length, rejects all-zero.

```ts
type ShahabCodeExtraProps = {}; // no extra config currently
export const shahabCodeValidationRules = (): RuleObject[] => [...];
```

- Input itself only guards against non-numeric keystrokes (reverts to previous value on
  a non-digit); it does **not** enforce length — always pair with
  `shahabCodeValidationRules()` in `validation.rules` for real enforcement.
- `maxLength={16}` is a hard input-level cap.

**Usage:**
```tsx
{
  name: "shahabCode",
  type: "business",
  label: messages("module.shahabCode"),
  element: FormGenerator.ShahabCodeField,
  validation: { rules: shahabCodeValidationRules() },
}
```

---

## 5. `PostalCodeField`

**File:** `postal-code-field.tsx`

**Purpose:** 10-digit Iranian postal code input with format validation.

```ts
type PostalCodeExtraProps = {}; // no extra config currently
export const postalCodeValidationRules = (errorMsg?: string): RuleObject[] => [...];
const POSTAL_CODE_PATTERN = /^(?!(\d)\1{3})[13-9]{4}[1346-9][0-9]{5}$/;
```

- Rejects a leading `"0"` at input time (first typed char can't be `0`), rejects >10
  digits by reverting to the previous value.
- Validator (separate from the input's live sanitation) additionally checks exact length
  10 and the full postal-code regex (blocks 4+ repeated leading digits, invalid digit
  positions per the Iran Post spec).
- `dir="ltr"` is hardcoded on the input (numeric codes always LTR regardless of RTL
  form context) — follow this for any other purely-numeric-code business element.

**Usage:**
```tsx
{
  name: "postalCode",
  label: messages("module.postalCode"),
  type: "business",
  element: FormGenerator.PostalCodeField,
  validation: { rules: postalCodeValidationRules() },
}
```

---

## 6. `NestedDynamicField`

**Files:** `nested-dynamic-field.tsx`, `nested-dynamic-field.module.css`

**Purpose:** repeatable group of sub-fields (add/remove rows), each row rendering a full
mini `FormFieldsRow`. This is the "array of objects" dynamic list — distinct from
`DynamicListField` (documented in the system doc) and from `SortableField` (no drag here,
just add/remove).

```ts
type NestedDynamicFieldProps = {
  addButtonLabel?: string;
  fields?: FormField<FormFields>[]; // the per-row field configs
};
```

- Built on native antd `Form.List` internally (`name={name}` = the array field's own
  name) — each row's fields are remapped so their `name` becomes `[field.name, opt.name]`
  (antd's nested-path convention), and their `label` defaults to `null` if not explicitly
  set (rows commonly render compact/unlabeled inputs).
- Add button label is composed as
  `` `${messages("brdpManagement.actionAddition")} ${dynamicFieldProps?.addButtonLabel}` ``
  — always pass a meaningful, already-translated `addButtonLabel` (it's concatenated
  raw, not passed through `messages()` itself).
- Remove button per row uses `MinusCircleOutlined` (error-red); Add button uses
  `PlusCircleOutlined`. Both hidden entirely when `options.readOnly === true` (no
  disabled-but-visible state for this element — read-only removes the controls, it
  doesn't just disable them).
- ⚠️ As noted in the system doc §12, fields inside dynamic/nested structures like this
  may not reliably receive form-level validation context — validate composite rules for
  these rows at the parent form level rather than trusting nested `Form.Item` rules
  alone.

**Usage:**
```tsx
{
  name: "signatories",
  type: "business",
  label: messages("module.signatories"),
  element: FormGenerator.NestedDynamicField,
  options: {
    extraProps: {
      addButtonLabel: messages("module.signatory"),
      fields: [
        { name: "fullName", type: "input", label: messages("module.fullName") },
        { name: "nationalId", type: "input", label: messages("module.nationalId") },
      ],
    },
  },
}
```

---

## 7. `InputWithSelectField`

**File:** `input-with-select-field.tsx`

**Purpose:** a text input with a `Select` as its `addonAfter` — e.g. "amount" + "currency"
in one visual control, where the select is actually a **separate, sibling form field**
rendered inline via a nested `Form.Item name={...} noStyle`.

```ts
type InputWithSelectFieldProps = {
  select: {
    name: string;              // the sibling field's own form field name
    placeholder?: string;
    data: { label: string; value: number | string | boolean }[];
    loading?: boolean;
  };
};
```

- The main business field's `value`/`onChange` control the **input** only; the select's
  value lives under its own independent field name (`options.extraProps.select.name`) —
  meaning this business element actually contributes **two** entries to the submitted
  form values: the field's own `name`, and `extraProps.select.name`.
- If `select.data` has exactly one option, it's rendered as static text (no dropdown) —
  don't rely on the dropdown being interactive below 2 options.
- Dev-time console errors fire (not thrown) if `select.name` is missing or `select.data`
  is empty — always provide both.

**Usage:**
```tsx
{
  name: "amount",
  type: "business",
  label: messages("module.amount"),
  element: FormGenerator.InputWithSelectField,
  options: {
    extraProps: {
      select: {
        name: "currency",              // sibling field, appears in form values as `currency`
        data: [{ label: "IRR", value: "IRR" }, { label: "USD", value: "USD" }],
        placeholder: messages("module.currency"),
      },
    },
  },
}
```

---

## 8. `InputWithButtonField`

**Files:** `input-with-button-field.tsx`, `input-with-button-field.module.css`

**Purpose:** an input paired with either an icon-button suffix or a full text button
(e.g. "search this value externally", "generate", "clear + verify" combos).

```ts
type BaseButtonProps = { onClick?: (value: unknown) => void; isLoading?: boolean };

type InputWithButtonFieldExtraProps = {
  input: {
    valueKey?: string;         // dot/bracket path into `value` to *display*, via findByStringAddress
    clearable?: boolean;
    onClick?: (value: unknown) => void;
    preventTyping?: boolean;   // input becomes effectively readOnly for typing, but still clickable
  };
  button:
    | (BaseButtonProps & { type: "icon"; icon: React.ReactNode; tooltip?: string })
    | (BaseButtonProps & { type: "text"; text: string });
};
```

- Two mutually exclusive button shapes: `type: "icon"` (compact suffix icon button,
  supports a built-in "clear" toggle state) or `type: "text"` (full primary button after
  the input, `Space.Compact` layout).
- `input.preventTyping` + `input.clearable` + an icon button together enables a built-in
  **clear** affordance: when there's a value and clearing is allowed, the suffix icon
  swaps to a cross-circle icon and its click calls `onChange?.(undefined)` instead of the
  button's own `onClick`.
- `input.valueKey` lets the *displayed* value be a nested path extracted from a richer
  `value` object (via `findByStringAddress`) while the actual field `value` stays the
  full object — this only kicks in when `preventTyping || readOnly || disabled` is true.
- Button `onClick` receives the **current form value of this field**
  (`form.getFieldValue(props.name)`), not the raw input event.
- This is the correct pattern for the "`antd` Button vs `@brdp/ui` Button" convention
  noted for `CustomerSearch`-style inputs: an inline `antd` `Button` with `type="text"`
  inside an `Input` suffix, to avoid height inflation from `@brdp/ui`'s `Button`.

**Usage — icon variant (e.g. lookup + clear):**
```tsx
{
  name: "nationalCode",
  type: "business",
  label: messages("module.nationalCode"),
  element: FormGenerator.InputWithButtonField,
  options: {
    extraProps: {
      input: { clearable: true, preventTyping: false },
      button: {
        type: "icon",
        icon: <IconsList.SearchIcon />,
        tooltip: messages("module.lookup"),
        onClick: (value) => handleLookup(value),
      },
    },
  },
}
```

**Usage — text-button variant (e.g. generate value):**
```tsx
{
  name: "generatedCode",
  type: "business",
  label: messages("module.generatedCode"),
  element: FormGenerator.InputWithButtonField,
  options: {
    extraProps: {
      input: { preventTyping: true },
      button: { type: "text", text: messages("module.generate"), onClick: handleGenerate },
    },
  },
}
```

---

## 9. `IbanField` (current implementation — supersedes the simplified version)

**File:** `iban-field.tsx`

**Purpose:** Iranian IBAN/Sheba input with live dash-grouped formatting, caret-position
preservation while typing/deleting, and ISO 7064 mod-97 checksum validation.

```ts
export const ibanNumberValidationRules = (): RuleObject[] => [...];
const IbanField: React.FC<BusinessElementFieldsProps<{ addIR?: boolean }>>;
```

> ⚠️ Note: this is a materially different (more advanced) implementation than the
> `IbanField` shown in the earlier system-doc example — that earlier version used a
> simple space-grouped `formatIban` and defaulted `addIR` to `true`. **This file is the
> current source of truth.** Key differences to use going forward:

- **Formatting:** dash-grouped in chunks of `2-4-4-4-4-6` digits (not space-grouped every
  4 digits like the generic `AmountField`/`CardNumberField`/older `IbanField` pattern).
- **`addIR` default is `false`** here (`=== true` check) — the "IR" prefix is only
  prepended to the value when explicitly opted in via `options.extraProps.addIR: true`.
  Don't assume "IR" gets added unless you set this.
- Implements custom `onKeyDown` handling for `Backspace`/`Delete` so the caret lands on
  the correct **digit**, not the correct raw character position, accounting for the
  dashes — if you fork this element, keep the `caretFromDigitIndex` /
  `countDashesBefore` helpers together; they're tightly coupled to the fixed dash
  positions `[2, 6, 10, 14, 18]`.
- Validation logic differs subtly from the generic mod-97 helper elsewhere: it expects
  a 26-char `IR` + 24-digit string, converts the two letters of `"IR"` to their
  numeric equivalents (`d1`, `d2` via `charCodeAt(0) - 65 + 10`) and rearranges per the
  standard IBAN check algorithm before running mod-97 — don't validate raw 24-digit
  input directly against `ibanISO7064Mod97Validator` without this letter-to-number
  rearrangement step, or the check will be wrong.
- Read-only "empty" convention here is `isReadOnly && value === "-"` (matches
  `TagField`'s convention), not `!value` — be consistent with whichever your caller
  passes as the read-only placeholder.

**Usage:**
```tsx
{
  name: "shebaNumber",
  type: "business",
  label: messages("module.shebaNumber"),
  element: FormGenerator.IBANField,
  options: { extraProps: { addIR: true } },
  validation: { rules: ibanNumberValidationRules() },
}
```

---

## 10. `FileUploaderField`

**Files:** `file-uploader-field.tsx`, `file-uploader.type.ts`, `file-uploader.utils.ts`,
`file-uploader.module.css`

**Purpose:** simple single-file drag-and-drop uploader — raw file only, no parsing.

```ts
export type Extensions = keyof typeof mimeTypes; // imported FROM file-parser.utils.ts
export type UploadFile = RcFile | File;
export type ExtraProps = {
  accept: Extensions[];
  disabled?: boolean;
};
```

- **`value`** shape: the raw `UploadFile` (`RcFile | File`) — never parsed.
- ⚠️ **Coupling to `FileParserField`:** this element's own `mimeTypes`/`Extensions` are
  re-exported from `../file-parser-field/file-parser.utils` — `FileUploaderField` cannot
  be used/copied independently of the `file-parser-field` folder existing alongside it.
  If you ever split these into separate packages, move `mimeTypes` to a shared location
  first.
- Validation is a **hard throw**, not a `RuleObject[]` export like most other elements
  here — `checkPropsExist`/`checkIsValidFile` in `file-uploader.utils.ts` throw plain
  `Error`s with hardcoded Persian strings. This is inconsistent with the rest of the form
  system's i18n convention (`getFormatMessage()`); if extending this element, prefer
  routing new error strings through `messages()` instead of copying the hardcoded-string
  pattern.
- `beforeUpload` always returns `false` — no automatic network upload; the raw file is
  just handed to `onChange`. Errors caught in `beforeUpload` show a `message.error(...)`
  toast (`App.useApp()`) and reset the internal `fileList` state.
- `onDrop` re-validates the dropped file for early user feedback, but does **not** call
  `onChange` itself — actual state changes only happen through `beforeUpload`.
- Single file only: `multiple={false}`, `maxCount={1}`, `showUploadList={false}` (own
  custom UI replaces antd's file list).
- CSS class composition is manual string-array `.join(" ")`, not `clsx` — follow that
  local pattern if touching this file, but prefer `clsx` for any *new* element.

**Usage:**
```tsx
{
  name: "attachmentFile",
  type: "business",
  label: messages("module.attachmentFile"),
  element: FormGenerator.FileUploaderField,
  options: {
    extraProps: { accept: [".pdf", ".jpg", ".png"] },
  },
}
```

---

## 11. `FileParserField`

**Files:** `file-parser-field.tsx`, `file-parser.type.ts`, `file-parser.utils.ts`,
`file-parser.module.css`

**Purpose:** single-file uploader that additionally **parses** the file content before
handing it to the form (JSON object, or raw byte array + filename/extension metadata).
This is the canonical source for `mimeTypes` — `FileUploaderField` depends on it (§10).

```ts
export type Extensions = keyof typeof mimeTypes;
export type UploadFile = RcFile | File;
export type ExtraProps = {
  accept: Extensions[];
  disabled?: boolean;
  parser?: "json" | "byteArray";
  sizeLimit?: number;
  sizeLimitValidationMessage?: string;
};
```

- **`value`** shape depends on `parser`:
  - `parser` omitted → raw `UploadFile` (same as `FileUploaderField`).
  - `parser: "json"` → the parsed JSON **object** (rejects empty object / empty file /
    invalid JSON).
  - `parser: "byteArray"` → `{ file: Uint8Array; fileName: string; fileExtension: string }`
    (filename/extension split from the original file name).
- Unlike `FileUploaderField`, all thrown validation errors here go through
  `messages("brdpManagement.xxxValidation")` — this is the version to imitate for any
  new file-handling element, not `file-uploader.utils.ts`'s hardcoded strings.
- `checkSizeLimit` takes an **object** arg `{ file, sizeLimit, sizeLimitValidationMessage }`
  (not positional args like `checkIsValidFile`) — don't mix up the call signatures if
  reusing these utils.
- `mimeTypes` includes a few entries with **falsy MIME values** (`.cap: ""`) and a
  `.dll` entry present here (absent from the uploader's copy) — the MIME-match check
  in `checkIsValidFile` here is `fileMimeType && fileMimeType !== mimeTypes[matchedExtension]`
  (guards against comparing against an empty expected MIME), whereas the uploader's
  version does a strict `!==` with no such guard. If you add extensions with empty/absent
  browser MIME types, make sure whichever validator you use handles that guard.
- The displayed file name is wrapped in Unicode LTR embedding marks
  (`` `\u202A${fileList.name}\u202C` ``) to keep Latin filenames left-to-right inside the
  RTL layout — `FileUploaderField` does **not** do this (plain `{fileList.name}`); prefer
  the parser field's approach for any new file-name display.
- Same drag/drop/error/reset UX pattern as `FileUploaderField` otherwise (single file,
  custom UI, `beforeUpload` always returns `false`).

**Usage — JSON import:**
```tsx
{
  name: "importedConfig",
  type: "business",
  label: messages("module.importConfig"),
  element: FormGenerator.FileParserField,
  options: {
    extraProps: { accept: [".json"], parser: "json", sizeLimit: 2 * 1024 * 1024 },
  },
}
```

**Usage — raw byte array (e.g. certificate upload):**
```tsx
{
  name: "certificateFile",
  type: "business",
  label: messages("module.certificateFile"),
  element: FormGenerator.FileParserField,
  options: {
    extraProps: { accept: [".cer"], parser: "byteArray" },
  },
}
```

---

## 12. `DynamicListField`

**Files:** `dynamic-list-field.tsx`, `dynamic-list-field.module.css`

**Purpose:** modal-driven add/edit/delete list of rich items, rendered as a
`DetailsCard` (from `@brdp/ui`) once non-empty, or an empty-state box with an "add" call
to action. **Not to be confused with `NestedDynamicField`** (§6 in this catalog) — see
comparison table below.

```ts
type ListItem = { id: string; [key: string]: unknown };
type DetailField = { key: string; label: string; span?: number; children: ReactNode };

type DynamicListFieldExtraProps = {
  addButtonLabel?: string;
  emptyBoxLabel?: string;
  formTitle?: string;
  editFormTitle?: string;
  modalSize?: "wide" | "default" | "small"; // default "small"
  ModalForm?: React.ComponentType<{
    initialValues?: Record<string, unknown>;
    onSubmit: (data: Record<string, unknown>) => void;
    onCancel: () => void;
  }>;               // REQUIRED — component renders null + console.error if missing
  componentProps?: Record<string, unknown>;
  detailCardFields?: DetailField[];
  detailCardTitle?: string;
  detailCardColumn?: number;   // default 2
  displayOptions?: { showHeader?: boolean; showActions?: boolean };
};
```

- **`value`** shape: `Array<Record<string, unknown>>`, each item eventually carrying an
  internal `id` (`dynamic-list-item-<uuid>`) — pre-existing ids matching that prefix are
  preserved on mount, everything else gets a freshly generated one.
- `ModalForm` is **your own component**, supplied per usage — this business element is a
  generic shell (state + modal orchestration + card rendering); it does not know your
  domain form fields. `ModalForm` receives `initialValues` (undefined for add, the item
  for edit), and must call `onSubmit(data)` / `onCancel()` itself.
- The non-empty state renders via `DetailsCard` from `@brdp/ui` — see §24 for the full,
  standalone documentation of that component (it isn't form-specific and can be used
  entirely outside a form too).
- Modal is opened via `App.useApp().modal.info({...})` with `footer: null` — your
  `ModalForm` is fully responsible for its own submit/cancel buttons; this is **not**
  the same modal pattern as `showAppModal` used elsewhere in feature code — it's a
  self-contained `antd` `modal.info` call local to this business element.
- Row actions are fixed to exactly `edit` + `delete` (via `DetailsCard`'s `itemActions`)
  — there's no config surface to add a third row action; if you need more actions, this
  element isn't the right fit as-is.
- `detailCardColumn` and `detailCardFields` drive how each item's data renders inside
  `DetailsCard` — `children: ReactNode` per field means the caller pre-renders each
  field's display value (this element does not know how to format your item shape).

**`NestedDynamicField` vs `DynamicListField`:**

| | `NestedDynamicField` | `DynamicListField` |
|---|---|---|
| Editing UI | Inline rows, full `FormFieldsRow` per row | Modal per add/edit, arbitrary `ModalForm` |
| Add/remove | Native `Form.List` add/remove | Local `useState` array + generated ids |
| Row shape | Same `FormField<T>[]` config for every row | Fully custom component per row's edit UI |
| Read-only look | Inline `FormFieldsRow` with `readOnly` | `DetailsCard` in `readOnly` display mode |
| Best for | Small/simple repeated field groups (e.g. signatories with 2-3 flat inputs) | Larger/richer item shapes, or reusing an existing standalone form as the row editor |

**Usage:**
```tsx
{
  name: "beneficiaries",
  type: "business",
  label: messages("module.beneficiaries"),
  element: FormGenerator.DynamicListField,
  options: {
    extraProps: {
      addButtonLabel: messages("module.addBeneficiary"),
      formTitle: messages("module.addBeneficiary"),
      editFormTitle: messages("module.editBeneficiary"),
      modalSize: "default",
      ModalForm: BeneficiaryModalForm, // your own component
      detailCardTitle: messages("module.beneficiariesList"),
      detailCardColumn: 2,
      detailCardFields: [
        { key: "fullName", label: messages("module.fullName"), children: null },
      ],
    },
  },
}
```

---

## 13. `DatePickerField`

**File:** `date-picker-field.tsx`

**Purpose:** single Jalali (Persian) date picker, with cross-field `minDate`/`maxDate`
support by referencing **another field's name**, plus live keyboard-input parsing.

```ts
export type DatePickerFieldExtraProps = {
  /** @default "YYYY/MM/DD" */
  displayFormat?: string;
  minDate?: string | Dayjs; // a Dayjs (Gregorian), OR another field's `name` to watch
  maxDate?: string | Dayjs; // same
};
```

- **`value`** stored as either a `Dayjs` or a jalali-formatted string (via
  `options.returnFormat: { type: "string", template }` — same `returnFormat` mechanism
  used by other business elements). If `returnFormat` isn't set, `onChange` receives the
  raw `Dayjs`.
- `minDate`/`maxDate` are **overloaded**: pass a literal `Dayjs` for a fixed Gregorian
  bound, or a **string that is another field's name** to dynamically bind to that
  field's live value via `Form.useWatch([fieldName], form)`. The component auto-detects
  which case applies (parses as jalali if the watched value looks like a jalali string).
- Enforces the bound automatically: if the current value falls outside a newly-changed
  `minDate`/`maxDate`, the component **silently corrects the value** to the boundary
  (`onChangeMinDateWatcherValue`/`onChangeMaxDateWatcherValue` effects) — don't expect
  the previously-selected value to survive a min/max change past it.
- Also parses **raw keyboard typing** into the underlying native `<input>` (via a
  `useEffectEvent` wired to the picker's DOM node) and commits the date once the typed
  string reaches the exact length of `displayFormat` — this exists to support fully
  typing a Jalali date without opening the calendar popup. If you fork this element,
  keep the `input`/`keyup` listener pair together (the `keyup` listener is a fallback
  for browsers/cases where the `input` event doesn't fire cleanly).
- Overrides the picker's built-in Persian "باشه" (OK) label with
  `messages("brdpManagement.confirm")` via `locale.lang.ok` — follow this pattern for
  any other `antd` `DatePicker`/`TimePicker` locale override in this codebase.

**Usage — simple:**
```tsx
{
  name: "startDate",
  type: "business",
  label: messages("module.startDate"),
  element: FormGenerator.DatePickerField,
  options: { returnFormat: { type: "string", template: "YYYY-MM-DD" } },
}
```

**Usage — cross-field bound (start ≤ end):**
```tsx
{
  name: "startDate",
  type: "business",
  label: messages("module.startDate"),
  element: FormGenerator.DatePickerField,
  options: { extraProps: { maxDate: "endDate" } },
},
{
  name: "endDate",
  type: "business",
  label: messages("module.endDate"),
  element: FormGenerator.DatePickerField,
  options: { extraProps: { minDate: "startDate" } },
}
```

---

## 14. `DateTimePickerField`

**File:** `date-time-picker-field.tsx`

**Purpose:** date + time picker rendered side-by-side (`Flex`, 50/50 width), sharing one
underlying `Dayjs` value — for when a single field needs both a date and a time-of-day.

```ts
type DateTimePickerExtraProps = {
  setTimeToNow?: boolean;      // if selected date is today, carries the current time forward instead of resetting to 00:00:00
  setTimeToEnd?: boolean;      // new date selections default to end-of-day instead of start-of-day
  needDateConfirm?: boolean;
  needTimeConfirm?: boolean;
  displayFormat?: "YYYY-MM-DD" | "YYYY/MM/DD"; // default "YYYY/MM/DD"
  minDate?: string | Dayjs;    // same cross-field-name mechanism as DatePickerField
  maxDate?: string | Dayjs;
  datePlaceholder?: string;
  timePlaceholder?: string;
};
```

- **`value`** is one combined `Dayjs` covering both date and time — there are no
  separate date/time values; changing either picker recomputes the same underlying
  value (`handleDateChange`/`handleTimeChange` both call the same `handleOnChange`).
- Precedence when a new date is picked: `setTimeToNow` (only if the picked date is
  today) → `setTimeToEnd` → default `startOf("day")`. Only one of `setTimeToNow` /
  `setTimeToEnd` makes sense at a time; don't set both expecting a defined blended
  behavior.
- Clearing the **time** picker does not clear the whole value — it resets the time
  portion to `00:00:00` while keeping the date (`handleTimeChange`'s null branch).
  Clearing the **date** picker clears the whole value to `null`.
- Same keyboard-typed-date parsing behavior as `DatePickerField` (own copy of the
  `input`/`keyup` listener logic) — kept as a near-duplicate implementation rather than
  shared; if you fix a bug in one, check whether the same fix is needed in the other.
- Same `minDate`/`maxDate` cross-field-name watching and silent-correction behavior as
  `DatePickerField`.

**Usage:**
```tsx
{
  name: "effectiveFrom",
  type: "business",
  label: messages("module.effectiveFrom"),
  element: FormGenerator.DateTimePickerField,
  options: {
    extraProps: {
      setTimeToNow: true,
      needTimeConfirm: true,
      displayFormat: "YYYY/MM/DD",
    },
  },
}
```

---

## 15. `TimePickerField`

**File:** `time-picker-field.tsx`

**Purpose:** standalone time-of-day picker (no date component at all).

```ts
type TimePickerExtraProps = { needTimeConfirm?: boolean }; // default true
```

- **`value`**: if `options.returnFormat: { type: "string", template }` is set, `value`
  is a formatted time string parsed back in via `dayjs(value, template)`; otherwise
  `value` is expected to already be a `Dayjs`.
- Much simpler than `DatePickerField`/`DateTimePickerField` — no cross-field watching, no
  keyboard-typed parsing, just the picker + the same `"باشه"` → `messages("brdpManagement.confirm")`
  locale override.

**Usage:**
```tsx
{
  name: "openingTime",
  type: "business",
  label: messages("module.openingTime"),
  element: FormGenerator.TimePickerField,
  options: {
    returnFormat: { type: "string", template: "HH:mm" },
    extraProps: { needTimeConfirm: true },
  },
}
```

---

## 16. `CopyableField`

**File:** `copyable-field.tsx`

**Purpose:** display-only field with a one-click "copy to clipboard" suffix button.

- No `ExtraProps` (untyped generic `BusinessElementFieldsProps` with no type argument).
- ⚠️ **Always read-only and always disabled**, regardless of what's passed in
  `options.readOnly`/`options.disabled` — the underlying `<Input readOnly disabled={true}>`
  hardcodes both. This element is not conditionally editable; don't expect
  `options.disabled: false` to make it typable.
- `handleCopy` calls `navigator.clipboard.writeText` **without awaiting or catching** —
  there's a `// TODO: fix this!` comment in the source itself acknowledging this is
  missing async error handling. If you fork this element for new usage, add a
  `.then()/.catch()` (or `try/await/catch`) and a success/error toast via
  `App.useApp().message` rather than copying the current fire-and-forget call as-is.
- Suffix button uses the inline `antd` `Button type="text"` pattern (same convention as
  `InputWithButtonField`, §8) to avoid height inflation inside the `Input`.

**Usage:**
```tsx
{
  name: "generatedTrackingCode",
  type: "business",
  label: messages("module.trackingCode"),
  element: FormGenerator.CopyableField,
}
```

---

## 17. `CollapseField` (full implementation — supersedes the brief system-doc mention)

**Files:** `collapse-field.tsx`, `collapse-label.tsx`, `collapse-utils.ts`,
`collapse-field.module.css`, plus a plain (non-module) `./collapse-field.css` import

> The system doc (`brdp-form-system.md` §12) describes `CollapseField` at a high level.
> This is the complete, current behavior.

```ts
export type CollapseFieldExtraProps<SubFieldsTypes = unknown> = {
  /** @default 'groupable' */
  type?: "collapsible" | "groupable";
  appearance?: {
    collapsedLabel?: string;
    /** @default "solid" */
    variant?: "dashed" | "dotted" | "solid";
    /** @default "start" */
    orientation?: "center" | "start";
    /** @default true */
    withRightBorder?: boolean;
    /**
     * @default true
     * When false, nested fields aren't mounted until the panel opens — their values
     * are excluded from onSubmit unless the panel has been expanded at least once.
     */
    forceRender?: boolean;
  };
  fields: FormField<SubFieldsTypes>[];
};
```

- **`value`** is a **boolean** driving the initial expanded/collapsed state (not the
  nested fields' data) — `value === false` starts collapsed, anything else starts
  expanded. Passing a non-boolean `value` triggers a dev-time `console.warn`.
- `type: "groupable"` (default) → `collapsible: "disabled"` (the header itself isn't the
  click target to toggle — it's purely a visual grouping divider); `type:
  "collapsible"` → `collapsible: "header"` (the whole header toggles the panel).
- `appearance.forceRender` (default `true`) is a **correctness-critical** flag: if you
  set it to `false` for a performance reason, be aware that any nested field whose panel
  is never opened by the user will be **excluded from the submitted form values**
  (native antd `Form` behavior — unmounted `Form.Item`s don't register).
- `collapsedLabel` only shows while collapsed; once expanded it falls back to the
  field's own `label`.
- `withRightBorder` only actually draws when combined with `readOnly` — it controls the
  `FormFieldsRow`'s `withBorder` prop, and that prop's border-drawing logic is itself
  gated on `readOnly` in `FormFieldsRow` (see system doc §9) — so
  `withRightBorder: true` in edit mode is a no-op visually.
- Uses a plain CSS import (`import "./collapse-field.css"`) **in addition to** its CSS
  Modules file (`collapse-field.module.css`) — the module file only exports the
  `brdp-collapse-collapsible` class hook; broader collapse styling lives in the
  non-module global-ish CSS file. Don't assume every style for this element is scoped
  through the module.
- Validate nested fields at the parent form level — same caveat as `NestedDynamicField`
  (system doc §12): form-context validation isn't guaranteed to reach fields nested this
  deeply.

**Usage:**
```tsx
{
  name: "hasSecondarySignatory",
  type: "business",
  label: messages("module.secondarySignatory"),
  element: FormGenerator.CollapseField,
  options: {
    extraProps: {
      type: "collapsible",
      appearance: { collapsedLabel: messages("module.addSecondarySignatory"), forceRender: false },
      fields: [
        { name: "secondaryFullName", type: "input", label: messages("module.fullName") },
        { name: "secondaryNationalId", type: "input", label: messages("module.nationalId") },
      ],
    },
  },
}
```

---

## 18. `CardNumberField`

**Files:** `card-number-field.tsx`, `banks-code.tsx`, `verify-card-number.ts`

**Purpose:** 16-digit bank card number input with live bank-logo detection and an
optional inline "search/verify" action button.

```ts
type CardNumberFieldExtraProps = {
  onSearch: (value: string) => void;
  searchLoading?: boolean;
  searchLabel?: string; // defaults to "استعلام" (raw Persian literal, not messages())
};
export const validateCardNumber = (errorMsg?: string) => RuleObject[];
```

- **`value`**: digits-only string, capped at 16 via `extractDigits`; displayed through the
  shared `formatCardNumber` util from `@brdp/utils` (not a locally-defined formatter —
  unlike `IbanField`, this element does **not** roll its own group formatter).
- **Dependency chain:** `card-number-field.tsx` → `banks-code.tsx` (for `BankIcon()`,
  bank name lookup, and the canonical `iranianBankPrefixes` set) → consumed again by
  `verify-card-number.ts`, which **re-exports** `iranianBankPrefixes` from
  `banks-code.tsx` rather than redefining it. `banks-code.tsx` is the **single source of
  truth** for Iranian bank prefixes/icons/names — don't hardcode a second prefix list
  anywhere else; import from here.
- `BankIcon(cardNumber)` renders as the input's `prefix` — matches the first 6 digits
  against `BANKS_LIST` and returns that bank's icon, or `null` if unmatched/not yet
  6 digits typed.
- `verifyCardNumber()` (in `verify-card-number.ts`) does, in order: format check
  (`^\d{16}$`), a "not literally all one repeating middle section" sanity check, an
  Iranian-prefix check against `iranianBankPrefixes`, then the Luhn checksum. It also
  maintains its own `invalidTestCards` set (well-known internationally-published test
  card numbers) purely for documentation/reference — note it is **not currently
  consulted** inside `verifyCardNumber()`'s logic shown here (no `invalidTestCards.has(...)`
  check in the function body) — don't assume test cards are actively rejected by this
  check alone.
- `validateCardNumber()` (in `card-number-field.tsx`, exported separately from
  `verifyCardNumber`) sets `validateTrigger: "onBlur"` explicitly — this validator only
  re-runs on blur, not on every keystroke; keep that in mind if you need live validation
  feedback while typing.
- The optional `onSearch` extra prop turns the field into an `Input` + `Button` pair
  (`Flex` layout) — omit `onSearch` entirely to get a bare input with no action button.
  `searchLabel` default (`"استعلام"`) is a **raw literal string**, not routed through
  `messages()` — if you need this to be translatable, always pass `searchLabel` explicitly
  rather than relying on the built-in default.

**Usage — bare input:**
```tsx
{
  name: "cardNumber",
  type: "business",
  label: messages("module.cardNumber"),
  element: FormGenerator.CardNumberField,
  validation: { rules: validateCardNumber() },
}
```

**Usage — with inline verify action:**
```tsx
{
  name: "cardNumber",
  type: "business",
  label: messages("module.cardNumber"),
  element: FormGenerator.CardNumberField,
  validation: { rules: validateCardNumber() },
  options: {
    extraProps: {
      onSearch: (value) => verifyCardOwner(value),
      searchLoading: isVerifying,
      searchLabel: messages("module.verify"),
    },
  },
}
```

---

## 19. `CalculatorField` (+ `ModalCalculatorField` / `ButtonsCalculatorField`)

**Files:** `calculator-field.tsx`, `modal-calculator-field.tsx`,
`buttons-calculator-field.tsx`, `calculator-field.module.css`

**Purpose:** a read-only-by-default formula input whose value is actually built inside a
modal calculator (on-screen keypad + hotkeys + a "variables" picker), then serialized
back into the outer field as a joined string.

```ts
export type Variable = {
  loading?: boolean;
  data: { value: string | number | boolean; label: string; disabled?: boolean }[];
};
type CalculatorFieldProps = { modalTitle: string; variable: Variable };
```

- ⚠️ **`readOnly` defaults to `true` here** (`const isReadOnly = readOnly ?? true`) —
  this is the **opposite default** from every other element in this catalog (which all
  default to editable). If you want the input to accept direct typing instead of only
  the calculator modal, you must explicitly pass `readOnly: false` at the field level.
- Dev-time console errors (not thrown) fire if `modalTitle` or `variable` extra props are
  missing — both are effectively required despite being typed as required in
  `CalculatorFieldProps` (TS won't catch a missing prop passed through
  `options.extraProps` at the call site as strictly as a normal component prop would).
- **`value`** is a plain joined string (e.g. `"2+sqrt[16]"`), not an AST or token array —
  the tokenization only exists transiently inside the modal's `fieldValueArray` ref.
- Clicking the calculator (icon-button `addonAfter`, hidden entirely when
  `readOnly === true`) opens `ModalCalculatorField` inside `App.useApp().modal.info(...)`
  — same "self-contained `antd` `modal.info`, not `showAppModal`" pattern as
  `DynamicListField` (§12).
- **`ModalCalculatorField`** is itself a mini `useControlledForm` form with:
  - a `FormulaFiled` business element (read-only display of the formula tokens joined —
    defined **inline** inside `modal-calculator-field.tsx`, never registered on
    `FormGenerator`, and passed directly as `element: FormulaFiled` in the field config —
    this is the supported pattern for a **private, unregistered** business element scoped
    to one composite component; see the `FormBusinessField.element` type, which accepts
    any `React.ElementType`, not just entries from `BusinessElementsRepositoryTypes`),
  - a `"variable"` `select` field — picking a variable **appends** it into the formula
    (`fieldWatch("variable")` drives a `useEffect` that pushes the picked value onto
    `formulaValuesRef.current`),
  - a `"divider"` field,
  - a `ButtonsCalculatorField` business element (also unregistered/private) rendering the
    on-screen keypad grid, wired to hotkeys via `useHotkeys` from `../../hooks/use-hotkeys`.
  - Required-formula validation uses `requiredField(messages("brdpManagement.notEmptyField"))`
    from `@brdp/utils` — a ready-made rule-builder for simple "must not be empty" cases,
    as an alternative to writing a one-off `validator` function for that specific check.
- `ButtonsCalculatorField` throws (not just logs) if `onFormulaChange` isn't supplied —
  it's always wired internally by `ModalCalculatorField`, so this only matters if you
  fork the modal.
- The button grid supports full keyboard operation: every button with an `accessKey`
  gets a matching hotkey via `useHotkeys`, plus fixed hotkeys for backspace/delete
  (→ delete last token), escape (→ clear all), and shift+asterisk/shift+plus (× / + as
  typed via shift combos). If you extend the button list, keep `accessKey` unique and
  remember hotkeys are excluded inside `TEXTAREA`/`SELECT` tags and
  `.ant-select-selection-search-input`/`.ant-select` elements.

**Usage:**
```tsx
{
  name: "commissionFormula",
  type: "business",
  label: messages("module.commissionFormula"),
  element: FormGenerator.CalculatorField,
  options: {
    readOnly: false, // opt in to direct typing; omit to keep calculator-only input
    extraProps: {
      modalTitle: messages("module.commissionFormula"),
      variable: { data: [{ value: "amount", label: messages("module.amount") }] },
    },
  },
}
```

---

## 20. `ButtonField`

**File:** `button-field.tsx`

**Purpose:** a plain action button embedded as a form "field" — for buttons that need
form-row layout (span/offset/endPoint) alongside real inputs, without carrying any data
value themselves.

```ts
type ButtonFieldExtraProps = ComponentProps<typeof Button> & {
  position?: { y?: FlexProps["align"]; x?: FlexProps["justify"] };
};
```

- Uses the local `@brdp/ui` `Button` (from `../../../button/button`), not the icon/text
  buttons seen in `InputWithButtonField`/`CopyableField` — this is the one place in the
  catalog so far where the "real" `@brdp/ui` `Button` is the correct choice rather than
  an inline `antd` `Button type="text"`.
- **Throws** (hard error, not console warning) if neither `icon` nor `label` is provided
  in `extraProps` — one of the two is mandatory.
- ⚠️ **Ignores form-level `disabled`/`readOnly` cascades** — it only reads
  `extraProps.disabled` (defaulting to `false` if omitted), with the comment "for
  prevent disabled button by form" in the source itself. This means a `ButtonField`
  stays clickable even when the surrounding form is globally `disabled`/`readOnly`,
  unless you explicitly pass `disabled: true` (or a computed value) inside `extraProps`
  yourself. If a button truly needs to respect the form's disabled state, wire that
  explicitly — don't assume it "just works" the way native input types do.
- `position` only controls the button's alignment inside its own grid cell (`Flex`
  align/justify) — use `layout.span`/`layout.offset` (the standard field-level layout
  props) to control where that cell sits in the row.
- Because it uses `name: "__something"` (the `IgnorablePattern` convention) in practice
  — it carries no real form value, so give it a `__`-prefixed field name to keep it out
  of your typed `Fields` shape.

**Usage:**
```tsx
{
  name: "__resetFilters",
  type: "business",
  label: "",
  element: FormGenerator.ButtonField,
  layout: { span: 1, offset: 3 },
  options: {
    extraProps: {
      label: messages("module.resetFilters"),
      icon: <IconsList.RefreshIcon />,
      onClick: handleResetFilters,
      position: { x: "flex-end" },
    },
  },
}
```

---

## 21. `BankIdentifierField`

**File:** `bank-identifier-field.tsx`

**Purpose:** 11-digit bank/branch identifier code input — digits-only, rejects all-zero.
Structurally identical to `ShahabCodeField` (§4) and `PostalCodeField`'s live-typing
guard (§5), just a different fixed length.

```ts
type BankIdentifierExtraProps = {}; // no extra config
export const bankIdentifierValidationRules = (): RuleObject[] => [...];
```

- Same shape as `ShahabCodeField`: input-level guard only blocks non-numeric keystrokes
  (reverts to previous value), `maxLength={11}` hard cap; real length/all-zero
  enforcement lives in `bankIdentifierValidationRules()` — always pair the two.

**Usage:**
```tsx
{
  name: "bankBranchIdentifier",
  type: "business",
  label: messages("module.bankBranchIdentifier"),
  element: FormGenerator.BankIdentifierField,
  validation: { rules: bankIdentifierValidationRules() },
}
```

---

## 22. `AutoCompleteField`

**File:** `auto-complete-field.tsx`

**Purpose:** thin wrapper over `antd`'s `AutoComplete` with the codebase's standard
search-matching (`globalSearchFilter`) and a loading/error/retry affordance built into
the suffix icon slot.

```ts
type AutoCompleteExtraPropsType = {
  error?: boolean;
  optionsData?: AutoCompleteProps["options"];
  onSearch?: (value: string) => void;
  onSelect: (value: unknown, options: BaseOptionType) => void; // required, no `?`
  retryButton?: MouseEventHandler<HTMLElement>;
  loading?: boolean;
};
```

- `onSelect` is the only extra prop **not** marked optional in the type — always supply
  it even though the surrounding object type doesn't force you to at the call site
  (same "typed as required but not enforced through `options.extraProps`" caveat as
  `CalculatorField`'s `modalTitle`/`variable`).
- Suffix icon precedence: `loading` (spinner) → `error && retryButton` (a clickable redo
  icon that calls `retryButton`) → nothing. There's no visual affordance for "error
  without a retry handler" — pass `retryButton` whenever `error` can be true if you want
  the user to have a recovery action.
- Filtering matches against a joined `title + label + value` string via the shared
  `globalSearchFilter` — same convention as the `select`/`cascader`/`tree-select` native
  field types (system doc §5) and `TransferField`'s built-in search.
- No formatting/parsing of `value` — it's a free-typed string exactly like a native
  `select` in `tags` mode, just with async-searchable suggestions instead of a static
  list.

**Usage:**
```tsx
{
  name: "customerSearch",
  type: "business",
  label: messages("module.customerSearch"),
  element: FormGenerator.AutoCompleteField,
  options: {
    extraProps: {
      optionsData: suggestions,
      onSearch: handleSearch,
      onSelect: (value, option) => setSelectedCustomer(option),
      loading: isSearching,
      error: hasSearchError,
      retryButton: () => handleSearch(lastQuery),
    },
  },
}
```

---

## 23. `AmountField` (current implementation — full multi-currency version)

**File:** `amount-field.tsx`, `amount-field.module.css`

**Purpose:** the canonical monetary-amount input: comma-grouped live formatting, caret
preservation while typing, optional negative values, optional multi-currency selector,
and optional Persian-words ("قرائت مبلغ") assistance. This is a significantly richer
implementation than earlier illustrative mentions of `AmountField` in this catalog/the
system doc — treat this file as the current source of truth.

```ts
export const CURRENCIES_LIST = [
  { label: "ریال", value: 932 },
  { label: "تومان", value: 930 },
  { label: "دلار", value: 275 },
  { label: "یورو", value: 342 },
] as const; // mock list — only 932 (ریال) is presented as "real" in the source comment

type CurrencyConfig = { options?: CurrencyOption[]; default?: CurrencyValue };

type AmountFieldExtraProps = {
  separator?: string;              // default ","
  /** @deprecated use `currency` instead */
  addonAfter?: string;
  currency?: CurrencyConfig;
  allowNegative?: boolean;         // default false
  wordify?: { toTooltip?: boolean; toDescription?: boolean };
};
```

- **`value`** can be either a plain `string | number` amount, **or** an object
  `{ value: number; currency: CurrencyValue }` — which shape is submitted is controlled
  by `options.returnFormat: { type: "object" }` (object shape) vs. omitted/`"string"`
  (plain amount only, currency is tracked but not part of the submitted `value`).
- **Multi-currency sibling field convention:** when a currency selector is shown, its
  value lives in an **auto-generated sibling field** named `` `__${name}_currency` `` —
  this follows the exact `__`-prefix / `IgnorablePattern` convention documented in the
  system doc (§3), and is handled entirely internally (you don't declare this sibling
  field yourself). If `options.returnFormat.type !== "object"`, this sibling field's
  value is the *only* place the chosen currency ends up — the main field's `value`
  stays a bare amount.
- `currency.options` (explicit list) takes precedence over the module's `CURRENCIES_LIST`
  default; with 0 or 1 option, the currency renders as static text instead of a `Select`
  (same "single option ⇒ static text" convention seen in `InputWithSelectField`, §7).
- **Sanitization (`sanitize`)** is intentionally permissive mid-typing — it tolerates
  scientific notation (`e`/`E`), a single decimal point, and a single leading sign, but
  strips everything else (multiple signs, multiple `e`, stray characters). `allowNegative`
  gates whether a leading `-` survives sanitization at all.
  `isIntermediate()` recognizes half-typed states (`"-"`, `"12."`, `".5"`) and skips
  formatting for those so the input doesn't fight the user mid-keystroke.
- Decimal digits are capped via `MAX_DECIMAL_LENGTH` from `@brdp/utils` — don't
  reintroduce a magic number for this if extending the element.
- **Caret preservation** is a two-part mechanism: `handleChange` computes the caret's
  position in terms of *raw digit count* (ignoring separators) on the way in, and a
  `useLayoutEffect` re-maps that raw count back onto the newly-formatted string (with
  separators re-inserted) after render. There's also a **click-anywhere-to-focus-end**
  behavior (`handleMouseDown`/`handleFocus`, using a canvas-measured text width) so
  clicking empty space to the side of a right-aligned value still puts the caret at the
  end rather than the start.
- **Overflow affordance:** an eye-icon suffix button (hidden — `visibility: hidden`, not
  unmounted — unless `formattedValue.length >= 21`) shows a tooltip with the full
  formatted value + currency label, for amounts too long to read comfortably in the
  input box.
- **Wordify (Persian amount-in-words):** `wordify(rawValue)` from `@brdp/utils` computes
  the tooltip/description text; `extraProps.wordify.toTooltip` wraps the whole input in
  a `Tooltip`, `extraProps.wordify.toDescription` instead renders a small secondary
  `Typography.Text` line below the input (only in non-read-only mode). Both can be
  enabled independently; enabling neither means no words assistance at all.
- Read-only "empty" convention: `(!rawValue || rawValue === "-") && readOnly ? "-" : inputNode`
  — matches the general `"-"` convention from the system doc, note it checks the
  **numeric raw value**, not the formatted/displayed one.
- `addonAfter` (string) is explicitly marked `@deprecated` in favor of `currency` — don't
  use it in new field configs; it only exists for backward compatibility with fields
  written before the multi-currency support existed.

**Usage — simple Rial amount, no currency picker:**
```tsx
{
  name: "amount",
  type: "business",
  label: messages("module.amount"),
  element: FormGenerator.AmountField,
  options: {
    extraProps: { wordify: { toTooltip: true } },
  },
}
```

**Usage — multi-currency, object return shape:**
```tsx
{
  name: "transactionAmount",
  type: "business",
  label: messages("module.transactionAmount"),
  element: FormGenerator.AmountField,
  options: {
    returnFormat: { type: "object" }, // value becomes { value, currency }
    extraProps: {
      currency: {
        options: [{ label: "ریال", value: 932 }, { label: "دلار", value: 275 }],
        default: 932,
      },
      allowNegative: false,
      wordify: { toDescription: true },
    },
  },
}
```

---

## 24. `DetailsCard` (`@brdp/ui`) — supporting component, **not** a business element

**Files:** `details-card.tsx`, `details-card.module.css`

**Purpose:** generic "records as description-list cards" renderer: an optional
title/header with an add-affordance icon, then for each record a `Descriptions`
block (label/value pairs) plus optional per-item actions (edit/delete/etc.), with a
divider between records. Already used internally by `DynamicListField` (§12) as its
non-empty-state display — but it's a plain `@brdp/ui` component, **not** a
`BusinessElementFieldsProps`-shaped element, not registered on `FormGenerator`, and
fully usable outside any form (summary panels, read-only detail views, view modals).

```ts
import { DetailsCard } from "@brdp/ui"; // NOT from a business-elements path

type BaseListItem = { id: string | number };

type DetailField<T extends BaseListItem> = {
  key: keyof T;
  label: string;
  span?: number;
  children?: ReactNode | ((item: T) => ReactNode);
};

type DisplayOptions = { showHeader?: boolean; showActions?: boolean };

type DetailsCardProps<T extends BaseListItem> = {
  title?: string;
  extraIcon?: ReactNode;
  data: T[];
  column?: number;                // default 2
  fields: DetailField<T>[];
  displayOptions?: DisplayOptions; // default {} -> effectively showHeader true, showActions false
  onExtraClick?: () => void;
  itemActions?: BarAction<T>[];    // same BarAction type used by table row actions
  readOnly?: boolean;
  disabled?: boolean;
  mode?: ShowingActionModesList;   // default "ellipsis" — same enum as table Actions
};
```

- Generic over `T extends BaseListItem` — every record needs an `id: string | number`.
  This is exactly the shape `DynamicListField`'s internal `ListItem` type already
  provides, which is why the two compose cleanly.
- Renders **`null` entirely** when `data` is empty — there's no built-in empty state.
  This is exactly why `DynamicListField` keeps its own empty-state box and only swaps to
  `DetailsCard` once `internalItems.length > 0`; do the same in any standalone usage.
- The header only renders when **both** `displayOptions.showHeader` (default `true`) is
  truthy **and** a non-empty `title` is passed — missing either suppresses it.
- `displayOptions.showActions` defaults to `false` — you must explicitly opt in even
  when `itemActions` is provided, otherwise the actions column renders nothing.
- `readOnly || disabled` collapses into a single `isReadOnlyOrDisabled` switch that
  suppresses **both** the header's `extraIcon` click affordance and all `itemActions` at
  once — there's no partial mode (e.g. "keep actions visible, just hide the add icon"
  isn't configurable from the outside; you'd need to not pass `extraIcon` at all).
- `fields[].children` can be a static `ReactNode`, or a function `(item: T) => ReactNode`
  for computed/formatted display (dates, amounts, tags, etc.) — when omitted entirely it
  falls back to `item[field.key] ?? "-"` (the standard empty-value convention used
  throughout this codebase).
- `itemActions` reuses the **exact same `BarAction<T>` type** (and the same underlying
  `Actions` renderer / `ShowingActionModesList` mode enum) as table row actions
  elsewhere in the system (e.g. `GenerativeTable`'s `rowActions`) — if you already know
  how to write `rowActions`, you already know how to write `itemActions` here.
  `itemsCountOut={1}` and `overflowCount={1}` are hardcoded internally (always exactly
  one action shown inline, the rest collapsed into an overflow menu) — not currently
  configurable through `DetailsCardProps`.
- Dividers render **between** records only (none after the last one).

**Usage — as a form's dynamic-list row renderer (what `DynamicListField` does
internally; shown here as a direct equivalent):**
```tsx
<DetailsCard
  title={messages("module.beneficiariesList")}
  extraIcon={<IconsList.PlusCircleIcon />}
  onExtraClick={openAddModal}
  data={beneficiaries}
  column={2}
  displayOptions={{ showHeader: true, showActions: true }}
  fields={[
    { key: "fullName", label: messages("module.fullName") },
    {
      key: "amount",
      label: messages("module.amount"),
      children: (item) => addCommaToAmount(item.amount, ","),
    },
  ]}
  itemActions={[
    {
      id: "edit",
      appearance: { icon: <IconsList.EditIcon />, tooltip: messages("brdpManagement.actionEdit") },
      action: (item) => openEditModal(item),
    },
    {
      id: "delete",
      appearance: { icon: <IconsList.DeleteIcon />, tooltip: messages("brdpManagement.actionDelete") },
      action: (item) => handleRemoveItem(item),
    },
  ]}
/>
```

**Usage — entirely outside a form (read-only summary block):**
```tsx
<DetailsCard
  title={messages("module.customerSummary")}
  data={[customer]}
  column={3}
  readOnly
  displayOptions={{ showHeader: true, showActions: false }}
  fields={[
    { key: "fullName", label: messages("module.fullName") },
    { key: "nationalId", label: messages("module.nationalId") },
    { key: "phoneNumber", label: messages("module.phoneNumber") },
  ]}
/>
```

---

## Quick index — when to use which

| Need | Element |
|---|---|
| Move items between two lists, optionally reorder/check | `TransferField` |
| Colored status/label pill from a raw value | `TagField` |
| Reorder a flat array field (no dual list) | `SortableField` |
| 16-digit شاهاب code | `ShahabCodeField` |
| 10-digit Iranian postal code | `PostalCodeField` |
| Repeatable group of *simple* sub-fields (add/remove rows, inline) | `NestedDynamicField` |
| Repeatable list of *rich* items (modal add/edit, custom row shape) | `DynamicListField` |
| Input + inline sibling select (e.g. amount + currency) | `InputWithSelectField` |
| Input + action button (lookup/generate/clear) | `InputWithButtonField` |
| Iranian IBAN/Sheba with formatting + checksum | `IbanField` |
| Raw single-file upload, no parsing | `FileUploaderField` |
| Single-file upload **with** JSON/byte-array parsing | `FileParserField` |
| Single Jalali date, optional cross-field min/max | `DatePickerField` |
| Combined date + time in one value | `DateTimePickerField` |
| Time-of-day only | `TimePickerField` |
| Read-only value + copy-to-clipboard button | `CopyableField` |
| Collapsible/groupable sub-section of fields | `CollapseField` |
| 16-digit card number with bank-logo detection + Luhn check | `CardNumberField` |
| On-screen/keyboard formula builder (calculator modal) | `CalculatorField` |
| A button that needs to live inside the form grid | `ButtonField` |
| 11-digit bank/branch identifier code | `BankIdentifierField` |
| Free-typed input with async/searchable suggestions | `AutoCompleteField` |
| Monetary amount, comma-formatted, optional multi-currency + words | `AmountField` |
| Read-only labeled record list w/ actions, in *or* out of a form | `DetailsCard` (`@brdp/ui`, not a business element) |

Registration for all of the above follows the same two steps as any business element —
see `brdp-form-system.md` §6.3 (add to `BusinessElementsRepositoryTypes`, import, assign
`FormGenerator.X = X`). The exceptions:
- `FormulaFiled` and `ButtonsCalculatorField` inside `CalculatorField`'s modal (§19) —
  intentionally **private/unregistered** business elements, passed directly as
  `element: LocalComponent` rather than through `FormGenerator.X`; a supported pattern
  for elements scoped to one composite component and never reused elsewhere.
- `DetailsCard` (§24) — not a business element at all, just imported directly from
  `@brdp/ui` wherever you need it (inside a `ModalForm`/business element, or completely
  outside the form system).
