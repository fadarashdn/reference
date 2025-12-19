به جای اینکه مقدار رو واچ کنی و اینطوری استفاده کنی، بهتره از دیپندنسی استفاده کنی و مقدار رو از طریق
values.PersonType
بگیری. پرفورمنس این مدلی که پیاده کردی خیلی ناپسنده.
  const watchPersonType = fieldWatch("noneBeneficiaryType");
  const noneBeneficiaryGender = fieldWatch("noneBeneficiaryGender");
  const beneficiaryCustomerNumberValue = fieldWatch("beneficiaryCustomerNumber");
کلا واچ رو سعی کن هیچ‌وقت استفاده نکنی مگر اینکه مجبور باشیم و هیچ‌راهی نداشته باشیم. موارد اینطوری که استفاده کردی رو اکثرن میشه با همین دیپندسی و این‌ها هندل کرد.



نیم فاصله ها با دقت رعایت شود مثال: 
حساب های مرتبط not correct
نیم‌فاصله correct حساب‌های مرتبط 


if (personType === "REAL" && value.length !== 10) {
از enum یا
object as const
استفاده کن برای مواردی که مقدار ثابت دارن مثل
real, legal, foreign_real, and...



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
