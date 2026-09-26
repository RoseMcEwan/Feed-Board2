import Button from "./button/Button.jsx";
import Card from "./Card.jsx";
import Notice from "./Notice.jsx";
import Brand from "./Brand.jsx";
import FormActions from "./FormActions.jsx";
import HerdTitle from "./HerdTitle.jsx"
import Metric from "./Metric.jsx";

export function Stories() {
  return (
    <section>
      {/*   BUTTON     */}
      <section>
        <h2> Button: </h2>
        <div className="flex flex-wrap gap-4">
          <h3>Colour, border and emphasis </h3>
          <Button variant="primary">Primary</Button>

          <Button variant="secondary">Secondary</Button>

          <Button variant="danger">Delete</Button>

          <Button variant="text">Cancel</Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <h3>Size </h3>
          <Button size="small">Small</Button>

          <Button size="medium">Medium</Button>

          <Button size="large">Large</Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <h3>Disable </h3>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </section>
      {/*   CARD     */}
      <h2 className="mt-6"> Card:</h2>
      <section>
        <div className="grid gap-4 md:grid-cols-5">
          <h3>Varients:</h3>
          <Card variant="surface">
            <h4 className="text-lg font-semibold">surface</h4>
          </Card>

          <Card variant="subtle">
            <h4 className="text-lg font-semibold">subtle</h4>
          </Card>

          <Card variant="info">
            <h4 className="text-lg font-semibold">info</h4>
          </Card>

          <Card variant="dashed">
            <h4 className="text-lg font-semibold">dashed (add / empty)</h4>
          </Card>
        </div>
      </section>

      <section>
        <div className="grid gap-4 md:grid-cols-5">
          <h3>Padding:</h3>
          <Card padding="normal">Normal</Card>

          <Card padding="small">Small</Card>

          <Card padding="none">
            <div className="p-4">None</div>
          </Card>
        </div>
      </section>

      {/*   NOTICE    */}
      <section className="space-y-6">
        <h2>Notice:</h2>

        <Notice variant="info">info</Notice>

        <Notice variant="warning">warning (check paddock info)</Notice>

        <Notice variant="error">error (info is required)</Notice>

        <Notice variant="success">success (save complete)</Notice>

        <Notice variant="muted">muted (low priority)</Notice>

        <div>
          <h3>Compact:</h3>

          <Notice variant="info" compact>
            Compact.
          </Notice>
        </div>

        <div>
          <h3> List error</h3>

          <Notice variant="error">
            error (Please correct)
            <ul>
              <li>Farm name</li>
              <li>Target residual</li>
            </ul>
          </Notice>
        </div>
      </section>
      {/*   BRAND    */}
      <section className="space-y-6">
        <h2>Brand:</h2>

        <div>
          <Brand />
        </div>
      </section>
{/*   FORM ACTIONS    */}
      <section className="space-y-6">
        <h2>Form actions</h2>

        <div>
          <h3 className="mb-3">Default</h3>

          <FormActions>
            <Button>Cancel</Button>
            <Button variant="primary">Save changes</Button>
          </FormActions>
        </div>

        <div>
          <h3 className="mb-3">Start aligned</h3>

          <FormActions align="start">
            <Button variant="primary">Continue</Button>
          </FormActions>
        </div>
      </section>
{/*   HERD TITLE    */}
<section className="space-y-4">
  <h2>Herd titles</h2>
  <HerdTitle
    herd={{
      name: "Mixed age",
      animals: 210,
      colour: "blue",
    }}
  />
</section>

{/*   METRIC    */}
<section className="space-y-4">
  <h2>Metrics</h2>

  <div className="grid gap-4 sm:grid-cols-3">
    <Metric
      label="Pasture intake"
      value="14.2"
      unit="kgDM/cow/day"
    />

    <Metric
      label="Feed difference"
      value="-2.1"
      unit="kgDM/cow/day"
      tone="warning"
    />
  </div>

  <div>
    <h3 className="mb-3">
      Compact on mobile
    </h3>

    <Metric
      label="Days remaining"
      value="34"
      unit="days"
      compactOnMobile
    />
  </div>
</section>
    </section>
  );
}

export default Stories;
