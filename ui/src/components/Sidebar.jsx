import { NavLink, Link } from "react-router-dom";
import { LayoutGrid, LogOut, Settings, Tractor } from "lucide-react";
import Brand from "./primaryUI/Brand.jsx";
import Button from "./primaryUI/buttons/Button.jsx";
import ButtonLink from "./primaryUI/buttons/ButtonLink.jsx";

const navLinkClasses =
  "flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-control px-2 py-2.5 text-caption font-medium text-muted no-underline hover:bg-brand-subtle md:justify-start md:gap-3 md:p-3 aria-[current=page]:bg-brand-soft aria-[current=page]:font-bold aria-[current=page]:text-heading";

export default function Sidebar({ farm, profile, onLogout }) {
  const farmName = farm.settings.farmName;
  const initials =
    farmName
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "FB";

  return (
    <aside className="min-w-0 border-b border-line bg-navigation px-4 py-3 sm:px-5 md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:justify-between md:border-r md:border-b-0 md:px-4 md:pt-7">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center justify-between gap-2 md:block">
          <Brand to="/settings" aria-label="FeedBoard farm settings" className="min-w-0 max-md:[&_img]:h-8" />

          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <ButtonLink to="/settings" variant="text" size="icon" aria-label="Open farm settings" title="Farm settings">
              <Settings aria-hidden="true" size={20} />
            </ButtonLink>
            <Button variant="text" size="icon" onClick={() => onLogout(false)} aria-label="Log out" title="Log out">
              <LogOut aria-hidden="true" size={20} />
            </Button>
          </div>
        </div>

        <p className="mt-12 mb-4 ml-3 hidden text-micro font-bold tracking-widest text-faint md:block">WORKSPACE</p>
        <nav className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:grid-cols-1 md:gap-1.5" aria-label="Primary navigation">
          <NavLink to="/planner" className={navLinkClasses}>
            <LayoutGrid aria-hidden="true" className="size-5" />
            Planner
          </NavLink>
          <NavLink to="/farminfo" className={navLinkClasses}>
            <Tractor aria-hidden="true" className="size-5" />
            <span className="md:hidden">Farm info</span>
            <span className="hidden md:inline">Farm information</span>
          </NavLink>
        </nav>
      </div>

      <div className="hidden md:block">
        <Link
          className="group/farm flex items-center gap-2.5 border-t border-info-line px-0.5 py-4 no-underline"
          to="/settings"
          aria-label={`Open settings for ${farmName}`}
        >
          <span className="grid size-9.5 shrink-0 place-items-center rounded-panel bg-brand-soft text-caption font-bold text-green-herd">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-xs text-brand-dark wrap-anywhere group-hover/farm:underline">
              {farmName}
            </strong>
            <small className="mt-0.5 block text-tiny text-faint">Farm settings</small>
          </span>
          <Settings aria-hidden="true" size={18} />
        </Link>
        <div className="flex items-center justify-between gap-2 px-0.5 pt-2">
          <span className="min-w-0 text-xs text-muted wrap-anywhere">{profile.name}</span>
          <Button className="shrink-0" variant="text" size="small" onClick={() => onLogout(false)}>
            <LogOut aria-hidden="true" size={17} />
            Log out
          </Button>
        </div>
      </div>
    </aside>
  );
}
