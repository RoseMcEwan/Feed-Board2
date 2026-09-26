import Button from "./button/Button.jsx";
import Card from "./Card.jsx";

export function Stories() {
  return (
    <section>
      {/*   BUTTON     */}
      <section>
        <h1> Button: </h1>
        <div className="flex flex-wrap gap-4">
          <h2>Colour, border and emphasis </h2>
          <Button variant="primary">Primary</Button>

          <Button variant="secondary">Secondary</Button>

          <Button variant="danger">Delete</Button>

          <Button variant="text">Cancel</Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <h2>Size </h2>
          <Button size="small">Small</Button>

          <Button size="medium">Medium</Button>

          <Button size="large">Large</Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <h2>Disable </h2>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </section>
      {/*   CARD     */}
      <h1 class="mt-10"> Card:</h1>
      <section>

        <div className="grid gap-4 md:grid-cols-5">
          <h2>Cards</h2>
          <Card variant="surface">
            <h3 className="text-lg font-semibold">surface</h3>
          </Card>

          <Card variant="subtle">
            <h3 className="text-lg font-semibold">subtle</h3>
          </Card>

          <Card variant="info">
            <h3 className="text-lg font-semibold">info</h3>
          </Card>

          <Card variant="dashed">
            <h3 className="text-lg font-semibold">dashed (add / empty)</h3>
          </Card>
        </div>
      </section>

      <section>

        <div className="grid gap-4 md:grid-cols-5">
          <h2>Card padding</h2>
          <Card padding="normal">Normal</Card>

          <Card padding="small">Small</Card>

          <Card padding="none">
            <div className="p-4">None</div>
          </Card>
        </div>
      </section>
    </section>
  );
}

export default Stories;
