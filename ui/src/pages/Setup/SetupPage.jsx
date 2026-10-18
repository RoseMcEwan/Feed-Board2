import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import Card from "../../components/primaryUI/Card.jsx";
import Button from "../../components/primaryUI/buttons/Button.jsx";
import Brand from "../../components/primaryUI/Brand.jsx";
import Notice from "../../components/primaryUI/Notice.jsx";

import FarmSettingsFields from "../../components/featureComponents/farmInfo/FarmSettingsFields.jsx";
import HerdsEditor from "../../components/featureComponents/farmInfo/HerdsEditor.jsx";
import PaddockImporter from "../../components/featureComponents/farmInfo/PaddockImporter.jsx";
import PaddocksTable from "../../components/featureComponents/farmInfo/PaddocksTable.jsx";
import CropsEditor from "../../components/featureComponents/farmInfo/CropsEditor.jsx";

import { validateFarm, validateSettings, validateHerds, validatePaddocks } from "../../utilis/validation.js";

import useFarmCalculations from "../../hooks/useFarmCalculations.js";
import { displayNumber } from "../../utilis/numbers.js";

const steps = [
  ["Your farm", "A few details to make FeedBoard yours."],
  ["Herds", "Who you are feeding, and their target intake."],
  ["Import paddocks", "Bring in your paddock names and hectares."],
  ["Grazing & herds", "Choose what can be grazed and where each herd belongs."],
  ["Crops & review", "Add feeding details and check your farm before starting."],
];
const lastStep = steps.length - 1;

export default function SetupPage({ farm, onChange, onLogout, today, userId }) {
  const step = Math.max(0, Math.min(lastStep, farm.setupStep || 0));
  const calculations = useFarmCalculations({
    farm,
    userId,
    today,
    enabled: step >= 3,
  });

  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  const pendingImport = Boolean(farm.importText?.trim());

  function next() {
    if (step >= 2 && pendingImport) {
      setErrors(["Add the paddocks from your preview, or clear the pasted text before continuing."]);

      return;
    }

    const checks = [
      () => validateSettings(farm.settings),
      () => validateHerds(farm),
      () =>
        validatePaddocks(farm, {
          requireAssignments: false,
          requireCropTypes: false,
        }),
      () => validatePaddocks(farm),
      () => validateFarm(farm),
    ];

    const problems = checks[step]();

    if (problems.length) {
      setErrors(problems);

      return;
    }

    setErrors([]);

    if (step === lastStep) {
      onChange({
        ...farm,
        setupCompleted: true,
        setupStep: lastStep,
      });
      navigate("/planner");
    } else {
      onChange({
        ...farm,
        setupStep: step + 1,
      });
      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
    }
  }

  const missingCount = calculations.data?.summary.unassignedPaddockIds.length;
  const grazingHa = calculations.data?.summary.grazingHa;

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-5 border-b border-line bg-canvas px-3 py-4 sm:px-5 md:px-6 md:py-5 lg:px-10">
        <Brand />

        <Button variant="text" size="small" onClick={onLogout}>
          Log out
        </Button>
      </header>

      <div className="mx-auto max-w-workspace px-4 pt-5 pb-10 sm:px-5 sm:py-6 md:grid md:grid-cols-[var(--container-setup-nav)_minmax(0,1fr)] md:gap-6 md:px-6 md:py-8 lg:grid-cols-[var(--container-setup-nav-wide)_minmax(0,1fr)] lg:gap-12 lg:px-10 lg:pt-10 lg:pb-14">
        <aside className="self-start md:sticky md:top-8">
          <p className="mb-1.5 hidden text-tiny font-bold tracking-widest text-brand uppercase md:block">
            MAKE YOURSELF AT HOME
          </p>

          <h1 className="mt-3 mb-5 hidden text-3xl font-semibold tracking-tighter md:block lg:text-4xl">
            Let’s set up
            <br />
            your farm.
          </h1>

          <p className="hidden text-caption leading-loose text-muted md:block">
            You can change these details later in Settings and Farm information.
          </p>

          <ol className="mb-6 flex list-none justify-between gap-1 p-0 md:mt-7 md:mb-8 md:grid md:gap-2">
            {steps.map(([title], index) => (
              <li
                key={title}
                aria-current={step === index ? "step" : undefined}
                data-complete={step > index ? true : undefined}
                className="group/step flex flex-1 items-center justify-center rounded-control px-1 py-2 text-caption text-faint md:justify-start md:gap-3 md:px-3 md:py-2.5 data-[complete=true]:text-muted aria-[current=step]:bg-brand-soft aria-[current=step]:font-semibold aria-[current=step]:text-heading"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-info-line text-tiny font-semibold text-faint group-data-[complete=true]/step:border-success-line group-data-[complete=true]/step:bg-brand-subtle group-data-[complete=true]/step:text-green-herd group-aria-[current=step]/step:border-brand group-aria-[current=step]/step:bg-brand group-aria-[current=step]/step:text-inverse">
                  {step > index ? <Check aria-hidden="true" size={16} /> : index + 1}
                </span>

                <span className="hidden md:inline">{title}</span>
              </li>
            ))}
          </ol>
        </aside>

        <main id="main" className="min-w-0">
          {calculations.error && step >= 3 && (
            <Notice variant="warning" className="mb-5">
              Feed calculations are unavailable: {calculations.error}
            </Notice>
          )}

          <div className="mb-7">
            <p className="mb-1.5 text-tiny font-bold tracking-widest text-brand uppercase">
              STEP {step + 1} OF {steps.length}
            </p>

            <h2 className="mt-2 mb-2.5 text-metric font-semibold sm:text-3xl">{steps[step][0]}</h2>
            <p className="text-sm text-muted">{steps[step][1]}</p>

            <progress
              value={step + 1}
              max={steps.length}
              aria-label="Setup progress"
              className="setup-progress mt-6 block h-1 w-full"
            />
          </div>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              next();
            }}
            className="grid min-w-0 gap-5"
          >
            {errors.length > 0 && (
              <Notice variant="error">
                Please correct:
                <ul>
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </Notice>
            )}

            {step === 0 && (
              <Card className="@container">
                <FarmSettingsFields
                  showRoundLength
                  settings={farm.settings}
                  onChange={(field, value) =>
                    onChange({
                      ...farm,
                      settings: {
                        ...farm.settings,
                        [field]: value,
                      },
                    })
                  }
                />
              </Card>
            )}

            {step === 1 && <HerdsEditor farm={farm} onChange={onChange} singleColumn />}
            {step === 2 && (
              <>
                <PaddockImporter farm={farm} onImport={onChange} />
                <PaddocksTable farm={farm} onChange={onChange} simple />
              </>
            )}

            {step === 3 && (
              <>
                <Notice>
                  {farm.settings.assignHerds
                    ? `Confirm the recognised herds. ${
                        missingCount === undefined
                          ? "Checking herd assignments…"
                          : missingCount
                            ? `${missingCount} grazed paddock(s) still need a herd — choose them in the table.`
                            : "Every grazed paddock has a herd."
                      } Excluded paddocks do not need a grazing herd.`
                    : "Each herd keeps its own grazing queue and can choose any paddock not excluded below. Shared grazing area is divided between herds by animal numbers."}
                </Notice>

                <PaddocksTable farm={farm} onChange={onChange} />

                <div className="flex items-center justify-between gap-4 rounded-panel bg-brand-soft p-4 text-sm sm:px-6 sm:py-5">
                  <span>Area available for grazing</span>
                  <strong className="text-xl text-brand-dark sm:text-metric">{displayNumber(grazingHa, 2)} ha</strong>
                </div>
              </>
            )}

            {step === lastStep && (
              <>
                <CropsEditor farm={farm} onChange={onChange} today={today} metrics={calculations.data?.cropMetrics} />

                <Card variant="info" className="@container">
                  <h3>Ready to plan</h3>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-5">
                    <div>
                      <dt className="text-xs text-muted">Farm</dt>
                      <dd className="mt-1 text-body font-semibold text-heading">{farm.settings.farmName}</dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted">Herds / mobs</dt>
                      <dd className="mt-1 text-body font-semibold text-heading">{farm.herds.length}</dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted">Paddocks</dt>
                      <dd className="mt-1 text-body font-semibold text-heading">{farm.paddocks.length}</dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted">Grazable area</dt>
                      <dd className="mt-1 text-body font-semibold text-heading">{displayNumber(grazingHa, 2)} ha</dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted">Target cover / residual</dt>
                      <dd className="mt-1 text-body font-semibold text-heading">
                        {farm.settings.targetCover} / {farm.settings.residualKgDmHa} kgDM/ha
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted">Round length</dt>
                      <dd className="mt-1 text-body font-semibold text-heading">{farm.settings.roundLength} days</dd>
                    </div>
                  </dl>
                </Card>
              </>
            )}

            <div className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-5">
              <Button
                type="button"
                disabled={step === 0}
                onClick={() => {
                  setErrors([]);
                  onChange({
                    ...farm,
                    setupStep: step - 1,
                  });
                  window.scrollTo({
                    top: 0,
                    behavior: "instant",
                  });
                }}
              >
                <ArrowLeft aria-hidden="true" size={18} />
                Back
              </Button>

              <Button type="submit" variant="primary">
                {step === lastStep ? "Finish setup" : "Continue"}

                {step === lastStep ? (
                  <Check aria-hidden="true" size={18} />
                ) : (
                  <ArrowRight aria-hidden="true" size={18} />
                )}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
