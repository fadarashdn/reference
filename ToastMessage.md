# BRDP Translation & Action Message Guide (LLM)

This guide teaches an AI assistant how to convert legacy `<Translate tKey="..." params={{...}} />` toast/confirm descriptions into the standardized `<ToastMessage />` / `<ActionConfirmMessage />` components used across the `ashianeh` monorepo (based on commit `0819027a`, "Replace Translate with ToastMessage in toast descriptions").

The workflow an AI should follow, in order, is:

1. **Find** every `<Translate tKey="..." params={{...}} />` used inside a `showToast(...)` description (or `ActionConfirmMessage`-eligible confirmation dialog).
2. **Classify** the action (ADD/EDIT/DELETE/etc., or custom) using the tables below.
3. **Convert** it to `<ToastMessage />` (or `<ActionConfirmMessage />` for confirmations), using `entity` + `identifiers`.
4. **Update imports**: swap `Translate` for `ToastMessage` in the `@brdp/engine` import (drop `Translate` entirely if nothing else in the file still uses it; keep it if e.g. a confirm dialog still needs it).
5. **Clean up** now-unused imports (e.g. `Typography` from `@brdp/ui` if it was only used for the old message).

---

## 1. Use `useFormatMessage()`

```tsx
const messages = useFormatMessage();
```

Use only for **string values**:

- title
- label
- placeholder
- entity
- actionName
- tooltip
- column title
- button text
- identifier `title`, `prefix`, `suffix`

Example:

```tsx
entity={messages("sso.staticClientBusinessTitle")}
title={messages("brdpManagement.successful")}
```

---

## 2. Use `<Translate />` only when nothing else fits

Use when rendering translated JSX with interpolation that has **no standard component equivalent** (rare after this refactor — most CRUD toasts now use `ToastMessage`).

```tsx
<Translate
  tKey="namespace.key"
  params={{
    key: "...",
    value: "...",
  }}
/>
```

Do **not** use `<Translate />` if `ToastMessage` or `ActionConfirmMessage` can express the same message. If you find a `<Translate tKey="sso.addSuccessful" .../>`, `sso.deleteSuccessful`, `sso.editSuccessful`, `sso.changeStatusSuccessful`, `sso.assignSuccessful`, or any similarly-shaped success/delete/edit key — **always convert it to `ToastMessage`.**

---

## 3. Standard Components

### ToastMessage

Use for **all standard toast descriptions** (success/error CRUD feedback shown after a mutation).

```tsx
showToast(
  {
    title: messages("brdpManagement.successful"),
    description: (
      <ToastMessage
        actionType="ADD"
        entity={messages("sso.staticClientBusinessTitle")}
        identifiers={[
          {
            title: messages("brdpManagement.name"),
            value: clientName,
          },
        ]}
      />
    ),
  },
  "success",
  "toastId",
);
```

Do **not** create custom `<Translate />` messages for standard CRUD operations.

> **Fallback pattern:** Prefer keeping the server message as the primary source when available, falling back to `ToastMessage`:
> `description: res?.message || (<ToastMessage .../>)`
> This preserves backend-provided text (e.g. localized business rules) while still guaranteeing a consistent fallback UI when the API doesn't return one.

---

### ActionConfirmMessage

Use for confirmation dialogs (before the action executes).

Standard action:

```tsx
<ActionConfirmMessage
  actionType="DELETE"
  entity={messages("customer.entity")}
  identifiers={[
    {
      title: messages("common.name"),
      value: customerName,
    },
  ]}
/>
```

Custom action:

```tsx
<ActionConfirmMessage
  actionName={messages("sso.changePassWithEmail")}
  entity={messages("sso.staticClientBusinessTitle")}
  identifiers={[
    {
      title: messages("brdpManagement.name"),
      value: clientName,
    },
  ]}
/>
```

---

## 4. `actionType` (predefined actions)

Use whenever the action matches one of the values below — never invent a new `actionType`.

```ts
type EntityActionType =
  | "ADD"
  | "ADDED"
  | "EDIT"
  | "DELETE"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "APPROVE"
  | "REJECT"
  | "REGISTER"
  | "COMPLETE"
  | "FINALIZE"
  | "RETURN"
  | "RECEIVE"
  | "REQUEST"
  | "PAY"
  | "SETTLE"
  | "CONVERT"
  | "RELEASE"
  | "CREATION"
  | "DONE"
  | "ASSIGN";
```

```ts
const ACTION_TRANSLATION_KEY: Record<EntityActionType, TranslateKeys> = {
  DELETE: "brdpManagement.actionDelete",       // حذف
  ADD: "brdpManagement.actionAddition",        // افزودن
  EDIT: "brdpManagement.actionEdit",           // ویرایش
  DEACTIVATE: "brdpManagement.deActivation",   // غیرفعال سازی
  ACTIVATE: "brdpManagement.activation",       // فعال سازی
  APPROVE: "brdpManagement.actionApprove",     // تأیید
  REJECT: "brdpManagement.actionReject",       // رد
  ADDED: "brdpManagement.actionAppended",      // افزوده
  REGISTER: "brdpManagement.actionRegister",   // ثبت
  COMPLETE: "brdpManagement.actionComplete",   // تکمیل
  FINALIZE: "brdpManagement.actionFinalize",   // نهایی‌سازی
  RETURN: "brdpManagement.actionReturn",       // برگشت
  RECEIVE: "brdpManagement.actionReceive",     // دریافت
  REQUEST: "brdpManagement.sendRequest",       // ارسال درخواست
  PAY: "brdpManagement.actionPay",             // پرداخت
  SETTLE: "brdpManagement.actionSettle",       // تسویه
  CONVERT: "brdpManagement.actionConvert",     // تبدیل
  RELEASE: "brdpManagement.actionRelease",     // آزادسازی
  CREATION: "brdpManagement.actionCreation",   // تشکیل
  DONE: "brdpManagement.actionDone",           // انجام
  ASSIGN: "brdpManagement.actionAssign",       // واگذار
};
```

### Choosing between `ADD` / `ADDED`

- Use `"ADD"` in `ActionConfirmMessage` (confirming an action about to happen — imperative tense: "Add X?").
- Use `"ADDED"` in `ToastMessage` (reporting a completed action — past tense: "X was added").
- Same pattern applies conceptually elsewhere, but `EDIT`/`DELETE`/`DONE` are used as-is in both past and imperative contexts (the component's own copy handles tense).

### When to use `DONE`

Use `DONE` as a generic actionType for status/state-change or "generic success" toasts that don't map cleanly onto ADD/EDIT/DELETE — e.g. changing a status, changing a password, confirming a phone number. Examples from the codebase: `changeStatusSuccessful`, `changePasswordSuccessful`, `changeUserStatusAccessSuccessMessage`.

### When to use `ASSIGN`

Use `ASSIGN` when the action attaches/links one entity to another (e.g. assigning a software statement to a client). Example: `sso.assignSuccessful`.

### When the action doesn't exist in the table

Use `actionName` instead of `actionType`, passing a fully custom translated string:

```tsx
<ToastMessage
  actionName={messages("sso.changePassWithEmail")}
  entity={messages("sso.staticClientBusinessTitle")}
  identifiers={[{ title: messages("brdpManagement.name"), value: clientName }]}
/>
```

Real examples of `actionName` usage (business actions with no generic verb):
- `sso.changePassWithEmail` — client secret changed via email
- `sso.changePassWithSms` — client secret changed via SMS
- `brdpManagement.empty` — bucket emptied
- `brdpManagement.Charging` — bucket filled/charged
- `sso.phoneNumberConfirmation` — phone number confirmed

---

## 5. `identifiers`

Pass entity-identifying information using `identifiers`. Each identifier supports:

```ts
type Identifier = {
  title: string;    // label, e.g. messages("brdpManagement.name")
  value: string;    // the actual value, e.g. clientName
  prefix?: string;  // optional text rendered before the identifier (e.g. "for")
  suffix?: string;  // optional text rendered after the identifier (e.g. "to the black list")
};
```

### Single identifier

```tsx
identifiers={[
  {
    title: messages("common.name"),
    value: customerName,
  },
]}
```

### Multiple identifiers

```tsx
identifiers={[
  { title: messages("common.name"), value: customerName },
  { title: messages("common.code"), value: customerCode },
]}
```

### Using `suffix` (attach a relationship phrase after the value)

Use `suffix` when the original message described *where* the entity was added to/removed from (e.g. "... to the black list", "... from the white list"):

```tsx
<ToastMessage
  actionType="ADDED"
  entity={messages("brdpManagement.address")}
  identifiers={[
    {
      title: messages("sso.uri"),
      value: values.uri,
      suffix: messages("sso.toBlackList"),
    },
  ]}
/>
```

### Using `prefix` (attach a relationship phrase before the value)

Use `prefix` when the original message read "... for [operation]" or similar (commonly paired with `sso.operation`):

```tsx
<ToastMessage
  actionType="DONE"
  entity={messages("sso.changeStateGroupSpecialAccessUsersBusiness")}
  identifiers={[
    {
      title: messages("sso.operation"),
      prefix: messages("brdpManagement.for"),
      value:
        infoValue.specialAccessOperation === 6
          ? "DELEGATION_LOGIN"
          : infoValue.specialAccessOperation === 3
            ? "REFAH_BANK_SUPPORT"
            : infoValue.specialAccessOperation === 4
              ? "MAX_LOGIN"
              : "",
    },
  ]}
/>
```

### Custom formatting (rare — last resort)

```tsx
identifierBuilder={(ids) =>
  ids?.map(x => `${x.title}:${x.value}`).join(" | ")
}
```

---

## 6. Conversion Recipes (before → after)

These are the concrete shapes observed in the codebase. Match the old `<Translate>` shape to the closest recipe below.

### Recipe A — Add success (`tKey: "*.addSuccessful"` / `"*.addItemSuccessful"` / `"*.addBlacklistItemSuccessful"`)

```tsx
// BEFORE
<Translate
  tKey="sso.addSuccessful"
  params={{
    business: messages("sso.claimBusinessTitle"),
    key: messages("brdpManagement.code"),
    value: values.code,
  }}
/>

// AFTER
<ToastMessage
  actionType="ADDED"
  entity={messages("sso.claimBusinessTitle")}
  identifiers={[
    {
      title: messages("brdpManagement.code"),
      value: values.code,
    },
  ]}
/>
```

Mapping: `params.business` → `entity`, `params.key` → `identifiers[].title`, `params.value` → `identifiers[].value`.

If the old key also carried an `item` param (e.g. `sso.addItemSuccessful` had `item: messages("brdpManagement.client")`), that `item` string usually collapses into `entity` (use the more specific of `business`/`item` as `entity`), and a relational suffix like "to the white list" becomes `identifiers[].suffix`.

### Recipe B — Delete success (`tKey: "*.deleteSuccessful"` / `"*.deleteItemSuccessful"` / `"*.deleteBlacklistItemSuccessful"` / `messages("brdpManagement.deleteDynamicResponse", {...})`)

```tsx
// BEFORE
<Translate
  tKey="sso.deleteSuccessful"
  params={{
    business: messages("sso.claimBusinessTitle"),
    key: messages("brdpManagement.code"),
    value: code,
  }}
/>

// AFTER
<ToastMessage
  actionType="DELETE"
  entity={messages("sso.claimBusinessTitle")}
  identifiers={[
    {
      title: messages("brdpManagement.code"),
      value: code,
    },
  ]}
/>
```

Also applies when the old code used a plain string helper instead of JSX:

```tsx
// BEFORE
description: messages("brdpManagement.deleteDynamicResponse", { item: uri })

// AFTER
description: (
  <ToastMessage
    actionType="DELETE"
    entity={messages("brdpManagement.address")}
    identifiers={[
      { title: messages("sso.uri"), value: uri, suffix: messages("sso.fromBlackList") },
    ]}
  />
)
```

### Recipe C — Edit success (`tKey: "*.editSuccessful"` / `"*.editItemSuccessful"`)

```tsx
// BEFORE
<Translate
  tKey="sso.editSuccessful"
  params={{
    business: messages("sso.scopeBusinessTitle"),
    key: messages("brdpManagement.title"),
    value: obj.title,
  }}
/>

// AFTER
<ToastMessage
  actionType="EDIT"
  entity={messages("sso.scopeBusinessTitle")}
  identifiers={[
    {
      title: messages("brdpManagement.title"),
      value: obj.title,
    },
  ]}
/>
```

### Recipe D — Status/toggle change (`tKey: "*.changeStatusSuccessful"`)

Map to `ACTIVATE`/`DEACTIVATE` if it's a boolean toggle with a known direction; otherwise use `DONE`.

```tsx
// BEFORE (boolean toggle, direction known)
<Translate
  tKey="sso.changeStatusSuccessful"
  params={{ value: clientName, key: messages("brdpManagement.name"), business: messages("sso.dynamicClientBusinessTitle") }}
/>

// AFTER
<ToastMessage
  actionType={active ? "DEACTIVATE" : "ACTIVATE"}
  entity={messages("sso.dynamicClientBusinessTitle")}
  identifiers={[{ title: messages("brdpManagement.name"), value: clientName }]}
/>
```

```tsx
// BEFORE (generic status change, no clear ACTIVATE/DEACTIVATE direction)
<Translate
  tKey="sso.changeStatusSuccessful"
  params={{ business: messages("sso.softwareStatementBusinessTitle"), key: messages("brdpManagement.name"), value: record.clientName }}
/>

// AFTER
<ToastMessage
  actionType="DONE"
  entity={messages("sso.changeStatusStatementBusiness")}
  identifiers={[{ title: messages("brdpManagement.name"), value: record.clientName }]}
/>
```

> Note: when converting a generic "changeStatus..." key to `DONE`, prefer creating/using a dedicated `entity` translation key (e.g. `sso.changeStatusStatementBusiness`, `sso.changeStatusSubsystem`) rather than reusing the plain business-title key, so the toast reads as "status of X changed" rather than just "X".

### Recipe E — Assign (`tKey: "*.assignSuccessful"`)

```tsx
// BEFORE
<Translate tKey="sso.assignSuccessful" params={{ name: clientName }} />

// AFTER
<ToastMessage
  actionType="ASSIGN"
  entity={messages("sso.softwareStatementBusinessTitle")}
  identifiers={[{ title: messages("sso.clientName"), value: clientName }]}
/>
```

### Recipe F — User-access grant/edit with a derived `operation` param

When `params.operation` is a derived/computed string (e.g. based on a numeric enum), keep the computation but move it into `identifiers[].value`, and give the identifier a meaningful `title` (typically `sso.operation`):

```tsx
// BEFORE
<Translate
  tKey="sso.addUserAccessSuccessMessage"
  params={{
    business: messages("sso.groupSpecialAccessUsersBusinessTitle"),
    operation:
      operation === 6 ? "DELEGATION_LOGIN"
      : operation === 3 ? "REFAH_BANK_SUPPORT"
      : operation === 4 ? "MAX_LOGIN"
      : "",
  }}
/>

// AFTER
<ToastMessage
  actionType="ADDED"
  entity={messages("sso.groupSpecialAccessUsersBusinessTitle")}
  identifiers={[
    {
      title: messages("sso.operation"),
      value:
        operation === 6 ? messages("sso.delegationLogin")
        : operation === 3 ? messages("sso.refahBankSupport")
        : operation === 4 ? messages("sso.maxLogin")
        : "",
    },
  ]}
/>
```

> Prefer translating the enum labels themselves (e.g. `messages("sso.delegationLogin")`) rather than leaving raw constant strings (`"DELEGATION_LOGIN"`) as the displayed value — raw constants are a smell to fix opportunistically, even if some pre-existing conversions in the codebase still show them verbatim.

For an edit/status-change of the same access, reuse the same `identifiers` shape with `EDIT` / `DONE`, and add `prefix: messages("brdpManagement.for")` on the operation identifier when the phrasing reads "... for [operation]":

```tsx
<ToastMessage
  actionType="DONE"
  entity={messages("sso.changeStateGroupSpecialAccessUsersBusiness")}
  identifiers={[
    {
      title: messages("sso.operation"),
      prefix: messages("brdpManagement.for"),
      value: /* same ternary */,
    },
  ]}
/>
```

### Recipe G — Custom/no-generic-verb action (`actionName`)

```tsx
// BEFORE
<Translate
  tKey="sso.changeWithEmailSecretSuccess"
  params={{ name: clientName, business: messages("sso.staticClientBusinessTitle") }}
/>

// AFTER
<ToastMessage
  actionName={messages("sso.changePassWithEmail")}
  entity={messages("sso.staticClientBusinessTitle")}
  identifiers={[{ title: messages("brdpManagement.name"), value: clientName }]}
/>
```

Same pattern for: `changeWithSmsSecretSuccess` → `actionName={messages("sso.changePassWithSms")}`, `emptyBucketSuccess` → `actionName={messages("brdpManagement.empty")}`, `fillBucketSuccess` → `actionName={messages("brdpManagement.Charging")}`, and plain string fallbacks like `messages("brdpManagement.editSuccess")` → `actionName={messages("sso.phoneNumberConfirmation")}` when the message is about a specific business action rather than a generic edit.

---

## 7. Import & cleanup checklist

When converting a file:

1. Add `ToastMessage` to the `@brdp/engine` import.
2. Remove `Translate` from that import **only if** no other `<Translate>` usage remains in the file (some files keep both — e.g. one toast converted to `ToastMessage`, another spot in the same file still legitimately uses `<Translate>`).
3. Remove now-unused UI imports (e.g. `Typography` from `@brdp/ui`) if they were only used to render the old custom message.
4. Remove leftover `params` ternary logic that is no longer referenced.
5. Do not leave commented-out old translation strings in the file (e.g. stray `// باکت کلاینت ایستا ...` debug comments) — delete them as part of the cleanup.
6. If `actionType`/`ASSIGN`/`DONE` do not yet exist in `packages/engine/src/i18n/messages/base-action-messages.tsx`, add them to both the `EntityActionType` union and the `ACTION_TRANSLATION_KEY` map (with a trailing Persian comment documenting the phrase), rather than inlining a one-off translation.

---

## 8. Decision Table

| Need | Use |
|------|-----|
| JSX translated text with no standard-component equivalent | `<Translate />` |
| String prop | `useFormatMessage()` |
| Success/error CRUD toast | `ToastMessage` |
| Confirmation dialog | `ActionConfirmMessage` |
| Standard action (ADD/EDIT/DELETE/ACTIVATE/DEACTIVATE/DONE/ASSIGN/etc.) | `actionType` |
| Business-specific action with no generic verb | `actionName` |
| Entity-identifying data | `identifiers` (`title`, `value`, optional `prefix`/`suffix`) |

---

## 9. LLM Instructions (apply when converting code)

When modifying this codebase:

1. Never hardcode visible text.
2. Always use `useFormatMessage()` for string props.
3. Use `<Translate />` only for custom translated JSX that has no `ToastMessage`/`ActionConfirmMessage` equivalent.
4. Prefer `ToastMessage` for all standard CRUD toast descriptions — this includes cases previously implemented as plain `messages("...", { params })` string calls, not just JSX `<Translate>` blocks.
5. Prefer `ActionConfirmMessage` for confirmation dialogs.
6. Use `actionType` whenever a predefined action exists (see the full list in section 4); only fall back to `actionName` when truly no generic verb fits.
7. Map old `params.business`/`params.item` → `entity`; old `params.key` → `identifiers[].title`; old `params.value`/`params.name`/`params.username` → `identifiers[].value`.
8. Use `identifiers[].suffix` for trailing relational phrases ("... to/from/in the X list") and `identifiers[].prefix` for leading relational phrases ("... for [operation]").
9. Pass business data through `entity` and `identifiers`; never concatenate translated strings manually.
10. When updating existing code, replace custom CRUD translations with `ToastMessage` if the message follows a standard action pattern (add/edit/delete/status-change/assign), even if the original implementation used a plain string helper rather than `<Translate>`.
11. Preserve the existing architecture and translation conventions instead of introducing new translation patterns.
12. After conversion, run the import/cleanup checklist (section 7) on the touched file.
13. If an `actionType` needed for the conversion doesn't exist yet, extend `EntityActionType` and `ACTION_TRANSLATION_KEY` in `packages/engine/src/i18n/messages/base-action-messages.tsx` instead of hardcoding a one-off phrase.
