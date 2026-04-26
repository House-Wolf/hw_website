interface FleetFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  manufacturer: string;
  setManufacturer: (value: string) => void;
  manufacturers: string[];
  classification: string;
  setClassification: (value: string) => void;
  classifications: string[];
}

export default function FleetFilters({
  search,
  setSearch,
  manufacturer,
  setManufacturer,
  manufacturers,
  classification,
  setClassification,
  classifications,
}: FleetFiltersProps) {
  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search ships, models, manufacturers..."
          className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-700"
        />

        <select
          value={manufacturer}
          onChange={(event) => setManufacturer(event.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-red-700"
        >
          {manufacturers.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select
          value={classification}
          onChange={(event) => setClassification(event.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-red-700"
        >
          {classifications.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
    </div>
  );
}