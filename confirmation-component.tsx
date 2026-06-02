/**
 * # ActionConfirmMessage Guide
 *
 * ## Purpose
 *
 * `ActionConfirmMessage` is the standard component used to display
 * confirmation text inside action modals such as:
 *
 * - Delete
 * - Activate
 * - Deactivate
 * - Approve
 * - Reject
 * - Settlement
 * - Any custom business action
 *
 * The component automatically generates a localized confirmation message
 * based on:
 *
 * - action type or custom action name
 * - entity name
 * - entity identifiers
 *
 * ---
 *
 * ## Basic Usage
 *
 * ```tsx
 * <ActionConfirmMessage
 *   actionType="DELETE"
 *   entity={messages("ebill.discount")}
 * />
 * ```
 *
 * Example output:
 *
 * "Are you sure you want to delete Discount?"
 *
 * ---
 *
 * ## Usage With Identifiers
 *
 * ```tsx
 * <ActionConfirmMessage
 *   actionType="DELETE"
 *   entity={messages("ebill.discount")}
 *   identifiers={[
 *     {
 *       title: messages("brdpManagement.case"),
 *       value: billNumber,
 *     },
 *     {
 *       title: messages("ebill.discountSerial"),
 *       value: serial,
 *     },
 *   ]}
 * />
 * ```
 *
 * Example output:
 *
 * "Are you sure you want to delete Discount
 * with Case «123456»
 * and Discount Serial «987654» ?"
 *
 * ---
 *
 * ## Custom Action Name
 *
 * When the action does not match one of the predefined action types,
 * use `actionName`.
 *
 * ```tsx
 * <ActionConfirmMessage
 *   actionName={messages("ebill.settlement")}
 *   entity={messages("ebill.discount")}
 * />
 * ```
 *
 * Example:
 *
 * Settlement Discount
 *
 * ---
 *
 * ## Available Action Types
 *
 * ```ts
 * DELETE
 * ADD
 * EDIT
 * DEACTIVATE
 * ACTIVATE
 * APPROVE
 * REJECT
 * ```
 *
 * Example:
 *
 * ```tsx
 * <ActionConfirmMessage
 *   actionType="APPROVE"
 *   entity={messages("ebill.discount")}
 * />
 * ```
 *
 * ---
 *
 * ## Identifier Structure
 *
 * ```ts
 * {
 *   title: string;
 *   value: string | number;
 *   prefix?: string;
 *   suffix?: string;
 * }
 * ```
 *
 * Example:
 *
 * ```tsx
 * identifiers={[
 *   {
 *     title: messages("brdpManagement.case"),
 *     value: billNumber,
 *     prefix: messages("brdpManagement.for"),
 *   },
 *   {
 *     title: messages("ebill.discountSerial"),
 *     value: serial,
 *     prefix: messages("brdpManagement.with"),
 *   },
 * ]}
 * ```
 *
 * ---
 *
 * ## Standard Confirmation Modal Pattern
 *
 * Every confirmation modal should follow this structure:
 *
 * 1. Show possible API errors.
 * 2. Display `ActionConfirmMessage`.
 * 3. Render a `FormGenerator` with no fields.
 * 4. Execute API request on submit.
 * 5. Close modal on success.
 * 6. Show success toast.
 *
 * Example:
 *
 * ```tsx
 * <>
 *   {error && (
 *     <ErrorAlert
 *       errorMessage={error.message}
 *       errorList={error.errorList}
 *     />
 *   )}
 *
 *   <ActionConfirmMessage
 *     actionType="DELETE"
 *     entity={messages("ebill.discount")}
 *     identifiers={[
 *       {
 *         title: messages("brdpManagement.case"),
 *         value: billNumber,
 *       },
 *     ]}
 *   />
 *
 *   <FormGenerator
 *     fields={[]}
 *     formType="DELETE"
 *     id="confirm-delete-modal"
 *     isSubmitting={loading}
 *     onSubmit={() => mutate({})}
 *     onReset={() => hideAppModal(modalId)}
 *     reset
 *   />
 * </>
 * ```
 *
 * ---
 *
 * ## Delete Action Convention
 *
 * For destructive actions:
 *
 * ```tsx
 * <FormGenerator
 *   formType="DELETE"
 *   fields={[]}
 *   ...
 * />
 * ```
 *
 * This ensures delete styling is applied consistently.
 *
 * ---
 *
 * ## Management Page Integration
 *
 * Actions are typically registered inside table actions.
 *
 * Example:
 *
 * ```tsx
 * {
 *   id: "delete",
 *   appearance: {
 *     icon: <IconsList.DeleteIcon />,
 *     tooltip: messages("brdpManagement.cancellation"),
 *   },
 *   action: (values) => {
 *     const modalId = "delete-discount";
 *
 *     showAppModal({
 *       id: modalId,
 *       icon: <IconsList.DeleteIcon />,
 *       title: messages("brdpManagement.cancellation"),
 *       element: (
 *         <ConfirmDeleteDiscount
 *           billNumber={values.billNumber}
 *           serial={values.serial}
 *           modalId={modalId}
 *         />
 *       ),
 *       options: {
 *         size: "small",
 *       },
 *     });
 *   },
 * }
 * ```
 *
 * ---
 *
 * ## Recommended Pattern
 *
 * For every new business action:
 *
 * 1. Create a dedicated confirmation modal component.
 * 2. Call the related API hook (`usePost`, `useDelete`, etc.).
 * 3. Display `ActionConfirmMessage`.
 * 4. Use `FormGenerator` for Confirm/Cancel actions.
 * 5. Show success toast.
 * 6. Close modal after successful completion.
 *
 * This keeps all confirmation dialogs consistent across the application.
 */

export default function ActionConfirmMessageDocumentation() {
  return null;
}
