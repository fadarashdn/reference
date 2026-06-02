import accessKeys from "@/config/accessKeys";
import EbillAssurancesModal from "@/pages/ebill-files-management/modals/assurances/ebill-assurance-modal";
import ConvertDebtManagement from "@/pages/ebill-files-management/modals/convert-debt/convert-debt-management-modal";
import DeleteEbillFile from "@/pages/ebill-files-management/modals/delete-ebill/delete-ebill-modal";
import PayAmountManagementModal from "@/pages/ebill-files-management/modals/pay-amount/pay-amount-management-modal";
import { Services } from "@/services/url";
import {
  convertSelectboxData,
  type SelectboxDataType,
} from "@/utils/convert-selectbox-data";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { showAppModal } from "@/utils/hooks/useAppModal";
import { formatNumber } from "@/utils/string-format";
import { BusinessElements, Translate, useAppContext, useGet } from "@brdp/engine";
import {
  Content,
  ErrorAlert,
  GenerativeTable,
  IconsList,
  Tag,
  useTablePagination,
} from "@brdp/ui";
import FormGenerator, { useControlledForm } from "@brdp/ui/form";
import {
  getFormatMessage,
  ISOToJalaaliDate,
  jalaaliDateTimeToISO,
  numbersOnly,
  removeEmptyValues,
  validateExactLength,
} from "@brdp/utils";
import { useState } from "react";
import { useGetBillType } from "../base-info/commission-rate/hooks/use-get-bill-type";
import AddBaratFile from "./modals/add-barat-file/add-barat-file";
import BankIssuance from "./modals/bank-issuance/bank-issuance";
import CentralBankManagement from "./modals/central-bank-management/central-bank-management-modal";
import CommissionManagement from "./modals/commission/commission-management-modal";
import CustomerIssuanceBack from "./modals/customer-issuance-back/customer-issuance-back";
import CustomerIssuance from "./modals/customer-issuance/customer-issuance";
import ViewEbillDetail from "./modals/detail-view/view-ebill-detail";
import EconomyMinistryManagement from "./modals/economy-ministry-management/economy-ministry-management-modal";
import EditBaratFile from "./modals/edit-barat-file/edit-barat-file";
import ProofManagement from "./modals/proof/proof-management-modal";
import ReceiveAmount from "./modals/receive-amount/receive-amount";
import SanctionApprove from "./modals/sanction-approve/sanction-approve";
import Sanction from "./modals/sanction/sanction";

type EbillFilesManagementFormType = {
  billTypeCode: string;
  customerNumber: string;
  centralBankCode: string;
  billNumber: string;
  startDateFrom: string;
  startDateTo: string;
  expireDateFrom: string;
  expireDateTo: string;
  amountFrom: number;
  amountTo: number;
  status: string;
};

export type EbillFilesManagementDataType = {
  billTypeCode?: string;
  customerNumber?: string;
  centralBankCode?: string;
  billNumber?: string;
  startDateFrom?: string;
  startDateTo?: string;
  expireDateFrom?: string;
  expireDateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  status?: string;
  pageSize: number;
  pageNumber: number;
};

type EbillFileType = {
  centralBankCode: string;
  billNumber: string;
  branchName: string;
  branchCode: string;
  enable: boolean;
  statusName: string;
  statusCode: string;
  startDateTime: string;
  endDateTime: string;
  amount: number;
  customerNumber: string;
  duration: number;
  billTypeCode: string;
  billTypeName: string;
  action: {
    update: boolean;
    view: boolean;
    delete: boolean;
    certificate: boolean;
    sanction: boolean;
    transfer: boolean;
    approve: boolean;
    assurance: boolean;
    centralBank: boolean;
    economyMinistry: boolean;
    issuance: boolean;
    commission: boolean;
    receivePayment: boolean;
    payPayment: boolean;
    convertDebt: boolean;
    spmManagement: boolean;
    settlement: boolean;
    customerIssuance: boolean;
    customerIssuanceBack: boolean;
    ministryTax: boolean;
    receiveCash: boolean;
    discount: boolean;
  };
};

type EbillFilesManagementResponseType = {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  items: EbillFileType[];
};

const CustomTag: React.FC<{ title: string; type: string }> = ({ title, type }) => {
  switch (type) {
    case "ELECTRONIC_BILL_ISSUED": //"صدور تعهد مشتری"
      return <Tag color="blue">{title}</Tag>;
    case "ELECTRONIC_BILL_PAYED": //"پرداخت شده"
      return <Tag color="grassColor">{title}</Tag>;
    case "ELECTRONIC_BILL_SETTLED": //"خاتمه یافته"
      return <Tag color="gray">{title}</Tag>;
    case "ELECTRONIC_BILL_APPROVED": //"تصویب شده"
      return <Tag color="green">{title}</Tag>;
    case "ELECTRONIC_BILL_HAS_MINISTRY_TAX": //"دارای شناسه مالیاتی"
      return <Tag color="pink">{title}</Tag>;
    case "ELECTRONIC_BILL_BANK_ISSUED": //"صدور تعهد بانک"
      return <Tag color="purple">{title}</Tag>;
    case "ELECTRONIC_BILL_DELETED": //"حذف شده"
      return <Tag color="red">{title}</Tag>;
    case "ELECTRONIC_BILL_CREATED": //"تشکیل شده"
      return <Tag color="cyan">{title}</Tag>;
    default:
      return <Tag>{title}</Tag>;
  }
};

const EbillFilesManagement: React.FC = () => {
  const messages = getFormatMessage();
  const { billTypeLoading, uniqueBillTypes, billTypeError } = useGetBillType();
  const [searchData, setSearchData] = useState<EbillFilesManagementFormType>();
  const {
    access: { hasAccessTo },
  } = useAppContext();
  const { tableConfig, PAGE_SIZE, resetPage, tableFromIndex, currentPage } =
    useTablePagination();

  const { ControlledForm } = useControlledForm<EbillFilesManagementFormType>({
    id: "ebillFilesManagementForm",
  });

  const {
    data: allBillStatusData,
    isFetching: allBillStatusIsFetching,
    error: allBillStatusError,
  } = useGet<SelectboxDataType[]>(
    ["all-bill-status"],
    Services.EbillServices.GET_ALL_BILL_STATUS(),
    { raw: true },
  );

  const { data, isFetching, isLoading, mutate, error, reset } =
    useGet<EbillFilesManagementResponseType>(
      ["ebill-files-management", currentPage, PAGE_SIZE],
      Services.ExternalServices.GET_EBILL_FILES({
        pageSize: PAGE_SIZE,
        pageNumber: currentPage,
        ...removeEmptyValues<Partial<EbillFilesManagementFormType>>({
          ...searchData,
        }),
      }),
      {
        enable: !!searchData,
        hasPagination: true,
        raw: true,
      },
    );

  const handleSearch = (values: EbillFilesManagementFormType) => {
    setSearchData({
      ...values,
      customerNumber: values.customerNumber,
      startDateFrom: values.startDateFrom
        ? jalaaliDateTimeToISO(values.startDateFrom)
        : "",
      startDateTo: values.startDateTo ? jalaaliDateTimeToISO(values.startDateTo) : "",
      expireDateFrom: values.expireDateFrom
        ? jalaaliDateTimeToISO(values.expireDateFrom)
        : "",
      expireDateTo: values.expireDateTo ? jalaaliDateTimeToISO(values.expireDateTo) : "",
    });

    mutate();

    resetPage();
  };

  const convertedData = data?.resultData?.items?.map((item) => ({
    ...item,
    startDateTime: item.startDateTime ? ISOToJalaaliDate(item.startDateTime) : "",
    endDateTime: item.endDateTime ? ISOToJalaaliDate(item.endDateTime) : "",
  }));

  return (
    <Content title={messages("ebill.ebillFilesManagement")}>
      {error && (
        <ErrorAlert errorMessage={getErrorMessage(error)} errorList={error?.errorList} />
      )}

      {allBillStatusError && (
        <ErrorAlert
          errorMessage={getErrorMessage(allBillStatusError)}
          errorList={allBillStatusError?.errorList}
        />
      )}

      {billTypeError && (
        <ErrorAlert
          errorMessage={getErrorMessage(billTypeError)}
          errorList={billTypeError?.errorList}
        />
      )}

      <ControlledForm
        isSubmitting={isLoading}
        submitLabel={messages("brdpManagement.search")}
        submitButtonIcon={<IconsList.SearchIcon />}
        onSubmit={handleSearch}
        onReset={() => {
          reset();
          resetPage();
          setSearchData(undefined);
        }}
        fields={[
          {
            name: "billTypeCode",
            type: "select",
            label: messages("ebill.ebillTypeCodeName"),
            loading: billTypeLoading,
            options: {
              placeholder: messages("brdpManagement.doChoose"),
              searchable: true,
            },
            data: {
              static: uniqueBillTypes,
            },
          },
          {
            type: "business",
            name: "customerNumber",
            label: messages("brdpManagement.customerNumber"),
            element: BusinessElements.CustomerSearchField,
            options: {
              extraProps: { preventBlurRequest: true },
              returnFormat: { type: "string", template: "" },
            },
          },
          {
            name: "centralBankCode",
            type: "input",
            label: messages("ebill.centralBankCode"),
            validation: {
              rules: [validateExactLength(16), numbersOnly({ allowInteger: true })],
            },
          },
          {
            name: "billNumber",
            type: "input",
            label: messages("ebill.ebillFileNumber"),
          },
          {
            name: "startDateFrom",
            type: "business",
            element: FormGenerator.DatePickerField,
            label: messages("ebill.creationDateFrom"),
            options: {
              placeholder: messages("ebill.placeholderDate_slash_template"),
              returnFormat: {
                type: "string",
                template: "YYYY/MM/DD",
              },
              extraProps: {
                maxDate: "startDateTo",
              },
            },
          },
          {
            name: "startDateTo",
            type: "business",
            element: FormGenerator.DatePickerField,
            label: messages("ebill.creationDateTo"),
            options: {
              placeholder: messages("ebill.placeholderDate_slash_template"),
              returnFormat: {
                type: "string",
                template: "YYYY/MM/DD",
              },
              extraProps: {
                minDate: "startDateFrom",
                setTimeToEnd: true,
              },
            },
          },
          {
            name: "expireDateFrom",
            type: "business",
            element: FormGenerator.DatePickerField,
            label: messages("ebill.expireDateFrom"),
            options: {
              placeholder: messages("ebill.placeholderDate_slash_template"),
              returnFormat: {
                type: "string",
                template: "YYYY/MM/DD",
              },
              extraProps: {
                maxDate: "expireDateTo",
              },
            },
          },
          {
            name: "expireDateTo",
            type: "business",
            element: FormGenerator.DatePickerField,
            label: messages("ebill.expireDateTo"),
            options: {
              placeholder: messages("ebill.placeholderDate_slash_template"),
              returnFormat: {
                type: "string",
                template: "YYYY/MM/DD",
              },
              extraProps: {
                minDate: "expireDateFrom",
              },
            },
          },
          {
            name: "amountFrom",
            type: "business",
            element: FormGenerator.AmountField,
            label: messages("ebill.ebillAmountFrom"),
          },
          {
            name: "amountTo",
            type: "business",
            element: FormGenerator.AmountField,
            label: messages("ebill.ebillAmountTo"),
          },
          {
            name: "status",
            type: "select",
            label: messages("brdpManagement.status"),
            loading: allBillStatusIsFetching,
            options: {
              placeholder: messages("brdpManagement.doChoose"),
            },
            data: {
              static: allBillStatusData
                ? convertSelectboxData(allBillStatusData?.resultData)
                : [],
            },
          },
        ]}
      />

      <GenerativeTable<EbillFileType>
        rowKey="billNumber"
        fromIndex={tableFromIndex}
        data={convertedData || []}
        pagination={tableConfig(data?.resultData?.totalCount || 0)}
        title={`${messages("brdpManagement.tableRowsCount")}: ${data?.resultData?.totalCount || 0}`}
        loading={isFetching}
        tableHeaderActions={[
          {
            id: "barat-file",
            mode: "expanded",
            actions: [
              {
                id: "add-barat-file",
                appearance: {
                  icon: <IconsList.PlusCircleIcon />,
                  tooltip: messages("ebill.addEbillFile"),
                },
                access: hasAccessTo(accessKeys.createElectronicBill),
                action: () =>
                  showAppModal({
                    id: "add-barat-file",
                    title: messages("ebill.addEbillFile"),
                    icon: <IconsList.PlusCircleIcon />,
                    element: <AddBaratFile mutate={mutate} />,
                    options: {
                      size: "default",
                      closable: true,
                    },
                  }),
              },
            ],
          },
        ]}
        columns={[
          {
            key: "billNumber",
            dataIndex: "billNumber",
            title: messages("ebill.fileNumber"),
          },
          {
            key: "branchName",
            dataIndex: "branchName",
            title: messages("ebill.branchCodeAndName"),
            render: (col, row) => `${col} - ${row.branchCode}`,
            sorter: (a, b) => a?.branchName?.localeCompare(b?.branchName),
          },
          {
            key: "customerNumber",
            dataIndex: "customerNumber",
            title: messages("brdpManagement.customerNumber"),
          },
          {
            key: "centralBankCode",
            dataIndex: "centralBankCode",
            title: messages("ebill.centralBankCode"),
          },
          {
            key: "startDateTime",
            dataIndex: "startDateTime",
            title: messages("ebill.creationDate"),
            sorter: (a, b) => a?.startDateTime?.localeCompare(b?.startDateTime),
          },
          {
            key: "endDateTime",
            dataIndex: "endDateTime",
            title: messages("ebill.expirationDate"),
            sorter: (a, b) => a?.endDateTime?.localeCompare(b?.endDateTime),
          },
          {
            key: "amount",
            dataIndex: "amount",
            title: `${messages("brdpManagement.amount")} (${messages("brdpManagement.rial")})`,
            render: (col) => {
              return <p>{formatNumber(col)}</p>;
            },
            sorter: (a, b) => {
              const amountA = Number(a.amount) || 0;
              const amountB = Number(b.amount) || 0;
              return amountA - amountB;
            },
          },
          {
            key: "statusName",
            dataIndex: "statusName",
            title: messages("brdpManagement.status"),
            render: (col, row) => <CustomTag title={col} type={row.statusCode} />,
          },
        ]}
        rowActions={[
          {
            id: "viewDetail",
            appearance: {
              icon: <IconsList.EyeIcon />,
              tooltip: messages("brdpManagement.actionView"),
            },
            action: (values) => {
              showAppModal({
                id: "ebill-detail-view",
                icon: <IconsList.EyeIcon />,
                title: (
                  <Translate
                    tKey="ebill.viewDetailBaratManagement"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: <ViewEbillDetail billNumber={values.billNumber} />,
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.view;
            },
          },
          {
            id: "edit",
            appearance: {
              icon: <IconsList.EditIcon />,
              tooltip: messages("brdpManagement.actionEdit"),
            },
            access: hasAccessTo(accessKeys.updateElectronicBill),
            action: (values) => {
              showAppModal({
                id: "edit-barat-file",
                icon: <IconsList.EditIcon />,
                title: (
                  <Translate
                    tKey="ebill.editFileBarat"
                    params={{
                      billNumber: values?.billNumber || "",
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: (
                  <EditBaratFile mutate={mutate} billNumber={values?.billNumber || ""} />
                ),
                options: {
                  size: "default",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.update;
            },
          },
          {
            id: "delete",
            appearance: {
              icon: <IconsList.DeleteIcon />,
              tooltip: messages("brdpManagement.actionDelete"),
            },
            access: hasAccessTo(accessKeys.deleteElectronicBill),
            action: (values) => {
              const modalId = "delete-ebill-file";
              showAppModal({
                id: modalId,
                icon: <IconsList.DeleteIcon />,
                title: (
                  <Translate
                    tKey="ebill.deleteFileBarat"
                    params={{
                      billNumber: values?.billNumber || "",
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: (
                  <DeleteEbillFile
                    billNumber={values?.billNumber || ""}
                    modalId={modalId}
                  />
                ),
                options: {
                  size: "small",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.delete;
            },
          },
          {
            id: "proof",
            appearance: {
              icon: <IconsList.BalanceIcon />,
              tooltip: messages("ebill.certificates"),
            },
            action: (values) => {
              showAppModal({
                id: "proofModal",
                icon: <IconsList.BalanceIcon />,
                title: (
                  <Translate
                    tKey="ebill.ebillFileCertificates"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: (
                  <ProofManagement
                    getEbillFiles={mutate}
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: { closable: true },
              });
            },
            hidden(record) {
              return !record.action.certificate;
            },
          },
          {
            id: "sanction",
            appearance: {
              icon: <IconsList.BalanceScaleIcon />,
              tooltip: messages("ebill.sanction"),
            },
            access: hasAccessTo(accessKeys.addSanctionElectronicBill),
            action: (values) => {
              showAppModal({
                id: "sanction-barat-file",
                icon: <IconsList.BalanceScaleIcon />,
                title: (
                  <Translate
                    tKey="ebill.sanctionModalTitle"
                    params={{
                      billNumber: values?.billNumber || "",
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: (
                  <Sanction
                    mutate={mutate}
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: {
                  size: "default",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.sanction;
            },
          },
          {
            id: "approve",
            appearance: {
              icon: <IconsList.StampIcon />,
              tooltip: messages("ebill.approve"),
            },
            action: (values) => {
              showAppModal({
                id: "approve-barat-file",
                icon: <IconsList.StampIcon />,
                title: (
                  <Translate
                    tKey="ebill.approveModalTitle"
                    params={{
                      billNumber: values?.billNumber || "",
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: (
                  <SanctionApprove
                    mutate={mutate}
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.approve;
            },
          },
          {
            id: "assurance",
            appearance: {
              icon: <IconsList.DocumentBottomFoldIcon />,
              tooltip: messages("ebill.assurance"),
            },
            access: hasAccessTo(accessKeys.addAssuranceElectronicBill),
            action: (values) => {
              showAppModal({
                id: "ebill-assurance-modal",
                title: (
                  <Translate
                    tKey="ebill.assuranceModalTitle"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                icon: <IconsList.DocumentBottomFoldIcon />,
                element: (
                  <EbillAssurancesModal
                    getEbillFiles={mutate}
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: { size: "wide", closable: true },
              });
            },
            hidden(record) {
              return !record.action.assurance;
            },
          },
          {
            id: "centralBank",
            appearance: {
              icon: <IconsList.MinistryManagementIcon />,
              tooltip: messages("ebill.centralBankManagement"),
            },
            action: (values) => {
              showAppModal({
                id: "centralBankManagementModal",
                icon: <IconsList.MinistryManagementIcon />,
                title: (
                  <Translate
                    tKey="ebill.ebillFileCentralBankManagement"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: (
                  <CentralBankManagement
                    getEbillFiles={mutate}
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                    centralBankCode={values.centralBankCode}
                  />
                ),
                options: { closable: true, size: "wide" },
              });
            },
            hidden(record) {
              return !record.action.spmManagement;
            },
          },
          {
            id: "customerIssuance",
            appearance: {
              icon: <IconsList.ValidUserIcon />,
              tooltip: messages("ebill.customerIssuance"),
            },
            access: hasAccessTo(accessKeys.electronicBillCustomerIssuance),
            action: (values) => {
              showAppModal({
                id: "customerIssuanceModal",
                icon: <IconsList.ValidUserIcon />,
                title: messages("ebill.customerIssuance"),
                element: (
                  <CustomerIssuance
                    billNumber={values.billNumber}
                    customerNumber={values.customerNumber}
                    getEbillFiles={mutate}
                  />
                ),
                options: { size: "small" },
              });
            },
            hidden(record) {
              return !record.action.customerIssuance;
            },
          },
          {
            id: "customerIssuanceBack",
            appearance: {
              icon: <IconsList.UserArrowDownIcon />,
              tooltip: messages("ebill.customerIssuanceBack"),
            },
            access: hasAccessTo(accessKeys.electronicBillCustomerIssuanceBack),
            action: (values) => {
              showAppModal({
                id: "customerIssuanceBackModal",
                icon: <IconsList.UserArrowDownIcon />,
                title: messages("ebill.customerIssuanceBack"),
                element: (
                  <CustomerIssuanceBack
                    billNumber={values.billNumber}
                    customerNumber={values.customerNumber}
                    getEbillFiles={mutate}
                  />
                ),
                options: { size: "small" },
              });
            },
            hidden(record) {
              return !record.action.customerIssuanceBack;
            },
          },
          {
            id: "economyMinistry",
            appearance: {
              icon: <IconsList.EconomyIcon />,
              tooltip: messages("ebill.economyMinistry"),
            },
            action: (values) => {
              showAppModal({
                id: "economyMinistryModal",
                icon: <IconsList.EconomyIcon />,
                title: (
                  <Translate
                    tKey="ebill.ebillEconomyMinistry"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: (
                  <EconomyMinistryManagement
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.economyMinistry;
            },
          },
          {
            id: "bankIssuance",
            appearance: {
              icon: <IconsList.MinistryIcon />,
              tooltip: messages("ebill.bankIssuance"),
            },
            access: hasAccessTo(accessKeys.electronicBillBankIssuance),
            action: (values) => {
              showAppModal({
                id: "bankIssuanceModal",
                icon: <IconsList.MinistryIcon />,
                title: messages("ebill.bankIssuance"),
                element: (
                  <BankIssuance
                    billNumber={values.billNumber}
                    customerNumber={values.customerNumber}
                    getEbillFiles={mutate}
                  />
                ),
                options: { size: "small", closable: true },
              });
            },
            hidden(record) {
              return !record.action.issuance;
            },
          },
          {
            id: "commission",
            appearance: {
              icon: <IconsList.SquarePercentIcon />,
              tooltip: messages("ebill.commission"),
            },
            action: (values) => {
              showAppModal({
                id: "ebill-commission-modal",
                icon: <IconsList.SquarePercentIcon />,
                title: (
                  <Translate
                    tKey="ebill.ebillCommissions"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                element: (
                  <CommissionManagement
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.commission;
            },
          },
          {
            id: "receivePayment",
            appearance: {
              icon: <IconsList.GetCashIcon />,
              tooltip: messages("ebill.receivePayment"),
            },
            action: (values) => {
              showAppModal({
                id: "receiveAmountModal",
                title: (
                  <Translate
                    tKey="ebill.receivePaymentModalTitle"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                icon: <IconsList.GetCashIcon />,
                element: (
                  <ReceiveAmount
                    mutate={mutate}
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.receivePayment;
            },
          },
          {
            id: "payPayment",
            appearance: {
              icon: <IconsList.PayAmountIcon />,
              tooltip: messages("ebill.payPayment"),
            },
            action: (values) => {
              showAppModal({
                id: "payAmountModal",
                title: (
                  <Translate
                    tKey="ebill.payAmountModalTitle"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                icon: <IconsList.PayAmountIcon />,
                element: (
                  <PayAmountManagementModal
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.payPayment;
            },
          },
          {
            id: "convertDebt",
            appearance: {
              icon: <IconsList.ReturnCashIcon />,
              tooltip: messages("ebill.convertDebt"),
            },

            action: (values) => {
              showAppModal({
                id: "convert-debt-modal-id",
                title: (
                  <Translate
                    tKey="ebill.convertDebtModalId"
                    params={{
                      billNumber: values.billNumber,
                    }}
                    components={{
                      span: <span dir="ltr" />,
                    }}
                  />
                ),
                icon: <IconsList.ReturnCashIcon />,
                element: (
                  <ConvertDebtManagement
                    billNumber={values.billNumber}
                    startDateTime={values.startDateTime}
                    endDateTime={values.endDateTime}
                    amount={values.amount}
                    billTypeCode={values.billTypeCode}
                    billTypeName={values.billTypeName}
                    duration={values.duration}
                    customerNumber={values.customerNumber}
                  />
                ),
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            hidden(record) {
              return !record.action.convertDebt;
            },
          },
          {
            id: "settlement",
            appearance: {
              icon: <IconsList.HorizontalBarsIcon />,
              tooltip: messages("ebill.settlement"),
            },
            action: () => {},
            hidden(record) {
              return !record.action.settlement;
            },
          },
        ]}
      />
    </Content>
  );
};

export default EbillFilesManagement;
