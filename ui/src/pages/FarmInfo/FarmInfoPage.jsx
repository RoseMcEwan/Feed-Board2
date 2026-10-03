import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/primaryUI/PageHeader.jsx";
import HerdsEditor from "../../components/featureComponents/farmInfo/HerdsEditor.jsx";
import PaddockImporter from "../../components/featureComponents/farmInfo/PaddockImporter.jsx";
import PaddocksTable from "../../components/featureComponents/farmInfo/PaddocksTable.jsx";
import CropsEditor from "../../components/featureComponents/farmInfo/CropsEditor.jsx";
import Notice from "../../components/primaryUI/Notice.jsx";
import { InputField } from "../../components/primaryUI/FormFields.jsx";
import { grazingArea, totalArea, missingAssignments } from "../../utilis/farmSelectors.js";
import { displayNumber } from "../../utilis/numbers.js";
import { validateHerds, validatePaddocks, validateCrops } from "../../utilis/validation.js";
import Metric from "../../components/primaryUI/Metric.jsx";

const farmTabs = [
  {
    key: "herds",
    label: "Herds",
    heading: "Herds & feed calculations",
    validate: validateHerds,
  },
  {
    key: "paddocks",
    label: "Paddocks",
    heading: "Paddocks",
    validate: validatePaddocks,
  },
  {
    key: "crops",
    label: "Crops",
    heading: "Crop calculation",
    validate: validateCrops,
  },
];

export default function FarmInfoPage({ farm, onChange, today }) {
  const { tab: routeTab } = useParams();

  // Default routes to the Herds tab.
  const activeTab = farmTabs.find(({ key }) => key === routeTab) ?? farmTabs[0];

  const tab = activeTab.key;
  const errors = activeTab.validate(farm);

  const unassignedCount = missingAssignments(farm).length;
  const totalHa = totalArea(farm);
  const grazingHa = grazingArea(farm);
  const excludedHa = totalHa - grazingHa;

  return (
    <>
      <div className="hidden md:block">
        <PageHeader
          title="Farm information"
          subtitle="Your herds, paddocks and crops, all working from the same plan."
        />
      </div>

      <nav
        className="mt-0.5 mb-3 flex gap-5 border-b border-info-line sm:mb-7 sm:gap-7"
        aria-label="Farm information sections"
      >
        {farmTabs.map(({ key, label }) => (
          <Link
            key={key}
            to={`/farminfo/${key}`}
            aria-current={tab === key ? "page" : undefined}
            className="group/tab flex items-center gap-2 border-b-3 border-transparent px-0.5 pt-3 pb-4 text-sm font-semibold text-muted no-underline aria-[current=page]:border-brand aria-[current=page]:text-brand"
          >
            {label}
            <span className="rounded-sm bg-navigation px-1.5 py-px text-tiny group-aria-[current=page]/tab:bg-brand-soft">
              {farm[key].length}
            </span>
          </Link>
        ))}
      </nav>

      <div className="grid min-w-0 gap-3 sm:gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4 sm:mb-4 sm:flex-nowrap sm:items-center">
          <h2 className="mb-0 sr-only md:not-sr-only">{activeTab.heading}</h2>

          {tab === "herds" && (
            <InputField
              label="Round length"
              type="number"
              unit="days"
              wrapperClassName="w-full sm:w-44 sm:shrink-0"
              value={farm.settings.roundLength}
              onChange={(e) =>
                onChange({
                  ...farm,
                  settings: { ...farm.settings, roundLength: e.target.value },
                })
              }
              min={0.01}
              step="any"
              required
            />
          )}
        </div>

        {Boolean(errors.length) && (
          <Notice variant="warning">
            Some details need attention:
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Notice>
        )}

        {Boolean(unassignedCount) && (
          <Notice variant="warning">
            {unassignedCount} grazed paddock(s) need herd assignments. Open Paddocks to allocate them. They are not
            included in a herd’s grazing queue until assigned.
          </Notice>
        )}

        {tab === "herds" && <HerdsEditor farm={farm} onChange={onChange} today={today} showCalculations />}

        {tab === "paddocks" && (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Metric label="Total farm area" value={`${displayNumber(totalHa, 2)} ha`} />

              <Metric label="Available for grazing" value={`${displayNumber(grazingHa, 2)} ha`} />

              <Metric label="Excluded from pasture" value={`${displayNumber(excludedHa, 2)} ha`} />
            </div>
            <PaddocksTable farm={farm} onChange={onChange} />
            <details className="border-t border-info-line py-4">
              <summary className="mb-4 text-caption font-semibold text-brand">
                Import more paddocks from pasted text
              </summary>
              <PaddockImporter farm={farm} onImport={onChange} />
            </details>
          </>
        )}

        {tab === "crops" && <CropsEditor farm={farm} onChange={onChange} today={today} />}
      </div>
    </>
  );
}
