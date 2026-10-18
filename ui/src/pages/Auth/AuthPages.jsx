import { ArrowRight } from "lucide-react";
import AuthLayout from "../../components/featureComponents/auth/AuthLayout.jsx";
import AccountForm from "../../components/featureComponents/auth/AccountForm.jsx";
import ButtonLink from "../../components/primaryUI/buttons/ButtonLink.jsx";

export function WelcomePage() {
  return (
    <AuthLayout>
      <p className="mt-4 mb-1.5 text-tiny font-bold tracking-widest text-brand uppercase md:mt-6">
        WELCOME TO FEEDBOARD
      </p>

      <h2 className="mt-3 mb-4 text-3xl leading-tight font-semibold tracking-tighter lg:text-4xl">
        Your farm.
        <br />
        Your next move.
      </h2>

      <p className="mb-7 text-sm leading-loose text-muted">
        Start with your farm details, bring in your paddocks, and make a plan that works for you.
      </p>

      <div className="grid min-w-0 gap-2.5">
        <ButtonLink to="/register" variant="primary" size="large">
          Create a new account
          <ArrowRight aria-hidden="true" size={20} />
        </ButtonLink>

        <ButtonLink to="/login">Log in</ButtonLink>
      </div>
    </AuthLayout>
  );
}

export function LoginPage({ onEnter }) {
  return (
    <AuthLayout>
      <AccountForm mode="login" onEnter={onEnter} />
    </AuthLayout>
  );
}

export function RegisterPage({ onEnter }) {
  return (
    <AuthLayout>
      <AccountForm mode="register" onEnter={onEnter} />
    </AuthLayout>
  );
}
