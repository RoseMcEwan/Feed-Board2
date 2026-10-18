import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Workspace from "./components/Workspace.jsx";
import Notice from "./components/primaryUI/Notice.jsx";
import Button from "./components/primaryUI/buttons/Button.jsx";

import { LoginPage, RegisterPage, WelcomePage } from "./pages/Auth/AuthPages.jsx";

import { getSession, logoutAccount } from "./services/api.js";

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Restore the authenticated account when FeedBoard first loads.
  useEffect(() => {
    let cancelled = false;

    getSession()
      .then(({ user }) => {
        if (!cancelled) {
          setProfile(user);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    if (profile) {
      try {
        await logoutAccount(profile.id);
      } catch (requestError) {
        if (!["AUTH_REQUIRED", "ACCOUNT_CHANGED"].includes(requestError.code)) {
          throw requestError;
        }
      }
    }

    setProfile(null);
  }

  //prevents the rest of Workspace rendering before the farm has finished loading. 
  if (loading) {
    return (
      <main id="main" className="mx-auto my-20 max-w-2xl px-4">
        <Notice>Connecting to FeedBoard…</Notice>
      </main>
    );
  }

  if (error) {
    return (
      <main id="main" className="mx-auto my-20 max-w-2xl px-4">
        <Notice variant="error">{error}</Notice>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    );
  }

  return (
    <>
    {/*Normally invisible, a way to bypass navigation via tab as an established accessiblility requirement.*/}
      <a href="#main" className="fixed top-4 left-4 z-200 -translate-y-[calc(100%+var(--spacing)*4)] rounded-control bg-surface p-4 focus:translate-y-0">
        Skip to main content
      </a>

      <Routes>
        {profile ? (
          <Route
            path="*"
            element={
              <Workspace key={profile.id} profile={profile} onLogout={logout} onLoginAgain={() => setProfile(null)} />
            }
          />
        ) : (
          <>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage onEnter={setProfile} />} />
            <Route path="/register" element={<RegisterPage onEnter={setProfile} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}
