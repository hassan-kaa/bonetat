"use client";

export default function AutoSubmitSelect({
  id, name, defaultValue, options,
}: { id: string; name: string; defaultValue: string; options: { value: string; label: string }[] }) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="h-11 rounded-xl border-[1.5px] border-line-strong bg-white px-3 text-sm text-ink outline-none focus:border-brand"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
