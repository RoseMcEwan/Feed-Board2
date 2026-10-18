import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import SetupPage from "../pages/Setup/SetupPage.jsx";
import FarmInfoPage from "../pages/FarmInfo/FarmInfoPage.jsx";
import SettingsPage from "../pages/Settings/SettingsPage.jsx";
import PlannerPage from "../pages/Planner/PlannerPage.jsx";
import Card from "./primaryUI/Card.jsx";
import Notice from "./primaryUI/Notice.jsx";
import Button from "./primaryUI/buttons/Button.jsx";
import FormActions from "./primaryUI/FormActions.jsx";
import useFarmData from "../hooks/useFarmData.js";

//contains the shares farm hook and passing data. 
export default function Workspace({ profile, onLogout, onLoginAgain }) {
  const workspace = useFarmData(profile);
  const { farm, setFarm, today, error, loading, retry } = workspace;
  async function logout() {
  await workspace.saveNow();

  if (
    workspace.hasLocalError() &&
    !window.confirm(
      "Some edits could not be stored in this browser. Export them before logging out. Log out anyway?",
    )
  ) {
    return;
  }

  try {
    await onLogout();
  } catch (error) {
    // Stay logged in if the server could not end the session.
    console.error("Logout failed:", error);
  }
}
  if (loading) return <main id="main" className="mx-auto my-20 max-w-2xl px-4"><Notice>Loading your farm…</Notice></main>;
  if (error) return (
    <main id="main" className="mx-auto my-20 max-w-2xl px-4">
      <Card className="grid gap-4">
        <h1 className="text-metric">Unable to load FeedBoard</h1>
        <Notice variant="error">{error}</Notice>
        <FormActions>
          <Button onClick={retry}>Try again</Button>
          <Button onClick={workspace.exportDraft}>Export browser draft</Button>
          <Button onClick={workspace.discardDraft}>Discard browser draft & reload</Button>
          <Button onClick={onLoginAgain}>Log in again</Button>
        </FormActions>
      </Card>
    </main>
  );
  if (!farm.setupCompleted) return (
    <Routes>
      <Route path="/setup" element={<SetupPage farm={farm} userId={profile.id} today={today} onChange={setFarm} onLogout={logout} />} />
      <Route path="*" element={<Navigate to="/setup" replace />} />
    </Routes>
  );
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[var(--spacing-sidebar)_minmax(0,1fr)]">
      <Sidebar farm={farm} profile={profile} onLogout={logout} />
      <main id="main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-workspace p-4 sm:p-5 lg:px-8 lg:pt-6 lg:pb-14">
        <Routes>
          <Route path="/planner" element={<PlannerPage farm={farm} today={today} onChange={setFarm} userId={profile.id} />} />
          <Route path="/farminfo/:tab?" element={<FarmInfoPage farm={farm} userId={profile.id} today={today} onChange={setFarm} />} />
          <Route path="/settings" element={<SettingsPage farm={farm} onChange={setFarm} />} />
          <Route path="*" element={<Navigate to="/planner" replace />} />
        </Routes>
      </main>
    </div>
  );
}

