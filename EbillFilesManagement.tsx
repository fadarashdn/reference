import CustomerSearch from "@/components/business-components/customerSearch/customer-search";
import { getCustomerNumber } from "@/components/business-components/customerSearch/get-customer-number";
import { ebillMessages } from "@/locale/ebill-messages";
import EbillAssurancesModal from "@/pages/ebill-files-management/modals/assurances/ebill-assurance-modal";
import { Services } from "@/services/url";
import {
  convertSelectboxData,
  type SelectboxDataType,
} from "@/utils/convert-selectbox-data";
import { showAppModal } from "@/utils/hooks/useAppModal";
import { formatNumber } from "@/utils/string-format";
import { useGet } from "@brdp/engine";
import { Content, GenerativeTable, IconsList, Tag, useTablePagination } from "@brdp/ui";
import FormGenerator, { useControlledForm } from "@brdp/ui/form";
import {
  generalMessages,
  getFormatMessage,
  ISOToJalaaliDate,
  jalaaliDateTimeToISO,
  numbersOnly,
  numbersOnlyNotStartWithZero,
  removeEmptyValues,
  validateExactLength,
  validateMaxLength,
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
import EditBaratFile from "./modals/edit-barat-file/edit-barat-file";
import ProofManagement from "./modals/proof/proof-management-modal";
import ReceiveAmount from "./modals/receive-amount/receive-amount";
import SanctionApprove from "./modals/sanction-approve/sanction-approve";
import Sanction from "./modals/sanction/sanction";
import EconomyMinistryManagement from "./modals/economy-ministry-management/economy-ministry-management-modal";

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
  };
};

type EbillFilesManagementResponseType = {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  queryResult: EbillFileType[];
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
  const { billTypeLoading, uniqueBillTypes } = useGetBillType();
  const [searchData, setSearchData] = useState<EbillFilesManagementFormType>();

  const { tableConfig, PAGE_SIZE, resetPage, tableFromIndex, currentPage } =
    useTablePagination();

  const { ControlledForm } = useControlledForm<EbillFilesManagementFormType>({
    id: "ebillFilesManagementForm",
  });

  const { data: allBillStatusData, isFetching: allBillStatusIsFetching } = useGet<
    SelectboxDataType[]
  >(["all-bill-status"], Services.EbillServices.GET_ALL_BILL_STATUS());

  const { data, isFetching, isLoading, mutate } =
    useGet<EbillFilesManagementResponseType>(
      ["ebill-files-management", currentPage],
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
      },
    );

  const handleSearch = (values: EbillFilesManagementFormType) => {
    setSearchData({
      ...values,
      customerNumber: getCustomerNumber(values.customerNumber),
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

  const convertedData = data?.resultData?.queryResult?.map((item) => ({
    ...item,
    startDateTime: item.startDateTime ? ISOToJalaaliDate(item.startDateTime) : "",
    endDateTime: item.endDateTime ? ISOToJalaaliDate(item.endDateTime) : "",
  }));

  return (
    <Content title={messages(ebillMessages.ebillFilesManagement)}>
      <ControlledForm
        isSubmitting={isLoading}
        submitLabel={messages(generalMessages.search)}
        submitButtonIcon={<IconsList.SearchIcon />}
        onSubmit={handleSearch}
        fields={[
          {
            name: "billTypeCode",
            type: "select",
            label: messages(ebillMessages.ebillTypeCodeName),
            loading: billTypeLoading,
            options: {
              placeholder: messages(generalMessages.doChoose),
              searchable: true,
            },
            data: {
              static: uniqueBillTypes,
            },
          },
          {
            type: "business",
            name: "customerNumber",
            label: messages(generalMessages.customerNumber),
            element: CustomerSearch,
            options: { extraProps: { preventBlurRequest: true } },
          },
          {
            name: "centralBankCode",
            type: "input",
            label: messages(ebillMessages.centralBankCode),
            validation: {
              rules: [validateExactLength(16), numbersOnly()],
            },
          },
          {
            name: "billNumber",
            type: "input",
            label: messages(ebillMessages.ebillFileNumber),
          },
          {
            name: "startDateFrom",
            type: "business",
            element: FormGenerator.DatePickerField,
            label: messages(ebillMessages.creationDateFrom),
            options: {
              placeholder: messages(ebillMessages.placeholderDate_slash_template),
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
            label: messages(ebillMessages.creationDateTo),
            options: {
              placeholder: messages(ebillMessages.placeholderDate_slash_template),
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
            label: messages(ebillMessages.expireDateFrom),
            options: {
              placeholder: messages(ebillMessages.placeholderDate_slash_template),
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
            label: messages(ebillMessages.expireDateTo),
            options: {
              placeholder: messages(ebillMessages.placeholderDate_slash_template),
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
            label: messages(ebillMessages.ebillAmountFrom),
            validation: {
              rules: [validateMaxLength(15), numbersOnlyNotStartWithZero()],
            },
          },
          {
            name: "amountTo",
            type: "business",
            element: FormGenerator.AmountField,
            label: messages(ebillMessages.ebillAmountTo),
            validation: {
              rules: [validateMaxLength(15), numbersOnlyNotStartWithZero()],
            },
          },
          {
            name: "status",
            type: "select",
            label: messages(generalMessages.status),
            loading: allBillStatusIsFetching,
            options: {
              placeholder: messages(generalMessages.doChoose),
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
        title={`${messages(generalMessages.tableRowsCount)}: ${data?.resultData?.totalCount || 0}`}
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
                  tooltip: messages(ebillMessages.addEbillFile),
                },
                action: () =>
                  showAppModal({
                    id: "add-barat-file",
                    title: messages(ebillMessages.addEbillFile),
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
            title: messages(ebillMessages.fileNumber),
          },
          {
            key: "branchName",
            dataIndex: "branchName",
            title: messages(ebillMessages.branchCodeAndName),
            render: (col, row) => `${col} - ${row.branchCode}`,
            sorter: (a, b) => a?.branchName?.localeCompare(b.branchName),
          },
          {
            key: "customerNumber",
            dataIndex: "customerNumber",
            title: messages(generalMessages.customerNumber),
          },
          {
            key: "centralBankCode",
            dataIndex: "centralBankCode",
            title: messages(ebillMessages.centralBankCode),
          },
          {
            key: "startDateTime",
            dataIndex: "startDateTime",
            title: messages(ebillMessages.creationDate),
            sorter: (a, b) => a?.startDateTime?.localeCompare(b.startDateTime),
          },
          {
            key: "endDateTime",
            dataIndex: "endDateTime",
            title: messages(ebillMessages.expirationDate),
            sorter: (a, b) => a?.endDateTime?.localeCompare(b.endDateTime),
          },
          {
            key: "amount",
            dataIndex: "amount",
            title: `${messages(generalMessages.amount)} (${messages(generalMessages.rial)})`,
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
            title: messages(generalMessages.status),
            render: (col, row) => <CustomTag title={col} type={row.statusCode} />,
          },
        ]}
        rowActions={[
          {
            id: "1",
            appearance: {
              icon: <IconsList.EyeIcon />,
              tooltip: messages(generalMessages.actionView),
            },
            action: (values) => {
              showAppModal({
                id: "ebill-detail-view",
                icon: <IconsList.EyeIcon />,
                title: messages(ebillMessages.viewDetailBaratManagement),
                element: <ViewEbillDetail billNumber={values.billNumber} />,
                options: {
                  onCancel: () => {},
                  size: "wide",
                  closable: true,
                  cancelText: messages(generalMessages.close),
                },
              });
            },
            permissionField(record) {
              return record.action.view;
            },
          },
          {
            id: "2",
            appearance: {
              icon: <IconsList.EditIcon />,
              tooltip: messages(generalMessages.actionEdit),
            },
            action: (values) => {
              showAppModal({
                id: "edit-barat-file",
                icon: <IconsList.EditIcon />,
                title: messages(ebillMessages.editFileBarat, {
                  billNumber: values?.billNumber || "",
                }),
                element: (
                  <EditBaratFile mutate={mutate} billNumber={values?.billNumber || ""} />
                ),
                options: {
                  size: "default",
                  closable: true,
                },
              });
            },
          },
          {
            id: "3",
            appearance: {
              icon: <IconsList.DeleteIcon />,
              tooltip: messages(generalMessages.actionDelete),
            },
            action: () => {},
            permissionField(record) {
              return record.action.delete;
            },
          },
          {
            id: "4",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.certificates),
            },
            action: (values) => {
              showAppModal({
                id: "proofModal",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.certificates),
                element: <ProofManagement {...values} getEbillFiles={mutate} />,
                options: { size: "wide", closable: true },
              });
            },
            permissionField(record) {
              return record.action.certificate;
            },
          },
          {
            id: "5",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.sanction),
            },
            action: (values) => {
              showAppModal({
                id: "sanction-barat-file",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.sanction),
                element: <Sanction {...values} mutate={mutate} />,
                options: {
                  size: "default",
                  closable: true,
                },
              });
            },
            permissionField(record) {
              return record.action.sanction;
            },
          },
          {
            id: "6",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.transfer),
            },
            action: () => {},
            permissionField(record) {
              return record.action.transfer;
            },
          },
          {
            id: "7",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.approve),
            },
            action: (values) => {
              showAppModal({
                id: "approve-barat-file",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.approve),
                element: <SanctionApprove {...values} mutate={mutate} />,
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            permissionField(record) {
              return record.action.approve;
            },
          },
          {
            id: "8",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.assurance),
            },
            action: (values) => {
              showAppModal({
                id: "ebill-assurance-modal",
                title: messages(ebillMessages.assurance),
                icon: <IconsList.DocumentWithLinesIcon />,
                element: <EbillAssurancesModal getEbillFiles={mutate} {...values} />,
                options: { size: "wide", closable: true },
              });
            },
            permissionField(record) {
              return record.action.assurance;
            },
          },
          {
            id: "9",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.economyMinistry),
            },
            action: (values) => {
              showAppModal({
                id: "economyMinistryModal",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.economyMinistry),
                element: <EconomyMinistryManagement {...values} />,
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            permissionField(record) {
              return record.action.economyMinistry;
            },
          },
          {
            id: "10",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.ministryTax),
            },
            action: () => {},
            permissionField(record) {
              return record.action.ministryTax;
            },
          },
          {
            id: "11",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.bankIssuance),
            },
            action: (values) => {
              showAppModal({
                id: "bankIssuanceModal",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.bankIssuance),
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
            permissionField(record) {
              return record.action.issuance;
            },
          },
          {
            id: "12",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.commission),
            },
            action: (values) => {
              showAppModal({
                id: "ebill-commission-modal",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.ebillCommissions),
                element: <CommissionManagement {...values} />,
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            permissionField(record) {
              return record.action.commission;
            },
          },
          {
            id: "13",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.receivePayment),
            },
            action: (values) => {
              showAppModal({
                id: "receiveAmountModal",
                title: messages(ebillMessages.receivePayment),
                icon: <IconsList.DocumentWithLinesIcon />,
                element: <ReceiveAmount {...values} mutate={mutate} />,
                options: {
                  size: "wide",
                  closable: true,
                },
              });
            },
            permissionField(record) {
              return record.action.receivePayment;
            },
          },
          {
            id: "14",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.payPayment),
            },
            action: () => {},
            permissionField(record) {
              return record.action.payPayment;
            },
          },
          {
            id: "15",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.convertDebt),
            },
            action: () => {},
            permissionField(record) {
              return record.action.convertDebt;
            },
          },
          {
            id: "16",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.centralBankManagement),
            },
            action: (values) => {
              showAppModal({
                id: "centralBankManagementModal",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.centralBankManagement),
                element: <CentralBankManagement {...values} getEbillFiles={mutate} />,
                options: { closable: true, size: "wide" },
              });
            },
            permissionField(record) {
              return record.action.spmManagement;
            },
          },
          {
            id: "17",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.settlement),
            },
            action: () => {},
            permissionField(record) {
              return record.action.settlement;
            },
          },
          {
            id: "18",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.customerIssuance),
            },
            action: (values) => {
              showAppModal({
                id: "customerIssuanceModal",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.customerIssuance),
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
            permissionField(record) {
              return record.action.customerIssuance;
            },
          },
          {
            id: "19",
            appearance: {
              icon: <IconsList.DocumentWithLinesIcon />,
              tooltip: messages(ebillMessages.customerIssuanceBack),
            },
            action: (values) => {
              showAppModal({
                id: "customerIssuanceBackModal",
                icon: <IconsList.DocumentWithLinesIcon />,
                title: messages(ebillMessages.customerIssuanceBack),
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
            permissionField(record) {
              return record.action.customerIssuanceBack;
            },
          },
        ]}
      />
    </Content>
  );
};

export default EbillFilesManagement;
