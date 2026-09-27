import { useState } from "react";
import Button from "./primaryUI/buttons/Button.jsx";
import Card from "./primaryUI/Card.jsx";
import Notice from "./primaryUI/Notice.jsx";
import Brand from "./primaryUI/Brand.jsx";
import FormActions from "./primaryUI/FormActions.jsx";
import HerdTitle from "./primaryUI/HerdTitle.jsx";
import Metric from "./primaryUI/Metric.jsx";
import PageHeader from "./primaryUI/PageHeader.jsx";
import DataTable, { TableHeader, TableCell } from "./primaryUI/DataTable.jsx";
import { InputField, SelectField, TextareaField, CheckboxField } from "./primaryUI/FormFields.jsx";
import SettingsFields from "./featureComponents/farm/forms/FarmSettingsFields.jsx";


function StorySection({ title, children }) {
  return (
    <section className="border-b border-line py-8">
      <h2 className="mb-6 text-2xl font-bold text-brand-dark">{title}</h2>

      <div className="space-y-6">{children}</div>
    </section>
  );
}

function StoryRow({ title, children }) {
  return (
    <div className="grid gap-3 md:grid-cols-[12rem_1fr] md:gap-6">
      <h3 className="m-0 text-base font-semibold text-blue-accent">{title}</h3>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Stories() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* BUTTON */}
      <StorySection title="Button">
        <StoryRow title="Colour, border and emphasis">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>

            <Button variant="secondary">Secondary</Button>

            <Button variant="danger">Delete</Button>

            <Button variant="text">Cancel</Button>
          </div>
        </StoryRow>

        <StoryRow title="Size">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="small">Small</Button>

            <Button size="medium">Medium</Button>

            <Button size="large">Large</Button>
          </div>
        </StoryRow>

        <StoryRow title="Disabled">
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </StoryRow>
      </StorySection>

      {/* CARD */}
      <StorySection title="Card">
        <StoryRow title="Variants">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card variant="surface">Surface</Card>

            <Card variant="subtle">Subtle</Card>

            <Card variant="info">Info</Card>

            <Card variant="dashed">Dashed</Card>
          </div>
        </StoryRow>

        <StoryRow title="Padding">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card padding="normal">Normal</Card>

            <Card padding="small">Small</Card>

            <Card padding="none">None</Card>
          </div>
        </StoryRow>
      </StorySection>

      {/* NOTICE */}
      <StorySection title="Notice">
        <StoryRow title="Variants">
          <div className="space-y-3">
            <Notice variant="info">Info</Notice>

            <Notice variant="warning">
              Warning — check paddock information
            </Notice>

            <Notice variant="error">Error — information is required</Notice>

            <Notice variant="success">Success — save complete</Notice>

            <Notice variant="muted">Muted — low priority</Notice>
          </div>
        </StoryRow>

        <StoryRow title="Compact">
          <Notice variant="info" compact>
            Compact notice
          </Notice>
        </StoryRow>

        <StoryRow title="List error">
          <Notice variant="error">
            Please correct:
            <ul>
              <li>Farm name</li>
              <li>Target residual</li>
            </ul>
          </Notice>
        </StoryRow>
      </StorySection>

      {/* BRAND */}
      <StorySection title="Brand">
        <StoryRow title="Standard">
          <Brand />
        </StoryRow>
      </StorySection>

      {/* FORM ACTIONS */}
      <StorySection title="Form actions">
        <StoryRow title="Default">
          <FormActions>
            <Button>Cancel</Button>

            <Button variant="primary">Save changes</Button>
          </FormActions>
        </StoryRow>

        <StoryRow title="Start aligned">
          <FormActions align="start">
            <Button variant="primary">Continue</Button>
          </FormActions>
        </StoryRow>
      </StorySection>

      {/* HERD TITLE */}
      <StorySection title="Herd title">
        <StoryRow title="Example">
          <HerdTitle
            herd={{
              name: "Mixed age",
              animals: 210,
              colour: "blue",
            }}
          />
        </StoryRow>
      </StorySection>

      {/* METRIC */}
      <StorySection title="Metric">
        <StoryRow title="Default and warning">
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric label="Pasture intake" value="14.2" unit="kgDM/cow/day" />

            <Metric
              label="Feed difference"
              value="-2.1"
              unit="kgDM/cow/day"
              tone="warning"
            />
          </div>
        </StoryRow>

        <StoryRow title="Compact on mobile">
          <Metric
            label="Days remaining"
            value="34"
            unit="days"
            compactOnMobile
          />
        </StoryRow>
      </StorySection>

      {/* PAGE HEADER */}
      <StorySection title="Page header">
        <StoryRow title="Standard">
          <PageHeader
            title="Farm information"
            subtitle="Manage your herds, paddocks and crops."
          >
            <Button variant="primary">Save changes</Button>
          </PageHeader>
        </StoryRow>
      </StorySection>

      {/* DATA TABLE */}
      <StorySection title="Data table">
        <StoryRow title="Standard">
          <DataTable
            label="Example paddock table"
            caption="Example paddock names and hectares"
          >
            <thead>
              <tr>
                <TableHeader>Paddock</TableHeader>
                <TableHeader>Hectares</TableHeader>
                <TableHeader>Type</TableHeader>
              </tr>
            </thead>

            <tbody>
              <tr>
                <TableCell>Front</TableCell>
                <TableCell>4.5</TableCell>
                <TableCell>Pasture</TableCell>
              </tr>

              <tr>
                <TableCell>River</TableCell>
                <TableCell>3.2</TableCell>
                <TableCell>Crop</TableCell>
              </tr>
            </tbody>
          </DataTable>
        </StoryRow>
      </StorySection>

{/* FORM FIELDS */}
<StorySection title="Form fields">
  <StoryRow title="Fields">
    <div className="grid max-w-md gap-4">
      <InputField
        label="InputField"
        value="Rose's Farm"
        onChange={() => {}}
      />

      <InputField
        label="InputField"
        type="number"
        unit="kgDM/ha"
        value="1550"
        onChange={() => {}}
      />

      <SelectField
        label="SelectField"
        value="Dairy"
        options={["Dairy", "Sheep / Beef"]}
        onChange={() => {}}
      />

      <TextareaField
        label="TextareaField"
        value={"Front 4.2\nRiver 3.8"}
        onChange={() => {}}
      />

      <CheckboxField
        label="CheckboxField"
      />
    </div>
  </StoryRow>
</StorySection>

{/* SETTINGS FIELDS */}
<StorySection
  title="Settings fields"
  uses="InputField · CheckboxField (FormFields)"
>
  <StoryRow title="Default">
    <div className="@container max-w-2xl">
      <SettingsFields
        settings={{
          farmType: "dairy",
          farmName: "Rose's Farm",
          assignHerds: true,
          latitude: "-43.5321",
          longitude: "172.6362",
          targetCover: "2900",
          residualKgDmHa: "1550",
        }}
      />
    </div>
  </StoryRow>
</StorySection>
      
    </div>
  );
}

export default Stories;
