import Button from './button/Button.jsx'

export function Stories() {
  return (
<section>
<h1> Button: </h1>
      <div className="flex flex-wrap gap-4">
        <h2>Colour, border and emphasis </h2>
        <Button variant="primary">
          Primary
        </Button>

        <Button variant="secondary">
          Secondary
        </Button>

        <Button variant="danger">
          Delete
        </Button>

        <Button variant="text">
          Cancel
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <h2>Size </h2>
        <Button size="small">
          Small
        </Button>

        <Button size="medium">
          Medium
        </Button>

        <Button size="large">
          Large
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <h2>Disable </h2>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </div>
  </section>
  )
}

export default Stories;