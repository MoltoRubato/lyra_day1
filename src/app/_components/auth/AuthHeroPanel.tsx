"use client";

function TileOne() {
  return (
    <div className="relative h-[124px] rounded-[14px] bg-gradient-to-br from-[#3d3f44] to-[#212431]">
      <div className="absolute inset-0 bg-[linear-gradient(160deg,transparent_35%,rgba(168,187,255,0.2)_36%,transparent_40%)]" />
      <div className="absolute bottom-3 right-3 h-7 w-7 rounded-full border-4 border-[#ff9557] border-dotted" />
    </div>
  );
}

function TileTwo() {
  return (
    <div className="relative h-[124px] rounded-[14px] bg-[#de94e2]">
      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-8 border-[#f8d6f4] border-dotted" />
      <div className="absolute left-[42%] top-[46%] h-2 w-2 rounded-full bg-[#d61f9a]" />
      <div className="absolute left-[56%] top-[46%] h-2 w-2 rounded-full bg-[#d61f9a]" />
    </div>
  );
}

function TileThree() {
  return (
    <div className="relative h-[124px] overflow-hidden rounded-[14px] bg-[#bb4f34]">
      <div className="absolute left-3 top-3 h-4 w-[108px] rounded bg-white/95" />
      <div className="absolute bottom-3 left-3 h-[56px] w-14 rounded bg-[#f5eee8]" />
      <div className="absolute bottom-3 left-[74px] h-[56px] w-14 rounded bg-[#f0c9b3]" />
      <div className="absolute bottom-3 right-3 h-7 w-7 rounded-full border-4 border-[#ff9557] border-dotted" />
    </div>
  );
}

function TileFour() {
  return (
    <div className="relative h-[124px] overflow-hidden rounded-[14px] bg-[#f8c7ad]">
      <div className="absolute left-2 top-2 h-8 w-12 rounded bg-white/90" />
      <div className="absolute right-4 top-4 h-12 w-12 rounded-full bg-[#86524a]" />
      <div className="absolute bottom-3 right-4 h-8 w-8 rounded-full border-4 border-[#ff9557] border-dotted" />
    </div>
  );
}

function TileFive() {
  return (
    <div className="relative h-[124px] rounded-[14px] bg-[#dff2d8] p-3">
      <div className="h-4 w-20 rounded bg-white/90" />
      <div className="mt-3 h-3 w-24 rounded bg-[#cbebbf]" />
      <div className="mt-3 h-3 w-20 rounded bg-[#cbebbf]" />
      <div className="absolute bottom-3 right-3 h-7 w-7 rounded-full border-4 border-[#79cd79] border-dotted" />
    </div>
  );
}

function TileSix() {
  return (
    <div className="relative h-[124px] overflow-hidden rounded-[14px] bg-[#2f3442]">
      <div className="absolute left-1/2 top-1/2 h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4b5161]" />
      <div className="absolute bottom-3 right-3 h-7 w-7 rounded-full border-4 border-[#ffcc42] border-dotted" />
      <div className="absolute right-2 top-6 h-5 w-5 rounded-full bg-[#efc67a]" />
      <div className="absolute left-2 top-8 h-5 w-5 rounded-full bg-[#7a8cc7]" />
    </div>
  );
}

export function AuthHeroPanel() {
  return (
    <aside className="hidden w-full max-w-[460px] rounded-[24px] bg-[#4a0055] p-11 text-white lg:flex lg:flex-col">
      <h2 className="max-w-[320px] text-[32px] font-semibold leading-[1.18]">
        Meet Omni, your AI collaborator for building custom apps.
      </h2>

      <button
        type="button"
        className="mt-8 inline-flex h-[44px] w-fit items-center rounded-[11px] bg-white px-6 text-[15px] font-semibold text-[#1f2937]"
      >
        Start building
      </button>

      <div className="mt-12 grid grid-cols-3 gap-4">
        <TileOne />
        <TileTwo />
        <TileThree />
        <TileFour />
        <TileFive />
        <TileSix />
      </div>
    </aside>
  );
}
