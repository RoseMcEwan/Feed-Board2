import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";

import Button from "../../primaryUI/buttons/Button.jsx";
import { InputField } from "../../primaryUI/FormFields.jsx";
import Notice from "../../primaryUI/Notice.jsx";
import { loginAccount, registerAccount } from "../../../services/api.js";

export default function AccountForm({ mode, onEnter }) {
  const registering = mode === "register";
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();

    if (registering && !form.name.trim()) {
      setError("Enter a display name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (registering && [...form.password].length < 8) {
      setError("Use a password of at least 8 characters.");
      return;
    }
    if (!registering && !form.password) {
      setError("Enter your password.");
      return;
    }
    if (registering && form.password !== form.confirm) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = registering
        ? await registerAccount({ name: form.name.trim(), email: form.email.trim(), password: form.password })
        : await loginAccount({ email: form.email.trim(), password: form.password });

      onEnter(response.user);
      navigate(registering ? "/setup" : "/planner");
    } catch (requestError) {
      setError(requestError.message || "Could not sign in to FeedBoard.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link className="inline-flex items-center gap-1 text-xs text-muted no-underline" to="/">
        <ArrowLeft aria-hidden="true" size={16} />
        Welcome
      </Link>

      <p className="mt-4 mb-1.5 text-tiny font-bold tracking-widest text-brand uppercase md:mt-6">
        {registering ? "LET’S GET STARTED" : "GOOD TO SEE YOU"}
      </p>

      <h2 className="mt-3 mb-4 text-3xl leading-tight font-semibold tracking-tighter lg:text-4xl">
        {registering ? "Create your account" : "Welcome back"}
      </h2>

      <p className="mb-7 text-sm leading-loose text-muted">
        {registering ? "Create your FeedBoard account and set up your farm." : "Log in to your FeedBoard account."}
      </p>

      <form onSubmit={submit} className="grid min-w-0 gap-5" noValidate>
        {registering && (
          <InputField
            label="Your name"
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
            autoComplete="name"
            maxLength={80}
            required
          />
        )}

        <InputField
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => change("email", e.target.value)}
          placeholder="farmer@example.com"
          autoComplete="email"
          required
        />

        <InputField
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => change("password", e.target.value)}
          autoComplete={registering ? "new-password" : "current-password"}
          minLength={registering ? 8 : 1}
          required
        />

        {registering && (
          <InputField
            label="Confirm password"
            type="password"
            value={form.confirm}
            onChange={(e) => change("confirm", e.target.value)}
            autoComplete="new-password"
            required
          />
        )}

        {error && <Notice variant="error">{error}</Notice>}

        <Button type="submit" variant="primary" size="large" disabled={busy}>
          {busy ? "Please wait…" : registering ? "Create account" : "Log in"}
          {!busy && <ArrowRight aria-hidden="true" size={20} />}
        </Button>
      </form>

      <p className="my-6 text-center text-caption text-faint">
        {registering ? "Already have an account? " : "New to FeedBoard? "}
        <Link to={registering ? "/login" : "/register"} className="font-semibold">
          {registering ? "Log in" : "Create an account"}
        </Link>
      </p>
    </>
  );
}
