# `GenerativeTable` — brdp Component Skill Guide

Reference for using the `ashianeh`/`brdp` shared table system. Read this before
generating or reviewing any code that renders a data table in this monorepo.
Do not invent props, hooks, or patterns that aren't listed here — this file is
the full surface area of the component.

## When to use this

Any list/grid view in the app (accounts, deposits, branches, members,
transactions, etc.) that needs: paginated data, row actions, header actions,
column search/filter, or row-level color highlighting. `GenerativeTable`
wraps antd's `Table` and should be used instead of raw antd `<Table />` in
this codebase.

## File map

| File | Exports | Responsibility |
|---|---|---|
| `generative-table.tsx` | `GenerativeTable` (default) | Root component: composes columns, pagination, header actions, row highlighting |
| `table/action.tsx` | `Actions` (default), `BarAction`, `BarActionRowParams`, `ShowingActionModesList` | Renders one action bar (row actions or header actions) with permission/confirm guards |
| `table/action-bar-builder.tsx` | `ActionBarBuilder`, `ActionBarBuilderType` | Renders a horizontal list of *labeled* action groups (used for table header actions) |
| `table/pagination.ts` | `useTablePagination`, `PageSizeType` | Local pagination state + `tableConfig()` adapter for `GenerativeTable` |
| `table/use-search-in-table-column.tsx` | `useSearchInTableColumn` | Per-column search/filter dropdown (antd `TableColumnType` props) |
| `table/row-highlighter/use-row-highlighter.ts` | `useRowHighlighter` | Turns a color-rule config into `rowClassName` + a "color guide" header action |

---

## 1. `GenerativeTable` — the entry point

```tsx
<GenerativeTable<RecordType>
  title="عنوان جدول"
  columns={columns}
  data={data}
  loading={isLoading}
  fromIndex={pagination.tableFromIndex}
  pagination={pagination.tableConfig(itemsCount)}
  rowActions={rowActions}
  tableHeaderActions={headerActions}
  rowSelection={{ ... }}
  rowHighlighter={{ ... }}
  expandable={{ ... }}
  emptyText="موردی یافت نشد"
/>
```

### Props

| Prop | Type | Notes |
|---|---|---|
| `columns` | `TableProps<RecordType>["columns"]` | Same as antd. `align` defaults to `"center"` if not set — don't set it explicitly unless you need something else. |
| `data` | `RecordType[]` (required) | Raw data source — row-index and action columns are injected automatically, don't add them yourself. |
| `fromIndex` | `number` | Starting row-number shown in the auto-added "ردیف" (row index) column. Pass `pagination.tableFromIndex` from `useTablePagination`, not a hand-computed value. |
| `rowKey` | `string` | Standard antd rowKey field name. |
| `loading` | `boolean` | |
| `size` | `"small" \| "middle"` | Defaults to `"small"`. |
| `pagination` | result of `useTablePagination().tableConfig(itemsCount)` | If omitted, pagination is disabled (`false`) — do not build this object by hand. |
| `rowActions` | `BarAction<RecordType>[]` | Injects a fixed-right "عملیات" column. Mode auto-picked: 1 action → `"smart"`, 2+ → `"ellipsis"`. You cannot override this mode from `GenerativeTable` — if you need a different mode, use `Actions` directly instead of `rowActions`. |
| `tableHeaderActions` | `ActionBarBuilderType<HeaderActionData>[]` | Rendered in the card's `extra` (top-right of the table header). Row-highlighter's "color guide" action is auto-prepended when `rowHighlighter` is set. |
| `rowSelection` | `{ onChange, actionButton, type, onSelect, onSelectAll, selectedRowKeys, getCheckboxProps }` | `type: "single"` maps to antd `radio`, anything else (default) maps to `checkbox`. `actionButton` renders a `Button` next to the title, disabled automatically when nothing is selected. |
| `rowHighlighter` | `RowHighlighterType<RecordType>` | See §5. |
| `expandable` | subset of antd `ExpandableConfig` | Only the listed keys are passed through. |
| `disableHorizontalScroll` | `boolean` | Omits `scroll={{ x: "1000px" }}` when true. |
| `emptyText` / `emptyIcon` | `string` / `ReactNode` | Passed into antd `locale.emptyText` via `<Empty />`. |

### Fixed widths (don't hardcode these elsewhere)

```ts
ROW_INDEX_WIDTH = 60
SELECTION_COL_WIDTH = 60
ACTION_COL_WIDTH = 80   // one ellipsis button only, per UX decision
```

### Behavioral notes / gotchas

- Table `key` is `generative-table-${currentPage}` — this remounts the table
  on page change (intentional, resets internal antd state like column
  resize). Don't remove this key thinking it's a stray prop.
- Direction is RTL: `fixed: "left"` visually renders on the right and vice
  versa — comments in the source call this out; don't "fix" the fixed sides.
- The row-index column and action column are appended by
  `addRowIndexColumn`/`addActionColumn` — never manually add a `__rowIndex`
  or `__actions` column key, they're reserved.
- `pagination.disabled` is computed from `itemsCount <= pageSize`, and
  `showSizeChanger` is disabled the same way — don't duplicate this logic in
  the caller.

---

## 2. Row / header actions — `BarAction<RecordType>` + `Actions`

```ts
const rowActions: BarAction<RecordType>[] = [
  {
    id: "editDeposit",
    appearance: { icon: <EditOutlined />, tooltip: "ویرایش", label: "ویرایش" },
    action: (record) => openEditModal(record),
    disabled: (record) => record.status === "locked",
    hidden: (record) => record.isSystemRecord,
    access: userAccess.canEdit, // strictly `false` hides it, anything else shows it
    permissionField: "canEdit", // or a function; failing this shows an "access denied" modal on click, item stays visible
    confirmMessage: (record) => `آیا از حذف ${record.name} مطمئن هستید؟`,
    loading: isDeleting,
  },
];
```

### Field semantics (don't blur these — they are different gates)

| Field | Effect when it fails | Item visibility |
|---|---|---|
| `hidden` | — | Removed from render entirely |
| `access === false` (exactly) | — | Removed from render entirely. `access: true/undefined/null` all show it. |
| `disabled` | Click does nothing | Still visible, greyed out |
| `permissionField` | Click shows an antd `modal.error` "عدم دسترسی" | **Still visible and enabled** — this is a soft/UX gate, not a hard hide |
| `confirmMessage` | Click opens `modal.confirm` before running `action` | n/a |

Guard execution order in `runActionWithGuards`: `disabled`/`hidden` short-circuit
first → permission check → confirm dialog (if `confirmMessage` present) →
`action(record, event)`. When writing a new action, don't use
`permissionField` as a substitute for `access` — they serve different UX
intents (silent hide vs. "you clicked but you're not allowed").

### `mode` (`ShowingActionModesList`)

| Mode | Behavior |
|---|---|
| `"normal"` | All action buttons rendered inline, icon-only |
| `"expanded"` | Same as normal but with visible text labels |
| `"smart"` (default) | Inline buttons up to `overflowCount` (default 4); beyond that, first `itemsCountOut` (default 2) stay inline, rest collapse into a `···` dropdown |
| `"ellipsis"` | Everything collapses into the `···` dropdown, nothing shown inline |

Use `Actions` directly (not through `GenerativeTable.rowActions`) when you
need a non-default `mode`/`overflowCount`/`itemsCountOut` — `GenerativeTable`
hardcodes the mode choice.

### Header/group actions — `ActionBarBuilder`

Use this (not raw `Actions`) for a *row of labeled action groups*, e.g. table
header actions or a toolbar:

```ts
const headerActions: ActionBarBuilderType<HeaderData>[] = [
  {
    id: "bulkActions",
    label: "عملیات گروهی",
    mode: "normal",
    data: someContextObject,
    actions: [/* BarAction<HeaderData>[] */],
  },
];
```

Each entry gets its own `Actions` block with an optional leading
`<Typography type="text" />` label. `mode` defaults to `"normal"` here (note:
different default than `Actions` itself, which defaults to `"smart"`).

---

## 3. Pagination — `useTablePagination`

```ts
const pagination = useTablePagination({ currentPage: 1, defaultPageSize: 20 });

<GenerativeTable
  fromIndex={pagination.tableFromIndex}
  pagination={pagination.tableConfig(itemsCount)}
  ...
/>

// fetching data:
useQuery(["deposits", pagination.PAGE_SIZE, pagination.offset], () =>
  fetchDeposits({ limit: pagination.PAGE_SIZE, offset: pagination.offset }),
);
```

- Page size options are restricted to `[10, 20, 50, 100]` by default; pass
  `defaultPageSize` to change the starting size (must be one of the allowed
  values, or a custom number if you know what you're doing).
- `calculatePageSizeOptions` trims/extends the options list to fit small
  datasets (e.g. adds the exact `itemsCount` as an option when it doesn't
  neatly match a preset) — this is computed automatically inside
  `tableConfig(itemsCount)`, don't recompute it in the caller.
- Changing page size always resets to page 1 (`updatePageSize` calls
  `updatePage(1)`) — expected behavior, not a bug to "fix".
- Use `offset`/`skip` (identical values, two names) for API calls,
  `pageIndex` for zero-based UI logic, `tableFromIndex` only for the row
  number column.

---

## 4. Column search — `useSearchInTableColumn`

```ts
const { getColumnSearchProps } = useSearchInTableColumn<RecordType>();

const columns: ColumnType<RecordType>[] = [
  {
    title: "نام مشتری",
    dataIndex: "customerName",
    ...getColumnSearchProps("customerName", "نام مشتری"),
  },
];
```

- Filtering itself is done with `globalSearchFilter` from `@brdp/utils` — do
  not write ad-hoc `includes()`/regex filter logic for a column that could
  use this hook.
- The dropdown has explicit `disabled={false}` / `readOnly={false}` on the
  `Input` and buttons — this is a deliberate guard so the search box isn't
  disabled when it's nested inside a disabled/read-only `FormGenerator`
  parent. Keep this if you copy the pattern elsewhere.
- Only one `dataIndex` per call; for a multi-field search box, don't try to
  bend this hook — build a custom header action/input instead.

---

## 5. Row highlighting — `useRowHighlighter`

```ts
const rowHighlighter: RowHighlighterType<RecordType> = {
  overdue: {
    label: "معوق",
    shouldHighlight: (record) => record.daysOverdue > 0,
  },
  vip: {
    label: "مشتری ویژه",
    shouldHighlight: (record) => record.tier === "vip",
  },
};

<GenerativeTable rowHighlighter={rowHighlighter} ... />
```

- Each key becomes a CSS class (via `clsx`) applied to matching rows —
  actual colors live in `row-highlighter.module.css`, keyed by the same
  color names; add the CSS class there when introducing a new key.
- Passing `rowHighlighter` automatically prepends a "راهنمای رنگ‌ها" (color
  guide) header action that opens an info modal listing every
  `label`/color pair — you don't need to build this legend yourself.
- Multiple rules can match the same row (`clsx` combines all truthy
  classes) — if two highlight colors should be mutually exclusive, that
  exclusivity must be encoded in each rule's `shouldHighlight`, the hook
  does not dedupe/prioritize.

---

## 6. Full composition example

```tsx
const Page = () => {
  const pagination = useTablePagination({ defaultPageSize: 20 });
  const { getColumnSearchProps } = useSearchInTableColumn<Deposit>();
  const { data, isLoading, totalCount } = useDepositsQuery(pagination);

  const columns: ColumnType<Deposit>[] = [
    { title: "نوع سپرده", dataIndex: "type", ...getColumnSearchProps("type", "نوع سپرده") },
    { title: "مانده", dataIndex: "balance" },
  ];

  const rowActions: BarAction<Deposit>[] = [
    {
      id: "editDeposit",
      appearance: { icon: <EditOutlined />, tooltip: "ویرایش" },
      action: (record) => openEditModal(record),
    },
    {
      id: "deleteDeposit",
      appearance: { icon: <DeleteOutlined />, tooltip: "حذف", danger: true },
      confirmMessage: (record) => `حذف سپرده ${record.type}؟`,
      action: (record) => deleteDeposit(record.id),
    },
  ];

  return (
    <GenerativeTable<Deposit>
      title="لیست سپرده‌ها"
      columns={columns}
      data={data ?? []}
      loading={isLoading}
      fromIndex={pagination.tableFromIndex}
      pagination={pagination.tableConfig(totalCount)}
      rowActions={rowActions}
      rowHighlighter={{
        overdue: { label: "معوق", shouldHighlight: (r) => r.daysOverdue > 0 },
      }}
    />
  );
};
```

## 7. Anti-patterns (things to flag in review / avoid generating)

- Don't render a bare antd `<Table />` when this component covers the need.
- Don't hand-roll pagination state — always go through `useTablePagination`.
- Don't add a manual "ردیف"/row-index or "عملیات"/actions column — they're
  injected automatically.
- Don't use `disabled` when you mean `access: false` (or vice versa) — they
  produce different UX (greyed-out-but-visible vs. fully hidden).
- Don't recompute `pageSizeOptions`/`disabled` pagination logic outside
  `tableConfig`.
- Don't write custom column-filter dropdowns for simple single-field text
  search — use `useSearchInTableColumn`.
