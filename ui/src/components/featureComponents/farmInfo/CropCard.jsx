import Card from "../../primaryUI/Card.jsx";
import { InputField, SelectField } from "../../primaryUI/FormFields.jsx";
import Notice from "../../primaryUI/Notice.jsx";
import Metric from "../../primaryUI/Metric.jsx";
import { CROP_TYPES } from "../../../data/farmDefaults.js";
import { displayNumber } from "../../../utilis/numbers.js";
import { formatDate } from "../../../utilis/calendarDates.js";

export default function CropCard({ crop, farm, onChange, today, metric }) {
  const paddock = farm.paddocks.find((paddock) => paddock.id === crop.paddockId);
  const herd = farm.herds.find((herd) => herd.id === crop.herdId);

  if (!paddock) return null;

  const changeCrop = (field, value) =>
    onChange({
      ...farm,
      crops: farm.crops.map((item) =>
        item.id === crop.id
          ? {
              ...item,
              [field]: value,
              ...(field === "cropType" && value !== "Other" ? { otherCropType: "" } : {}),
            }
          : item,
      ),
    });

  return (
    <Card className="@container border-t-3 border-t-crop [--field-control-size:var(--text-sm)] @sm:[--field-control-size:var(--text-base)]">
      <div className="mb-4">
        <p className="mb-1.5 text-tiny font-bold tracking-widest text-brand uppercase">CROP PADDOCK</p>
        <h3 className="mb-0 wrap-anywhere">{paddock.name}</h3>
      </div>

      <div className="grid gap-3 @3xl:grid-cols-3 @3xl:gap-4">
        <div className="grid grid-cols-2 items-end gap-3 @3xl:contents">
          <InputField type="number" label="Paddock area" value={paddock.hectares} unit="ha" disabled />
          <SelectField
            label="Crop type"
            value={crop.cropType ?? ""}
            options={[{ value: "", label: "Choose crop type" }, ...CROP_TYPES]}
            onChange={(e) => changeCrop("cropType", e.target.value)}
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
            required
          />

          <InputField
            type="number"
            label="Intake per animal"
            value={crop.kgDMPerAnimalDay}
            onChange={(e) => changeCrop("kgDMPerAnimalDay", e.target.value)}
            unit="kgDM/day"
            min={0.001}
            step="any"
            required
          />
        </div>

        <div className="grid grid-cols-2 items-end gap-3 @3xl:contents">
          <SelectField
            label="Herd allocation"
            value={crop.herdId}
            options={[
              { value: "", label: "Choose herd" },
              ...farm.herds.map((herd) => ({ value: herd.id, label: herd.name })),
            ]}
            onChange={(e) => changeCrop("herdId", e.target.value)}
            required
          />

          <InputField
            label="Feeding start date"
            type="date"
            value={crop.startDate}
            onChange={(e) => changeCrop("startDate", e.target.value)}
            required
          />
        </div>

        {crop.cropType === "Other" && (
          <InputField
            label="Other crop type"
            value={crop.otherCropType ?? ""}
            onChange={(e) => changeCrop("otherCropType", e.target.value)}
            required
          />
        )}
      </div>

      {metric?.valid ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Metric
              label={metric.status === "scheduled" ? "Feeding days available" : "Estimated days remaining"}
              value={displayNumber(metric.daysRemaining)}
              unit={
                metric.status === "scheduled" ? `Starts ${formatDate(crop.startDate)}` : `As at ${formatDate(today)}`
              }
            />

            <Metric
              label="Estimated exhausted by"
              value={formatDate(metric.finishDate)}
              unit={`Last feeding day: ${formatDate(metric.lastFeedingDate)}`}
            />
          </div>

          <p className="mt-3 mb-0 text-caption leading-relaxed text-muted">
            ({displayNumber(crop.yieldKgDMHa, 0)} yield × {displayNumber(paddock.hectares, 2)} ha) ÷ (
            {displayNumber(crop.kgDMPerAnimalDay, 2)} target/day × {displayNumber(herd?.animals, 0)} animals) −{" "}
            {metric.elapsedDays} {metric.elapsedDays === 1 ? "day" : "days"} since {formatDate(crop.startDate)} ={" "}
            {displayNumber(metric.daysRemaining)} {metric.daysRemaining === 1 ? "day" : "days"}
          </p>
        </>
      ) : metric ? (
        <Notice className="mt-6" variant="warning">
          Complete all boxes
        </Notice>
      ) : (
        <Notice className="mt-6">Calculating crop information…</Notice>
      )}
    </Card>
  );
}
