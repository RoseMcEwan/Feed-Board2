import DataTable, { TableHeader, TableCell } from "../../primaryUI/DataTable.jsx";
import { InputField, SelectField, CheckboxField } from "../../primaryUI/FormFields.jsx";
import Button from "../../primaryUI/buttons/Button.jsx";
import Notice from "../../primaryUI/Notice.jsx";
import { Plus, Trash2 } from "lucide-react";
import { CROP_TYPES, createPaddock, syncCropRecords } from "../../../data/farmDefaults.js";

const exclusionReasons = [
  { value: "", label: "Choose reason" },
  { value: "crop", label: "Crop" },
  { value: "young-grass", label: "Young grass" },
  { value: "other", label: "Other" },
];

const exclusionCategories = {
  crop: "Crop",
  "young-grass": "Young grass",
  other: "Other",
};

const cropTypes = [{ value: "", label: "Choose crop type" }, ...CROP_TYPES];

// Keep paddock exclusion changes and linked crop records in sync.
function changePaddock(farm, id, field, value) {
  const paddocks = farm.paddocks.map((paddock) => {
    if (paddock.id !== id) {
      return paddock;
    }

    const next = {
      ...paddock,
      [field]: value,
    };

    if (field === "excluded" && !value) {
      next.exclusionReason = "";

      if (["Crop", "Other", "Silage"].includes(next.category)) {
        next.category = "Pasture";
      }
    }

    if (field === "exclusionReason") {
      next.category = exclusionCategories[value] ?? next.category;
    }

    return next;
  });

  return syncCropRecords({
    ...farm,
    paddocks,
  });
}

export default function PaddocksTable({ farm, onChange, simple = false }) {
  const herdOptions = [
    { value: "", label: "Choose herd" },
    ...farm.herds.map((herd) => ({
      value: herd.id,
      label: herd.name,
    })),
  ];

  function change(id, field, value) {
    const current = farm.paddocks.find((paddock) => paddock.id === id);

    // Confirm before an edit removes an existing crop feeding plan.
    const removesCrop =
      current?.exclusionReason === "crop" &&
      ((field === "excluded" && !value) || (field === "exclusionReason" && value !== "crop"));

    if (
      removesCrop &&
      (farm.crops ?? []).some(
        (crop) => crop.paddockId === id && (crop.startDate || crop.yieldKgDMHa || crop.kgDMPerAnimalDay),
      ) &&
      !window.confirm("This will remove the crop feeding plan for this paddock. Continue?")
    ) {
      return;
    }

    onChange(changePaddock(farm, id, field, value));
  }

  // Removing a paddock also clears its linked crop record.
  function remove(paddock) {
    if (!window.confirm(`Remove ${paddock.name || "this paddock"} and any linked crop plan?`)) {
      return;
    }

    onChange(
      syncCropRecords({
        ...farm,
        paddocks: farm.paddocks.filter((item) => item.id !== paddock.id),
      }),
    );
  }

  return (
    <div className="@container/paddocks grid min-w-0 gap-2.5">
      <DataTable
        label="Paddock information"
        caption="Paddocks, hectares, grazing exclusions and herd assignments"
        compact
        fixed
        className="@max-3xl/paddocks:[&_th]:px-1.5 @max-3xl/paddocks:[&_td]:px-1.5 @max-3xl/paddocks:[&_select]:px-1 @max-3xl/paddocks:[&_select]:text-xs"
      >
        <thead>
          <tr>
            <TableHeader>Paddock</TableHeader>

            <TableHeader className="@max-3xl/paddocks:w-[14%]">Ha</TableHeader>

            {!simple && (
              <>
                <TableHeader className="@max-3xl/paddocks:w-[11%]">Excl.</TableHeader>

                <TableHeader className="@max-3xl/paddocks:w-[22%]">Reason</TableHeader>
              </>
            )}

            {farm.settings.assignHerds && <TableHeader className="@max-3xl/paddocks:w-[20%]">Herd</TableHeader>}

            <TableHeader className="w-8">
              <span className="sr-only">Actions</span>
            </TableHeader>
          </tr>
        </thead>

        <tbody>
          {farm.paddocks.map((paddock, index) => {
            const name = paddock.name || `paddock ${index + 1}`;

            return (
              <tr key={paddock.id} className={paddock.excluded ? "bg-subtle" : "hover:bg-subtle"}>
                <TableCell>
                  <InputField
                    label={`Name for ${name}`}
                    labelHidden
                    value={paddock.name}
                    onChange={(event) => change(paddock.id, "name", event.target.value)}
                    required
                    maxLength={80}
                  />

                  {!simple && paddock.category !== "Pasture" && (
                    <span className="mt-1 block text-[10px] text-muted wrap-anywhere @3xl/paddocks:mt-1.5 @3xl/paddocks:text-tiny">
                      {paddock.category}
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  <InputField
                    type="number"
                    label={`Hectares for ${name}`}
                    labelHidden
                    value={paddock.hectares}
                    onChange={(event) => change(paddock.id, "hectares", event.target.value)}
                    min={0.001}
                    step="any"
                    required
                  />
                </TableCell>

                {!simple && (
                  <>
                    <TableCell>
                      <div className="flex min-h-8 items-center justify-center">
                        <CheckboxField
                          label={<span className="sr-only">{`Exclude ${name}`}</span>}
                          checked={paddock.excluded}
                          onChange={(event) => change(paddock.id, "excluded", event.target.checked)}
                        />
                      </div>
                    </TableCell>

                    <TableCell>
                      {paddock.excluded ? (
                        <div className="grid min-w-0 gap-1.5 @3xl/paddocks:gap-2.5">
                          <SelectField
                            label={`Exclusion reason for ${name}`}
                            labelHidden
                            value={paddock.exclusionReason}
                            options={exclusionReasons}
                            onChange={(event) => change(paddock.id, "exclusionReason", event.target.value)}
                            required
                          />

                          {paddock.exclusionReason === "crop" && (
                            <>
                              <SelectField
                                label={`Crop type for ${name}`}
                                labelHidden
                                value={paddock.cropType}
                                options={cropTypes}
                                onChange={(event) => change(paddock.id, "cropType", event.target.value)}
                                required
                              />

                              {paddock.cropType === "Other" && (
                                <InputField
                                  label={`Other crop type for ${name}`}
                                  labelHidden
                                  value={paddock.otherCropType}
                                  placeholder="Crop type"
                                  onChange={(event) => change(paddock.id, "otherCropType", event.target.value)}
                                  required
                                />
                              )}
                            </>
                          )}

                          {paddock.exclusionReason === "other" && (
                            <InputField
                              label={`Other reason for ${name}`}
                              labelHidden
                              value={paddock.otherReason}
                              placeholder="e.g. silage / resting"
                              onChange={(event) => change(paddock.id, "otherReason", event.target.value)}
                              required
                            />
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-muted @3xl/paddocks:hidden">—</span>

                          <span className="hidden items-center rounded-sm bg-brand-subtle px-2 py-1 text-tiny font-semibold text-brand @3xl/paddocks:inline-flex">
                            Available for grazing
                          </span>
                        </>
                      )}
                    </TableCell>
                  </>
                )}

                {farm.settings.assignHerds && (
                  <TableCell>
                    {!simple && paddock.excluded ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <SelectField
                        label={`Herd for ${name}`}
                        labelHidden
                        value={paddock.herdId}
                        options={herdOptions}
                        onChange={(event) => change(paddock.id, "herdId", event.target.value)}
                        required
                      />
                    )}
                  </TableCell>
                )}

                <TableCell>
                  <Button
                    size="small"
                    variant="text"
                    className="w-6 p-0 @3xl/paddocks:w-auto @3xl/paddocks:px-2"
                    aria-label={`Remove paddock ${name}`}
                    title={`Remove ${name}`}
                    onClick={() => remove(paddock)}
                  >
                    <Trash2 aria-hidden="true" size={15} className="@3xl/paddocks:hidden" />

                    <span className="hidden @3xl/paddocks:inline">Remove</span>
                  </Button>
                </TableCell>
              </tr>
            );
          })}
        </tbody>
      </DataTable>

      {!farm.paddocks.length && (
        <Notice variant="muted" className="border-dashed text-center">
          No paddocks added yet.
        </Notice>
      )}

      <Button
        className="max-w-full justify-self-start"
        onClick={() =>
          onChange({
            ...farm,
            paddocks: [...farm.paddocks, createPaddock()],
          })
        }
      >
        <Plus aria-hidden="true" size={18} />
        Add paddock manually
      </Button>
    </div>
  );
}
