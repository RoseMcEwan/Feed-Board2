import { Clock, LayoutGrid, Leaf } from "lucide-react";
import Brand from "../../primaryUI/Brand.jsx";

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh bg-canvas md:grid-cols-[47%_53%]">
      <section className="flex flex-col justify-between overflow-hidden bg-auth-panel px-6 py-5 md:p-7 lg:px-14 lg:pt-10 lg:pb-8">
        <Brand to="/" />

        <div className="pt-6 md:pt-16 md:pb-20 lg:pb-24">
          <p className="mb-1.5 text-tiny font-bold tracking-widest text-brand uppercase">MADE FOR YOUR FARM</p>

          <h1 className="mt-2.5 mb-0 text-4xl leading-tight font-semibold tracking-tighter text-heading md:mt-5 md:mb-6 md:text-hero">
            Know your balance.
            <br /> Build grazing calendar.
          </h1>

          <p className="hidden text-base leading-loose text-muted md:block">
            Your paddocks, herds and feed plans.
            <br />
            Build your grazing calendar from your round length.
          </p>

          <div className="mt-8 hidden gap-3 md:grid">
            <span className="flex items-center gap-2.5 text-caption text-green-herd">
              <Leaf aria-hidden="true" size={20} className="text-faint" />
              See your feed balance
            </span>

            <span className="flex items-center gap-2.5 text-caption text-green-herd">
              <Clock aria-hidden="true" size={20} className="text-faint" />
              Plan your timetable
            </span>

            <span className="flex items-center gap-2.5 text-caption text-green-herd">
              <LayoutGrid aria-hidden="true" size={20} className="text-faint" />
              Unique to your farm
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-2 text-tiny text-faint md:flex">
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-brand" />
          Built for dairy, sheep &amp; beef farms
        </div>
      </section>

      <main id="main" className="flex items-center justify-center px-6 pt-8 pb-12 md:p-8 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
