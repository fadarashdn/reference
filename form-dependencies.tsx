import { Container } from "@brdp/ui";
import { useControlledForm, FormFields } from "@brdp/ui/form";

type SimpleFormType = {
  name: string;
  nickname: string;
  city: string;
};

const DemoAutoFillForm: React.FC = () => {
  const { ControlledForm, setFieldsValue } = useControlledForm<SimpleFormType>({
    id: "auto-fill-dep",
  });

  /**
   * Defines the form fields for the beneficiary fourth step.
   *
   * @remarks
   * - The `fields` array specifies the configuration for each form field, including label, name, type, and dependencies.
   * - The `nickname` field includes a `hidden` function that is triggered whenever the `name` field changes, due to its dependency.
   * - Inside the `hidden` function of the `nickname` field, the value of the `city` field is updated based on the value of the `name` field.
   * - Specifically, when the `name` field is set to "arash", both the `nickname` and `city` fields are updated programmatically.
   * - Note: The `hidden` function is used here as a hook for side effects, not for actually hiding the field.
   */
  const fields: FormFields<SimpleFormType> = [
    {
      label: "City",
      name: "city",
      type: "input",
    },
    {
      label: "Name",
      name: "name",
      type: "input",
    },
    {
      label: "Nickname",
      name: "nickname",
      type: "input",
      dependencies: ["name"],
      // This runs automatically whenever "name" changes
      // using your FormGenerator dependency system
      hidden: ({ values }) => {
        console.log("🚀 ~ DemoAutoFillForm ~ values:", values);
        const name = values?.name;
        console.log("🚀 ~ DemoAutoFillForm ~ name:", name);
        const city = values?.city;
        console.log("🚀 ~ DemoAutoFillForm ~ city:", city);
        const nickname = values?.nickname;
        console.log("🚀 ~ DemoAutoFillForm ~ nickname:", nickname);

        if (name === "arash") {
          setFieldsValue({ nickname: "fada", city: values.name });
        }

        return false; // not really hidden, we just hook here
      },
    },
  ];

  return (
    <Container>
      <ControlledForm
        fields={fields}
        initialValues={{
          name: "",
          nickname: "",
          city: "TEHRAN",
        }}
        onSubmit={(data) => console.log("Submit:", data)}
      />
    </Container>
  );
};

export default DemoAutoFillForm;

// If you add both "name" and "city" to the dependencies array of the "nickname" field,
// you will see their values populated in `values`. Otherwise, you will see `undefined` for fields not in dependencies.
// 🚀 ~ DemoAutoFillForm ~ values: {name: 'arash'}
// 🚀 ~ DemoAutoFillForm ~ name: arash
// 🚀 ~ DemoAutoFillForm ~ city: undefined
