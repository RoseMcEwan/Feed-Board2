import Card from "../../primaryUI/Card.jsx";
import { InputField, SelectField } from "../../primaryUI/FormFields.jsx";
import Notice from "../../primaryUI/Notice.jsx";
import Metric from "../../primaryUI/Metric.jsx";
import { CROP_TYPES } from "../../../data/farmDefaults.js";
import { calculateCropMetrics } from "../../../calculations/CropMetric.js";
import { displayNumber } from "../../../utilis/numbers.js";
import { formatDate } from "../../../utilis/calendarDates.js";
export default function CropCard({ crop, farm, onChange, today }) {
  
  const paddock = farm.paddocks.find(
    (paddock) => paddock.id === crop.paddockId,
  );

  const herd = farm.herds.find((herd) => herd.id === crop.herdId);

  if (!paddock) return null;

  const result = calculateCropMetrics({
    crop,
    paddock,
    herd,
    today,
  });

  const changeCrop = (field, value) =>
    onChange({
      ...farm,
      crops: farm.crops.map((item) =>
        item.id === crop.id ? { ...item, [field]: value } : item,
      ),
    });

  const changePaddock = (field, value) =>
    onChange({
      ...farm,
      paddocks: farm.paddocks.map((item) =>
        item.id === paddock.id ? { ...item, [field]: value } : item,
      ),
    });

  return (
    <Card className="@container border-t-3 border-t-crop [--field-control-size:var(--text-sm)] @sm:[--field-control-size:var(--text-base)]">
      <div className="mb-4">
        <p className="mb-1.5 text-tiny font-bold tracking-widest text-brand uppercase">
          CROP PADDOCK
        </p>

        <h3 className="mb-0 wrap-anywhere">{paddock.name}</h3>
      </div>

      <div className="grid gap-3 @3xl:grid-cols-3 @3xl:gap-4">
        <div className="grid grid-cols-2 items-end gap-3 @3xl:contents">
          <SelectField
            label="Crop type"
            value={paddock.cropType}
            options={[{ value: "", label: "Choose crop type" }, ...CROP_TYPES]}
            onChange={(e) => changePaddock("cropType", e.target.value)}
            required
          />

          <InputField
            type="number"
            label="Crop area"
            value={paddock.hectares}
            onChange={(e) => changePaddock("hectares", e.target.value)}
            unit="ha"
            min={0.001}
            step="any"
            required
          />
        </div>

        <div className="grid grid-cols-2 items-end gap-3 @3xl:contents">
          <InputField
            type="number"
            label="Total yield / ha"
            value={crop.yieldKgDMHa}
            onChange={(e) => changeCrop("yieldKgDMHa", e.target.value)}
            unit="kgDM/ha"
            min={0.01}
            step="any"
            placeholder="Enter measured / estimated yield"
          />

          <InputField
            type="number"
            label="Target intake / animal"
            value={crop.kgDMPerAnimalDay}
            onChange={(e) => changeCrop("kgDMPerAnimalDay", e.target.value)}
            unit="kgDM/day"
            min={0.001}
            step="any"
          />
        </div>

        <div className="grid grid-cols-2 items-end gap-3 @3xl:contents">
          <SelectField
            label="Herd allocation"
            value={crop.herdId}
            options={[
              { value: "", label: "Choose herd" },
              ...farm.herds.map((herd) => ({
                value: herd.id,
                label: herd.name,
              })),
            ]}
            onChange={(e) => changeCrop("herdId", e.target.value)}
          />

          <InputField
            label="Feeding start date"
            type="date"
            value={crop.startDate}
            onChange={(e) => changeCrop("startDate", e.target.value)}
          />
        </div>

        {paddock.cropType === "Other" && (
          <InputField
            label="Other crop type"
            value={paddock.otherCropType}
            onChange={(e) => changePaddock("otherCropType", e.target.value)}
            required
          />
        )}
      </div>

      {result.valid ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Metric
              label={
                result.status === "scheduled"
                  ? "Feeding days available"
                  : "Estimated days remaining"
              }
              value={displayNumber(result.daysRemaining)}
              unit={
                result.status === "scheduled"
                  ? `Starts ${formatDate(crop.startDate)}`
                  : `As at ${formatDate(today)}`
              }
            />

            <Metric
              label="Estimated exhausted by"
              value={formatDate(result.finishDate)}
              unit={`Last feeding day: ${formatDate(result.lastFeedingDate)}`}
            />
          </div>

          <p className="mt-3 mb-0 text-caption leading-relaxed text-muted">
            ({displayNumber(crop.yieldKgDMHa, 0)} yield ×{" "}
            {displayNumber(paddock.hectares, 2)} ha) ÷ (
            {displayNumber(crop.kgDMPerAnimalDay, 2)} target/day ×{" "}
            {displayNumber(herd.animals, 0)} animals) − {result.elapsedDays}{" "}
            {result.elapsedDays === 1 ? "day" : "days"} since{" "}
            {formatDate(crop.startDate)} = {displayNumber(result.daysRemaining)}{" "}
            {result.daysRemaining === 1 ? "day" : "days"}
          </p>
        </>
      ) : (
        <Notice className="mt-6" variant="warning">
          Complete all boxes
        </Notice>
      )}
    </Card>
  );
}