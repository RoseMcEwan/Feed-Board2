import { displayNumber } from "../../../utilis/numbers.js";
import { cropIntakeForHerd } from "../../../calculations/CropMetric.js";
import {
  calculateTotalHa24h,
  calculatePastureKgDM,
  calculateFeedDifference,
} from "../../../calculations/calculateFeedMetrics.js";
import { planningGroups } from "../../../utilis/farmSelectors.js";
import { COLOURS, STOCK_CLASSES, createHerd } from "../../../data/farmDefaults.js";
import Metric from "../../primaryUI/Metric.jsx";
import Button from "../../primaryUI/buttons/Button.jsx";
import { InputField, SelectField } from "../../primaryUI/FormFields.jsx";
import Card from "../../primaryUI/Card.jsx";
import { Plus } from "lucide-react";
import Notice from "../../primaryUI/Notice.jsx";
import HerdTitle from "../../primaryUI/HerdTitle.jsx";

const colourOptions = COLOURS.map((colour) => ({
  value: colour,
  label: colour.charAt(0).toUpperCase() + colour.slice(1),
}));

export default function HerdsEditor({ farm, onChange, showCalculations = false, today, singleColumn = false }) {
  function updateHerd(id, field, value) {
    onChange({
      ...farm,
      herds: farm.herds.map((herd) =>
        herd.id === id
          ? {
              ...herd,
              [field]: value,
            }
          : herd,
      ),
    });
  }

  // Clear linked assignments and planner orders so nothing references a deleted herd.
  function removeHerd(id) {
    if (!window.confirm("Remove this herd? Its paddock and crop assignments will be cleared.")) return;
    const orders = {
      ...farm.planner.orders,
    };
    delete orders[id];
    onChange({
      ...farm,
      herds: farm.herds.filter((herd) => herd.id !== id),

      paddocks: farm.paddocks.map((paddock) =>
        paddock.herdId === id
          ? {
              ...paddock,
              herdId: "",
            }
          : paddock,
      ),

      crops: farm.crops.map((crop) =>
        crop.herdId === id
          ? {
              ...crop,
              herdId: "",
            }
          : crop,
      ),
      planner: {
        ...farm.planner,
        orders,
      },
    });
  }

  function addHerd() {
    onChange({
      ...farm,
      herds: [...farm.herds, createHerd(farm.herds.length, farm.settings.farmType)],
    });
  }

  // Each herd either has their own grazing area or all paddocks are shared. 
  const groups = planningGroups(farm);
  return (
    <div className="grid min-w-0 gap-5">
      {!farm.herds.length && (
        <Notice>Add your herds or mobs so feed requirements and crop feeding rates can be calculated.</Notice>
      )}

      {/* Farm Info reuses the same editor in a wider layout. */}
      <div className={singleColumn ? "grid gap-5" : "grid gap-5 xl:grid-cols-2"}>
        {groups.map((herd) => (
          <HerdDataCard
            key={herd.id}
            herd={herd}
            farm={farm}
            today={today}
            showCalculations={showCalculations}
            onChange={updateHerd}
            onRemove={removeHerd}
          />
        ))}
      </div>

      <Button className="justify-self-start" onClick={addHerd}>
        <Plus aria-hidden="true" size={18} />
        Add herd / mob
      </Button>
    </div>
  );
}

function HerdDataCard({ herd, farm, onChange, onRemove, showCalculations, today }) {
  const area = herd.totalArea;
  const dailyHa = calculateTotalHa24h(area, farm.settings.roundLength);
  const pasture = calculatePastureKgDM({
    totalHa24h: dailyHa,
    ...farm.settings,
    animals: herd.animals,
  });
  const crop = cropIntakeForHerd(farm, herd.id, today);
  const offered = pasture === null ? null : pasture + crop;
  const difference = calculateFeedDifference(herd.targetKgDMDay, offered);
  const change = (field, value) => onChange(herd.id, field, value);
  return (
    <Card className="@container border-t-3 border-t-herd-accent" data-herd-colour={herd.colour}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <HerdTitle herd={herd} />
        <Button variant="text" size="small" onClick={() => onRemove(herd.id)}>
          Remove herd
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4">
        <div className="grid grid-cols-2 items-end gap-3 sm:gap-4">
          <InputField
            label="Herd name"
            value={herd.name}
            onChange={(e) => change("name", e.target.value)}
            required
            maxLength={60}
          />

          <InputField
            type="number"
            label="Animals"
            value={herd.animals}
            onChange={(e) => change("animals", e.target.value)}
            min={1}
            step={1}
            required
          />
        </div>

        <div className="grid grid-cols-2 items-end gap-3 sm:gap-4">
          <SelectField
            label="Stock class"
            value={herd.stockClass}
            options={STOCK_CLASSES}
            onChange={(e) => change("stockClass", e.target.value)}
          />

          <InputField
            type="number"
            label="Target intake animal"
            value={herd.targetKgDMDay}
            onChange={(e) => change("targetKgDMDay", e.target.value)}
            unit="kgDM/day"
            min={0.01}
            step="any"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <SelectField
            label="Herd colour"
            value={herd.colour}
            options={colourOptions}
            onChange={(e) => change("colour", e.target.value)}
          />
        </div>
      </div>

      {/* Farm Info shows feed calculations. */}
      {showCalculations && (
        <>
          <div className="mt-4 grid grid-cols-4 gap-1.5 @sm:mt-5 @sm:gap-2">
            <Metric unit="kgDM/animal/day" label="Pasture" value={displayNumber(pasture)} />
            <Metric unit="kgDM/animal/day" label="Crop today" value={displayNumber(crop)} />
            <Metric unit="kgDM/animal/day" label="Total offered" value={displayNumber(offered)} />
            <Metric
              unit="kgDM/animal/day"
              label="Difference from target"
              value={difference === null ? "—" : `${difference > 0 ? "+" : ""}${displayNumber(difference)}`}
            />
          </div>

          <p className="mt-3 mb-0 text-xs leading-relaxed text-muted">
            Pasture = ({displayNumber(area, 2)} ha ÷ {farm.settings.roundLength || "—"} days) × (
            {farm.settings.targetCover} − {farm.settings.residualKgDmHa}) ÷ {herd.animals || "—"} animals.
          </p>
        </>
      )}
    </Card>
  );
}
