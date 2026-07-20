# @brdp/engine — Business Elements Reference

> Companion to `brdp-form-system.md` and `brdp-business-elements-catalog.md`. Those two
> cover `@brdp/ui/form`'s own business elements (registered on `FormGenerator`). **This
> file covers a separate tier: business elements that live in `@brdp/engine`.**

## Why these are a separate tier

Import shape is different — and this is the deciding signal, not just folder location:

```ts
import { BusinessElements } from "@brdp/engine";
// used as: element: BusinessElements.CustomerSearchField
```

vs. the `@brdp/ui/form` tier:

```ts
import FormGenerator from "@brdp/ui/form";
// used as: element: FormGenerator.AmountField
```

This matches the "exactly two valid import shapes" rule already established in
`brdp-form-system.md` §6.3 — this file is the detailed reference for the second shape.

**Architecturally**, `@brdp/engine` business elements are domain/business-logic-heavy:
every one of them (except `InfoField`) performs a live network fetch (`useGet` from
`@brdp/engine`) to search for or verify a real banking entity — customer, deposit,
account, currency. `@brdp/ui/form`'s own business elements, by contrast, are generic UI
primitives (inputs, pickers, uploaders) with no built-in knowledge of any API. **If a new
business element needs to fetch/search real backend data, it belongs in `@brdp/engine`,
not `@brdp/ui/form`.**

Registered elements (from `@brdp/engine`'s own `index.ts`):

```ts
export { AccountSearchField } from "./account-search-field/account-search-field";
export { CurrencySearchField, type CurrencySearchFormType } from "./currency-search-field/currency-search-field";
export { CustomerSearchField, type CustomerDataType } from "./customerSearch/customer-search-field";
export { DepositSearchField, type DepositDataType } from "./deposit-search/deposit-search-field";
export { InfoField } from "./info-field/info-field";
```

**Structural convention:** each search field is its own **feature folder**, not a single
file — typically: the field component itself, a `-modal.tsx` (full search UI: form +
`GenerativeTable`), sometimes a `-detail-modal.tsx` (read-only view), and small pure
utility files (`get-X-number.ts`) for value normalization. Follow this folder shape for
any new engine business element rather than cramming everything into one file.

---

## The shared "Search Field" pattern

`CustomerSearchField`, `DepositSearchField`, and `AccountSearchField` all follow the same
template (`CurrencySearchField` is a simplified variant — see §4). Internalizing this
template is the fastest way to generate a new one correctly.

1. **Display value extraction** — `value` can be either a raw string/number code, or the
   full fetched object; the input always displays just the identifying field:
   ```ts
   const displayValue =
     typeof value === "string" ? value : (value as XDataType)?.someIdField || "";
   ```
2. **Manual, not automatic, fetching** — `useGet(..., { enable: false, raw: true })` from
   `@brdp/engine`, triggered explicitly via the returned `mutate`/fetch function, never
   on mount.
3. **Fetch triggers:** `onBlur` and `onKeyDown` (Enter key, with `preventDefault()`) both
   call the same internal `performFetch(currentValue)`, guarded against:
   - empty value,
   - value unchanged since focus (`initialValueRef`, set in `onFocus`),
   - `options.extraProps.preventBlurRequest === true` (an explicit opt-out every one of
     these fields exposes, for callers who want to control fetch timing themselves, e.g.
     when embedding the field inside a `requiredGroup` search form where you don't want
     a fetch firing on every blur — see `DepositSearchFieldModal`'s usage of
     `BusinessElements.CustomerSearchField` with `preventBlurRequest: true`).
4. **`returnFormat` switch** — same mechanism as `AmountField`/`DatePickerField`
   (`brdp-business-elements-catalog.md`): `options.returnFormat.type === "string"` makes
   `onChange` receive just the normalized id string (via a `getXNumber()` helper, §5);
   otherwise the full fetched object is passed to `onChange`.
5. **Field-level error surfacing on failure** — these do **not** throw or rely on
   `validation.rules`; on a failed/empty fetch they call
   `form.setFields([{ name: props.name, errors: [message] }])` directly, and clear it
   again (`errors: []`) once a valid selection/fetch succeeds. This is a **different**
   error-reporting mechanism from typical `validation.rules` validators — appropriate
   here because the error is the *result of an async side effect* (a failed search),
   not a synchronous input-shape check.
6. **`__{name}_loading` sibling field** — while the fetch is in flight, each of these
   sets a same-form sibling field named `` `__${name}_loading` `` via
   `form.setFieldValue`, inside a `useEffect`/`useEffectEvent`. This is a **third**
   example (alongside `AmountField`'s `__{name}_currency` and
   `InputWithSelectField`'s sibling select) of the `__`-prefixed sibling-field
   convention from the system doc — this particular usage exists so that **other parts
   of the same form** can watch `` `__${name}_loading` `` (e.g. via `dependencies`) if
   they need to react to this field's async state, without the search field needing to
   expose any imperative ref/handle.
7. **Search modal via `showAppModal`, not `antd`'s `modal.info`** — the suffix search
   button opens a full search-and-pick UI through `showAppModal({ id, title, icon,
   element, options })` / closes it via `hideAppModal(id)`. See "Two modal systems" (§6)
   for why this is the correct choice here versus the `App.useApp().modal.info()`
   pattern used by `CalculatorField`/`DynamicListField`.
8. **The modal's own `GenerativeTable`** always wires:
   ```tsx
   rowSelection={{
     type: "single",
     onChange: (_, values) => onChange(values[0]), // the OUTER field's onChange
     onSelect: () => hideAppModal("the-modal-id"),
   }}
   ```
   i.e. picking a row both fills the field and closes the modal in one action.

---

## 1. `CustomerSearchField`

**Files:** `customer-search-field.tsx`, `customer-tabs.tsx`, `real-customer-tab.tsx`,
`legal-customer-tab.tsx`, `requireOneOfFields.ts`, `get-customer-number.ts`

**Purpose:** search/select a bank customer (real **or** legal person), by customer
number or national ID/code, with type-ahead verification on blur.

```ts
type CustomerSearchExtraProps = { preventBlurRequest?: boolean };
export type CustomerDataType = { customerId: string | number; /* ~40 more fields */ };
```

- The modal (`CustomerTabs`) is **not** a single search form — it's a `Tabs` component
  (from `@brdp/ui`) with two full tabs: `RealCustomerTab` and `LegalCustomerTab`, each
  its **own** independent `ControlledForm` + `GenerativeTable` + its own `useGet` call
  against the same underlying `Customers.GET_CUSTOMER_FILTER` endpoint. The backend
  response actually returns **both** `legalCustomer` and `realCustomer` slots
  (`CustomerFilterResponse`) regardless of which tab searched — each tab checks whether
  data landed in the *other* slot and shows a warning (`hasRealCustomerData` /
  `hasLegalCustomerData`) rather than silently showing nothing, e.g.:
  `messages("brdpManagement.realCustomerError")` when a real-customer search actually
  found a legal customer.
- Field-level validation on `customerNumber`/`nationalId` in each tab uses
  **`requireOneOfFields(["customerNumber", "nationalId"])`** (§5) — a `RuleRender`, not
  the `requiredGroup` mechanism — plus a `pattern` rule for digits-only and a
  cross-field `validator` that **rejects filling both fields at once** (this search
  form wants exactly one of the two, not "at least one"). If you need "exactly one of
  N, not both" semantics elsewhere, copy this pair-of-rules combination rather than
  reaching for `requiredGroup` (which only enforces "at least one").
- `getCustomerNumber()` (§5) is the `returnFormat: "string"` normalizer, checking
  `customerId` via `findByStringAddress`.

**Usage:**
```tsx
{
  name: "customerNumber",
  type: "business",
  label: messages("module.customerNumber"),
  element: BusinessElements.CustomerSearchField,
  options: {
    extraProps: { preventBlurRequest: true },
    returnFormat: { type: "string", template: "" },
  },
}
```

---

## 2. `DepositSearchField`

**Files:** `deposit-search-field.tsx`, `deposit-search-field-modal.tsx`,
`deposit-detail-modal.tsx`, `amount-state-table.tsx`, `get-deposit-number.ts`

**Purpose:** search/select a deposit account by deposit number, IBAN, or a rich set of
filters (state, branch, dates, relation type, etc. behind a collapsible "more filters"
section).

```ts
type DepositSearchFieldExtraProps = { preventBlurRequest?: boolean };
export type DepositDataType = {
  number: string; iban: string; title: string; openingDate: string;
  branchCode: string; depositTypeNumber: string;
  amountAndStateList: [{ totalAmount: number; availableAmount: number; state: string; currencySwiftCode: string }];
};
```

- ⚠️ **Search button only renders when `options.readOnly` is true** (note: `hidden={true}`
  is also passed alongside it on the button, meaning the button is currently never
  actually shown by this exact code path — flagging as-is from the source; if you're
  extending this field and want the search button visible, check both the `readOnly`
  condition and the `hidden` prop before assuming it'll appear).
- `DepositSearchFieldModal` demonstrates the **full "blue-star required group" recipe**
  combining several system-doc primitives into the real-world pattern — copy this
  whenever you need "at least one of several fields, with a blue asterisk, cleared as
  soon as any one is filled":
  ```tsx
  const REQUIRED_GROUP = "search-deposit";
  const blueStarFields = [
    { name: "depositNumber", requiredGroup: REQUIRED_GROUP },
    { name: "customerNumber", requiredGroup: REQUIRED_GROUP },
    { name: "iban", requiredGroup: REQUIRED_GROUP },
  ];
  // 1) a validator attached to EACH field in the group, clearing the group's errors
  //    the moment any one of them gets a value:
  const blueStarCleaner = () => ({
    validator: async (_, value) => {
      if (value) clearRequiredGroupErrors(REQUIRED_GROUP, blueStarFields);
      return Promise.resolve();
    },
  });
  // 2) an explicit check inside onSubmit, BEFORE actually searching:
  const handleSubmit = async (values) => {
    await validateRequiredGroup(REQUIRED_GROUP, blueStarFields, messages("brdpManagement.atLeastOneRequiredField"));
    // ...proceed with the search
  };
  ```
  Each of the three fields (`depositNumber` as native `input`, `customerNumber` as
  `BusinessElements.CustomerSearchField`, `iban` as `FormGenerator.IBANField`) gets
  `requiredGroup: REQUIRED_GROUP` **and** `validation.rules: [blueStarCleaner()]` — both
  halves are required for the pattern to work correctly.
- The "more filters" section is a `FormGenerator.CollapseField` (`type: "collapsible"`,
  centered orientation, dashed divider) — see `brdp-business-elements-catalog.md` §17
  for the full `CollapseField` mechanics this relies on.
- Row action `viewDetail` opens `DepositDetailModal` — a **fully read-only**
  `ControlledForm` (`readOnly={true}`) built entirely from **nested `CollapseField`s**,
  including one nested `CollapseField` whose only child field renders
  `AmountStateTable` — a small **private, unregistered business element**
  (`element: AmountStateTable`, not `FormGenerator.X` or `BusinessElements.X`) that
  itself renders a `GenerativeTable` for the deposit's amount/currency/state breakdown.
  This is the same "private business element scoped to one composite view" pattern
  documented for `CalculatorField`'s `FormulaFiled`/`ButtonsCalculatorField`
  (`brdp-business-elements-catalog.md` §19) — worth knowing this pattern recurs for
  **read-only detail views** just as much as for interactive widgets.
- `getDepositNumber()` (§5) is the `returnFormat: "string"` normalizer for this field.

**Usage:**
```tsx
{
  name: "depositNumber",
  type: "business",
  label: messages("module.depositNumber"),
  element: BusinessElements.DepositSearchField,
  options: { returnFormat: { type: "string", template: "" } },
}
```

---

## 3. `AccountSearchField`

**Files:** `account-search-field.tsx`, `account-search-field-modal.tsx`

**Purpose:** search/select an account by account number, with a richer **inline
preview** than the other search fields.

```ts
type AccountSearchFieldExtraProps = { preventBlurRequest?: boolean };
export type AccountDataType = {
  AccountNumber?: string; Title?: string; Amount?: string; StatusName?: string;
  Topic?: {...}; Branch?: {...}; Currency?: {...}; /* PascalCase fields — mirrors the raw API shape */
};
```

- ⚠️ **Field names are PascalCase** (`AccountNumber`, `Title`, `StatusName`, ...) unlike
  every other `DataType` in this catalog (camelCase) — this mirrors the raw upstream API
  response shape directly rather than being normalized. Don't assume camelCase when
  wiring up columns/fields against `AccountDataType`.
- Unique to this field: an **inline `Popover` preview button** (eye icon), separate from
  the search button, shown whenever `value` is an object (`isObject(value)`) — hovering
  it shows name/status/branch/amount without opening the full search modal. Disabled
  when there's no `Title` on the current value (i.e. nothing meaningful to preview yet).
  If you want this same "quick glance without leaving the field" affordance on a new
  search field, this is the reference implementation to copy (`truncate()` from
  `@brdp/utils` keeps long names/branch labels from blowing out the popover).
- The search button itself is conditionally rendered only when **not** `options.readOnly`
  (a plain ternary, unlike `DepositSearchField`'s currently-broken `hidden` combination
  above) — this is the version to imitate.
- `AccountSearchFieldModal` is the simplest of the three modals: a single
  `accountNumber` input (`requiredField(messages("brdpManagement.requiredField"))` from
  `@brdp/utils` — the same ready-made required-rule helper seen in
  `ModalCalculatorField`, `brdp-business-elements-catalog.md` §19) plus a table with a
  single fetched row. Uses `fieldWatch("accountNumber")` (from `useControlledForm`) to
  drive the `useGet` query key directly — a legitimate use of `fieldWatch` per the
  system doc's own carve-out ("logic that lives outside field config").
- No `getAccountNumber()` normalizer utility exists for this field (unlike Customer/
  Deposit) — `AccountSearchField` does not offer a `returnFormat: "string"` mode in the
  current source; it always hands back the full `AccountDataType` object.

**Usage:**
```tsx
{
  name: "sourceAccount",
  type: "business",
  label: messages("module.sourceAccount"),
  element: BusinessElements.AccountSearchField,
}
```

---

## 4. `CurrencySearchField` (display-only variant — no type-ahead fetch)

**Files:** `currency-search-field.tsx`, `currency-form-modal.tsx`

**Purpose:** pick a currency purely via the search modal — the simplified member of this
family, worth knowing so you don't expect blur-fetch behavior from it.

```ts
export type CurrencySearchFormType = {
  centralBankCode: string; currencyName: string; currencyTypeName: string;
  foreignName: string; globalCode: string; isoCode: string; marketRate: boolean;
  reference: boolean; referenceCurrencyName: string; swiftCode: string; __rowIndex: number;
};
```

- ⚠️ **No `useGet`, no `onBlur`, no `onFocus`, no `returnFormat` switch at all** — unlike
  `CustomerSearchField`/`DepositSearchField`/`AccountSearchField`, typing into this
  input does **not** trigger any verification fetch. Free-typed text just becomes the
  field's raw `value` (a plain string) until the user opens the modal and picks a real
  row, at which point `value` becomes the full `CurrencySearchFormType` object again.
  This means the displayed text (`(value as CurrencySearchFormType)?.currencyName`)
  will render as `undefined`/blank right after free typing, until a real selection is
  made — if you need type-ahead verification behavior for a new search-style field,
  base it on `CustomerSearchField`/`DepositSearchField` instead of this one.
- `CurrencyFormModal` is also the simplest modal of the four — a flat search form (no
  `requiredGroup`, no collapsible "more filters"), and notably drives its query directly
  off `getAllParams` from `useControlledForm` (`autoSyncWithQueryParams`-style reading,
  though the form itself doesn't set `autoSyncWithQueryParams: true` here — it just
  reads whatever's already in the URL) rather than local `useState` search params like
  the other three modals.

**Usage:**
```tsx
{
  name: "settlementCurrency",
  type: "business",
  label: messages("module.settlementCurrency"),
  element: BusinessElements.CurrencySearchField,
}
```

---

## 5. `InfoField`

**File:** `info-field.tsx`

**Purpose:** a purely **display** field — shows a (possibly nested) value, with an
"info" button that opens a modal rendering arbitrary custom content for that value. The
source's own doc-comment states it plainly: **"it's only work on read-only fields of
form."**

```ts
type InfoFieldExtraProps = {
  inputValueKey?: string;              // dot-path into `value` to *display* in the input
  infoTitle?: string;                  // modal title
  view?: (data: unknown) => React.ReactNode; // modal body renderer, given the full `value`
};
```

- **Always `readOnly` and `disabled`, hardcoded** — same "always locked regardless of
  what's passed" behavior as `CopyableField`
  (`brdp-business-elements-catalog.md` §16) — don't expect this to become editable via
  `options.disabled: false`.
- Displays `findByStringAddress(value, inputValueKey)` in the input — i.e. `value` can
  be a full object and `inputValueKey` picks which nested field to show as text (same
  `findByStringAddress` utility used by `InputWithButtonField`'s `valueKey`,
  `brdp-business-elements-catalog.md` §8).
- The info button always opens via `showAppModal` (not `antd`'s `modal.info`) — content
  is `options.extraProps.view?.(value)`, i.e. **you supply the entire modal body as a
  function of the raw value** — this field has zero built-in knowledge of what it's
  displaying beyond the single text line.

**Usage:**
```tsx
{
  name: "customerSnapshot",
  type: "business",
  label: messages("module.customer"),
  readOnly: true,
  element: BusinessElements.InfoField,
  options: {
    extraProps: {
      inputValueKey: "firstName",
      infoTitle: messages("module.customerDetails"),
      view: (data) => <CustomerDetailView customer={data as CustomerDataType} />,
    },
  },
}
```

---

## 6. Two modal systems — which one to use

This codebase legitimately has **two different imperative modal mechanisms**. Picking
the wrong one for a new element is an easy mistake — use this to decide:

| | `App.useApp().modal.info({...})` (`antd`) | `showAppModal({ id, ... })` / `hideAppModal(id)` |
|---|---|---|
| Used by | `CalculatorField`, `DynamicListField` (`brdp-business-elements-catalog.md` §19, §12) | All `@brdp/engine` search fields, `InfoField`, general app/table row actions (e.g. `EbillFilesManagement`'s row actions) |
| Identity | Anonymous — controlled via the returned `ref`/`destroy()` handle | Named — has an explicit `id`, closeable from **anywhere** via `hideAppModal(id)` |
| Best for | A small, self-contained widget tightly scoped to one business element, opened and closed entirely from within that same component | Anything that needs a full search form + `GenerativeTable`, or needs to be closed from a *different* place than where it was opened (e.g. a table's `rowSelection.onSelect` closing the modal that contains that same table) |
| Closing from a table row-select | Not idiomatic here | The standard pattern — `onSelect: () => hideAppModal("the-modal-id")` |

**Rule of thumb:** if the new business element needs to show a `GenerativeTable` with
row selection to pick a value, use `showAppModal`/`hideAppModal`. If it's a compact,
purely local popup (a calculator, a small add/edit form), `App.useApp().modal.info()` is
fine and matches existing precedent.

---

## 7. Shared helper utilities

### `getCustomerNumber` / `getDepositNumber` — value-normalizer template

```ts
export const getXNumber = (value: unknown): string => {
  if (isObject(value)) {
    const id = findByStringAddress(value, "theIdFieldName", "");
    return id.toString();
  }
  if (isString(value) || isNumber(value)) return value.toString();
  return "";
};
```

This exact shape (object → pluck id field via `findByStringAddress`; string/number →
`.toString()`; anything else → `""`) is the template for **any** new search field that
wants to support `options.returnFormat: { type: "string" }`. `AccountSearchField`
currently lacks one of these — if you add `returnFormat: "string"` support to it later,
write `getAccountNumber()` following this exact shape for consistency.

### `requireOneOfFields([...])` — per-field "exactly one of N" / "at least one of N" rule

```ts
export const requireOneOfFields = (dependencies: NamePath[]): RuleRender => {
  const messages = getFormatMessage();
  return ({ getFieldValue, setFields }) => ({
    validator(_, _value) {
      // rejects only when THIS field is empty AND all `dependencies` are also empty
      // clears errors on all `dependencies` once satisfied
    },
  });
};
```

- This is a **`RuleRender`** (a function returning a rule, given `{ getFieldValue,
  setFields }`) — attach it to `validation.rules` on **each** field in the group, same
  as `requireOneOfFields(["customerNumber", "nationalId"])` on both `customerNumber`
  and `nationalId` in `RealCustomerTab`/`LegalCustomerTab`.
- **Different from `requiredGroup`:** `requiredGroup` (system doc §7) is a form-system
  built-in with its own blue-asterisk UI and an explicit `validateRequiredGroup()` call
  you make yourself at submit time. `requireOneOfFields` is a plain antd validation rule
  that self-enforces through antd's normal per-field validation flow (on blur/submit,
  whatever `validateTrigger` applies) — no special UI, no separate call needed. Pick
  `requiredGroup` when you want the blue-asterisk visual treatment; pick
  `requireOneOfFields` when you just need the constraint enforced with a normal field
  error message.
- Both `CustomerSearchField`'s two tabs additionally stack a **third**, cross-field
  validator on top of `requireOneOfFields` that actively **rejects filling both fields**
  — i.e. "exactly one," not "at least one." `requireOneOfFields` alone only gives you
  "at least one"; add your own cross-field rule (as shown in `RealCustomerTab`/
  `LegalCustomerTab`) if you need mutual exclusivity too.

### `__{name}_loading` sibling field convention

Recap across all three sources documented as of this file plus the earlier catalog:

| Element | Sibling field | Purpose |
|---|---|---|
| `AmountField` (`brdp-business-elements-catalog.md` §23) | `__{name}_currency` | holds the picked currency when `returnFormat.type !== "object"` |
| `InputWithSelectField` (`brdp-business-elements-catalog.md` §7) | `options.extraProps.select.name` (caller-provided, not auto `__`-prefixed) | the paired select's own value |
| `CustomerSearchField` / `DepositSearchField` / `AccountSearchField` (this file) | `__{name}_loading` | exposes async fetch-in-flight state to the rest of the form |

If you build a new business element that needs to expose secondary state alongside its
main value without polluting the typed `Fields` shape, prefer a `` `__${name}_suffix` ``
sibling field set via `form.setFieldValue`/`setFieldsValue` — it's the established
convention, and any other field can pick it up via `dependencies: ["__{name}_loading"]`
+ a `hidden`/`disabled` callback (system doc §6.5).

---

## Quick index

| Need | Element |
|---|---|
| Search/select a bank customer (real or legal), with blur-verify | `CustomerSearchField` |
| Search/select a deposit, with rich filters + a read-only detail view | `DepositSearchField` |
| Search/select an account, with an inline hover preview | `AccountSearchField` |
| Pick a currency purely via modal (no type-ahead verify) | `CurrencySearchField` |
| Read-only value + "view more info" modal, caller supplies the modal body | `InfoField` |

All five are consumed as `BusinessElements.X` via
`import { BusinessElements } from "@brdp/engine"` — never via `FormGenerator.X` and
never as a bare named import (system doc §6.3).
