import { Button, DetailsCard, IconsList } from "@brdp/ui";
import { generateUuidV4, getFormatMessage, pxToRem } from "@brdp/utils";
import { App } from "antd";
import { Fragment, useRef, useState, type ReactNode } from "react";
import type { BusinessElementFieldsProps } from "../../form-field";

type ModalSizes = "wide" | "default" | "small";

const modalSizes = {
  wide: pxToRem("1200px"),
  default: pxToRem("820px"),
  small: pxToRem("420px"),
} satisfies Record<ModalSizes, string>;

const ID_PREFIX = "dynamic-list-item";

type ListItem = {
  id: string;
  [key: string]: unknown;
};

type DetailField = {
  key: string;
  label: string;
  span?: number;
  children: ReactNode;
};

type AddItemListExtraProps = BusinessElementFieldsProps<{
  addButtonLabel?: string;
  formTitle?: string;
  editFormTitle?: string;
  modalSize?: ModalSizes;
  ModalForm?: React.ComponentType<{
    initialValues?: Record<string, unknown>;
    onSubmit: (data: Record<string, unknown>) => void;
    onCancel: () => void;
  }>;
  componentProps?: Record<string, unknown>;
  detailCardFields?: DetailField[];
  detailCardTitle?: string;
  detailCardColumn?: number;
  displayOptions?: {
    showHeader?: boolean;
    showActions?: boolean;
  };
}>;

export const DynamicListField: React.FC<AddItemListExtraProps> = ({
  id,
  onChange,
  options,
  value,
}) => {
  const messages = getFormatMessage();
  const { modal } = App.useApp();
  const ref = useRef<ReturnType<typeof modal["info"]>>(null);

  const {
    addButtonLabel = messages("brdpManagement.actionAddition"),
    formTitle = messages("brdpManagement.actionAddItem"),
    editFormTitle = "",
    ModalForm,
    componentProps = {},
    detailCardFields = [],
    detailCardTitle = "",
    detailCardColumn = 2,
    displayOptions = { showHeader: true, showActions: true },
    modalSize,
  } = options?.extraProps || {};

  const [internalItems, setInternalItems] = useState<ListItem[]>(
    Array.isArray(value)
      ? value.map((item: Record<string, unknown>) => ({
          ...item,
          id:
            item.id && typeof item.id === "string" && item.id.startsWith(ID_PREFIX)
              ? item.id
              : `${ID_PREFIX}-${generateUuidV4()}`,
        }))
      : [],
  );

  const generateId = (): string => {
    return `${ID_PREFIX}-${generateUuidV4()}`;
  };

  const handleRemoveItem = (item: ListItem): void => {
    const filteredItems = internalItems.filter((i) => i.id !== item.id);
    setInternalItems(filteredItems);
    onChange?.(filteredItems);
  };

  const handleModalSubmit = (
    formData: Record<string, unknown>,
    mode: "add" | "edit",
    editingItem: ListItem | null,
  ) => {
    if (mode === "add") {
      const newItem = { ...formData, id: generateId() };
      const updatedItems = [...internalItems, newItem];
      setInternalItems(updatedItems);
      onChange?.(updatedItems);
    } else if (mode === "edit" && editingItem) {
      const updatedItems = internalItems.map((i) =>
        i.id === editingItem.id ? { ...i, ...formData } : i,
      );
      setInternalItems(updatedItems);
      onChange?.(updatedItems);
    }
  };

  if (!ModalForm) {
    console.error("DynamicListField: ModalForm is required");
    return null;
  }

  const openAddModal = () => {
    ref.current = modal.info({
      title: formTitle,
      width: modalSizes[modalSize ?? "small"],
      closable: true,
      footer: null,
      icon: null,
      rootClassName: "brdp-modal",
      zIndex: 1000,
      content: (
        <ModalForm
          initialValues={undefined}
          onCancel={() => {
            ref.current?.destroy();
          }}
          onSubmit={(formData) => {
            handleModalSubmit(formData, "add", null);
            ref.current?.destroy();
          }}
          {...componentProps}
        />
      ),
    });
  };

  const openEditModal = (item: ListItem) => {
    ref.current = modal.info({
      title: editFormTitle || formTitle,
      width: modalSizes[modalSize ?? "small"],
      closable: true,
      footer: null,
      icon: null,
      rootClassName: "brdp-modal",
      zIndex: 1000,
      content: (
        <ModalForm
          initialValues={item}
          onCancel={() => {
            ref.current?.destroy();
          }}
          onSubmit={(formData) => {
            handleModalSubmit(formData, "edit", item);
            ref.current?.destroy();
          }}
          {...componentProps}
        />
      ),
    });
  };

  return (
    <Fragment key={id}>
      {internalItems.length === 0 ? (
        <Button
          type="glass"
          onClick={openAddModal}
          disabled={options?.disabled}
          label={addButtonLabel}
          block
        />
      ) : (
        <DetailsCard
          data={internalItems}
          readOnly={options?.readOnly}
          disabled={options?.disabled}
          title={detailCardTitle}
          extraIcon={<IconsList.PlusCircleIcon />}
          onExtraClick={openAddModal}
          column={detailCardColumn}
          fields={detailCardFields}
          displayOptions={displayOptions}
          itemActions={[
            {
              id: "edit",
              appearance: {
                icon: <IconsList.EditIcon />,
                tooltip: messages("brdpManagement.actionEdit"),
              },
              action: (item: ListItem) => openEditModal(item),
              disabled: options?.disabled,
            },
            {
              id: "delete",
              appearance: {
                icon: <IconsList.DeleteIcon />,
                tooltip: messages("brdpManagement.actionDelete"),
              },
              action: (item: ListItem) => handleRemoveItem(item),
              disabled: options?.disabled,
            },
          ]}
        />
      )}
    </Fragment>
  );
};

DynamicListField.displayName = "DynamicListField";

export default DynamicListField;
