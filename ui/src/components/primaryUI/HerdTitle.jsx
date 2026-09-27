export default function HerdTitle({ herd }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-herd-colour={herd.colour}
    >
      <span
        aria-hidden="true"
        className="inline-block size-2.25 rounded-full bg-herd"
      />

      <h2 className="m-0 text-lg">{herd.name}</h2>

      <span className="rounded-sm bg-herd-soft px-1.5 py-0.5 text-micro text-herd">
        {Number(herd.animals ?? 0).toLocaleString("en-NZ")} animals
      </span>
    </div>
  ); 
}
