# 📝 Form Best Practices - 3 Critical Rules

## 1️⃣ ❌ Don't Use fieldWatch - Use Dependencies Instead

### Performance Problem:
```typescript
// ❌ WRONG - Bad Performance
const watchPersonType = fieldWatch("noneBeneficiaryType");
const noneBeneficiaryGender = fieldWatch("noneBeneficiaryGender");
const beneficiaryCustomerNumberValue = fieldWatch("beneficiaryCustomerNumber");

{
  name: "someField",
  type: "input",
  disabled: watchPersonType === "REAL", // ❌ Extra re-renders
}
```

### ✅ Correct Solution - Use Dependencies:
```typescript
// ✅ CORRECT - Good Performance
{
  name: "someField",
  type: "input",
  dependencies: ["noneBeneficiaryType"],
  disabled: ({ values }) => values.noneBeneficiaryType === "REAL",
}

// ✅ Multiple dependencies
{
  name: "anotherField",
  type: "input",
  dependencies: ["noneBeneficiaryType", "noneBeneficiaryGender"],
  hidden: ({ values }) => {
    return values.noneBeneficiaryType === "REAL" && 
           values.noneBeneficiaryGender === "MALE";
  },
}
```

### When to Use fieldWatch:
```typescript
// ✅ OK: Only when you MUST use it outside field config
const CustomerInfo = () => {
  const { fieldWatch, setFieldsValue } = useControlledForm();
  
  // Use case: Complex logic that affects multiple fields
  const customerType = fieldWatch("customerType");
  
  useEffect(() => {
    if (customerType === "LEGAL") {
      setFieldsValue({
        field1: "value1",
        field2: "value2",
        field3: "value3",
      });
    }
  }, [customerType]);
};
```

**Rule:** Use `dependencies` + `disabled/hidden` callbacks in 95% of cases. Only use `fieldWatch` when absolutely necessary.

---

## 2️⃣ Persian Typography - Half-Space (نیم‌فاصله)

### Rules:
```typescript
// ❌ WRONG
"حساب های مرتبط"        // Space
"برنامه ها"              // Space
"داده های ورودی"         // Space

// ✅ CORRECT
"حساب‌های مرتبط"         // Half-space (‌)
"برنامه‌ها"              // Half-space (‌)
"داده‌های ورودی"         // Half-space (‌)
```

### How to Type Half-Space:
- **Windows:** `Shift + Space`
- **VS Code:** Type regular space, then autocorrect (if extension installed)

### Common Patterns:
```typescript
// Plural suffix
"حساب‌ها"    "پرونده‌ها"    "کارت‌های بانکی"

// Possessive
"اطلاعات کاربر"  →  "اطلاعات‌ کاربر"  ❌
"اطلاعات کاربر"  →  "اطلاعات کاربر"   ✅ (no half-space needed)

// With "های"
"داده های سیستم"  →  "داده‌های سیستم"  ✅
```

### In Code:
```typescript
// ✅ All Persian text in messages must use half-space correctly
const messages = defineMessages({
  relatedAccounts: {
    id: "app.relatedAccounts",
    defaultMessage: "حساب‌های مرتبط",  // ✅ Half-space
  },
  userPrograms: {
    id: "app.userPrograms", 
    defaultMessage: "برنامه‌های کاربر",  // ✅ Half-space
  },
});
```

---

## 3️⃣ Use Constants for Fixed Values - No String Literals

### ❌ Problem:
```typescript
// ❌ WRONG - Magic strings
if (personType === "REAL" && value.length !== 10) {
  return Promise.reject("error");
}

if (status === "APPROVED") { ... }
if (type === "LEGAL") { ... }
```

### ✅ Solution - Use `const` or `enum`:

```typescript
// ✅ Option 1: Object as const (Preferred)
const PersonType = {
  REAL: "REAL",
  LEGAL: "LEGAL", 
  FOREIGN_REAL: "FOREIGN_REAL",
  FOREIGN_LEGAL: "FOREIGN_LEGAL",
} as const;

type PersonTypeValue = typeof PersonType[keyof typeof PersonType];

// ✅ Usage
if (personType === PersonType.REAL && value.length !== 10) {
  return Promise.reject("error");
}

// ✅ Option 2: Type union (for types only)
type PersonType = "REAL" | "LEGAL" | "FOREIGN_REAL" | "FOREIGN_LEGAL";

// ✅ Option 3: Enum (less preferred)
enum PersonType {
  REAL = "REAL",
  LEGAL = "LEGAL",
  FOREIGN_REAL = "FOREIGN_REAL",
}
```

### Real Example:
```typescript
// ✅ Define constants
const BillStatus = {
  CREATED: "ELECTRONIC_BILL_CREATED",
  ISSUED: "ELECTRONIC_BILL_ISSUED",
  APPROVED: "ELECTRONIC_BILL_APPROVED",
  PAID: "ELECTRONIC_BILL_PAYED",
  DELETED: "ELECTRONIC_BILL_DELETED",
} as const;

const CustomerType = {
  BANK: "BANK_CUSTOMER",
  OTHER: "OTHER_BANK_CUSTOMER",
} as const;

// ✅ Use in code
{
  name: "isBankCustomer",
  type: "select",
  data: {
    static: [
      { value: CustomerType.BANK, label: "مشتری بانک" },
      { value: CustomerType.OTHER, label: "مشتری سایر بانک‌ها" },
    ],
  },
}

// ✅ Use in validation
validation: {
  rules: [{
    validator: (_, value) => {
      if (personType === PersonType.REAL && value.length !== 10) {
        return Promise.reject("کد ملی باید ۱۰ رقم باشد");
      }
      if (personType === PersonType.LEGAL && value.length !== 11) {
        return Promise.reject("شناسه ملی باید ۱۱ رقم باشد");
      }
      return Promise.resolve();
    },
  }],
}
```

### Benefits:
- ✅ Autocomplete support
- ✅ Type safety
- ✅ Easy refactoring
- ✅ Catch typos at compile time
- ✅ Single source of truth

---

## Quick Summary:

| Rule | ❌ Wrong | ✅ Correct |
|------|---------|-----------|
| **Performance** | `fieldWatch` everywhere | `dependencies` + callbacks |
| **Typography** | `حساب های` (space) | `حساب‌های` (half-space) |
| **Constants** | `"REAL"` magic strings | `PersonType.REAL` |

---

## Checklist Before Commit:

- [ ] No `fieldWatch` in field config (use `dependencies` instead)
- [ ] All Persian text has correct half-spaces (‌)
- [ ] No magic strings (use `const` objects)
- [ ] Constants defined at top of file or in separate constants file




# 📝 Note: Modal Reset Button Behavior

## ✅ CORRECT Pattern for Modal with Search Form + Table

```typescript
// ❌ WRONG - Don't close modal on reset
<FormGenerator
  onReset={() => {
    hideAppModal("modal-id"); // ← WRONG!
  }}
/>

// ✅ CORRECT - Reset should clear filters and refetch data
<FormGenerator
  onReset={() => {
    setSearchData({ id: initialId }); // Clear to default
    resetPage();                       // Reset pagination
    // Modal stays open!
  }}
/>
```

## Pattern Rules:

### 1️⃣ Modal with Search Form + Table
**Purpose:** Search/filter data and display results

```typescript
const SearchModal = () => {
  const handleReset = () => {
    setSearchData({ id: defaultId }); // Reset to default filters
    resetPage();                       // Reset pagination to page 1
    // ✅ Modal stays OPEN
  };

  return (
    <FormGenerator
      reset
      resetLabel={messages(generalMessages.clearForm)}
      onReset={handleReset}
      // ...
    />
    <GenerativeTable ... />
  );
};
```

**Reset button should:**
- ✅ Clear all search filters
- ✅ Reset to default values (like `id`)
- ✅ Reset pagination to page 1
- ✅ Trigger new search with defaults
- ❌ NOT close the modal

**To close modal:** Use `onCancel` in modal options or X button

---

### 2️⃣ Modal with Submit Form (Create/Edit)
**Purpose:** Submit data (create/edit something)

```typescript
const CreateEditModal = () => {
  return (
    <FormGenerator
      reset
      resetLabel={messages(generalMessages.cancel)}
      onReset={() => {
        hideAppModal("create-modal"); // ✅ OK to close here
      }}
      onSubmit={(values) => {
        // Submit data
        hideAppModal("create-modal"); // ✅ Close after success
      }}
    />
  );
};
```

**Reset/Cancel button should:**
- ✅ Close the modal (discard changes)

**Submit button should:**
- ✅ Save data
- ✅ Close modal on success

---

## Summary:

| Modal Type | Reset Button Behavior | When to Close |
|------------|----------------------|---------------|
| **Search + Table** | Clear filters, refetch with defaults, **stay open** | Use `onCancel` option or X button |
| **Create/Edit Form** | Close modal (cancel operation) | After successful submit or on cancel |

## Team Convention:
> وقتی داخل مدال سرچ و جدول داریم، دکمه Reset فقط باید فیلترها رو پاک کنه و با مقادیر پیش‌فرض دوباره جستجو کنه، نه اینکه مدال رو ببنده. بستن مدال با دکمه‌های مخصوص خودش (X یا Cancel در options) انجام میشه.

---

## Example - Correct Implementation:

```typescript
export const KeyCategoryHistoryModal: React.FC<{
  currentKeyCategory: Partial<KeyCategoryType>;
}> = ({ currentKeyCategory }) => {
  const [searchData, setSearchData] = useState<Partial<KeyCategoryHistorySearchParams>>();
  const { resetPage } = useTablePagination();

  // ✅ CORRECT: Reset clears filters and refetches, modal stays open
  const handleReset = () => {
    setSearchData({ id: currentKeyCategory.id }); // Reset to default
    resetPage();                                   // Reset to page 1
  };

  return (
    <>
      <FormGenerator
        reset
        onReset={handleReset} // ✅ Just reset, don't close modal
        // ...
      />
      <GenerativeTable ... />
    </>
  );
};

// To use this modal:
showAppModal({
  id: "history-modal",
  title: "History",
  element: <KeyCategoryHistoryModal ... />,
  options: {
    closable: true,              // ✅ X button to close
    onCancel: () => {},          // ✅ Cancel handler to close
    // Reset button inside form won't close modal
  },
});
```





# 📝 Loading States Management - Quick Guide

## 1️⃣ Search Page Pattern (Form + Table)

### First Search vs Subsequent Searches

```typescript
const SearchPage = () => {
  const [searchData, setSearchData] = useState<SearchParams>();
  const { tableConfig, PAGE_SIZE, pageIndex, resetPage } = useTablePagination();

  // ✅ Use both isLoading & isFetching
  const { data, isLoading, isFetching, mutate } = useGet(
    ["search-key", pageIndex, searchData],
    Services.API.SEARCH({
      ...searchData,
      page: pageIndex,
      size: PAGE_SIZE,
    }),
    {
      enable: !!searchData,  // ← Don't load initially
      hasPagination: true,
    }
  );

  return (
    <>
      {/* ✅ First search: Form button shows loading */}
      <FormGenerator
        isSubmitting={isLoading}  // ← First search only
        onSubmit={(values) => {
          setSearchData(values);
          resetPage();
        }}
      />

      {/* ✅ Always shows, but empty initially */}
      <GenerativeTable
        data={data?.resultData?.items || []}
        loading={isFetching}  // ← All searches (first + subsequent)
        pagination={tableConfig(data?.resultData?.totalCount || 0)}
      />
    </>
  );
};
```

### Loading States:
| Scenario | Form Button | Table |
|----------|-------------|-------|
| **Page Load** | Normal | Empty (no loading) |
| **First Search** | `isLoading` ✅ | `isFetching` ✅ |
| **Next Searches** | Normal | `isFetching` ✅ |
| **Pagination** | Normal | `isFetching` ✅ |

---

## 2️⃣ Modal with Data Fetching

### ✅ ALWAYS Show Loading in Modals

```typescript
const DataModal = ({ id }) => {
  const { data, isLoading } = useGet(
    ["modal-data", id],
    Services.API.GET_DATA(id)
  );

  // ✅ MUST handle loading state
  if (isLoading) {
    return <Spin caption={messages(generalMessages.isFetchingData)} />;
  }

  return <div>{/* Show data */}</div>;
};
```

### Common Patterns:

```typescript
// Pattern 1: Spin component
if (isLoading) {
  return <Spin caption={messages(generalMessages.isFetchingData)} />;
}

// Pattern 2: Table loading prop
<GenerativeTable
  loading={isFetching}
  data={data?.resultData || []}
/>

// Pattern 3: Form submitting
<FormGenerator
  isSubmitting={isLoading}
  onSubmit={handleSubmit}
/>

// Pattern 4: Error + Loading
{isLoading && <Spin />}
{error && <ErrorAlert errorMessage={error.message} />}
{data && <Content />}
```

---

## 3️⃣ Key Rules

### ✅ DO:
- Use `enable: !!searchData` for search pages (empty table initially)
- Use `isLoading` for **first-time** loading (form submit button)
- Use `isFetching` for **all** loading states (table)
- **ALWAYS** handle loading in modals with data fetching

### ❌ DON'T:
- Show loading table on page load without search
- Forget loading state in modals
- Use only `isLoading` (misses subsequent fetches)
- Use only `isFetching` (works but less UX-friendly for first search)

---

## Quick Checklist:

- [ ] Form: `isSubmitting={isLoading}` برای اولین جستجو
- [ ] Table: `loading={isFetching}` برای همه جستجوها
- [ ] Initial: `enable: !!searchData` جدول خالی بدون لودینگ
- [ ] Modal: همیشه `if (isLoading) return <Spin />` داشته باشه

---

## Example - Complete Pattern:

```typescript
const MySearchPage = () => {
  const [searchData, setSearchData] = useState<Params>();
  const { pageIndex, PAGE_SIZE, resetPage, tableConfig } = useTablePagination();

  const { data, isLoading, isFetching } = useGet(
    ["search", pageIndex, searchData],
    Services.API.SEARCH({ ...searchData, page: pageIndex, size: PAGE_SIZE }),
    { enable: !!searchData, hasPagination: true }
  );

  return (
    <>
      <FormGenerator
        isSubmitting={isLoading}           // ✅ First search loading
        onSubmit={(values) => {
          setSearchData(values);
          resetPage();
        }}
      />
      
      <GenerativeTable
        data={data?.resultData?.items || []}
        loading={isFetching}                // ✅ All searches loading
        pagination={tableConfig(data?.resultData?.totalCount || 0)}
      />
    </>
  );
};
```
