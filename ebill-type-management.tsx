import React, { useState } from "react";
import { useGet, usePost, usePatch, useDelete } from "@brdp/engine";
import { Content, GenerativeTable, IconsList, Tag, ErrorAlert, Spin, Steps } from "@brdp/ui";
import { useControlledForm } from "@brdp/ui/form";
import FormGenerator from "@brdp/ui/form"; // Assuming this is the aggregated form
import { generalMessages, getFormatMessage, removeEmptyValues, requiredFiled, validateMaxLength, numbersOnly, numbersOnlyNotStartWithZero, validateMinEqualNumber, validateMaxEqualNumber, validateMinNumber } from "@brdp/utils";
import { showAppModal, hideAppModal } from "@/utils/hooks/useAppModal";
import { showToast } from "@brdp/engine";
import { Services } from "@/services/url";
import { ebillMessages } from "@/locale/ebill-messages";
import { ApprovalReferenceDataType, convertApprovalReferenceData, formatSelectOptionsWithCode, SelectboxDataType, BillTypeDataType } from "@/utils/convert-selectbox-data";
import { AGGREGATE_DATA_SERVICE_KEYS, useGetAggregateData } from "@/utils/hooks/use-get-aggregate-data";
import { useGetBillType } from "../base-info/commission-rate/hooks/use-get-bill-type";
import { Button, Typography } from "@brdp/ui";
import { useTablePagination } from "@brdp/ui"; // Assuming available

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
export type EbillTypeDetailsType = {
  code: string;
  name: string;
  mainTopic: string;
  bankCommitmentsTopic: string;
  hasGuarantor: boolean;
  customerCommitmentsTopic: string;
  temporaryDebtorsTopic: string;
  convertDebtLoanTypeCode: string;
  discountLoanTypeCode: string;
  assuranceTypes: string[];
  approvalAuthorities: string[];
  assurancePercentage: string;
  billAmountFrom: number;
  billAmountTo: number;
  proof: boolean;
  issueCommissionTopic: string;
  otherCommissionTopic: string;
  transferCommissionTopic: string;
};

type AddEbillResponseType = null;
type DeleteEbillTypeData = { code: string };
type DeleteEbillTypeResponse = null;
type EditEbillResponseType = null;

type EbillTypeDetailFormType = {
  code: string;
  name: string;
  convertDebtLoanType: string;
  discountLoanType: string;
  assuranceTypes: string[];
  approvalAuthorities: string[];
  assurancePercentage: string;
  billAmountFrom: number;
  billAmountTo: number;
  proof: string;
  hasGuarantor: string;
  ebillMainTopic: string;
  temporaryDebtorsTopic: string;
  bankCommitmentsTopic: string;
  customerCommitmentsTopic: string;
  issueCommission: string;
  otherCommission: string;
  transferCommission: string;
};

type EbillTypeDetailsTypeResponse = {
  isSuccess: boolean;
  resultData: EbillTypeDetailsType;
  message?: string;
};

// -------------------------------------------------------------------
// EbillTypesManagement
// -------------------------------------------------------------------
const EbillTypesManagement = () => {
  const messages = getFormatMessage();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const pagination = useTablePagination({});

  const { data, isFetching, mutate } = useGet<BillTypeDataType[]>(Services.GET_EBILL_TYPES, {
    ...pagination,
  });

  const { mutate: mutateBillType } = useGetBillType();

  const tableProps = {
    rowKey: "code",
    columns: [
      {
        title: messages(ebillMessages.ebillTypeCode),
        dataIndex: "code",
      },
      {
        title: messages(ebillMessages.ebillTypeName),
        dataIndex: "name",
      },
      {
        title: messages(ebillMessages.proof),
        dataIndex: "proof",
        render: (proof: boolean) => (
          <Tag color={proof ? "green" : "red"}>
            {proof ? messages(generalMessages.has) : messages(generalMessages.doesNotHave)}
          </Tag>
        ),
      },
      {
        title: messages(ebillMessages.hasGuarantor),
        dataIndex: "hasGuarantor",
        render: (hasGuarantor: boolean) => (
          <Tag color={hasGuarantor ? "green" : "red"}>
            {hasGuarantor ? messages(generalMessages.has) : messages(generalMessages.doesNotHave)}
          </Tag>
        ),
      },
      {
        title: messages(generalMessages.actions),
        render: (record: BillTypeDataType) => (
          <>
            <IconsList.EyeIcon
              onClick={() =>
                showAppModal({
                  id: "showEbillTypeDetailModal",
                  icon: <IconsList.EyeIcon />,
                  title: messages(ebillMessages.showEbillTypeDetail),
                  element: <ShowEbillTypeDetail code={record.code} />,
                  options: { closable: true, size: "default" },
                })
              }
            />
            <IconsList.EditIcon
              onClick={() =>
                showAppModal({
                  id: "editEbillTypeModal",
                  icon: <IconsList.EditIcon />,
                  title: messages(ebillMessages.editEbillType),
                  element: (
                    <EditEbillTypeModal
                      mutateEbillTypes={mutate}
                      code={record.code}
                    />
                  ),
                  options: { closable: true, size: "default" },
                })
              }
            />
            <IconsList.DeleteIcon
              onClick={() =>
                showAppModal({
                  id: "deleteEbillTypeModal",
                  icon: <IconsList.DeleteIcon />,
                  title: messages(ebillMessages.deleteEbillType),
                  element: (
                    <DeleteEbillType
                      code={record.code}
                      mutateEbillTypes={mutate}
                      name={record.name}
                    />
                  ),
                  options: { closable: true, size: "default" },
                })
              }
            />
          </>
        ),
      },
    ],
    dataSource: data?.resultData ?? [],
    loading: isFetching,
    pagination: {
      ...pagination,
      total: data?.totalCount ?? 0,
    },
    rowSelection: {
      selectedRowKeys,
      onChange: setSelectedRowKeys,
    },
    headerActions: [
      {
        type: "action-bar",
        actionList: [
          {
            label: messages(ebillMessages.addEbillType),
            action: () =>
              showAppModal({
                id: "addEbillTypeModal",
                icon: <IconsList.PlusCircleIcon />,
                title: messages(ebillMessages.addEbillType),
                element: (
                  <AddEbillTypeModal
                    mutateEbillTypes={mutate}
                    mutateBillType={mutateBillType}
                  />
                ),
                options: { closable: true, size: "default" },
              }),
            appearance: {
              tooltip: messages(ebillMessages.addEbillType),
              icon: <IconsList.PlusCircleIcon />,
            },
          },
        ],
      },
    ],
  };

  return (
    <Content title={messages(ebillMessages.ebillTypesManagement)}>
      <GenerativeTable {...tableProps} />
    </Content>
  );
};

// -------------------------------------------------------------------
// AddEbillTypeModal
// -------------------------------------------------------------------
const AddEbillTypeModal = ({ mutateEbillTypes, mutateBillType }: { mutateEbillTypes: () => void; mutateBillType: () => void; }) => {
  const messages = getFormatMessage();
  const [current, setCurrent] = useState(0);
  const [ebillTypeDetails, setEbillTypeDetails] = useState<EbillTypeDetailsType | undefined>(undefined);

  const { data: aggregateData, isFetching: aggregateDataIsFetching } = useGetAggregateData([
    AGGREGATE_DATA_SERVICE_KEYS.approvalReference,
    AGGREGATE_DATA_SERVICE_KEYS.assuranceType,
    AGGREGATE_DATA_SERVICE_KEYS.convertDebtLoanType,
    AGGREGATE_DATA_SERVICE_KEYS.discountLoanType,
  ]);

  const next = () => setCurrent(current + 1);
  const prev = () => setCurrent(current - 1);

  const steps = [
    {
      title: messages(ebillMessages.ebillTypeDetails),
      content: (
        <AddEbillTypeDetails
          next={next}
          ebillTypeDetails={ebillTypeDetails}
          setEbillTypeDetails={setEbillTypeDetails}
          aggregateData={aggregateData}
          aggregateDataIsFetching={aggregateDataIsFetching}
        />
      ),
    },
    {
      title: messages(ebillMessages.ebillHeaders),
      content: (
        <AddHeaders
          next={next}
          prev={prev}
          ebillTypeDetails={ebillTypeDetails}
          setEbillTypeDetails={setEbillTypeDetails}
        />
      ),
    },
    {
      title: messages(ebillMessages.feeHeaders),
      content: (
        <AddCommissions
          prev={prev}
          ebillTypeDetails={ebillTypeDetails}
          mutateEbillTypes={mutateEbillTypes}
          mutateBillType={mutateBillType}
        />
      ),
    },
  ];

  return <Steps current={current} steps={steps} />;
};

// -------------------------------------------------------------------
// AddCommissions
// -------------------------------------------------------------------
type CommissionsProps = {
  prev: () => void;
  ebillTypeDetails: EbillTypeDetailsType | undefined;
  mutateEbillTypes: () => void;
  mutateBillType: () => void;
};

const AddCommissions = ({
  prev,
  ebillTypeDetails,
  mutateEbillTypes,
  mutateBillType,
}: CommissionsProps) => {
  const messages = getFormatMessage();

  const { mutate, isLoading, error, data } = usePost<AddEbillResponseType, EbillTypeDetailsType>(
    Services.ADD_EBILL_TYPE,
  );

  const { ControlledForm } = useControlledForm<EbillTypeDetailsType>({
    id: "addCommissionsForm",
  });

  const handleSubmit = (fields: EbillTypeDetailsType) => {
    mutate(fields, {
      onSuccess: (response) => {
        if (response.isSuccess) {
          showToast({
            type: "success",
            message: messages(ebillMessages.addEbillTypeSuccess),
          });
          mutateEbillTypes();
          mutateBillType();
          hideAppModal("addEbillTypeModal");
        } else {
          showToast({
            type: "error",
            message: response.message || messages(generalMessages.errorBadHappened),
          });
        }
      },
      onError: () => {
        showToast({
          type: "error",
          message: messages(generalMessages.errorBadHappened),
        });
      },
    });
  };

  return (
    <>
      {error && (
        <ErrorAlert
          errorMessage={error?.message || messages(generalMessages.errorBadHappened)}
          errorList={error?.errorList}
        />
      )}

      {data?.isSuccess === false && (
        <ErrorAlert
          errorMessage={data?.message || messages(generalMessages.errorBadHappened)}
        />
      )}

      <ControlledForm
        id="addCommissionsForm"
        fields={[
          {
            name: "issueCommissionTopic",
            label: messages(ebillMessages.issueCommission),
            type: "input",
            layout: { span: 2 },
            validation: {
              rules: [requiredFiled(), validateMaxLength(255)],
            },
          },
          {
            name: "otherCommissionTopic",
            label: messages(ebillMessages.otherCommission),
            type: "input",
            layout: { span: 2 },
            validation: {
              rules: [requiredFiled(), validateMaxLength(255)],
            },
          },
          {
            name: "transferCommissionTopic",
            label: messages(ebillMessages.transferCommission),
            type: "input",
            layout: { span: 2 },
            validation: {
              rules: [requiredFiled(), validateMaxLength(255)],
            },
          },
        ]}
        initialValues={ebillTypeDetails}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
        submitLabel={messages(generalMessages.submit)}
        resetLabel={messages(generalMessages.previous)}
        onReset={prev}
      />
    </>
  );
};

// -------------------------------------------------------------------
// AddEbillTypeDetails
// -------------------------------------------------------------------
type EbillTypeDetailsProps = {
  next: () => void;
  ebillTypeDetails: EbillTypeDetailsType | undefined;
  setEbillTypeDetails: React.Dispatch<React.SetStateAction<EbillTypeDetailsType | undefined>>;
  aggregateData: any; // Adjust type as needed
  aggregateDataIsFetching: boolean;
};

const AddEbillTypeDetails = ({
  next,
  ebillTypeDetails,
  setEbillTypeDetails,
  aggregateData,
  aggregateDataIsFetching,
}: EbillTypeDetailsProps) => {
  const messages = getFormatMessage();

  const { ControlledForm } = useControlledForm<EbillTypeDetailsType>({
    id: "addEbillTypeDetailsForm",
  });

  const approvalAuthoritiesOptions = formatSelectOptionsWithCode(
    convertApprovalReferenceData(aggregateData?.approvalReference as ApprovalReferenceDataType[]),
  );

  const assuranceTypesOptions = formatSelectOptionsWithCode(
    aggregateData?.assuranceType as SelectboxDataType[],
  );

  const convertDebtLoanTypeOptions = formatSelectOptionsWithCode(
    aggregateData?.convertDebtLoanType as SelectboxDataType[],
  );

  const discountLoanTypeOptions = formatSelectOptionsWithCode(
    aggregateData?.discountLoanType as SelectboxDataType[],
  );

  const handleSubmit = (fields: EbillTypeDetailsType) => {
    setEbillTypeDetails(fields);
    next();
  };

  if (aggregateDataIsFetching) {
    return <Spin caption={messages(generalMessages.isFetchingData)} />;
  }

  return (
    <ControlledForm
      id="addEbillTypeDetailsForm"
      fields={[
        {
          name: "code",
          label: messages(ebillMessages.ebillTypeCode),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [
              requiredFiled(),
              numbersOnlyNotStartWithZero(),
              validateMaxLength(3),
            ],
          },
        },
        {
          name: "name",
          label: messages(ebillMessages.ebillTypeName),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "mainTopic",
          label: messages(ebillMessages.ebillMainTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "temporaryDebtorsTopic",
          label: messages(ebillMessages.temporaryDebtorsTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "convertDebtLoanTypeCode",
          label: messages(ebillMessages.convertDebtLoanTypeCode),
          type: "select",
          data: { static: convertDebtLoanTypeOptions },
          layout: { span: 2 },
          validation: { rules: [requiredFiled()] },
        },
        {
          name: "discountLoanTypeCode",
          label: messages(ebillMessages.discountLoanTypeCode),
          type: "select",
          data: { static: discountLoanTypeOptions },
          layout: { span: 2 },
          validation: { rules: [requiredFiled()] },
        },
        {
          name: "assuranceTypes",
          label: messages(ebillMessages.assuranceTypes),
          type: "select",
          data: { static: assuranceTypesOptions },
          options: { multiple: true },
          layout: { span: 2 },
          validation: { rules: [requiredFiled()] },
        },
        {
          name: "approvalAuthorities",
          label: messages(ebillMessages.approvalAuthorities),
          type: "select",
          data: { static: approvalAuthoritiesOptions },
          options: { multiple: true },
          layout: { span: 2 },
          validation: { rules: [requiredFiled()] },
        },
        {
          name: "billAmountFrom",
          label: messages(ebillMessages.billAmountFrom),
          type: "numeric",
          layout: { span: 2 },
          validation: {
            rules: [
              requiredFiled(),
              validateMinNumber(0, "number"),
              numbersOnly(),
            ],
          },
        },
        {
          name: "billAmountTo",
          label: messages(ebillMessages.billAmountTo),
          type: "numeric",
          layout: { span: 2 },
          validation: {
            rules: [
              requiredFiled(),
              validateMinNumber(0, "number"),
              numbersOnly(),
            ],
          },
        },
        {
          name: "assurancePercentage",
          label: messages(ebillMessages.assurancePercentage),
          type: "input",
          layout: { span: 2 },
          options: {
            suffix: messages(generalMessages.percentage),
          },
          validation: {
            rules: [
              requiredFiled(),
              validateMinEqualNumber(0, "number"),
              validateMaxEqualNumber(1000, "number"),
              numbersOnly(),
            ],
          },
        },
        {
          name: "proof",
          label: messages(ebillMessages.proof),
          type: "checkbox",
        },
        {
          name: "hasGuarantor",
          label: messages(ebillMessages.hasGuarantor),
          type: "checkbox",
        },
      ]}
      initialValues={ebillTypeDetails}
      onSubmit={handleSubmit}
      submitLabel={messages(generalMessages.next)}
      resetLabel={messages(generalMessages.cancel)}
      onReset={() => hideAppModal("addEbillTypeModal")}
    />
  );
};

// -------------------------------------------------------------------
// AddHeaders
// -------------------------------------------------------------------
type HeadersProps = {
  prev: () => void;
  next: () => void;
  ebillTypeDetails: EbillTypeDetailsType | undefined;
  setEbillTypeDetails: React.Dispatch<React.SetStateAction<EbillTypeDetailsType | undefined>>;
};

const AddHeaders = ({
  prev,
  next,
  ebillTypeDetails,
  setEbillTypeDetails,
}: HeadersProps) => {
  const messages = getFormatMessage();
  const { ControlledForm } = useControlledForm<EbillTypeDetailsType>({
    id: "addHeadersForm",
  });

  const handleSubmit = (fields: EbillTypeDetailsType) => {
    setEbillTypeDetails((prevDetails) => ({ ...prevDetails, ...fields }));
    next();
  };

  return (
    <ControlledForm
      id="addHeadersForm"
      fields={[
        {
          name: "mainTopic",
          label: messages(ebillMessages.ebillMainTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "bankCommitmentsTopic",
          label: messages(ebillMessages.bankCommitmentsTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "customerCommitmentsTopic",
          label: messages(ebillMessages.customerCommitmentsTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
      ]}
      initialValues={ebillTypeDetails}
      onSubmit={handleSubmit}
      submitLabel={messages(generalMessages.next)}
      resetLabel={messages(generalMessages.previous)}
      onReset={prev}
    />
  );
};

// -------------------------------------------------------------------
// DeleteEbillType
// -------------------------------------------------------------------
type DeleteEbillTypeProps = {
  code: string;
  mutateEbillTypes: () => void;
  name: string;
};

const DeleteEbillType = ({ code, name, mutateEbillTypes }: DeleteEbillTypeProps) => {
  const messages = getFormatMessage();

  const { data, mutate, isLoading, error } = useDelete<DeleteEbillTypeResponse, DeleteEbillTypeData>(
    Services.DELETE_EBILL_TYPE,
  );

  const handleDelete = () => {
    mutate({ code }, {
      onSuccess: (response) => {
        if (response.isSuccess) {
          showToast({
            type: "success",
            message: messages(ebillMessages.deleteEbillTypeSuccess),
          });
          mutateEbillTypes();
          hideAppModal("deleteEbillTypeModal");
        } else {
          showToast({
            type: "error",
            message: response.message || messages(generalMessages.errorBadHappened),
          });
        }
      },
      onError: () => {
        showToast({
          type: "error",
          message: messages(generalMessages.errorBadHappened),
        });
      },
    });
  };

  return (
    <>
      {error && (
        <ErrorAlert
          errorMessage={error?.message || messages(generalMessages.errorBadHappened)}
          errorList={error?.errorList}
        />
      )}

      {data?.isSuccess === false && (
        <ErrorAlert
          errorMessage={data?.message || messages(generalMessages.errorBadHappened)}
        />
      )}

      <Typography text={messages(ebillMessages.deleteEbillTypeConfirmation, { name })} />

      <div className="ant-modal-footer custom-actions-modal">
        <Button
          label={messages(generalMessages.actionDelete)}
          loading={isLoading}
          type="danger"
          onClick={handleDelete}
        />
        <Button
          label={messages(generalMessages.cancel)}
          onClick={() => hideAppModal("deleteEbillTypeModal")}
        />
      </div>
    </>
  );
};

// -------------------------------------------------------------------
// EditEbillTypeModal
// -------------------------------------------------------------------
const EditEbillTypeModal = ({ mutateEbillTypes, code }: { mutateEbillTypes: () => void; code: string; }) => {
  const messages = getFormatMessage();
  const [current, setCurrent] = useState(0);
  const [ebillTypeDetails, setEbillTypeDetails] = useState<EbillTypeDetailsType | undefined>(undefined);

  const { data, isFetching, error } = useGet<EbillTypeDetailsTypeResponse>(Services.GET_EBILL_TYPE_DETAILS(code));

  const { data: aggregateData, isFetching: aggregateDataIsFetching } = useGetAggregateData([
    AGGREGATE_DATA_SERVICE_KEYS.approvalReference,
    AGGREGATE_DATA_SERVICE_KEYS.assuranceType,
    AGGREGATE_DATA_SERVICE_KEYS.convertDebtLoanType,
    AGGREGATE_DATA_SERVICE_KEYS.discountLoanType,
  ]);

  const next = () => setCurrent(current + 1);
  const prev = () => setCurrent(current - 1);

  const steps = [
    {
      title: messages(ebillMessages.ebillTypeDetails),
      content: (
        <EditEbillTypeDetails
          next={next}
          ebillTypeDetails={ebillTypeDetails}
          setEbillTypeDetails={setEbillTypeDetails}
          aggregateData={aggregateData}
          aggregateDataIsFetching={aggregateDataIsFetching}
          code={code}
        />
      ),
    },
    {
      title: messages(ebillMessages.ebillHeaders),
      content: (
        <EditHeaders
          next={next}
          prev={prev}
          ebillTypeDetails={ebillTypeDetails}
          setEbillTypeDetails={setEbillTypeDetails}
        />
      ),
    },
    {
      title: messages(ebillMessages.feeHeaders),
      content: (
        <EditCommissions
          prev={prev}
          code={code}
          ebillTypeDetails={ebillTypeDetails}
          mutateEbillTypes={mutateEbillTypes}
        />
      ),
    },
  ];

  if (isFetching || aggregateDataIsFetching) {
    return <Spin caption={messages(generalMessages.isFetchingData)} />;
  }

  if (data?.isSuccess && data?.resultData) {
    return <Steps current={current} steps={steps} />;
  }

  return (
    <>
      {error && (
        <ErrorAlert
          errorMessage={error?.message || messages(generalMessages.errorBadHappened)}
          errorList={error?.errorList}
        />
      )}

      {data?.isSuccess === false && (
        <ErrorAlert
          errorMessage={data?.message || messages(generalMessages.errorBadHappened)}
        />
      )}
    </>
  );
};

// -------------------------------------------------------------------
// EditCommissions
// -------------------------------------------------------------------
type CommissionsPropsEdit = {
  prev: () => void;
  code: string;
  ebillTypeDetails: EbillTypeDetailsType | undefined;
  mutateEbillTypes: () => void;
};

const EditCommissions = ({
  prev,
  code,
  ebillTypeDetails,
  mutateEbillTypes,
}: CommissionsPropsEdit) => {
  const messages = getFormatMessage();

  const { mutate, isLoading, error, data } = usePatch<EditEbillResponseType, EbillTypeDetailsType>(
    Services.EDIT_EBILL_TYPE(code),
  );

  const { ControlledForm } = useControlledForm<EbillTypeDetailsType>({
    id: "editCommissionsForm",
  });

  const handleSubmit = (fields: EbillTypeDetailsType) => {
    mutate(fields, {
      onSuccess: (response) => {
        if (response.isSuccess) {
          showToast({
            type: "success",
            message: messages(ebillMessages.editEbillTypeSuccess),
          });
          mutateEbillTypes();
          hideAppModal("editEbillTypeModal");
        } else {
          showToast({
            type: "error",
            message: response.message || messages(generalMessages.errorBadHappened),
          });
        }
      },
      onError: () => {
        showToast({
          type: "error",
          message: messages(generalMessages.errorBadHappened),
        });
      },
    });
  };

  return (
    <>
      {error && (
        <ErrorAlert
          errorMessage={error?.message || messages(generalMessages.errorBadHappened)}
          errorList={error?.errorList}
        />
      )}

      {data?.isSuccess === false && (
        <ErrorAlert
          errorMessage={data?.message || messages(generalMessages.errorBadHappened)}
        />
      )}

      <ControlledForm
        id="editCommissionsForm"
        fields={[
          {
            name: "issueCommissionTopic",
            label: messages(ebillMessages.issueCommission),
            type: "input",
            layout: { span: 2 },
            validation: {
              rules: [requiredFiled(), validateMaxLength(255)],
            },
          },
          {
            name: "otherCommissionTopic",
            label: messages(ebillMessages.otherCommission),
            type: "input",
            layout: { span: 2 },
            validation: {
              rules: [requiredFiled(), validateMaxLength(255)],
            },
          },
          {
            name: "transferCommissionTopic",
            label: messages(ebillMessages.transferCommission),
            type: "input",
            layout: { span: 2 },
            validation: {
              rules: [requiredFiled(), validateMaxLength(255)],
            },
          },
        ]}
        initialValues={ebillTypeDetails}
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
        submitLabel={messages(generalMessages.submit)}
        resetLabel={messages(generalMessages.previous)}
        onReset={prev}
      />
    </>
  );
};

// -------------------------------------------------------------------
// EditEbillTypeDetails
// -------------------------------------------------------------------
type EbillTypeDetailsPropsEdit = {
  next: () => void;
  ebillTypeDetails: EbillTypeDetailsType | undefined;
  setEbillTypeDetails: React.Dispatch<React.SetStateAction<EbillTypeDetailsType | undefined>>;
  aggregateData: any; // Adjust type
  aggregateDataIsFetching: boolean;
  code: string;
};

const EditEbillTypeDetails = ({
  next,
  ebillTypeDetails,
  setEbillTypeDetails,
  aggregateData,
  aggregateDataIsFetching,
  code,
}: EbillTypeDetailsPropsEdit) => {
  const messages = getFormatMessage();

  const { ControlledForm } = useControlledForm<EbillTypeDetailsType>({
    id: "editEbillTypeDetailsForm",
  });

  const approvalAuthoritiesOptions = formatSelectOptionsWithCode(
    convertApprovalReferenceData(aggregateData?.approvalReference as ApprovalReferenceDataType[]),
  );

  const assuranceTypesOptions = formatSelectOptionsWithCode(
    aggregateData?.assuranceType as SelectboxDataType[],
  );

  const convertDebtLoanTypeOptions = formatSelectOptionsWithCode(
    aggregateData?.convertDebtLoanType as SelectboxDataType[],
  );

  const discountLoanTypeOptions = formatSelectOptionsWithCode(
    aggregateData?.discountLoanType as SelectboxDataType[],
  );

  const handleSubmit = (fields: EbillTypeDetailsType) => {
    setEbillTypeDetails(fields);
    next();
  };

  if (aggregateDataIsFetching) {
    return <Spin caption={messages(generalMessages.isFetchingData)} />;
  }

  return (
    <ControlledForm
      id="editEbillTypeDetailsForm"
      fields={[
        {
          name: "code",
          label: messages(ebillMessages.ebillTypeCode),
          type: "input",
          layout: { span: 2 },
          disabled: true,
        },
        {
          name: "name",
          label: messages(ebillMessages.ebillTypeName),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "mainTopic",
          label: messages(ebillMessages.ebillMainTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "temporaryDebtorsTopic",
          label: messages(ebillMessages.temporaryDebtorsTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "convertDebtLoanTypeCode",
          label: messages(ebillMessages.convertDebtLoanTypeCode),
          type: "select",
          data: { static: convertDebtLoanTypeOptions },
          layout: { span: 2 },
          validation: { rules: [requiredFiled()] },
        },
        {
          name: "discountLoanTypeCode",
          label: messages(ebillMessages.discountLoanTypeCode),
          type: "select",
          data: { static: discountLoanTypeOptions },
          layout: { span: 2 },
          validation: { rules: [requiredFiled()] },
        },
        {
          name: "assuranceTypes",
          label: messages(ebillMessages.assuranceTypes),
          type: "select",
          data: { static: assuranceTypesOptions },
          options: { multiple: true },
          layout: { span: 2 },
          validation: { rules: [requiredFiled()] },
        },
        {
          name: "approvalAuthorities",
          label: messages(ebillMessages.approvalAuthorities),
          type: "select",
          data: { static: approvalAuthoritiesOptions },
          options: { multiple: true },
          layout: { span: 2 },
          validation: { rules: [requiredFiled()] },
        },
        {
          name: "billAmountFrom",
          label: messages(ebillMessages.billAmountFrom),
          type: "numeric",
          layout: { span: 2 },
          validation: {
            rules: [
              requiredFiled(),
              validateMinNumber(0, "number"),
              numbersOnly(),
            ],
          },
        },
        {
          name: "billAmountTo",
          label: messages(ebillMessages.billAmountTo),
          type: "numeric",
          layout: { span: 2 },
          validation: {
            rules: [
              requiredFiled(),
              validateMinNumber(0, "number"),
              numbersOnly(),
            ],
          },
        },
        {
          name: "assurancePercentage",
          label: messages(ebillMessages.assurancePercentage),
          type: "input",
          layout: { span: 2 },
          options: {
            suffix: messages(generalMessages.percentage),
          },
          validation: {
            rules: [
              requiredFiled(),
              validateMinEqualNumber(0, "number"),
              validateMaxEqualNumber(1000, "number"),
              numbersOnly(),
            ],
          },
        },
        {
          name: "proof",
          label: messages(ebillMessages.proof),
          type: "checkbox",
        },
        {
          name: "hasGuarantor",
          label: messages(ebillMessages.hasGuarantor),
          type: "checkbox",
        },
      ]}
      initialValues={ebillTypeDetails}
      onSubmit={handleSubmit}
      submitLabel={messages(generalMessages.next)}
      resetLabel={messages(generalMessages.cancel)}
      onReset={() => hideAppModal("editEbillTypeModal")}
    />
  );
};

// -------------------------------------------------------------------
// EditHeaders
// -------------------------------------------------------------------
type HeadersPropsEdit = {
  prev: () => void;
  next: () => void;
  ebillTypeDetails: EbillTypeDetailsType | undefined;
  setEbillTypeDetails: React.Dispatch<React.SetStateAction<EbillTypeDetailsType | undefined>>;
};

const EditHeaders = ({
  prev,
  next,
  ebillTypeDetails,
  setEbillTypeDetails,
}: HeadersPropsEdit) => {
  const messages = getFormatMessage();
  const { ControlledForm } = useControlledForm<EbillTypeDetailsType>({
    id: "editHeadersForm",
  });

  const handleSubmit = (fields: EbillTypeDetailsType) => {
    setEbillTypeDetails((prevDetails) => ({ ...prevDetails, ...fields }));
    next();
  };

  return (
    <ControlledForm
      id="editHeadersForm"
      fields={[
        {
          name: "mainTopic",
          label: messages(ebillMessages.ebillMainTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "bankCommitmentsTopic",
          label: messages(ebillMessages.bankCommitmentsTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
        {
          name: "customerCommitmentsTopic",
          label: messages(ebillMessages.customerCommitmentsTopic),
          type: "input",
          layout: { span: 2 },
          validation: {
            rules: [requiredFiled(), validateMaxLength(255)],
          },
        },
      ]}
      initialValues={ebillTypeDetails}
      onSubmit={handleSubmit}
      submitLabel={messages(generalMessages.next)}
      resetLabel={messages(generalMessages.previous)}
      onReset={prev}
    />
  );
};

// -------------------------------------------------------------------
// ShowEbillTypeDetail
// -------------------------------------------------------------------
type ShowEbillTypeDetailProps = {
  code: string;
};

const ShowEbillTypeDetail = ({ code }: ShowEbillTypeDetailProps) => {
  const messages = getFormatMessage();

  const { data, isFetching, error } = useGet<EbillTypeDetailsTypeResponse>(Services.GET_EBILL_TYPE_DETAILS(code));

  const { ControlledForm } = useControlledForm<EbillTypeDetailFormType>({
    id: "showEbillTypeDetailForm",
  });

  if (isFetching) {
    return <Spin caption={messages(generalMessages.isFetchingData)} />;
  }

  if (data?.isSuccess && data?.resultData) {
    const formData = {
      code: data.resultData.code,
      name: data.resultData.name,
      convertDebtLoanType: data.resultData.convertDebtLoanTypeCode,
      discountLoanType: data.resultData.discountLoanTypeCode,
      assuranceTypes: data.resultData.assuranceTypes,
      approvalAuthorities: data.resultData.approvalAuthorities,
      assurancePercentage: data.resultData.assurancePercentage,
      billAmountFrom: data.resultData.billAmountFrom,
      billAmountTo: data.resultData.billAmountTo,
      proof: data.resultData.proof ? messages(generalMessages.has) : messages(generalMessages.doesNotHave),
      hasGuarantor: data.resultData.hasGuarantor ? messages(generalMessages.has) : messages(generalMessages.doesNotHave),
      ebillMainTopic: data.resultData.mainTopic,
      temporaryDebtorsTopic: data.resultData.temporaryDebtorsTopic,
      bankCommitmentsTopic: data.resultData.bankCommitmentsTopic,
      customerCommitmentsTopic: data.resultData.customerCommitmentsTopic,
      issueCommission: data.resultData.issueCommissionTopic,
      otherCommission: data.resultData.otherCommissionTopic,
      transferCommission: data.resultData.transferCommissionTopic,
    };

    return (
      <ControlledForm
        id="showEbillTypeDetailForm"
        fields={[
          {
            type: "business",
            label: messages(ebillMessages.ebillTypeDetails),
            name: "__ebillTypeDetailsCollapse",
            layout: { span: 4 },
            element: FormGenerator.CollapseField,
            options: {
              extraProps: {
                fields: [
                  {
                    name: "code",
                    label: messages(ebillMessages.ebillTypeCode),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "name",
                    label: messages(ebillMessages.ebillTypeName),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "convertDebtLoanType",
                    label: messages(ebillMessages.convertDebtLoanTypeCode),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "discountLoanType",
                    label: messages(ebillMessages.discountLoanTypeCode),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "assuranceTypes",
                    label: messages(ebillMessages.assuranceTypes),
                    type: "select",
                    layout: { span: 2 },
                  },
                  {
                    name: "approvalAuthorities",
                    label: messages(ebillMessages.approvalAuthorities),
                    type: "select",
                    layout: { span: 2 },
                  },
                  {
                    name: "assurancePercentage",
                    label: messages(ebillMessages.assurancePercentage),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "billAmountFrom",
                    label: messages(ebillMessages.billAmountFrom),
                    type: "numeric",
                    layout: { span: 2 },
                  },
                  {
                    name: "billAmountTo",
                    label: messages(ebillMessages.billAmountTo),
                    type: "numeric",
                    layout: { span: 2 },
                  },
                  {
                    name: "proof",
                    label: messages(ebillMessages.proof),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "hasGuarantor",
                    label: messages(ebillMessages.hasGuarantor),
                    type: "input",
                    layout: { span: 2 },
                  },
                ],
              },
            },
          },
          {
            type: "business",
            label: messages(ebillMessages.ebillHeaders),
            name: "__ebillHeadersCollapse",
            layout: { span: 4 },
            element: FormGenerator.CollapseField,
            options: {
              extraProps: {
                fields: [
                  {
                    name: "ebillMainTopic",
                    label: messages(ebillMessages.ebillMainTopic),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "temporaryDebtorsTopic",
                    label: messages(ebillMessages.temporaryDebtorsTopic),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "bankCommitmentsTopic",
                    label: messages(ebillMessages.bankCommitmentsTopic),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "customerCommitmentsTopic",
                    label: messages(ebillMessages.customerCommitmentsTopic),
                    type: "input",
                    layout: { span: 2 },
                  },
                ],
              },
            },
          },
          {
            type: "business",
            label: messages(ebillMessages.feeHeaders),
            name: "__feeHeadersCollapse",
            layout: { span: 4 },
            element: FormGenerator.CollapseField,
            options: {
              extraProps: {
                fields: [
                  {
                    name: "issueCommission",
                    label: messages(ebillMessages.issueCommission),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "otherCommission",
                    label: messages(ebillMessages.otherCommission),
                    type: "input",
                    layout: { span: 2 },
                  },
                  {
                    name: "transferCommission",
                    label: messages(ebillMessages.transferCommission),
                    type: "input",
                    layout: { span: 2 },
                  },
                ],
              },
            },
          },
        ]}
        initialValues={formData}
        readOnly
      />
    );
  }

  return (
    <ErrorAlert
      errorMessage={
        data?.message || error?.message || messages(generalMessages.errorBadHappened)
      }
      errorList={error?.errorList}
    />
  );
};

// -------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------
export {
  EbillTypesManagement as default,
  AddEbillTypeModal,
  AddCommissions,
  AddEbillTypeDetails,
  AddHeaders,
  DeleteEbillType,
  EditEbillTypeModal,
  EditCommissions,
  EditEbillTypeDetails,
  EditHeaders,
  ShowEbillTypeDetail,
};
```
