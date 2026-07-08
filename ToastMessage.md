# BRDP Translation & Action Message Guide (LLM)

Converts legacy `<Translate tKey="..." params={{...}} />` toast/confirm text into `<ToastMessage />` / `<ActionConfirmMessage />`.

Steps: **Find** the `<Translate>` → **Classify** the action → **Convert** using `entity` + `identifiers` → **Fix imports** (swap `Translate`→`ToastMessage` in `@brdp/engine`, drop `Translate` only if unused elsewhere in file) → **Clean up** (dead `Typography` imports, leftover `params` logic, stray commented translations).

---

## 1. Strings vs JSX

- `useFormatMessage()` → for any string prop (title, label, entity, actionName, identifier title/prefix/suffix, etc.)
- `<Translate />` → only when no standard component can express the JSX. If a key looks like `*.addSuccessful` / `*.deleteSuccessful` / `*.editSuccessful` / `*.changeStatusSuccessful` / `*.assignSuccessful` (or similarly shaped), **always convert to `ToastMessage`** — never leave it as `Translate`.

## 2. Components

**`ToastMessage`** — all success/error CRUD toast descriptions.
**`ActionConfirmMessage`** — confirmation dialogs before an action runs (same props).

```tsx
<ToastMessage
  actionType="ADD"
  entity={messages("sso.staticClientBusinessTitle")}
  identifiers={[{ title: messages("brdpManagement.name"), value: clientName }]}
/>
```

> **Fallback:** prefer `description: res?.message || (<ToastMessage .../>)` to keep server-provided text when present.

## 3. `actionType`

```ts
type EntityActionType =
  | "ADD" | "ADDED" | "EDIT" | "DELETE" | "ACTIVATE" | "DEACTIVATE"
  | "APPROVE" | "REJECT" | "REGISTER" | "COMPLETE" | "FINALIZE" | "RETURN"
  | "RECEIVE" | "REQUEST" | "PAY" | "SETTLE" | "CONVERT" | "RELEASE"
  | "CREATION" | "DONE" | "ASSIGN";
```

Mapped to Persian verb keys in `packages/engine/src/i18n/messages/base-action-messages.tsx`:

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

If the `actionType` you need isn't in this map yet, **add it there** (union + map + Persian comment) instead of inlining a one-off phrase.

- `ADD` = imperative ("Add X?", used in `ActionConfirmMessage`). `ADDED` = past tense ("X was added", used in `ToastMessage`). `EDIT`/`DELETE`/`DONE` are used as-is in both.
- `DONE` = generic status/state-change success with no clean ADD/EDIT/DELETE fit (change password, confirm phone, generic status toggle without known direction).
- `ASSIGN` = attaching/linking one entity to another.
- No generic verb fits at all → use `actionName={messages("...")}` instead of `actionType`.

## 4. `entity` — how to determine it

This is the step most likely to go wrong, so be deliberate:

1. **If the old `params` included `business` or `item`** → that string is the entity, directly.
2. **If `params` had no `business`/`item`** (e.g. only `{ actionName, id }`, or `{ name }`), the entity was implicit in the **translation key's own subject**, not in the params. Infer it from the key name (e.g. `ssm.succeedCreateAction` → subject is "action" → look for an existing entity-title key like `ssm.action`).
3. **Never invent new message text for the entity.** Search the existing i18n keys (e.g. `ssm-flat.json`, `sso.*BusinessTitle` keys) for a key whose Persian text matches the inferred subject.
4. **If no matching key exists** — stop and tell the user: *"No existing message key represents entity '<subject>' — please add one (e.g. `ssm.xyz`) before I convert this."* Do not fabricate a key or guess translated text.
5. **Everything else in `params`** (the actual data values — name, id, code, etc.) becomes `identifiers`, one entry per param: pick a sensible existing `title` key for each (e.g. `id` → `ssm.identifier`), `value` = the original param expression, unchanged.

### Worked example — no `business`/`item` param

```tsx
// BEFORE
<Translate
  tKey="ssm.succeedCreateAction"
  params={{ actionName: fieldsValue.serviceName, id: result?.resultData?.id }}
/>

// AFTER
<ToastMessage
  actionType="ADDED"
  entity={messages("ssm.action")} // inferred from key subject "Action", not from params
  identifiers={[
    { title: messages("ssm.activityName"), value: fieldsValue.serviceName },
    { title: messages("ssm.identifier"), value: result?.resultData?.id },
  ]}
/>
```

Both `params` (`actionName`, `id`) map 1:1 to `identifiers` — nothing extra was added there. The only value not sourced from `params` is `entity`, and per rule above it must resolve to an existing key (here `ssm.action` already exists).

## 5. `identifiers`

```ts
type Identifier = { title: string; value: string; prefix?: string; suffix?: string };
```

- `suffix` — trailing relational phrase: "... to/from the X list" (`sso.toBlackList`, `sso.fromBlackList`).
- `prefix` — leading relational phrase: "... for [operation]" (typically `prefix: messages("brdpManagement.for")`).
- Multiple identifiers are just multiple array entries, in the order the original params appeared.
- Prefer translated enum labels over raw constants as `value` (e.g. `messages("sso.delegationLogin")`, not `"DELEGATION_LOGIN"`).

## 6. Old → new param mapping cheat sheet

| Old `params` key | Goes to |
|---|---|
| `business` / `item` (when present) | `entity` |
| *(no business/item present)* | infer `entity` from the key's subject — see §4 |
| `key` | `identifiers[].title` |
| `value` / `name` / `username` / any other data field | `identifiers[].value` (one identifier per such field) |
| relational phrase ("to/from the list") | `identifiers[].suffix` |
| relational phrase ("for X") | `identifiers[].prefix` |

## 7. Recipes by shape

- **Add success** → `actionType="ADDED"`
- **Delete success** (incl. plain `messages("...deleteDynamicResponse", {...})` string calls) → `actionType="DELETE"`
- **Edit success** → `actionType="EDIT"`
- **Status/toggle change**: known boolean direction → `ACTIVATE`/`DEACTIVATE`; unclear direction → `DONE` (with a dedicated entity key like `sso.changeStatusStatementBusiness`, not the plain business-title key)
- **Assign** → `actionType="ASSIGN"`
- **No generic verb fits** → `actionName={messages("...")}` (e.g. `sso.changePassWithEmail`, `sso.changePassWithSms`, `brdpManagement.empty`, `brdpManagement.Charging`, `sso.phoneNumberConfirmation`)

## 8. Import & cleanup checklist

1. Add `ToastMessage` to the `@brdp/engine` import.
2. Remove `Translate` from that import only if no other `<Translate>` remains in the file.
3. Remove now-dead UI imports (e.g. `Typography`) that only served the old message.
4. Delete leftover `params`-ternary logic no longer referenced.
5. Delete stray commented-out old translation strings.
6. If the needed `actionType` isn't in `EntityActionType`/`ACTION_TRANSLATION_KEY` yet, add it there.
7. **If an entity key needed for §4 doesn't exist, don't proceed silently — flag it to the user.**

## 9. Decision table

| Need | Use |
|---|---|
| JSX with no standard-component equivalent | `<Translate />` |
| String prop | `useFormatMessage()` |
| Success/error CRUD toast | `ToastMessage` |
| Confirmation dialog | `ActionConfirmMessage` |
| Predefined action | `actionType` |
| Business action, no generic verb | `actionName` |
| Entity-identifying data | `identifiers` |
| Entity string missing from params | infer from key subject; if no matching message key exists, **ask the user to create one** — never invent |
