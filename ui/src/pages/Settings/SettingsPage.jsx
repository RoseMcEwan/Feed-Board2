import Card from "../../components/primaryUI/Card.jsx";
import PageHeader from "../../components/primaryUI/PageHeader.jsx";
import FarmSettingsFields from "../../components/featureComponents/farmInfo/FarmSettingsFields.jsx";

export default function SettingsPage({
  farm,
  onChange,
}) {
  function change(field, value) {
    onChange({
      ...farm,
      settings: {
        ...farm.settings,
        [field]: value,
      },
    });
  }

  return (
    <>
      <PageHeader title="Farm settings" />

      <Card className="@container">
        <h2 className="mb-6 text-xl">
          Farm details
        </h2>

        <FarmSettingsFields
          settings={farm.settings}
          onChange={change}
        />
      </Card>
    </>
  );
}