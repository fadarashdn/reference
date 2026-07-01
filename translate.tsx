````md
# BRDP Translation & Action Message Guide (LLM)

## Core Rules

### 1. Use `useFormatMessage()`

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

Example:

```tsx
entity={messages("sso.staticClientBusinessTitle")}
title={messages("brdpManagement.successful")}
```

---

### 2. Use `<Translate />`

Use when rendering translated JSX with interpolation.

```tsx
<Translate
  tKey="namespace.key"
  params={{
    key: "...",
    value: "...",
  }}
/>
```

Do **not** use `<Translate />` if a standard component (`ToastMessage`, `ActionConfirmMessage`) already exists.

---

## Standard Components

### ToastMessage

Use for **all standard toast descriptions**.

Example:

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

---

### ActionConfirmMessage

Use for confirmation dialogs.

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

## actionType

Use whenever possible.

Supported values:

```
ADD
ADDED
EDIT
DELETE
ACTIVATE
DEACTIVATE
APPROVE
REJECT
REGISTER
COMPLETE
FINALIZE
RETURN
RECEIVE
REQUEST
PAY
SETTLE
CONVERT
RELEASE
CREATION
DONE
```

const ACTION_TRANSLATION_KEY: Record<EntityActionType, TranslateKeys> = {
  DELETE: "brdpManagement.actionDelete", // حذف
  ADD: "brdpManagement.actionAddition", // افزودن
  EDIT: "brdpManagement.actionEdit", // ویرایش
  DEACTIVATE: "brdpManagement.deActivation", // غیرفعال سازی
  ACTIVATE: "brdpManagement.activation", // فعال سازی
  APPROVE: "brdpManagement.actionApprove", // تأیید
  REJECT: "brdpManagement.actionReject", // رد
  ADDED: "brdpManagement.actionAppended", //افزوده
  REGISTER: "brdpManagement.actionRegister", // ثبت
  COMPLETE: "brdpManagement.actionComplete", //تکمیل
  FINALIZE: "brdpManagement.actionFinalize", // نهایی سازی
  RETURN: "brdpManagement.actionReturn", // برگشت
  RECEIVE: "brdpManagement.actionReceive", //دریافت
  REQUEST: "brdpManagement.sendRequest", // ارسال درخواست
  PAY: "brdpManagement.actionPay", // پرداخت
  SETTLE: "brdpManagement.actionSettle", // تسویه
  CONVERT: "brdpManagement.actionConvert", // تبدیل
  RELEASE: "brdpManagement.actionRelease", // آزادسازی
  CREATION: "brdpManagement.actionCreation", //تشکیل
  DONE: "brdpManagement.actionDone", //انجام
};

If the action doesn't exist, use `actionName`.

---

## identifiers

Pass entity information using identifiers.

Single:

```tsx
identifiers={[
  {
    title: messages("common.name"),
    value: customerName,
  },
]}
```

Multiple:

```tsx
identifiers={[
  {
    title: messages("common.name"),
    value: customerName,
  },
  {
    title: messages("common.code"),
    value: customerCode,
  },
]}
```

Custom formatting:

```tsx
identifierBuilder={(ids) =>
  ids?.map(x => `${x.title}:${x.value}`).join(" | ")
}
```

---

# Decision Table

| Need | Use |
|------|-----|
| JSX translated text | `<Translate />` |
| String prop | `useFormatMessage()` |
| Success/Error CRUD toast | `ToastMessage` |
| Confirmation dialog | `ActionConfirmMessage` |
| Standard action | `actionType` |
| Business-specific action | `actionName` |

---

# LLM Instructions

When modifying this codebase:

1. Never hardcode visible text.
2. Always use `useFormatMessage()` for string props.
3. Use `<Translate />` only for custom translated JSX.
4. Prefer `ToastMessage` for all standard CRUD toast descriptions.
5. Prefer `ActionConfirmMessage` for confirmation dialogs.
6. Use `actionType` whenever a predefined action exists.
7. Use `actionName` only for custom business actions.
8. Pass business data through `entity` and `identifiers`; never concatenate translated strings.
9. When updating existing code, replace custom CRUD translations with `ToastMessage` if the message follows the standard action pattern.
10. Preserve the existing architecture and translation conventions instead of introducing new translation patterns.
````
