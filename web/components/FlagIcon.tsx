import ReactCountryFlag from "react-country-flag";

export type FlagCode = "CN" | "ES" | "FR" | "JP";

export function FlagIcon({
  code,
  label,
  className,
}: {
  code: FlagCode;
  label: string;
  className?: string;
}) {
  return (
    <ReactCountryFlag
      aria-label={`${label} flag`}
      countryCode={code}
      svg
      className={className}
      title={`${label} flag`}
    />
  );
}
