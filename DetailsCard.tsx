import { Typography } from "@brdp/ui";
import { type ReactNode } from "react";
import { isFunction } from "@brdp/utils";
import Actions, {
  type BarAction,
  type ShowingActionModesList,
} from "../../src/table/action";
import styles from "./details-card.module.css";
import { Descriptions, Divider, Flex } from "antd";

type BaseListItem = {
  id: string | number;
};

type DetailField<T extends BaseListItem> = {
  key: keyof T;
  label: string;
  span?: number;
  children?: ReactNode | ((item: T) => ReactNode);
};

type DisplayOptions = {
  showHeader?: boolean;
  showActions?: boolean;
};

type DetailsCardProps<T extends BaseListItem> = {
  title?: string;
  extraIcon?: ReactNode;
  data: T[];
  column?: number;
  fields: DetailField<T>[];
  displayOptions?: DisplayOptions;
  onExtraClick?: () => void;
  itemActions?: BarAction<T>[];
  readOnly?: boolean;
  disabled?: boolean;
  mode?: ShowingActionModesList;
};

function DetailsCard<T extends BaseListItem>({
  title,
  extraIcon,
  onExtraClick,
  data,
  column = 2,
  fields = [],
  displayOptions = {},
  itemActions,
  disabled,
  readOnly,
  mode = "ellipsis",
}: DetailsCardProps<T>) {
  if (!data || data.length === 0) return null;

  const { showHeader = true, showActions = false } = displayOptions;
  const isReadOnlyOrDisabled = disabled || readOnly;

  const renderItems = (item: T) => {
    return fields.map((field) => {
      const value = field.children
        ? isFunction(field.children)
          ? field.children(item)
          : field.children
        : ((item[field.key] as ReactNode) ?? "-");

      return {
        key: String(field.key),
        label: field.label,
        children: value,
        span: field.span ?? 1,
      };
    });
  };

  return (
    <Flex vertical className={styles.detailsCard}>
      {showHeader && title && (
        <div className={styles.header}>
          <Typography text={title} />

          {!isReadOnlyOrDisabled && extraIcon && (
            <span className={styles.extraIcon} onClick={onExtraClick}>
              {extraIcon}
            </span>
          )}
        </div>
      )}

      {data.map((item, index) => (
        <div key={item.id}>
          <Flex justify="space-between" align="flex-start" gap="middle">
            <Descriptions
              className={styles.descriptions}
              size="small"
              column={column}
              items={renderItems(item)}
            />

            {!isReadOnlyOrDisabled && showActions && itemActions?.length && (
              <div className={styles.actions}>
                <Actions<T>
                  actions={itemActions}
                  record={item}
                  mode={mode}
                  itemsCountOut={1}
                  overflowCount={1}
                />
              </div>
            )}
          </Flex>

          {index < data.length - 1 && <Divider className={styles.divider} />}
        </div>
      ))}
    </Flex>
  );
}

export default DetailsCard;
