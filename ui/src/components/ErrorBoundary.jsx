import { Component } from "react";
import Card from "./primaryUI/Card.jsx";
import Button from "./primaryUI/buttons/Button.jsx";

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main id="main" className="mx-auto my-20 max-w-2xl px-4">
          <Card>
            <h1 className="text-metric">Something went wrong</h1>
            <p>Reload the page.</p>
            <Button onClick={() => window.location.reload()}>Reload FeedBoard</Button>
          </Card>
        </main>
      );
    return this.props.children;
  }
}
