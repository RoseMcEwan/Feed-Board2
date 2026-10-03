import CropCard from "./CropCard.jsx";
import Notice from "../../primaryUI/Notice.jsx";

export default function CropsEditor({ farm, onChange, today }) {
  return (
    <div className="grid min-w-0 gap-5">
      {farm.crops.length ? (
        farm.crops.map((crop) => (
          <CropCard
            key={crop.id}
            crop={crop}
            farm={farm}
            today={today}
            onChange={onChange}
          />
        ))
      ) : (
        <Notice>
          No crop paddocks yet. On Paddocks, tick “Exclude” and choose a crop.
        </Notice>
      )}
    </div>
  );
}
