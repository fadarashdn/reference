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
      extra: "Type 'arash' to auto-fill nickname",
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
        const currentCity = values?.city;
        console.log("🚀 ~ DemoAutoFillForm ~ currentCity:", currentCity);

        if (name === "arash") {
          setFieldsValue({ nickname: "fada" });
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
      />{" "}
    </Container>
  );
};

export default DemoAutoFillForm;

// If you add both "name" and "city" to the dependencies array of the "nickname" field,
// you will see their values populated in `values`. Otherwise, you will see `undefined` for fields not in dependencies.
// 🚀 ~ DemoAutoFillForm ~ values: {name: 'arash'}
// 🚀 ~ DemoAutoFillForm ~ name: arash
// 🚀 ~ DemoAutoFillForm ~ currentCity: undefined
