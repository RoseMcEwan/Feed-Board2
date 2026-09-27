import { CheckboxField, InputField } from "../../../primaryUI/FormFields.jsx";

const farmTypes = [
  {
    value: "dairy",
    title: "Dairy",
    description: "Plan around your milking timetable.",
  },
  {
    value: "sheep-beef",
    title: "Sheep / beef",
    description: "Plan around your break-shift times.",
  },
];

export default function SettingsFields({
  settings,
  onChange,
}) {
  return (
    <div className="grid min-w-0 gap-5">

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 text-caption font-semibold">
          Type of farming
        </legend>

        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
          {farmTypes.map((farmType) => (
            <label
              key={farmType.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-panel border border-info-line p-4 has-checked:border-brand has-checked:bg-info-soft"
            >
              <input
                type="radio"
                name="farmType"
                value={farmType.value}
                checked={settings.farmType === farmType.value}
                onChange={() =>
                  onChange("farmType", farmType.value)
                }
                className="mt-0.5 accent-brand"
              />

              <span>
                <strong className="block text-sm">
                  {farmType.title}
                </strong>

                <span className="mt-1 block text-xs text-muted">
                  {farmType.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <InputField
        label="Farm name"
        value={settings.farmName}
        onChange={(e) =>
          onChange("farmName", e.target.value)
        }
        required
        maxLength={100}
        placeholder="e.g. Green Valley Farm"
        autoComplete="organization"
      />

      <div>
        <CheckboxField
          label="Herds are assigned to specific paddocks"
          checked={settings.assignHerds}
          onChange={(e) =>
            onChange("assignHerds", e.target.checked)
          }
        />

        <p className="mt-2 mb-0 text-xs leading-relaxed text-muted">
          {settings.assignHerds
            ? "Each grazed paddock will be assigned to a herd."
            : "Herds share all grazing paddocks."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2">
        <InputField
          label="Latitude"
          type="number"
          value={settings.latitude}
          onChange={(e) =>
            onChange("latitude", e.target.value)
          }
          min={-90}
          max={90}
          step="any"
          required
          placeholder="e.g. -43.52872"
        />

        <InputField
          label="Longitude"
          type="number"
          value={settings.longitude}
          onChange={(e) =>
            onChange("longitude", e.target.value)
          }
          min={-180}
          max={180}
          step="any"
          required
          placeholder="e.g. 172.62166"
        />
      </div>

      <p className="m-0 text-caption leading-relaxed text-muted">
        Coordinates are used for local weather.
      </p>

      <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2">
        <InputField
          label="Target cover"
          type="number"
          value={settings.targetCover}
          onChange={(e) =>
            onChange("targetCover", e.target.value)
          }
          unit="kgDM/ha"
          min={1}
          step="any"
          required
        />

        <InputField
          label="Target residual"
          type="number"
          value={settings.residualKgDmHa}
          onChange={(e) =>
            onChange("residualKgDmHa", e.target.value)
          }
          unit="kgDM/ha"
          min={1}
          step="any"
          required
          placeholder="1550"
        />
      </div>

    </div>
  );
}