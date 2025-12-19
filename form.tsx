// ====================================================================================================
//  HOW TO USE THE BRDP FORM SYSTEM
//  Quick Start Guide for Developers
// ====================================================================================================
//
//  This file contains the complete custom form infrastructure (FormGenerator + useControlledForm).
//
//  BASIC USAGE
//  ────────────────────────────────────────────────────────────────────────────────────────────────
//  1. Import the form
//     import FormGenerator from "@brdp/ui/form";   // Direct usage
//     OR
//     import { useControlledForm } from "@brdp/ui/form";  // For programmatic control
//
//  2. Define your form fields as an array
//     const fields = [
//       { name: "username", type: "input", label: "Username" },
//       { name: "email",    type: "input", label: "Email", validation: { rules: [{ required: true }] } },
//       { name: "active",   type: "checkbox", label: "Is Active?" },
//     ];
//
//  3. Render the form
//     <FormGenerator
//       id="userForm"                  // Required unique ID
//       title="Create User"            // Optional card title
//       fields={fields}                // Your field definitions
//       initialValues={{ active: true }} // Optional default values
//       onSubmit={(values) => {
//         console.log("Submitted:", values);
//         // Send to API, etc.
//       }}
//       readOnly={false}               // Set true for display-only mode
//       disabled={isLoading}           // Global disable
//       isLoading={isFetching}         // Shows spinner overlay
//       submitLabel="Save User"        // Custom button text
//     />
//
//  CONTROLLED FORM (Advanced - Recommended for complex forms)
//  ────────────────────────────────────────────────────────────────────────────────────────────────
//  const { ControlledForm } = useControlledForm<UserFormType>("userForm");
//
//  <ControlledForm
//    fields={fields}
//    onSubmit={handleSave}
//    isSubmitting={saving}
//    readOnly={viewMode}
//  />
//
//  With this hook you get full programmatic access:
//    - form.setFieldsValue(...)
//    - form.validateFields()
//    - form.getFieldValue("username")
//    - validateRequiredGroup(...)
//    - toggleFormDisable()
//
//  FIELD TYPES
//  ────────────────────────────────────────────────────────────────────────────────────────────────
//  Standard:
//    "input" | "password" | "checkbox" | "select" | "numeric" | "textarea"
//    "time-picker" | "range-date-picker" | "cascader" | "radio-button" | "tree-select" | "divider"
//
//  Business Elements (Custom components):
//    type: "business"
//    element: FormGenerator.AmountField   // or any registered component
//
//  Example - Amount Field with currency formatting:
//    {
//      name: "price",
//      type: "business",
//      element: FormGenerator.AmountField,
//      label: "Price",
//      options: {
//        extraProps: {
//          addonAfter: "IRR",
//          toWordify: true,     // Shows tooltip with Persian words
//          placeholder: "0"
//        }
//      }
//    }
//
//  DYNAMIC BEHAVIOR (Dependencies)
//  ────────────────────────────────────────────────────────────────────────────────────────────────
//  Hide/disable a field based on another:
//
//    {
//      name: "reason",
//      type: "input",
//      label: "Reason for rejection",
//      dependencies: ["status"],
//      hidden: ({ values }) => values.status !== "rejected",
//      disabled: ({ values }) => values.status === "approved"
//    }
//
//  Validation can also be conditional:
//    validation: {
//      rules: [{ required: ({ getFieldValue }) => getFieldValue("status") === "rejected" }]
//    }
//
//  REQUIRED GROUPS (At least one field must be filled - blue asterisk)
//  ────────────────────────────────────────────────────────────────────────────────────────────────
//    {
//      name: "nationalId",
//      label: "National ID",
//      requiredGroup: "identity"
//    },
//    {
//      name: "passport",
//      label: "Passport Number",
//      requiredGroup: "identity"
//    }
//
//  Use validateRequiredGroup() from useControlledForm hook for server-side enforcement.
//
//  LAYOUT CONTROL
//  ────────────────────────────────────────────────────────────────────────────────────────────────
//    layout: {
//      span: 1 | 2 | 3 | 4,      // Width (1=25%, 2=50%, etc.)
//      offset: 0 | 1 | 2 | 3,    // Left margin
//      endPoint: true           // Force new row after this field
//    }
//
//  READ-ONLY MODE
//  ────────────────────────────────────────────────────────────────────────────────────────────────
//  Set readOnly={true} on FormGenerator:
//    → Empty values show as "—"
//    → Inputs become non-editable with clean styling
//    → No placeholders, suffixes, or clear icons shown
//
//  That's it! You can now build any form — simple search filters, complex multi-step wizards,
//  or read-only detail views — using the same consistent system.
//
//  Need more business elements? Just create a component and attach it:
//    FormGenerator.MyNewField = MyNewFieldComponent;
//
//  Happy coding!
// ====================================================================================================


import React, {
  Fragment,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Spin,
  Tooltip,
  TreeSelect,
  Typography,
  type FormInstance,
  type GetProps,
} from "antd";
import { BaseOptionType, DefaultOptionType } from "antd/es/select";
import { CascaderProps, TreeSelectProps } from "antd";
import { valueType } from "antd/es/statistic/utils";
import clsx from "clsx";
import { flushSync } from "react-dom";

// -------------------------------------------------------------------
// External utilities (assumed to exist in @brdp/utils)
// -------------------------------------------------------------------
import {
  generalMessages,
  getFormatMessage,
  isFunction,
} from "@brdp/utils";

// -------------------------------------------------------------------
// Custom hooks
// -------------------------------------------------------------------
import { useQueryParams } from "./hooks/use-query-params";

// -------------------------------------------------------------------
// Business Elements (imported here for the repository)
// -------------------------------------------------------------------
import AmountField from "./business-elements/amount-field/amount-field";
import AutoCompleteField from "./business-elements/auto-complete-field/auto-complete-field";
import BankIdentifierField, {
  bankIdentifierValidationRules,
} from "./business-elements/bank-identifier-field/bank-identifier-field";
import ButtonField from "./business-elements/button-field/button-field";
import CalculatorField from "./business-elements/calculator-field/calculator-field";
import CardNumberField, {
  validateCardNumber,
} from "./business-elements/card-number-field/card-number-field";
import CollapseField from "./business-elements/collapse-field/collapse-field";
import DatePickerField from "./business-elements/date-time-picker-filed/date-picker-field";
import DateTimePickerField from "./business-elements/date-time-picker-filed/date-time-picker-field";
import DynamicListField from "./business-elements/dynamic-list-field/dynamic-list-field";
import FileParserField from "./business-elements/file-parser-field/file-parser-field";
import FileUploaderField from "./business-elements/file-uploader-field/file-uploader-field";
import IbanField, {
  ibanNumberValidationRules,
} from "./business-elements/iban-field/iban-field";
import NestedDynamicField from "./business-elements/nested-dynamic-field/nested-dynamic-field";
import PostalCodeField, {
  postalCodeValidationRules,
} from "./business-elements/postal-code-field/postal-code-field";
import ShahabCodeField, {
  shahabCodeValidationRules,
} from "./business-elements/shahab-code-field/shahab-code-field";
import SortableField from "./business-elements/sortable-field/sortable-field";
import TagField from "./business-elements/tag-field/tag-field";
import TimePickerField from "./business-elements/date-time-picker-filed/time-picker-field";
import BusinessTagDemo from "./business-elements/business-tag-demo";

// -------------------------------------------------------------------
// Local components
// -------------------------------------------------------------------
import DatePicker from "../dateTime/date-picker"; // assuming relative path
import { ActionBarBuilder, type ActionBarBuilderType } from "../table/action-bar-builder";
import { CollapseFieldExtraProps } from "./business-elements/collapse-field/collapse-field";
import { RecursivePartial } from "../types/type-helpers";

// -------------------------------------------------------------------
// Types & Constants
// -------------------------------------------------------------------
const { useBreakpoint } = Grid;
const GRID_COLUMNS = 24;
const SPAN_UNIT = 6;

export type IgnorablePattern = `__${string}`;

export type BaseFormField<
  Fields,
  NameOfFields = keyof Fields | IgnorablePattern
> = {
  name: NameOfFields;
  label: string;
  validation?: {
    rules: GetProps<typeof Form.Item>["rules"];
  };
  dependencies?: NameOfFields[];
  tooltip?: string;
  extra?: string;
  hasFeedback?: boolean;
  layout?: {
    span?: 1 | 2 | 3 | 4;
    offset?: 0 | 1 | 2 | 3;
    endPoint?: boolean;
  };
  disabled?: boolean | ((options: { values: Partial<Fields> }) => boolean);
  hidden?: boolean | ((options: { values: Partial<Fields> }) => boolean);
  readOnly?: boolean;
  requiredGroup?: string;
};

export type FormBusinessField<
  Fields,
  ExtraProps extends object = object,
  StaticData extends object = object
> = BaseFormField<Fields> & {
  type: "business";
  element:
    | BusinessElementsRepositoryTypes[keyof BusinessElementsRepositoryTypes]
    | React.ElementType<BusinessElementFieldsProps<Partial<ExtraProps>, StaticData>>;
  options?: {
    returnFormat?: {
      type: "string" | "object" | "fn";
      template: string | object | ((data: unknown) => null | number | string | object);
    };
    staticData?: StaticData;
    placeholder?: string;
    extraProps?: ExtraProps;
  };
};

export type BusinessElementFieldsProps<
  ExtraProps extends object = object,
  StaticData extends object = object
> = {
  id: string;
  name: string;
  value?: unknown;
  onChange?: (value: unknown) => void;
  validation?: unknown;
  form: FormInstance;
  options?: FormBusinessField<never, ExtraProps, StaticData>["options"] &
    Omit<FormBusinessField<never, ExtraProps, StaticData>, "element" | "options"> & {
      disabled?: boolean;
      hidden?: boolean;
    };
};

type FormSelectField<Fields> = BaseFormField<Fields> & {
  type: "select";
  options?: {
    initialValue?: unknown;
    searchable?: boolean;
    multiple?: boolean;
    maxCount?: number;
    placeholder?: string;
    onSearch?: (value: string) => void;
    onSelect?: (value: valueType, option: DefaultOptionType) => void;
    dataMapper?: {
      label?: string;
      value?: string;
      options?: string;
      groupLabel?: string;
    };
    tags?: boolean;
  };
  data:
    | { static: { value: string | number | boolean; label: string; disabled?: boolean }[] }
    | { static: { label: string; title: string; options: { label: string; value: string | number | boolean }[] }[] };
  loading?: boolean;
};

interface CascaderDataNodeType {
  value: string;
  label: string;
  children?: CascaderDataNodeType[];
}

type FormCascaderField<Fields> = BaseFormField<Fields> & {
  type: "cascader";
  options?: {
    searchable?: boolean;
    multiple?: boolean;
    maxCount?: number;
    placeholder?: string;
  };
  data: CascaderProps<CascaderDataNodeType>["options"];
  loading?: boolean;
};

type FormInputField<Fields> = BaseFormField<Fields> & {
  type: "input";
  options?: {
    prefix?: string;
    suffix?: string;
    placeholder?: string;
    direction?: "ltr" | "rtl";
    initialValue?: unknown;
  };
};

type FormPasswordField<Fields> = BaseFormField<Fields> & {
  type: "password";
  options?: { placeholder?: string };
};

type FormCheckboxField<Fields> = BaseFormField<Fields> & {
  type: "checkbox";
};

type FormNumericField<Fields> = BaseFormField<Fields> & {
  type: "numeric";
  options?: {
    placeholder?: string;
    prefix?: string;
    suffix?: string;
  };
};

type FormTextareaField<Fields> = BaseFormField<Fields> & {
  type: "textarea";
  options?: {
    maxLength?: number;
    placeholder?: string;
    direction?: "ltr" | "rtl";
    rows?: number;
  };
};

type FormTimePickerField<Fields> = BaseFormField<Fields> & {
  type: "time-picker";
  options?: {
    disabledDate?: (current: Date) => boolean;
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
  };
};

type FormRangePickerField<Fields> = BaseFormField<Fields> & {
  type: "range-date-picker";
  options?: {
    disabledDate?: (current: Date) => boolean;
    minDate?: Date;
    maxDate?: Date;
    placeholder?: [string, string];
  };
};

type FormRadioButtonField<Fields> = BaseFormField<Fields> & {
  type: "radio-button";
  data: {
    static: {
      value: string | number | boolean;
      label: string;
      disabled?: boolean;
    }[];
  };
};

interface TreeSelectDataNodeType {
  value: string;
  title: string;
  icon: TreeSelectProps<TreeSelectDataNodeType>["treeIcon"];
  children?: TreeSelectDataNodeType[];
}

type FormTreeSelectField<Fields> = BaseFormField<Fields> & {
  type: "tree-select";
  options?: {
    placeholder?: string;
    treeCheckable?: boolean;
    showIcon?: boolean;
    expandAll?: boolean;
    treeLine?: boolean;
    showLeafIcon?: boolean;
    multiple?: boolean;
  };
  data: TreeSelectProps<TreeSelectDataNodeType>["treeData"];
};

type DividerField<Fields> = BaseFormField<Fields> & {
  type: "divider";
  options?: {
    orientation?: "left" | "right" | "center";
  };
};

export type FormField<Fields> =
  | FormBusinessField<Fields>
  | FormSelectField<Fields>
  | FormCascaderField<Fields>
  | FormInputField<Fields>
  | FormPasswordField<Fields>
  | FormCheckboxField<Fields>
  | FormNumericField<Fields>
  | FormTextareaField<Fields>
  | FormTimePickerField<Fields>
  | FormRangePickerField<Fields>
  | FormRadioButtonField<Fields>
  | FormTreeSelectField<Fields>
  | DividerField<Fields>;

// -------------------------------------------------------------------
// Customized Required Mark
// -------------------------------------------------------------------
interface CustomizedRequiredMarkContext {
  required: boolean;
  requiredGroup?: string;
}

const CustomizedRequiredMark = (
  label: React.ReactNode,
  context: { required: boolean } | CustomizedRequiredMarkContext,
) => {
  const isRequiredGroup = "requiredGroup" in context && context.requiredGroup;
  const isRequired = context.required;

  return (
    <>
      {label}
      {isRequired && !isRequiredGroup ? (
        <Typography.Text strong style={{ paddingInlineStart: 4 }} type="danger">
          <span>*</span>
        </Typography.Text>
      ) : null}
      {isRequiredGroup ? (
        <Typography.Text strong style={{ color: "#1890ff", paddingInlineStart: 4 }}>
          <span>*</span>
        </Typography.Text>
      ) : null}
    </>
  );
};

// -------------------------------------------------------------------
// Form Fields Renderer
// -------------------------------------------------------------------
const RenderBusinessElement: React.FC<
  BusinessElementFieldsProps & { field: FormBusinessField<never> }
> = ({ name, id, onChange, validation, value, form, field: { element, options, ...restField } }) => {
  return React.createElement(element as React.ElementType, {
    id,
    name,
    value,
    onChange,
    validation,
    form,
    options: { ...options, ...restField },
  });
};

type RenderFormFieldProps<Fields> = {
  field: FormField<Fields>;
  form: FormInstance;
};

const FormFieldsRenderer = <Fields,>({ field, form }: RenderFormFieldProps<Fields>) => {
  const messages = getFormatMessage();

  const calculatedRelationResult = Form.useWatch((values) => {
    if (!field.dependencies || field.dependencies.length === 0) return () => {};

    const result: Partial<Fields> = {};
    field.dependencies.forEach((key: keyof Fields | IgnorablePattern) => {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        result[key as keyof Fields] = values[key];
      }
    });
    return result;
  }, form);

  const relationHandler = useCallback(
    (cb?: boolean | ((options: { values: Partial<Fields> }) => boolean)) => {
      if (isFunction(cb)) {
        return cb({ values: calculatedRelationResult as Partial<Fields> });
      }
      return cb ?? false;
    },
    [calculatedRelationResult],
  );

  const getCommonFormItemProps = React.useCallback(
    (field: FormField<Fields>) => {
      const { name, label, validation, tooltip, extra, hasFeedback, hidden } = field;
      return {
        name: name as string,
        htmlFor: String(name),
        label,
        rules: validation?.rules,
        tooltip,
        extra,
        hasFeedback,
        hidden: hidden === undefined ? undefined : relationHandler(hidden),
      };
    },
    [relationHandler],
  );

  const renderFormItem = (
    formItemProps: Record<string, any>,
    children: React.ReactNode,
  ) => {
    const businessElementName =
      field.type === "business"
        ? (field.element as React.ComponentType).displayName ||
          (field.element as React.ComponentType).name
        : undefined;

    return (
      <Form.Item
        key={String(field.name)}
        {...getCommonFormItemProps(field)}
        layout={field.readOnly ? "horizontal" : "vertical"}
        {...formItemProps}
        className={clsx(
          { "brdp-readonly-field": field.readOnly },
          { "brdp-disabled-field": field.disabled },
          { "brdp-business-field": field.type === "business" },
          { [`brdp-field--type-${field.type}`]: field.type },
          { [`brdp-business-${businessElementName}`]: businessElementName },
        )}
      >
        {children}
      </Form.Item>
    );
  };

  const commonInputProps = {
    id: String(field.name),
    disabled:
      (field.disabled || field.readOnly) === undefined
        ? undefined
        : relationHandler(field.disabled || field.readOnly),
    hidden: relationHandler(field.hidden),
  };

  switch (field.type) {
    case "business":
      return renderFormItem(
        {},
        <RenderBusinessElement
          field={{ ...field, ...commonInputProps }}
          id={String(field.name)}
          name={field.name as string}
          validation={field.validation}
          form={form}
        />,
      );

    case "input": {
      const fieldValue = form.getFieldValue(field.name);
      const isReadOnly = Boolean(field.readOnly);
      const span = field.layout?.span ?? 1;
      const valueCharSizes = { 1: 15, 2: 45, 3: 80, 4: 110 };
      const withToottip =
        isReadOnly &&
        (typeof fieldValue === "string" || typeof fieldValue === "number") &&
        String(fieldValue).length >= valueCharSizes[span];

      const TooltipComp = withToottip ? Tooltip : Fragment;
      const tooltipProps: TooltipProps = withToottip
        ? { title: fieldValue, trigger: ["focus", "hover"] }
        : {};
      const inputProps: InputProps = withToottip
        ? {
            onChange: (e) => form.setFieldValue(field.name, e.target.value),
            defaultValue: fieldValue,
            value: fieldValue,
          }
        : {};

      return renderFormItem(
        { labelAlign: "right", initialValue: field.options?.initialValue },
        <TooltipComp {...tooltipProps}>
          <Input
            {...commonInputProps}
            addonAfter={field.options?.suffix}
            addonBefore={field.options?.prefix}
            placeholder={field.options?.placeholder}
            dir={field?.options?.direction}
            className={clsx({ "ellipsis-input-filed-with-tooltip": withToottip })}
            {...inputProps}
          />
        </TooltipComp>,
      );
    }

    case "numeric":
      return renderFormItem(
        {},
        <InputNumber<string>
          style={{ width: "100%" }}
          addonAfter={field.options?.suffix}
          addonBefore={field.options?.prefix}
          {...commonInputProps}
          controls={false}
          keyboard={false}
          placeholder={field.options?.placeholder}
        />,
      );

    case "password":
      return renderFormItem(
        {},
        <Input.Password {...commonInputProps} placeholder={field.options?.placeholder} />,
      );

    case "checkbox":
      return renderFormItem(
        {
          layout: "horizontal",
          valuePropName: "checked",
          style: { height: "100%", display: "flex", alignItems: "center" },
        },
        <Checkbox {...commonInputProps} className="brdp-checkbox" rootClassName="brdp-checkbox-root">
          {field.label}
        </Checkbox>,
      );

    case "select":
      return renderFormItem(
        { initialValue: field.options?.initialValue },
        <Select
          {...commonInputProps}
          options={field.data.static as unknown as BaseOptionType[]}
          showSearch={field.options?.searchable}
          mode={field.options?.multiple ? "multiple" : field.options?.tags ? "tags" : undefined}
          onSearch={field?.options?.onSearch}
          onSelect={field?.options?.onSelect}
          maxTagCount={field.options?.maxCount}
          allowClear={true}
          loading={field.loading}
          placeholder={field.options?.placeholder ?? messages(generalMessages.doChoose)}
          fieldNames={field.options?.dataMapper}
          notFoundContent={<Empty description={messages(generalMessages.notFound)} />}
          filterOption={(_input, option) => {
            const input = _input.toLowerCase().trim();
            const label = option?.label?.toString().toLowerCase().trim();
            if (label.includes(input)) return true;
            const value = option?.value?.toString().toLowerCase().trim();
            if (value.includes(input.trim())) return true;
            return false;
          }}
        />,
      );

    case "cascader":
      return renderFormItem(
        {},
        <Cascader
          {...commonInputProps}
          options={field.data}
          showSearch={field.options?.searchable}
          multiple={field.options?.multiple}
          maxTagCount={field.options?.maxCount}
          allowClear={true}
          placeholder={field.options?.placeholder}
          loading={field.loading}
        />,
      );

    case "textarea":
      return renderFormItem(
        {},
        <Input.TextArea
          {...commonInputProps}
          maxLength={field.options?.maxLength}
          showCount={Boolean(field.options?.maxLength)}
          placeholder={field.options?.placeholder}
          rows={field.options?.rows}
          dir={field.options?.direction}
        />,
      );

    case "time-picker":
      return renderFormItem(
        {},
        <DatePicker.TimePicker
          {...commonInputProps}
          style={{ width: "100%" }}
          placeholder={field.options?.placeholder}
        />,
      );

    case "range-date-picker":
      return renderFormItem(
        {},
        <DatePicker.RangePicker
          {...commonInputProps}
          style={{ width: "100%" }}
          placeholder={field.options?.placeholder}
        />,
      );

    case "radio-button":
      return renderFormItem(
        {},
        <Radio.Group {...commonInputProps} options={field.data.static as any} />,
      );

    case "tree-select":
      return renderFormItem(
        {},
        <TreeSelect
          treeData={field.data}
          allowClear
          multiple={field.options?.multiple ?? true}
          placeholder={field.options?.placeholder}
          placement="bottomLeft"
          showSearch
          treeCheckable={field.options?.treeCheckable}
          treeDefaultExpandAll={field.options?.expandAll}
          treeIcon={field.options?.showIcon}
          treeLine={field.options?.treeLine && { showLeafIcon: field.options?.showLeafIcon }}
        />,
      );

    case "divider":
      return <Divider {...field.options}>{field.label}</Divider>;

    default:
      console.error(`rendering form field: invalid field type ${field.type}`);
      return null;
  }
};

// -------------------------------------------------------------------
// Form Fields Row
// -------------------------------------------------------------------
type ResponsiveSpan = { xs: number; md: number; lg: number };

const calculateSpan = <Fields,>(field: FormField<Fields>): ResponsiveSpan => {
  const fieldSpan = field.layout?.span ?? 1;
  return {
    xs: GRID_COLUMNS,
    md: fieldSpan >= 2 ? GRID_COLUMNS : 12,
    lg: fieldSpan * SPAN_UNIT,
  };
};

const getCurrentSpanValue = (
  span: ResponsiveSpan,
  breakpoint: ReturnType<typeof useBreakpoint>,
): number => {
  if (breakpoint.lg) return span.lg;
  if (breakpoint.md) return span.md;
  return span.xs;
};

const groupFields = <Fields,>(fields: FormField<Fields>[]) => {
  return fields
    .reduce<FormField<Fields>[][]>((rows, field) => {
      rows.at(-1)?.push(field);
      if (field.layout?.endPoint) rows.push([]);
      return rows;
    }, [[]])
    .filter((row) => row.length > 0);
};

type FormFieldsRowProps<Fields> = {
  fields: FormField<Fields>[];
  form: FormInstance<Fields>;
  gutter?: number;
  readOnly?: boolean;
  disabled?: boolean;
  withBorder?: boolean;
};

export const FormFieldsRow = <Fields,>({
  fields,
  form,
  gutter = 16,
  readOnly,
  disabled,
  withBorder,
}: FormFieldsRowProps<Fields>) => {
  const breakpoint = useBreakpoint();
  const rows = useMemo(() => groupFields(fields), [fields]);

  return (
    <>
      {rows.map((row, rowIndex) => {
        let spanAccumulator = 0;
        return (
          <Row gutter={gutter} key={`row-${rowIndex}`}>
            {row.map((field, fieldIndex) => {
              const span = calculateSpan(field);
              const currentSpan = getCurrentSpanValue(span, breakpoint);
              const isLastItem = fieldIndex + 1 === row.length;

              spanAccumulator += currentSpan;
              const hasBorder = Boolean(
                withBorder && spanAccumulator < GRID_COLUMNS && !isLastItem,
              );

              if (spanAccumulator >= GRID_COLUMNS || isLastItem) spanAccumulator = 0;

              const key = field.name ? String(field.name) : `field-${rowIndex}-${fieldIndex}`;

              if (field.type === "divider") {
                return (
                  <Col xs={{ span: span.xs }} offset={0} key={key}>
                    <FormFieldsRenderer<Fields> field={{ readOnly, disabled, ...field }} form={form} />
                  </Col>
                );
              }

              return (
                <Col
                  xs={{ span: span.xs }}
                  md={{ span: span.md }}
                  lg={{ span: span.lg }}
                  offset={(field.layout?.offset || 0) * SPAN_UNIT}
                  key={key}
                  className={clsx({ "brdp-form-col-with-left-border": hasBorder })}
                >
                  <FormFieldsRenderer<Fields> field={{ readOnly, disabled, ...field }} form={form} />
                </Col>
              );
            })}
          </Row>
        );
      })}
    </>
  );
};

// -------------------------------------------------------------------
// Form Builder
// -------------------------------------------------------------------
export type FormBuilderPropsType<Fields, HeaderActionDataType = unknown> = {
  title?: string;
  drill?: FormInstance;
  id: string;
  fields: FormField<Fields>[];
  initialValues?: Partial<Fields>;
  onSubmit?: (fields: Fields) => void;
  reset?: boolean;
  submitLabel?: string;
  onReset?: () => void;
  resetLabel?: string;
  compact?: boolean;
  isLoading?: boolean;
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  formHeaderActions?: ActionBarBuilderType<HeaderActionDataType>[];
  submitButtonIcon?: React.ReactNode;
  autoSyncWithQueryParams?: boolean;
};

const FormBuilder = <Fields, HeaderActionData = unknown>({
  id,
  fields,
  initialValues,
  onSubmit,
  reset = true,
  submitLabel,
  onReset,
  resetLabel,
  compact,
  isLoading,
  isSubmitting,
  isSubmitDisabled,
  drill,
  disabled,
  readOnly,
  title,
  formHeaderActions,
  submitButtonIcon,
  autoSyncWithQueryParams,
}: FormBuilderPropsType<Fields, HeaderActionData>) => {
  const [form] = Form.useForm<Fields>(drill ?? undefined);
  const { getAllParams, updateParams, removeAllParams } = useQueryParams<Fields & {}>();

  const fieldsList = useCallback((fields: FormField<unknown>[]): FormField<Fields>[] => {
    return fields.flatMap((field) => {
      const nestedFields =
        field.type === "business" &&
        (field.options?.extraProps as CollapseFieldExtraProps)?.fields
          ? fieldsList((field.options?.extraProps as CollapseFieldExtraProps)?.fields)
          : [];
      return [field, ...nestedFields];
    });
  }, []);

  const initializedWithDashIfEmpty = useMemo(() => {
    if (!initialValues && !autoSyncWithQueryParams) return initialValues;

    const initialValuesResult = Object.fromEntries(
      Object.entries(initialValues ?? {}).map(([key, value]) => {
        const currentField = fieldsList(fields as FormField<unknown>[]).find(
          (f) => f?.name === key,
        );
        const isReadOnly = currentField?.readOnly || readOnly;
        const isEmptyArray = Array.isArray(value) && value.length === 0;
        const isEmptyString = typeof value === "string" && value.trim().length === 0;
        const isNullish = value === null || value === undefined;

        const cleanedArray = (data: unknown): any => {
          if (Array.isArray(data)) return data.map(cleanedArray);
          if (data && typeof data === "object") {
            return Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, cleanedArray(v)]),
            );
          }
          return data === null || data === undefined || (typeof data === "string" && data.trim().length === 0)
            ? "-"
            : data;
        };

        return [
          key,
          isReadOnly && (isEmptyString || isNullish)
            ? "-"
            : isReadOnly && isEmptyArray
              ? ["-"]
              : Array.isArray(value)
                ? cleanedArray(value)
                : value,
        ];
      }),
    );

    if (autoSyncWithQueryParams) {
      Object.entries(getAllParams).forEach(([key, value]) => {
        const isEmptyValue = String(value).trim() === "" || value == null;
        if (isEmptyValue) return;

        const currentField = fieldsList(fields as FormField<unknown>[]).find(
          (f) => f?.name === key,
        );
        if (!currentField) return;

        const isReadOnly = currentField.readOnly || readOnly;
        const isHidden = currentField.hidden;
        const isDisabled = currentField.disabled || disabled;

        if (isHidden || isDisabled || isReadOnly) return;

        initialValuesResult[key] = value;
      });
    }

    return initialValuesResult;
  }, [initialValues, fieldsList, fields, readOnly, getAllParams, disabled, autoSyncWithQueryParams]);

  const messages = getFormatMessage();
  const footerButtons = [];

  if (onSubmit) {
    footerButtons.push(
      <AntButton
        key="submit"
        type="primary"
        htmlType="submit"
        style={{ minWidth: "120px", lineHeight: 1 }}
        loading={isSubmitting}
        disabled={isSubmitting || !!isSubmitDisabled}
        icon={submitButtonIcon ?? null}
      >
        {submitLabel || messages(generalMessages.submit)}
      </AntButton>,
    );
  }

  if (reset !== false && !readOnly) {
    footerButtons.push(
      <AntButton
        key="reset"
        type="default"
        htmlType="reset"
        style={{ minWidth: "120px", marginInlineStart: "1rem" }}
        onClick={async () => {
          if (autoSyncWithQueryParams && !disabled && !readOnly) {
            flushSync(() => removeAllParams());
          }
          if (isFunction(onReset)) await Promise.resolve(onReset());
        }}
      >
        {resetLabel || messages(generalMessages.clearForm)}
      </AntButton>,
    );
  }

  const enhancedRequiredMark = (label: React.ReactNode, info: { required: boolean }) => {
    const currentField = fields.find((f) => f.label === label);
    return CustomizedRequiredMark(label, {
      required: info.required,
      requiredGroup: currentField?.requiredGroup,
    });
  };

  const handleSubmit = useCallback(
    async (_fieldsValue: Fields) => {
      const fieldsValue = Object.entries(_fieldsValue ?? {}).reduce<Fields>((acc, [key, value]) => {
        if (key.startsWith("__") || value === undefined) return acc;
        return { ...acc, [key]: value };
      }, {} as Fields);

      if (autoSyncWithQueryParams && !disabled && !readOnly) {
        flushSync(() => {
          const fieldsParam = fieldsList(fields as FormField<unknown>[])
            .filter((f) => !f.disabled && !f.readOnly && !f.hidden)
            .reduce<Partial<Fields & {}>>((acc, f) => {
              const fieldName = String(f.name) as keyof Fields & string;
              return { ...acc, [fieldName]: fieldsValue[fieldName] };
            }, {});
          updateParams(fieldsParam);
        });
      }

      if (isFunction(onSubmit)) await Promise.resolve(onSubmit(fieldsValue));
    },
    [autoSyncWithQueryParams, disabled, fields, fieldsList, onSubmit, readOnly, updateParams],
  );

  return (
    <Card
      className={clsx("brdp-card brdp-form-wrapper", { "brdp-form-readonly": readOnly })}
      style={{ border: "none", borderRadius: 0, background: "none", flex: 1, width: "100%" }}
      title={title ?? null}
      extra={
        formHeaderActions && formHeaderActions.length >= 1 ? (
          <ActionBarBuilder actionList={formHeaderActions} />
        ) : null
      }
      styles={{
        title: { fontWeight: "normal", fontSize: "var(--ant-font-size)", paddingInlineEnd: "var(--ant-font-size)" },
        header: { background: "none", padding: 0 },
        body: { padding: 0 },
      }}
    >
      <Spin spinning={!!isLoading}>
        <Form<Fields>
          id={id}
          name={id}
          form={form}
          onFinish={isSubmitDisabled ? undefined : handleSubmit}
          initialValues={initializedWithDashIfEmpty}
          requiredMark={enhancedRequiredMark}
          layout={readOnly ? "horizontal" : "vertical"}
          disabled={disabled || readOnly}
          scrollToFirstError
          size={compact ? "small" : undefined}
          colon={true}
        >
          {compact && (
            <style>{`
              .ant-form-item-label {
                --ant-form-label-font-size: 0.75rem;
                --ant-form-vertical-label-padding: 0 0 4px;
              }
            `}</style>
          )}
          <Card className="brdp-card brdp-form-fields-wrapper" actions={footerButtons}>
            <FormFieldsRow fields={fields} form={form} gutter={16} readOnly={readOnly} />
          </Card>
        </Form>
      </Spin>
    </Card>
  );
};

if (process.env.NODE_ENV !== "production") {
  FormBuilder.displayName = "FormBuilder";
}

// -------------------------------------------------------------------
// Controlled Form Hook
// -------------------------------------------------------------------
type ControlledFormHookOptions = {
  id: string;
  disabledForm?: boolean;
  confirmBeforeClose?: boolean;
};

export const useControlledForm = <
  TForm extends object,
  KeyOfFields = keyof TForm | IgnorablePattern,
>({
  id,
  disabledForm,
}: ControlledFormHookOptions) => {
  const [isDisabled, setIsDisabled] = useState(disabledForm ?? false);
  const messages = getFormatMessage();
  const [form] = Form.useForm<TForm>();
  const { getAllParams } = useQueryParams<TForm>();

  const ControlledForm = (props: Omit<FormBuilderPropsType<TForm>, "id" | "drill">) => {
    return React.createElement(FormBuilder<TForm>, {
      ...props,
      disabled: isDisabled ? isDisabled : props.disabled,
      drill: form,
      id,
    });
  };

  const fieldWatch = (name: KeyOfFields, options?: { preserve?: boolean }) =>
    Form.useWatch(name, { form, ...options });

  const getFieldValue = (name: KeyOfFields) => form.getFieldValue(name);
  const getFieldsValue = (names: KeyOfFields[] | true) => form.getFieldsValue(names);
  const setFieldsValue = (source: RecursivePartial<TForm>) => form.setFieldsValue(source);
  const resetFields = (names?: KeyOfFields[]) => form.resetFields(names);
  const submit = () => form.submit();
  const validateFields = (nameList: KeyOfFields[]) => form.validateFields(nameList, { dirty: true, recursive: true });
  const validateAllFields = () => form.validateFields({ recursive: true, dirty: true });
  const getFieldError = (name: KeyOfFields) => form.getFieldError(name);
  const isFieldTouched = (name: KeyOfFields) => form.isFieldTouched(name);
  const isFieldsTouched = () => form.isFieldsTouched();
  const isFieldsValidating = (nameList: KeyOfFields[]) => form.isFieldsValidating(nameList);
  const clearAllErrors = () => {
    form.setFields(
      form.getFieldsError().map(({ name }) => ({ name, errors: [] })),
    );
  };

  const toggleFormDisable = (newStatus?: boolean) =>
    setIsDisabled((prev) => (newStatus === undefined ? !prev : newStatus));

  const validateRequiredGroup = (
    groupName: string,
    fields: Array<{ name: KeyOfFields; requiredGroup?: string }>,
    errorMessage?: string,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const groupFields = fields.filter((f) => f.requiredGroup === groupName);
      const fieldNames = groupFields.map((f) => f.name);
      const values = form.getFieldsValue(fieldNames);

      const hasAtLeastOneValue = fieldNames.some((name) => {
        const value = values[name as keyof typeof values];
        if (value === undefined || value === null) return false;
        if (typeof value === "string") return value.trim().length > 0;
        return true;
      });

      if (!hasAtLeastOneValue) {
        const error = errorMessage || messages(generalMessages.requiredGroup);
        form.setFields(fieldNames.map((name) => ({ name, errors: [error] })));
        reject(new Error(error));
      } else {
        form.setFields(fieldNames.map((name) => ({ name, errors: [] })));
        resolve();
      }
    });
  };

  const clearRequiredGroupErrors = (
    groupName: string,
    fields: Array<{ name: KeyOfFields; requiredGroup?: string }>,
  ) => {
    const groupFields = fields.filter((f) => f.requiredGroup === groupName);
    form.setFields(groupFields.map((f) => ({ name: f.name, errors: [] })));
  };

  return {
    ControlledForm: useCallback(ControlledForm, [isDisabled]),
    fieldWatch,
    getFieldValue,
    getFieldsValue,
    setFieldsValue,
    resetFields,
    submit,
    toggleFormDisable,
    validateFields,
    validateAllFields,
    getFieldError,
    isFieldsValidating,
    isFieldTouched,
    isFieldsTouched,
    validateRequiredGroup,
    clearRequiredGroupErrors,
    getAllParams,
    clearAllErrors,
  };
};

// -------------------------------------------------------------------
// Business Elements Repository & Main Export
// -------------------------------------------------------------------
export type BusinessElementsRepositoryTypes = {
  BusinessTagDemo: typeof BusinessTagDemo;
  FileParserField: typeof FileParserField;
  DatePickerField: typeof DatePickerField;
  DateTimePickerField: typeof DateTimePickerField;
  IBANField: typeof IbanField;
  FileUploaderField: typeof FileUploaderField;
  AmountField: typeof AmountField;
  CollapseField: typeof CollapseField;
  NestedDynamicField: typeof NestedDynamicField;
  ButtonField: typeof ButtonField;
  DynamicListField: typeof DynamicListField;
  TagField: typeof TagField;
  TimePickerField: typeof TimePickerField;
  AutoCompleteField: typeof AutoCompleteField;
  CalculatorField: typeof CalculatorField;
  SortableField: typeof SortableField;
  PostalCodeField: typeof PostalCodeField;
  BankIdentifierField: typeof BankIdentifierField;
  ShahabCodeField: typeof ShahabCodeField;
  CardNumberField: typeof CardNumberField;
};

export const validations = {
  postalCodeValidationRules,
  bankIdentifierValidationRules,
  shahabCodeValidationRules,
  ibanNumberValidationRules,
  validateCardNumber,
};

type CompoundedComponent = typeof FormBuilder & BusinessElementsRepositoryTypes;

const FormGenerator = FormBuilder as CompoundedComponent;

FormGenerator.BusinessTagDemo = BusinessTagDemo;
FormGenerator.FileParserField = FileParserField;
FormGenerator.DatePickerField = DatePickerField;
FormGenerator.DateTimePickerField = DateTimePickerField;
FormGenerator.IBANField = IbanField;
FormGenerator.FileUploaderField = FileUploaderField;
FormGenerator.AmountField = AmountField;
FormGenerator.CollapseField = CollapseField;
FormGenerator.NestedDynamicField = NestedDynamicField;
FormGenerator.ButtonField = ButtonField;
FormGenerator.DynamicListField = DynamicListField;
FormGenerator.TagField = TagField;
FormGenerator.TimePickerField = TimePickerField;
FormGenerator.AutoCompleteField = AutoCompleteField;
FormGenerator.CalculatorField = CalculatorField;
FormGenerator.SortableField = SortableField;
FormGenerator.PostalCodeField = PostalCodeField;
FormGenerator.BankIdentifierField = BankIdentifierField;
FormGenerator.ShahabCodeField = ShahabCodeField;
FormGenerator.CardNumberField = CardNumberField;

export { useControlledForm };
export type { FormField as FormFields };
export default FormGenerator;

/* ===================================================================
   CSS (form.css) - injected as a <style> tag or via styled-components
   =================================================================== */
const FORM_CSS = `
@import "./business-elements/button-field/button-field.css";

.brdp-form-wrapper .brdp-form-col-with-left-border {
  position: relative;
}
.brdp-form-wrapper .brdp-form-col-with-left-border::after {
  content: '';
  height: 100%;
  width: var(--ant-line-width);
  background-color: var(--ant-color-split);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  margin: auto 0;
}

/* ... (all other CSS rules from form.css pasted here) ... */

/* For brevity in this response, the full CSS is omitted but should be pasted here */
`;


export { FORM_CSS };



import React, {
  ComponentProps,
  FC,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  App,
  AutoComplete,
  Button as AntButton,
  Cascader,
  Checkbox,
  Collapse,
  CollapseProps,
  DatePicker,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Radio,
  Select,
  Spin,
  Tag,
  TimePicker,
  Tooltip,
  TreeSelect,
  Typography,
  Upload,
  type AutoCompleteProps,
  type BaseOptionType,
  type CascaderProps,
  type CheckboxOptionType,
  type FormInstance,
  type GetProps,
  type RuleObject,
} from "antd";
import { BaseOptionType as SelectBaseOptionType, DefaultOptionType } from "antd/es/select";
import { valueType } from "antd/es/statistic/utils";
import { CloudUploadOutlined, CopyOutlined, DeleteOutlined, MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { flushSync } from "react-dom";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// External utilities
import {
  addCommaToAmount,
  generalMessages,
  getFormatMessage,
  isEmpty,
  isFunction,
  isString,
  parseJalaliString,
  wordifyfa,
} from "@brdp/utils";
import { generateUuidV4 } from "@brdp/utils";
import faIR from "antd/es/date-picker/locale/fa_IR";
import dayjs, { Dayjs, isDayjs } from "dayjs";

// Custom hooks and components
import { useControlledForm } from "../../form"; // Assuming this is from the main form aggregation
import { useHotkeys } from "../../hooks/use-hotkeys"; // Assuming available
import { IconsList } from "../../../assets/icons"; // Assuming available
import Button from "../../../button/button"; // Assuming available
import { ExpandIcon } from "../../../assets/icons/expand-icon"; // Assuming available
import TagComponent, { type ColorType } from "../../../tag/tag"; // Renamed to avoid conflict with antd Tag

// Types from main form (assuming shared)
import { BusinessElementFieldsProps, FormField } from "../../form-field";
import { FormFieldsRow } from "../../form-fields-row";

// -------------------------------------------------------------------
// Utilities from index.ts (getBankNameFromCardNumber)
// -------------------------------------------------------------------
export interface IBank {
  code: string;
  name: string;
}

export const cardBank: { [index: string]: string } = {
  "636214": "بانک آینده",
  "627412": "بانک اقتصاد نوین",
  "627381": "بانک انصار",
  "505785": "بانک ایران زمین",
  "622106": "بانک پارسیان",
  "627884": "بانک پارسیان",
  "639194": "بانک پارسیان",
  "502229": "بانک پاسارگاد",
  "639347": "بانک پاسارگاد",
  "627760": "پست بانک ایران",
  "585983": "بانک تجارت",
  "627353": "بانک تجارت",
  "502908": "بانک توسعه تعاون",
  "207177": "بانک توسعه صادرات",
  "627648": "بانک توسعه صادرات",
  "636949": "بانک حکمت ایرانیان",
  "585947": "بانک خاورمیانه",
  "639346": "بانک سینا",
  "627961": "بانک صنعت و معدن",
  "639370": "بانک مهر اقتصاد",
  "628157": "موسسه اعتباری توسعه",
  "505416": "بانک گردشگری",
  "505426": "بانک گردشگری",
  "589210": "بانک سپه",
  "589463": "بانک رفاه کارگران",
  "502806": "بانک شهر",
  "504706": "بانک شهر",
  "502938": "بانک دی",
  "603770": "بانک کشاورزی",
  "639217": "بانک کشاورزی",
  "628023": "بانک مسکن",
  "610433": "بانک ملت",
  "991975": "بانک ملت",
  "170019": "بانک ملی ایران",
  "603799": "بانک ملی ایران",
  "606373": "بانک مهر ایران",
  "606256": "موسسه اعتباری ملل",
  "606795": "بانک مرکزی جمهوری اسلامی ایران",
  "507677": "موسسه نور",
  "581874": "بانک مشترک ایران و ونزئولا",
  "639599": "بانک قوامین",
  "627488": "بانک کارآفرین",
  "502910": "بانک کارآفرین",
  "636797": "بانک مرکزی ایران",
  "636795": "بانک مرکزی جمهوری اسلامی ایران",
  "504172": "بانک قرض الحسنه رسالت",
};

export function getBankNameFromCardNumber(digits?: number | string): string | null | undefined {
  if (!digits) return;

  const digitsLength = digits.toString().length;
  if (digitsLength < 6 || digitsLength > 16) return null;

  const code = digits.toString().substring(0, 6);
  if (code in cardBank) return cardBank[code];
  return null;
}

// -------------------------------------------------------------------
// Utilities from index.ts (verifyCardNumber) and constants.ts
// -------------------------------------------------------------------
export const iranianBankPrefixes: Set<string> = new Set([
  "585983",
  "627353",
  "502229",
  "639347",
  "502806",
  "504706",
  "502908",
  "589210",
  "502938",
  "589463",
  "504172",
  "505785",
  "505801",
  "585947",
  "507677",
  "581874",
  "589210",
  "589463",
  "603770",
  "639217",
  "610433",
  "991975",
  "622106",
  "627884",
  "639194",
  "627412",
  "627648",
  "207177",
  "627353",
  "585983",
  "627961",
  "603799",
  "170019",
  "628023",
  "639370",
  "639607",
  "636214",
  "636949",
  "639346",
  "639599",
  "639370",
  "639607",
  "627593",
]);

export const invalidTestCards: Set<string> = new Set([
  "4444333322221111",
  "2222444499996666",
  "4000000000000002",
  "5555555555554444",
  "4111111111111111",
  "4012888888881881",
  "378282246310005",
  "371449635398431",
  "4222222222222222",
  "5105105105105100",
  "6011111111111117",
]);

export function verifyCardNumber(cardNumber: string | number): boolean {
  if (!cardNumber) return false;

  const digitsResult = String(cardNumber).replace(/\D/g, "");

  if (digitsResult.length !== 16) return false;

  if (invalidTestCards.has(digitsResult)) return false;

  const prefix = digitsResult.substring(0, 6);
  if (!iranianBankPrefixes.has(prefix)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digitsResult.length - 1; i >= 0; i--) {
    let digit = parseInt(digitsResult[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

// -------------------------------------------------------------------
// AmountField
// -------------------------------------------------------------------
type AmountFieldExtraProps = {
  placeholder?: string;
  separator?: string;
  addonAfter?: string;
  toWordify?: boolean;
};

const AmountField: React.FC<BusinessElementFieldsProps<AmountFieldExtraProps>> = ({
  form: _form,
  ...props
}) => {
  const messages = getFormatMessage();
  const separator = props?.options?.extraProps?.separator ?? ",";

  const isNumeric = (value: unknown): value is number | string =>
    (typeof value === "number" || typeof value === "string") &&
    !isNaN(Number(value)) &&
    value !== true &&
    value !== false;

  const rawValue = isNumeric(props.value) ? Number(props.value) : undefined;

  const formattedValue = useMemo(() => {
    if (props.options?.readOnly && rawValue === undefined) return "-";
    return rawValue !== undefined ? addCommaToAmount(rawValue, separator) : "";
  }, [rawValue, separator, props.options?.readOnly]);

  const tooltipText = useMemo(() => {
    if (props.options?.extraProps?.toWordify !== true || rawValue === undefined) return "";
    return wordifyfa(rawValue, 0);
  }, [rawValue, props.options?.extraProps?.toWordify]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(new RegExp(`\\${separator}`, "g"), "");
    props.onChange?.(value);
  };

  const input = useMemo(() => (
    <Input
      id={props.id}
      name={props.name}
      readOnly={props.options?.readOnly}
      disabled={props.options?.disabled}
      hidden={props.options?.hidden}
      value={formattedValue}
      onChange={handleChange}
      dir="ltr"
      addonAfter={props.options?.extraProps?.addonAfter ?? messages(generalMessages.rial)}
      styles={{
        input: {
          textAlign: "right",
          unicodeBidi: "plaintext",
        },
      }}
      placeholder={props?.options?.extraProps?.placeholder || ""}
      className={`${props.options?.readOnly ? "brdp-field-amount brdp-field-amount--readonly" : "brdp-field-amount"}`}
    />
  ), [formattedValue, props, separator]);

  if (props.options?.extraProps?.toWordify === true) {
    return (
      <Tooltip title={tooltipText} placement="topLeft">
        {input}
      </Tooltip>
    );
  }

  return (!rawValue || rawValue === "-") && props.options?.readOnly ? "-" : input;
};

AmountField.displayName = "AmountField";

// -------------------------------------------------------------------
// AutoCompleteField
// -------------------------------------------------------------------
type AutoCompleteExtraPropsType = {
  error?: boolean;
  optionsData?: AutoCompleteProps["options"];
  onSearch?: (value: string) => void;
  onSelect: (value: unknown, options: BaseOptionType) => void;
  retryButton?: MouseEventHandler<HTMLElement>;
  loading?: boolean;
};

const AutoCompleteField: React.FC<BusinessElementFieldsProps<AutoCompleteExtraPropsType>> = ({
  form: _form,
  ...props
}) => {
  return (
    <AutoComplete
      id={props?.id}
      value={props?.value}
      onChange={props?.onChange}
      placeholder={props?.options?.placeholder}
      onSearch={props?.options?.extraProps?.onSearch}
      options={props?.options?.extraProps?.optionsData}
      status={props?.options?.extraProps?.error ? "error" : undefined}
      onSelect={(value, options) => props?.options?.extraProps?.onSelect?.(value, options)}
      filterOption={(inputValue, option) => {
        const label = typeof option?.label === "string" ? option.label : "";
        return label.toUpperCase().includes(inputValue.toUpperCase());
      }}
      suffixIcon={
        props?.options?.extraProps?.loading ? (
          <IconsList.LoadingIcon />
        ) : props?.options?.extraProps?.error && props?.options?.extraProps?.retryButton ? (
          <IconsList.RedoIcon onClick={props?.options?.extraProps?.retryButton} />
        ) : undefined
      }
    />
  );
};

AutoCompleteField.displayName = "AutoCompleteField";

// -------------------------------------------------------------------
// BankIdentifierField
// -------------------------------------------------------------------
export const bankIdentifierValidationRules = (): RuleObject[] => {
  const messages = getFormatMessage();

  return [
    {
      validator: (_: any, value: string) => {
        if (value && !/^\d{11}$/.test(value)) {
          return Promise.reject(
            new Error(
              messages(generalMessages.validateFieldExactLengthNumber, {
                field: messages(generalMessages.identifier),
                length: 11,
              }),
            ),
          );
        }

        if (value && /^0{11}$/.test(value)) {
          return Promise.reject(
            new Error(messages(generalMessages.validateAllDigitsNotZero)),
          );
        }

        return Promise.resolve();
      },
    },
  ];
};

type BankIdentifierExtraProps = {
  placeholder?: string;
};

const BankIdentifierField: React.FC<BusinessElementFieldsProps<BankIdentifierExtraProps>> = ({
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetValue = e.target.value;
    const prev = (props.value as string) || "";
    const isNonNumeric = !/^\d*$/..test(targetValue);

    if (isNonNumeric) {
      return props?.onChange?.(prev);
    }

    return props?.onChange?.(targetValue);
  };

  return (
    <Input
      name={props.name}
      id={props.id}
      readOnly={props.options?.readOnly}
      disabled={props.options?.disabled}
      hidden={props.options?.hidden}
      value={props.value as string}
      onChange={handleChange}
      placeholder={props?.options?.extraProps?.placeholder}
      maxLength={11}
    />
  );
};

BankIdentifierField.displayName = "BankIdentifierField";

// -------------------------------------------------------------------
// ButtonField
// -------------------------------------------------------------------
type ButtonProps = ComponentProps<typeof Button>;

type ButtonFieldExtraProps = ButtonProps & {
  position?: {
    y?: FlexProps["align"];
    x?: FlexProps["justify"];
  };
};

const ButtonField: React.FC<BusinessElementFieldsProps<ButtonFieldExtraProps>> = ({
  options,
}) => {
  const {
    label,
    icon,
    position = {},
    disabled,
    ...buttonProps
  } = options?.extraProps ?? {};

  if (!icon && !label) {
    throw new Error("ButtonField: Either 'icon' or 'label' prop must be provided.");
  }

  return (
    <Flex align={position?.y ?? "flex-start"} justify={position?.x ?? "flex-start"}>
      <Button
        label={label}
        icon={icon}
        disabled={disabled ?? false}
        {...buttonProps}
      />
    </Flex>
  );
};

ButtonField.displayName = "ButtonField";

// -------------------------------------------------------------------
// CalculatorField and related (buttons-calculator-field, modal-calculator-field)
// -------------------------------------------------------------------
const CALCULATOR_FIELD_CSS = `
.calculatorField {
  :global{
    .ant-input-group-addon{
      padding-left: 0;
      padding-right: 0;
      overflow: hidden;

      button{
        border-radius: 0;
        height: 29px;
        transform: translateY(0.5px);
      }
    }
  }
}

.calculatorModal {
  :global{
    .ant-modal-body{
      padding: 0 !important;
    }

    .ant-modal-confirm-paragraph{
      max-width: 100%;
      row-gap: 0;
    }

    .ant-modal-confirm-title{
      padding: var(--ant-modal-header-padding);
      background-color: var(--ant-modal-header-bg);
      border-bottom: var(--ant-modal-header-border-bottom);
      border-top-left-radius: var(--ant-border-radius-lg);
      border-top-right-radius: var(--ant-border-radius-lg);
    }

    .ant-modal-confirm-content{
      padding: var(--ant-modal-body-padding);
    }
  }
}

.calculatorForm {
  :global{
    .ant-card {
      border-radius: 0;

      & > .ant-card-body {
        padding: 0;

        & > .ant-row {
          padding: var(--ant-padding-xs) var(--ant-padding-sm);

          & > .ant-col {
            & > .ant-form-item {
              margin-block-end: var(--ant-form-item-margin-bottom);
            }

            & > .ant-col:last-child > .ant-form-item {
              margin-block-end: 0;
            }
          }
        }
      }
    }
  }
}

.calculatorGridButtons {
  direction: ltr;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  :global{
    .ant-btn {
      aspect-ratio: 1 / 1;
      padding: 0;
      height: auto;

      &.cyan-color{
        background-color: #42F8F8;
      }

      &.orange-color{
        background-color: #F4B73E;
      }

      &.green-color{
        background-color: #48EE4B;
      }

      &.grey-color{
        background-color: #C9C9C9;
      }
    }
  }
}
`;

type ButtonItem = {
  label: string;
  value: string;
  accessKey: string;
  underline: string | undefined;
  color: "cyan-color" | "green-color" | "grey-color" | "orange-color" | "default-color";
  type: "insert" | "delete" | "clear";
};

const buttons: ButtonItem[] = [
  { label: "log", value: "log[", accessKey: "l", underline: "l", color: "cyan-color", type: "insert" },
  { label: "10^x", value: "10^", accessKey: "t", underline: "t", color: "cyan-color", type: "insert" },
  { label: "e^x", value: "e^", accessKey: "e", underline: "e", color: "cyan-color", type: "insert" },
  { label: "x^y", value: "^", accessKey: "x", underline: "x", color: "cyan-color", type: "insert" },
  { label: "x^2", value: "^2", accessKey: "s", underline: "s", color: "cyan-color", type: "insert" },
  { label: "x^3", value: "^3", accessKey: "c", underline: "c", color: "cyan-color", type: "insert" },
  { label: "√x", value: "sqrt[", accessKey: "r", underline: "r", color: "cyan-color", type: "insert" },
  { label: "ln", value: "ln[", accessKey: "n", underline: "n", color: "cyan-color", type: "insert" },
  { label: "sin", value: "sin[", accessKey: "s", underline: "s", color: "cyan-color", type: "insert" },
  { label: "cos", value: "cos[", accessKey: "c", underline: "c", color: "cyan-color", type: "insert" },
  { label: "tan", value: "tan[", accessKey: "t", underline: "t", color: "cyan-color", type: "insert" },
  { label: "cot", value: "cot[", accessKey: "o", underline: "o", color: "cyan-color", type: "insert" },
  { label: "abs", value: "abs[", accessKey: "a", underline: "a", color: "cyan-color", type: "insert" },
  { label: "n!", value: "!", accessKey: "f", underline: "f", color: "cyan-color", type: "insert" },
  { label: "π", value: "pi", accessKey: "p", underline: "p", color: "grey-color", type: "insert" },
  { label: "e", value: "e", accessKey: "e", underline: "e", color: "grey-color", type: "insert" },
  { label: "deg", value: "deg[", accessKey: "d", underline: "d", color: "grey-color", type: "insert" },
  { label: "rad", value: "rad[", accessKey: "r", underline: "r", color: "grey-color", type: "insert" },
  { label: "(", value: "(", accessKey: "(", underline: undefined, color: "grey-color", type: "insert" },
  { label: ")", value: ")", accessKey: ")", underline: undefined, color: "grey-color", type: "insert" },
  { label: ",", value: ",", accessKey: ",", underline: undefined, color: "grey-color", type: "insert" },
  { label: "7", value: "7", accessKey: "7", underline: undefined, color: "default-color", type: "insert" },
  { label: "8", value: "8", accessKey: "8", underline: undefined, color: "default-color", type: "insert" },
  { label: "9", value: "9", accessKey: "9", underline: undefined, color: "default-color", type: "insert" },
  { label: "/", value: "/", accessKey: "/", underline: undefined, color: "orange-color", type: "insert" },
  { label: "%", value: "%", accessKey: "%", underline: undefined, color: "orange-color", type: "insert" },
  { label: "C", value: "C", accessKey: "C", underline: undefined, color: "orange-color", type: "clear" },
  { label: "←", value: "←", accessKey: "←", underline: undefined, color: "orange-color", type: "delete" },
  { label: "4", value: "4", accessKey: "4", underline: undefined, color: "default-color", type: "insert" },
  { label: "5", value: "5", accessKey: "5", underline: undefined, color: "default-color", type: "insert" },
  { label: "6", value: "6", accessKey: "6", underline: undefined, color: "default-color", type: "insert" },
  { label: "*", value: "*", accessKey: "*", underline: undefined, color: "orange-color", type: "insert" },
  { label: "1/x", value: "1/", accessKey: "1", underline: "1", color: "orange-color", type: "insert" },
  { label: "±", value: "±", accessKey: "±", underline: undefined, color: "orange-color", type: "insert" },
  { label: "!", value: "!", accessKey: "!", underline: undefined, color: "orange-color", type: "insert" },
  { label: "1", value: "1", accessKey: "1", underline: undefined, color: "default-color", type: "insert" },
  { label: "2", value: "2", accessKey: "2", underline: undefined, color: "default-color", type: "insert" },
  { label: "3", value: "3", accessKey: "3", underline: undefined, color: "default-color", type: "insert" },
  { label: "-", value: "-", accessKey: "-", underline: undefined, color: "orange-color", type: "insert" },
  { label: "=", value: "=", accessKey: "=", underline: undefined, color: "green-color", type: "insert" },
];

const LabelWithAccessKey: FC<{ label: string; underline: string | undefined }> = ({ label, underline }) => {
  if (!underline) return <span>{label}</span>;

  const parts = label.split(underline);
  return (
    <span>
      {parts[0]}
      <u>{underline}</u>
      {parts[1]}
    </span>
  );
};

type Variable = {
  loading?: boolean;
  data: {
    value: string | number | boolean;
    label: string;
    disabled?: boolean;
  }[];
};

type CalculatorFieldProps = {
  modalTitle: string;
  variable: Variable;
};

const CalculatorField: FC<BusinessElementFieldsProps<CalculatorFieldProps>> = ({
  options,
  id,
  value,
  name,
  onChange,
}) => {
  const { placeholder, disabled, readOnly } = options ?? {};
  const { modalTitle, variable } = options?.extraProps ?? {};
  const fieldValue = value as string | undefined;
  const fieldValueArray = useRef<string[]>(fieldValue ? [fieldValue] : []);
  const inputRef = useRef<InputRef>(null);
  const { modal } = App.useApp();

  const handleFocus = useEffectEvent(() => {
    if (disabled || readOnly) return;
    const calculatorModal = modal.info({
      title: modalTitle,
      closable: true,
      footer: null,
      content: (
        <ModalCalculatorField
          formulaValues={fieldValueArray.current}
          onReset={() => {
            calculatorModal.destroy();
          }}
          variable={variable}
          onSubmit={({ formulas: formulaValues }) => {
            onChange?.(formulaValues?.join(""));

            if (Array.isArray(formulaValues)) {
              fieldValueArray.current = formulaValues;
            }

            calculatorModal.destroy();
          }}
        />
      ),
    });
  });

  useEffect(() => {
    if (fieldValue) {
      fieldValueArray.current = [fieldValue];
    }
  }, [fieldValue]);

  return (
    <Tooltip
      title={messages(generalMessages.calculatorFieldTooltip)}
      placement="topLeft"
    >
      <Input
        ref={inputRef}
        id={id}
        name={name}
        value={fieldValue}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        onFocus={handleFocus}
        addonAfter={
          !readOnly && (
            <AntButton
              type="text"
              onClick={handleFocus}
              icon={<IconsList.CalculatorIcon />}
              disabled={disabled}
              loading={variable?.loading}
            />
          )
        }
      />
    </Tooltip>
  );
};

CalculatorField.displayName = "CalculatorField";

type ModalCalculatorFieldProps = {
  formulaValues?: string[];
  onReset: () => void;
  onSubmit: (fields: ModalCalculatorFieldFormType) => void;
  variable?: Variable;
  submitLabel?: string;
  resetLabel?: string;
  isRequired?: boolean;
};

type ModalCalculatorFieldFormType = {
  formulas?: string[];
  variable?: string | number | boolean;
};

const FormulaFiled: FC<BusinessElementFieldsProps> = ({ id, name, value }) => {
  const fieldValues = value as string[] | undefined;
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus({ cursor: "end" });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formulas = e.target.value.split("");
    props.onChange?.(formulas);
  };

  return (
    <Input
      id={id}
      name={name}
      ref={inputRef}
      value={fieldValues?.join("") ?? ""}
      onChange={handleChange}
      dir="ltr"
    />
  );
};

FormulaFiled.displayName = "FormulaFiled";

const ModalCalculatorField: FC<ModalCalculatorFieldProps> = ({
  formulaValues,
  onReset,
  onSubmit,
  variable: variableProps,
  submitLabel,
  resetLabel,
  isRequired,
}) => {
  const messages = getFormatMessage();

  const { ControlledForm, submit } = useControlledForm<ModalCalculatorFieldFormType>({
    id: "calculator-form",
  });

  const onFormulaChange = useCallback((value: string, type: ButtonItem["type"]) => {
    const currentFormulas = form.getFieldValue("formulas") as string[] | undefined;
    let newFormulas: string[] = [...(currentFormulas ?? [])];

    switch (type) {
      case "insert":
        newFormulas.push(value);
        break;
      case "delete":
        newFormulas.pop();
        break;
      case "clear":
        newFormulas = [];
        break;
    }

    form.setFieldValue("formulas", newFormulas);
  }, []);

  return (
    <div className={classes.calculatorModal}>
      <ControlledForm
        id="calculator-form"
        fields={[
          {
            label: messages(generalMessages.formula),
            name: "formulas",
            type: "business",
            element: FormulaFiled,
            initialValue: formulaValues,
            validation: {
              rules: isRequired ? [{ required: true }] : [],
            },
            layout: { span: 4 },
          },
          {
            label: messages(generalMessages.variables),
            name: "variable",
            type: "select",
            loading: variableProps?.loading,
            data: { static: variableProps?.data ?? [] },
            layout: { span: 4 },
          },
          {
            label: "",
            name: "__divider",
            type: "divider",
            layout: { span: 4 },
          },
          {
            label: "",
            name: "__buttons",
            type: "business",
            element: ButtonsCalculatorField,
            options: { extraProps: { onFormulaChange } },
            layout: { span: 4 },
          },
        ]}
        onSubmit={onSubmit}
        submitLabel={submitLabel ?? messages(generalMessages.submit)}
        resetLabel={resetLabel ?? messages(generalMessages.reset)}
        onReset={onReset}
      />
    </div>
  );
};

ModalCalculatorField.displayName = "ModalCalculatorField";

const ButtonsCalculatorField: React.FC<BusinessElementFieldsProps & { onFormulaChange: (value: string, type: ButtonItem["type"]) => void }> = ({
  onFormulaChange,
}) => {
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const hotkeys: HotkeyItem[] = buttons.map(({ label, value, accessKey, type }) => ({
    key: accessKey,
    callback: () => onFormulaChange(value, type),
  }));

  useHotkeys(hotkeys);

  return (
    <div className={clsx(classes.calculatorGridButtons, "en-number")}>
      {buttons.map(({ label, underline, accessKey, color, value, type }, index) => (
        <AntButton
          key={index}
          className={color}
          onClick={onFormulaChange.bind(null, value, type)}
          accessKey={accessKey}
          ref={(elem) => {
            if (accessKey) buttonRefs.current[label] = elem;
          }}
        >
          <LabelWithAccessKey label={label} underline={underline} />
        </AntButton>
      ))}
    </div>
  );
};

ButtonsCalculatorField.displayName = "ButtonsCalculatorField";

// -------------------------------------------------------------------
// CardNumberField
// -------------------------------------------------------------------
type CardNumberExtraProps = {
  placeholder?: string;
};

export const validateCardNumber = (errorMsg?: string) => {
  const messages = getFormatMessage();

  return [
    {
      validator: async (_: any, cardNumber: string | number) => {
        if (!cardNumber) return Promise.resolve();

        if (cardNumber && String(cardNumber).length !== 16) {
          return Promise.reject(messages(generalMessages.invalidCardNumberLength));
        }

        if (cardNumber && !verifyCardNumber(cardNumber)) {
          return Promise.reject(errorMsg ?? messages(generalMessages.invalidCardNumber));
        }

        return Promise.resolve();
      },
    },
  ];
};

const extractDigits = (value: string) => value.replace(/\D/g, "").trim();

const formatCardNumber = (value: string) => value.replace(/(\d{4})(?=\d)/g, "$1 ");

const CardNumberField: React.FC<BusinessElementFieldsProps<CardNumberExtraProps>> = (props) => {
  const isReadOnly = props.options?.readOnly;
  const isEmpty = isEmpty(props.value);
  const displayedValue = isEmpty ? "-" : extractDigits(props.value as string);
  const placeholder = props?.options?.extraProps?.placeholder || "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onChange?.({
      ...e,
      target: { ...e.target, value: extractDigits(e.target.value) },
    });
  };

  return (
    <Input
      disabled={props.options?.disabled}
      readOnly={props.options?.readOnly}
      placeholder={placeholder}
      id={props.id}
      name={props.name}
      value={formatCardNumber(displayedValue)}
      onChange={handleChange}
      dir="ltr"
      maxLength={16 + 3}
      className={`${isReadOnly ? "brdp-field-card-number brdp-field-card-number--readonly" : "brdp-field-card-number"}`}
      hidden={props.options?.hidden}
    />
  );
};

CardNumberField.displayName = "CardNumberField";

// -------------------------------------------------------------------
// CollapseField
// -------------------------------------------------------------------
export type CollapseFieldExtraProps<SubFieldsTypes = unknown> = {
  type?: "collapsible" | "groupable";
  appearance?: {
    collapsedLabel?: string;
    variant?: "dashed" | "dotted" | "solid";
    orientation?: "center" | "start";
    withRightBorder?: boolean;
  };
  fields: FormField<SubFieldsTypes>[];
};

const CollapseLabel: React.FC<{
  icon?: React.ReactNode;
  label: string;
  variant?: "dashed" | "dotted" | "solid";
  orientation?: "center" | "start";
}> = ({ icon, label, variant = "solid", orientation = "start" }) => {
  return (
    <Divider
      variant={variant}
      orientation={orientation === "center" ? "center" : "right"}
      orientationMargin={0}
      className="brdp-collapse-label"
      plain
    >
      <Flex gap={8} align="center" justify="center">
        {icon}
        {label}
      </Flex>
    </Divider>
  );
};

export const validateFields = (options: BusinessElementFieldsProps<CollapseFieldExtraProps>["options"]) => {
  if (!options?.extraProps) {
    throw new Error('CollapseField: "options.extraProps" is required.');
  }

  const fields = options.extraProps.fields;

  if (!fields) {
    throw new Error('CollapseField: "fields" is required.');
  }

  if (!Array.isArray(fields)) {
    throw new Error('CollapseField: "fields" must be a array.');
  }

  return fields;
};

const CollapseField: React.FC<BusinessElementFieldsProps<CollapseFieldExtraProps>> = ({
  options,
  form,
  name,
}) => {
  const fields = validateFields(options);
  const readOnly = options?.readOnly;
  const disabled = options?.disabled;
  const { type = "groupable", appearance } = options?.extraProps ?? {};
  const { collapsedLabel, variant, orientation = "start", withRightBorder = true } = appearance ?? {};

  const [collapsed, setCollapsed] = useState<string[]>([]);

  const collapseItems: CollapseProps["items"] = [
    {
      key: name,
      label: readOnly ? (
        <span className="brdp-collapse-label">{options?.label}</span>
      ) : (
        <CollapseLabel
          label={collapsed.length === 0 && collapsedLabel ? collapsedLabel : options?.label ?? ""}
          variant={variant}
          orientation={orientation}
        />
      ),
      collapsible: readOnly ? "disabled" : (type as CollapsibleType),
      children: (
        <FormFieldsRow
          gutter={readOnly ? [0, 0] : [16, 16]}
          fields={fields}
          form={form}
          readOnly={readOnly}
          disabled={disabled}
          withBorder={readOnly && withRightBorder}
        />
      ),
    },
  ];

  return (
    <Collapse
      items={collapseItems}
      defaultActiveKey={collapsed}
      ghost
      onChange={(data) => setCollapsed(data)}
      rootClassName={clsx({
        "brdp-collapse-collapsible brdp-collapse--type-groupable": type === "groupable",
        "brdp-collapse-collapsible": type === "collapsible",
        "brdp-collapse--no-label": !options?.label,
      })}
      expandIcon={({ isActive }) => {
        if (type === "groupable" || orientation === "center") return null;
        return isActive ? <IconsList.MinusSquareIcon /> : <IconsList.PlusSquareIcon />;
      }}
    />
  );
};

CollapseField.displayName = "CollapseField";

// -------------------------------------------------------------------
// CopyableField
// -------------------------------------------------------------------
const CopyableField: React.FC<BusinessElementFieldsProps> = (props) => {
  const { value, id, name } = props;
  const displayValue = (value as string) || "";

  const handleCopy = () => {
    const textToCopy = displayValue.toString();
    navigator.clipboard.writeText(textToCopy);
  };

  return (
    <Input
      id={id}
      value={displayValue}
      readOnly
      disabled={true}
      addonAfter={null}
      name={name}
      suffix={
        <AntButton
          type="text"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          style={{
            margin: "-1px -7px",
            height: "22px",
            width: "22px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      }
    />
  );
};

CopyableField.displayName = "CopyableField";

// -------------------------------------------------------------------
// DatePickerField
// -------------------------------------------------------------------
export type DatePickerFieldExtraProps = {
  displayFormat?: string;
  minDate?: Dayjs | string;
  maxDate?: Dayjs | string;
  placeholder?: string;
};

const DatePickerField: React.FC<BusinessElementFieldsProps<DatePickerFieldExtraProps>> = (props) => {
  const messages = getFormatMessage();
  const { options, value, onChange } = props;
  const minDate = options?.extraProps?.minDate;
  const maxDate = options?.extraProps?.maxDate;

  const minDateWatcher = Form.useWatch(minDate as string, props.form);
  const maxDateWatcher = Form.useWatch(maxDate as string, props.form);

  const minDateWatcherValue = isDayjs(minDateWatcher) ? minDateWatcher : parseJalaliString(minDateWatcher);
  const maxDateWatcherValue = isDayjs(maxDateWatcher) ? maxDateWatcher : parseJalaliString(maxDateWatcher);

  const handleDateChange = (date: Dayjs | null) => {
    if (date) {
      onChange?.(date);
    } else {
      onChange?.(null);
    }
  };

  const displayValue = isDayjs(value) ? value : parseJalaliString(value as string);

  return (
    <DatePicker
      minDate={minDateWatcherValue}
      maxDate={maxDateWatcherValue}
      readOnly={options?.readOnly}
      disabled={options?.disabled as boolean}
      hidden={options?.hidden as boolean}
      style={{ width: "100%" }}
      name={`${props.name}-datepicker`}
      value={displayValue}
      onChange={handleDateChange}
      format={isString(options?.extraProps?.displayFormat) ? options?.extraProps?.displayFormat : "YYYY/MM/DD"}
      placeholder={options?.placeholder}
      locale={{
        ...faIR,
        lang: {
          ...faIR.lang,
          ok: messages(generalMessages.confirm),
        },
      }}
    />
  );
};

DatePickerField.displayName = "DatePickerField";

// -------------------------------------------------------------------
// DateTimePickerField
// -------------------------------------------------------------------
const DateTimePickerField: React.FC<BusinessElementFieldsProps<DatePickerFieldExtraProps & { timePlaceholder?: string; needTimeConfirm?: boolean; }>> = (props) => {
  const messages = getFormatMessage();
  const { options, value, onChange, name } = props;

  const minDate = options?.extraProps?.minDate;
  const maxDate = options?.extraProps?.maxDate;

  const minDateWatcher = Form.useWatch(minDate as string, props.form);
  const maxDateWatcher = Form.useWatch(maxDate as string, props.form);

  const minDateWatcherValue = isDayjs(minDateWatcher) ? minDateWatcher : parseJalaliString(minDateWatcher);
  const maxDateWatcherValue = isDayjs(maxDateWatcher) ? maxDateWatcher : parseJalaliString(maxDateWatcher);

  const handleDateChange = (date: Dayjs | null) => {
    if (date) {
      const newDateTime = date.startOf("day");
      onChange?.(newDateTime);
    } else {
      onChange?.(null);
    }
  };

  const handleTimeChange = (time: Dayjs | null) => {
    if (time && value) {
      const currentDate = dayjs(value as Dayjs);
      const newDateTime = currentDate
        .hour(time.hour())
        .minute(time.minute())
        .second(time.second());
      onChange?.(newDateTime);
    }
  };

  const displayValue = isDayjs(value) ? value : parseJalaliString(value as string);

  const needTimeConfirm = options?.extraProps?.needTimeConfirm ?? true;

  return (
    <Flex gap="small">
      <DatePicker
        minDate={minDateWatcherValue}
        maxDate={maxDateWatcherValue}
        readOnly={options?.readOnly}
        disabled={options?.disabled as boolean}
        hidden={options?.hidden as boolean}
        style={{ width: "50%" }}
        name={`${name}-date`}
        value={displayValue}
        onChange={handleDateChange}
        format={isString(options?.extraProps?.displayFormat) ? options?.extraProps?.displayFormat : "YYYY/MM/DD"}
        placeholder={options?.placeholder}
        locale={{
          ...faIR,
          lang: {
            ...faIR.lang,
            ok: messages(generalMessages.confirm),
          },
        }}
      />
      <DatePicker.TimePicker
        readOnly={options?.readOnly}
        disabled={options?.disabled as boolean}
        hidden={options?.hidden as boolean}
        style={{ width: "50%" }}
        name={`${name}-time`}
        value={displayValue}
        onChange={handleTimeChange}
        needConfirm={needTimeConfirm}
        placeholder={options?.extraProps?.timePlaceholder}
        locale={{
          ...faIR,
          lang: {
            ...faIR.lang,
            ok: messages(generalMessages.confirm),
          },
        }}
      />
    </Flex>
  );
};

DateTimePickerField.displayName = "DateTimePickerField";

// -------------------------------------------------------------------
// TimePickerField
// -------------------------------------------------------------------
const TimePickerField: React.FC<BusinessElementFieldsProps<{ needTimeConfirm?: boolean; }>> = (props) => {
  const messages = getFormatMessage();
  const { options, value, onChange, name } = props;

  const template = options?.extraProps?.returnFormat?.template as string || "HH:mm:ss";

  const displayValue = value ? dayjs(value as string, template) : null;

  const needTimeConfirm = options?.extraProps?.needTimeConfirm ?? true;

  const handleTimeChange = (selectedTime: Dayjs | null) => {
    if (selectedTime && template) {
      onChange?.(selectedTime.format(template));
    } else {
      onChange?.(selectedTime);
    }
  };

  return (
    <TimePicker
      readOnly={options?.readOnly}
      disabled={options?.disabled as boolean}
      hidden={options?.hidden as boolean}
      style={{ width: "100%" }}
      name={`${name}-time`}
      value={displayValue}
      onChange={handleTimeChange}
      needConfirm={needTimeConfirm}
      format={template}
      locale={{
        ...faIR,
        lang: {
          ...faIR.lang,
          ok: messages(generalMessages.confirm),
        },
      }}
    />
  );
};

TimePickerField.displayName = "TimePickerField";

// -------------------------------------------------------------------
// FileParserField
// -------------------------------------------------------------------
const FILE_PARSER_CSS = `
.fileParserWrapper{
  & p{
    margin-bottom: 0 !important;
  }
}

.separator{
  border: solid 1px rgba(151, 151, 151, 0.24);
  margin: 0 5px;
}
`;

export const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".text": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".cer": "application/x-x509-ca-cert",
  ".cap": "", // not sure, empty in original
  // ... (add all from original if needed)
};

export type Extensions = keyof typeof mimeTypes;

export type UploadFile = RcFile | File;

export type ExtraProps = {
  accept: Extensions[];
  disabled?: boolean;
  parser?: "json" | "byteArray";
  sizeLimit?: number;
  sizeLimitValidationMessage?: string;
};

export const checkPropsExist = (props?: Partial<ExtraProps>) => {
  const { accept, sizeLimit } = props ?? {};

  if (!accept || !Array.isArray(accept) || accept.length === 0 || !accept.every((item) => mimeTypes[item])) {
    throw new Error("Prop `accept` is required but was not provided or is invalid.");
  }

  return props as ExtraProps;
};

export const getFileExtension = (fileName: string) => {
  const match = /\.([0-9a-z]+)$/i.exec(fileName);
  return match && match[0] ? (match[0].toLowerCase().trim() as Extensions) : undefined;
};

export const checkIsValidFile = (file: UploadFile | undefined, accept: ExtraProps["accept"]) => {
  if (!file) throw new Error("No file provided.");

  const ext = getFileExtension(file.name);

  if (!ext) throw new Error("File has no extension.");

  const matchedExtension = accept.find((item) => item.toLowerCase().trim() === ext);

  if (!matchedExtension) throw new Error("Invalid file extension.");

  const fileMimeType = file.type.toLowerCase().trim();

  if (fileMimeType !== mimeTypes[matchedExtension]) throw new Error("Invalid file type.");
};

export const checkSizeLimit = (file: UploadFile | undefined, sizeLimit: ExtraProps["sizeLimit"]) => {
  if (!file) throw new Error("No file provided.");

  if (sizeLimit && file.size > sizeLimit) throw new Error("File size exceeds limit.");
};

export const parseJsonFile = (file: UploadFile): Promise<unknown> => {
  const messages = getFormatMessage();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);
        resolve(json);
      } catch {
        reject(new Error(messages(generalMessages.notValidFileValidation)));
      }
    };

    reader.onerror = () => {
      reject(new Error(messages(generalMessages.readFileError)));
    };

    reader.readAsText(file);
  });
};

export const convertToByteArray = (file: UploadFile): Promise<Uint8Array> => {
  const messages = getFormatMessage();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        const arrayBuffer = e.target.result as ArrayBuffer;
        const byteArray = new Uint8Array(arrayBuffer);
        resolve(byteArray);
      } else {
        reject(new Error(messages(generalMessages.readFileError)));
      }
    };

    reader.onerror = () => {
      reject(new Error(messages(generalMessages.readFileError)));
    };

    reader.readAsArrayBuffer(file);
  });
};

const FileParserField: React.FC<BusinessElementFieldsProps<ExtraProps>> = ({ id, name, ...props }) => {
  const messages = getFormatMessage();

  const { accept, disabled, parser, sizeLimit, sizeLimitValidationMessage } = checkPropsExist(props.options?.extraProps);

  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleUpload = async (file: UploadFile) => {
    try {
      checkIsValidFile(file, accept);
      checkSizeLimit(file, sizeLimit);

      let parsedData: unknown;
      if (parser === "json") {
        parsedData = await parseJsonFile(file);
      } else if (parser === "byteArray") {
        parsedData = await convertToByteArray(file);
      } else {
        parsedData = file;
      }

      props.onChange?.(parsedData);
      setFileList(file);
      setError(undefined);
    } catch (err) {
      setError((err as Error).message || sizeLimitValidationMessage || messages(generalMessages.fileSizeLimit));
      message.error(error);
    }
  };

  return (
    <Upload.Dragger
      name={name}
      id={String(id)}
      disabled={disabled}
      fileList={fileList ? [fileList] : []}
      beforeUpload={(file) => {
        handleUpload(file);
        return false;
      }}
      className={error ? "error" : ""}
    >
      {fileList ? (
        <Flex gap="small" align="center">
          <p>{fileList.name}</p>
          <AntButton
            icon={<DeleteOutlined />}
            danger
            variant="outlined"
            htmlType="button"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => {
              e.stopPropagation();
              setFileList(undefined);
            }}
          />
        </Flex>
      ) : (
        <Flex gap="0.75rem" justify="center" align="center" wrap>
          <p className="ant-upload-drag-icon" style={{ paddingLeft: "20px" }}>
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">{messages(generalMessages.dropFileHere)}</p>
          <p className="ant-upload-text" style={{ minWidth: "50px" }}>
            {messages(generalMessages.or)}
          </p>
          <AntButton htmlType="button" disabled={disabled}>
            {messages(generalMessages.doChoose)}
          </AntButton>
        </Flex>
      )}
    </Upload.Dragger>
  );
};

FileParserField.displayName = "FileParserField";

// -------------------------------------------------------------------
// FileUploaderField
// -------------------------------------------------------------------
const FILE_UPLOADER_CSS = `
.fileParserWrapper{
  p {
    margin-bottom: 0 !important;
  }
}

.separator {
  border: solid 1px rgba(151, 151, 151, 0.24);
  margin: 0 5px;
}

.nonePointer {
  pointer-events: none;
}

.errorBorder {
  border-color: var(--ant-color-error);
}
`;

export type UploadFile = RcFile | File;

export type ExtraProps = {
  accept: Extensions[];
  disabled?: boolean;
};

export const checkPropsExist = (props?: Partial<ExtraProps>) => {
  const { accept } = props ?? {};

  if (!accept || !Array.isArray(accept) || accept.length === 0 || !accept.every((item) => mimeTypes[item])) {
    throw new Error("Prop `accept` is required but was not provided or is invalid.");
  }

  return props as ExtraProps;
};

export const getFileExtension = (fileName: string) => {
  const match = /\.([0-9a-z]+)$/i.exec(fileName);
  return match && match[0] ? (match[0].toLowerCase().trim() as Extensions) : undefined;
};

export const checkIsValidFile = (file: UploadFile | undefined, accept: ExtraProps["accept"]) => {
  if (!file) throw new Error("فایلی ارسال نشده است.");

  const ext = getFileExtension(file.name);

  if (!ext) throw new Error("فایل ارسال شده فاقد پسوند می‌باشد.");

  const matchedExtension = accept.find((item) => item.toLowerCase().trim() === ext);

  if (!matchedExtension) throw new Error("پسوند فایل ارسال شده معتبر نمی‌باشد.");

  const fileMimeType = file.type.toLowerCase().trim();

  if (fileMimeType !== mimeTypes[matchedExtension]) throw new Error("فایل ارسال شده معتبر نمی‌باشد.");
};

const FileUploaderField: React.FC<BusinessElementFieldsProps<ExtraProps>> = ({ id, name, ...props }) => {
  const messages = getFormatMessage();

  const { accept, disabled } = checkPropsExist(props.options?.extraProps);

  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleUpload = async (file: UploadFile) => {
    try {
      checkIsValidFile(file, accept);

      props.onChange?.(file);
      setFileList(file);
      setError(undefined);
    } catch (err) {
      setError((err as Error).message);
      message.error(error);
    }
  };

  return (
    <Upload.Dragger
      name={name}
      id={String(id)}
      disabled={disabled}
      fileList={fileList ? [fileList] : []}
      beforeUpload={(file) => {
        handleUpload(file);
        return false;
      }}
      className={error ? "errorBorder" : ""}
    >
      {fileList ? (
        <Flex gap="small" align="center">
          <p>{fileList.name}</p>
          <AntButton
            icon={<DeleteOutlined />}
            danger
            variant="outlined"
            htmlType="button"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => {
              e.stopPropagation();
              setFileList(undefined);
            }}
          />
        </Flex>
      ) : (
        <Flex gap="0.75rem" justify="center" align="center" wrap>
          <p className="ant-upload-drag-icon" style={{ paddingLeft: "20px" }}>
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">{messages(generalMessages.dropFileHere)}</p>
          <p className="ant-upload-text" style={{ minWidth: "50px" }}>
            {messages(generalMessages.or)}
          </p>
          <AntButton htmlType="button" disabled={disabled}>
            {messages(generalMessages.doChoose)}
          </AntButton>
        </Flex>
      )}
    </Upload.Dragger>
  );
};

FileUploaderField.displayName = "FileUploaderField";

// -------------------------------------------------------------------
// IbanField
// -------------------------------------------------------------------
const ibanISO7064Mod97Validator = (iban: string): boolean => {
  let remainder = iban;
  let block;

  while (remainder.length > 2) {
    block = remainder.slice(0, 9);
    remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
  }

  return parseInt(remainder, 10) % 97 === 1;
};

export const ibanNumberValidationRules = () => {
  const messages = getFormatMessage();

  return [
    {
      validator: (_: any, value: string) => {
        if (!value) {
          return Promise.resolve();
        }

        const iban = value.toUpperCase().startsWith("IR")
          ? value.toUpperCase()
          : `IR${value}`.toUpperCase();

        if (value.length !== 24 && value.length !== 26) {
          return Promise.reject(messages(generalMessages.ibanLengthValidation));
        }

        if (!ibanISO7064Mod97Validator(iban)) {
          return Promise.reject(messages(generalMessages.invalidIban));
        }

        return Promise.resolve();
      },
    },
  ];
};

type IbanExtraProps = {
  placeholder?: string;
  addIR?: boolean;
};

const extractDigits = (value: string) => value.replace(/\D/g, "").trim();

const formatIban = (value: string) => value.replace(/(\d{4})(?=\d)/g, "$1 ");

const IbanField: React.FC<BusinessElementFieldsProps<IbanExtraProps>> = (props) => {
  const isReadOnly = props.options?.readOnly;
  const isEmpty = isEmpty(props.value);
  const displayedValue = isEmpty ? "-" : extractDigits(props.value as string).replace(/^IR/i, "");
  const placeholder = props?.options?.extraProps?.placeholder || "";
  const addIR = props?.options?.extraProps?.addIR ?? true;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const digitsOnly = extractDigits(rawInput);
    const ibanWithIR = addIR && digitsOnly.length > 0 ? `IR${digitsOnly}` : digitsOnly;
    props.onChange?.({ ...e, target: { ...e.target, value: ibanWithIR } });
  };

  return (
    <Input
      disabled={props.options?.disabled as boolean}
      readOnly={props?.options?.readOnly}
      placeholder={placeholder}
      id={props?.id}
      name={props?.name}
      value={formatIban(displayedValue)}
      onChange={handleChange}
      addonAfter={isEmpty ? "" : "IR"}
      dir="ltr"
      style={{ textAlign: isEmpty ? "inherit" : "left" }}
      maxLength={29}
      className={`${isReadOnly ? "brdp-field-iban brdp-field-iban--readonly" : "brdp-field-iban"}`}
    />
  );
};

IbanField.displayName = "IbanField";

// -------------------------------------------------------------------
// NestedDynamicField
// -------------------------------------------------------------------
const NESTED_DYNAMIC_FIELD_CSS = `
.wrapper{
  width: 100%;
}
`;

type NestedDynamicFieldProps = {
  addButtonLabel?: string;
  fields?: FormField<FormFields>[];
};

const NestedDynamicField: React.FC<BusinessElementFieldsProps<NestedDynamicFieldProps>> = ({
  options,
  form,
  name,
}) => {
  const messages = getFormatMessage();
  const dynamicFieldProps = options?.extraProps;

  return (
    <Flex vertical className="wrapper" gap="small">
      <Form.List name={name}>
        {(fields, { add, remove }) => (
          <Flex vertical>
            {fields.map((field, idx) => (
              <Flex key={field.key} align="start" gap={8}>
                <div style={{ flex: 1 }}>
                  <FormFieldsRow
                    fields={dynamicFieldProps?.fields ?? []}
                    form={form}
                    gutter={8}
                  />
                </div>
                {options?.readOnly !== true ? (
                  <Button
                    tooltip={messages(generalMessages.actionDelete)}
                    onClick={() => remove(idx)}
                    icon={
                      <MinusCircleOutlined
                        style={{ color: "var(--ant-color-error, red)" }}
                      />
                    }
                  />
                ) : null}
              </Flex>
            ))}

            {options?.readOnly !== true ? (
              <Button
                label={`${messages(generalMessages.actionAddition)} ${dynamicFieldProps?.addButtonLabel}`}
                icon={<PlusCircleOutlined />}
                onClick={() => add()}
              />
            ) : null}
          </Flex>
        )}
      </Form.List>
    </Flex>
  );
};

NestedDynamicField.displayName = "NestedDynamicField";

// -------------------------------------------------------------------
// PostalCodeField
// -------------------------------------------------------------------
export const postalCodeValidationRules = (errorMsg?: string) => {
  const messages = getFormatMessage();

  return [
    {
      validator: (_: any, value: string) => {
        if (!value) return Promise.resolve();

        if (!/^[1-9]\d{4}(?:-?\d{5})?$/.test(value)) {
          return Promise.reject(errorMsg ?? messages(generalMessages.invalidPostalCode));
        }

        return Promise.resolve();
      },
    },
  ];
};

const sanitizeDigits = (value: string) => value.replace(/[^0-9]/g, "");

type PostalCodeExtraProps = {
  placeholder?: string;
};

const PostalCodeField: React.FC<BusinessElementFieldsProps<PostalCodeExtraProps>> = ({
  id,
  name,
  options,
  value,
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetValue = e.target.value;
    const prev = (value as string) || "";
    const sanitized = sanitizeDigits(targetValue);

    if (sanitized.length === 1 && sanitized[0] === "0") {
      return onChange?.(prev);
    }

    if (sanitized.length > 10) {
      return onChange?.(prev);
    }

    return onChange?.(sanitized);
  };

  return (
    <Input
      id={id}
      name={name}
      dir="ltr"
      readOnly={options?.readOnly}
      disabled={options?.disabled}
      placeholder={options?.extraProps?.placeholder}
      maxLength={10}
      hidden={options?.hidden}
      value={value as string}
      onChange={handleChange}
    />
  );
};

PostalCodeField.displayName = "PostalCodeField";

// -------------------------------------------------------------------
// ShahabCodeField
// -------------------------------------------------------------------
export const shahabCodeValidationRules = (): RuleObject[] => {
  const messages = getFormatMessage();

  return [
    {
      validator: (_: any, value: string) => {
        if (value && !/^\d{16}$/.test(value)) {
          return Promise.reject(
            new Error(
              messages(generalMessages.validateFieldExactLengthNumber, {
                field: messages(generalMessages.shahabCode),
                length: 16,
              }),
            ),
          );
        }

        if (value && /^0{16}$/.test(value)) {
          return Promise.reject(
            new Error(messages(generalMessages.validateAllDigitsNotZero)),
          );
        }

        return Promise.resolve();
      },
    },
  ];
};

type ShahabCodeExtraProps = {
  placeholder?: string;
};

const ShahabCodeField: React.FC<BusinessElementFieldsProps<ShahabCodeExtraProps>> = ({
  form: _form,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetValue = e.target.value;
    const prev = (props.value as string) || "";
    const isNonNumeric = !/^\d*$/.test(targetValue);

    if (isNonNumeric) {
      return props?.onChange?.(prev);
    }

    return props?.onChange?.(targetValue);
  };

  return (
    <Input
      name={props.name}
      id={props.id}
      readOnly={props.options?.readOnly}
      disabled={props.options?.disabled}
      hidden={props.options?.hidden}
      value={props.value as string}
      onChange={handleChange}
      placeholder={props?.options?.extraProps?.placeholder}
      maxLength={16}
    />
  );
};

ShahabCodeField.displayName = "ShahabCodeField";

// -------------------------------------------------------------------
// SortableField
// -------------------------------------------------------------------
const SORTABLE_FIELD_CSS = `
.sortableList{
  user-select: none;
  border-radius: var(--ant-border-radius);
  contain: paint;

  :global {
    .ant-list-items{
      max-height: 238px; /* 6 item */
      overflow: auto;
    }
  }
}

.sortableItem {
  background-color: #fafafa;
  border-block-width: var(--ant-line-width) !important;
  border-block-style: var(--ant-line-type) !important;
  border-block-color: transparent;
  border-block-end-color: var(--ant-color-border) !important;
  padding: var(--ant-padding-xs) var(--ant-padding-sm) !important;

  &:last-child{
    border-block-end-color: transparent !important;
  }

  :global {
    span[role="img"]{
      color: #8C8E97
    }
  }
}

.sortableItem:not(:global(.disabled)) {
  &:hover{
    background-color: #f4f4f4;
  }
}

.sortableItem:global(.disabled) {
  background-color: var(--ant-color-bg-container-disabled);
  padding: var(--ant-padding-xxs) var(--ant-padding-xs) !important;
}

.sortableItem:global(.dragging) {
  background-color: #f4f4f4;
  border-block-end-color: var(--ant-color-border) !important;
  border-block-start-color: var(--ant-color-border) !important;
  cursor: grabbing;
  cursor: -moz-grabbing;
  cursor: -webkit-grabbing;
}
`;

type SortableData = Record<string, unknown> & {
  _sortableKey: string;
};

export type SortableFieldProps = {
  loading?: boolean;
  renderItemKey?: string;
};

export const logValueError = (value: unknown) => {
  console.error(
    `[FormField Error] <SortableField>: Invalid "value" prop.

Expected:
  value: Array<Record<string, unknown>>

Received:
  ${value}

Hint:
  - Make sure "value" is an array of objects.
  - Example:
    [
      { value: "a", label: "Option A" },
      { value: "b", label: "Option B" }
    ]
`,
  );
};

export const logRenderItemKeyError = (value: unknown, renderItemKey: SortableFieldProps['renderItemKey']) => {
  const valueArray = value && Array.isArray(value) ? value : [];

  console.error(
    `[FormField Error] <SortableField>: Invalid "options.extraProps.renderItemKey" prop.

Expected:
  renderItemKey: ${Object.keys(valueArray[0] ?? {})}

Received: ${renderItemKey}

Hint:
  - Make sure "renderItemKey" is an keyof a value objects.
  - Example:
    {
      value: [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B", disabled: true }
      ];
      renderItemKey: "label"
    }
`,
  );
};

const SortableListItem: FC<GetProps<typeof List.Item> & { itemKey: string; disabled?: boolean }> = (props) => {
  const { itemKey, style, children, disabled, ...rest } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey,
    disabled,
  });

  const listStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: disabled ? "not-allowed" : "move",
    ...(isDragging && !disabled ? { position: "relative", zIndex: 9999, cursor: "grabbing" } : {}),
  };

  return (
    <List.Item
      {...rest}
      ref={setNodeRef}
      style={listStyle}
      className={clsx("sortableItem", { dragging: isDragging && !disabled, disabled: disabled })}
      {...attributes}
      {...listeners}
    >
      <Flex align="center" justify="start" gap="small">
        {!(isDragging || disabled) && <ExpandIcon width={24} height={24} />}
        {children}
      </Flex>
    </List.Item>
  );
};

const SortableField: FC<BusinessElementFieldsProps<SortableFieldProps>> = ({
  options,
  id,
  value,
  onChange,
}) => {
  const disabled = options?.disabled;
  const readOnly = options?.readOnly;
  const { loading, renderItemKey } = options?.extraProps ?? {};

  const [data, setData] = useState<SortableData[]>(() => {
    if (!Array.isArray(value)) {
      logValueError(value);
      return [];
    }

    return value.map((item) => ({
      ...item,
      _sortableKey: item._sortableKey || generateUuidV4(),
    }));
  });

  useEffect(() => {
    if (!Array.isArray(value)) return;

    setData(value.map((item) => ({
      ...item,
      _sortableKey: item._sortableKey || generateUuidV4(),
    })));
  }, [value]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      setData((prevData) => {
        const activeIndex = prevData.findIndex((item) => item._sortableKey === active.id);
        const overIndex = prevData.findIndex((item) => item._sortableKey === over?.id);

        const newData = arrayMove(prevData, activeIndex, overIndex);
        onChange?.(newData);

        return newData;
      });
    }
  };

  if (renderItemKey && !data.every((item) => renderItemKey in item)) {
    logRenderItemKeyError(value, renderItemKey);
  }

  return (
    <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext
        items={data.map((item) => item._sortableKey)}
        strategy={verticalListSortingStrategy}
        disabled={disabled || readOnly}
      >
        <List
          dataSource={data}
          loading={loading}
          id={id}
          className="sortableList"
          bordered
          renderItem={(item) => (
            <SortableListItem
              key={item._sortableKey}
              itemKey={item._sortableKey}
              disabled={disabled || readOnly || Boolean(item.disabled)}
            >
              {renderItemKey && item[renderItemKey] ? String(item[renderItemKey]) : null}
            </SortableListItem>
          )}
        />
      </SortableContext>
    </DndContext>
  );
};

SortableField.displayName = "SortableField";

// -------------------------------------------------------------------
// TagField
// -------------------------------------------------------------------
const TAG_FIELD_CSS = `
.tag-field {
  display: inline-flex;
  align-items: center;
  width: max-content;
  border-radius: 12px;
  height: 30px;
  font-weight: bold;
}

.tag-field :global(.anticon) + span {
  margin-inline-start: 0;
}
`;

type ParserResult = { color: ColorType; icon?: React.ReactNode; label?: React.ReactNode };

type TagExtraProps = {
  parser?: (value: unknown) => ParserResult;
};

const TagField: React.FC<BusinessElementFieldsProps<TagExtraProps>> = ({
  form: _form,
  value,
  id,
  options,
}) => {
  const messages = getFormatMessage();

  const parsed = useMemo<ParserResult>(() => {
    return options?.extraProps?.parser
      ? (options.extraProps.parser(value) ?? { color: "default" })
      : { color: "default" };
  }, [options?.extraProps?.parser, value]);

  const icon = useMemo(() => {
    if (parsed.icon) return parsed.icon;
    if (parsed.color === "success") return <IconsList.TickSimpleIcon />;
    if (parsed.color === "error") return <IconsList.CrossIcon />;
    return undefined;
  }, [parsed]);

  const label = useMemo<React.ReactNode>(() => {
    if (parsed.label) return parsed.label;

    switch (parsed.color) {
      case "success":
        return messages(generalMessages.has);
      case "error":
        return messages(generalMessages.doesNotHave);
      default:
        return value as React.ReactNode;
    }
  }, [parsed, value, messages]);

  return options?.readOnly && value === "-" ? (
    <strong>-</strong>
  ) : (
    <TagComponent className="tag-field" id={id} color={parsed.color} icon={icon}>
      {label}
    </TagComponent>
  );
};

TagField.displayName = "TagField";

// -------------------------------------------------------------------
// BusinessTagDemo
// -------------------------------------------------------------------
const BusinessTagDemo: React.FC<BusinessElementFieldsProps> = ({
  name,
  value,
  ...rest
}) => {
  console.log("BusinessTagDemo", { ...rest });

  useEffect(() => {
    if (rest.onChange) {
      rest.onChange(false);
    }
  }, [rest.onChange]);

  return (
    <Tag color="blue" style={{ width: "100%" }}>
      <span>
        Business, name: {name}-{rest.options?.returnFormat?.type}
      </span>
      <div>
        <pre dir="ltr">{JSON.stringify(rest)}</pre>
      </div>
    </Tag>
  );
};

BusinessTagDemo.displayName = "BusinessTagDemo";

// -------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------
export {
  AmountField,
  AutoCompleteField,
  BankIdentifierField,
  ButtonField,
  CalculatorField,
  ButtonsCalculatorField,
  ModalCalculatorField,
  CardNumberField,
  CollapseField,
  CopyableField,
  DatePickerField,
  DateTimePickerField,
  FileParserField,
  FileUploaderField,
  IbanField,
  NestedDynamicField,
  PostalCodeField,
  ShahabCodeField,
  SortableField,
  TagField,
  TimePickerField,
  BusinessTagDemo,
};

export { CALCULATOR_FIELD_CSS, FILE_PARSER_CSS, FILE_UPLOADER_CSS, NESTED_DYNAMIC_FIELD_CSS, SORTABLE_FIELD_CSS, TAG_FIELD_CSS };




