const CAMPAIGN_COLOURS = [
  { name: 'Tuna Purple', value: '#8400FF' },
  { name: 'Deep Current', value: '#3100E4' },
  { name: 'Night Club Purple', value: '#6D45FF' },
  { name: 'Bonito Violet', value: '#B37DFF' },
  { name: 'Bruised Purple', value: '#837DC3' },
] as const;

type CampaignColourFieldProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>;

function CampaignColourField({ value, onChange, disabled = false }: CampaignColourFieldProps) {
  return (
    <fieldset className="campaign-colour-field">
      <legend>Campaign colour</legend>

      <div className="campaign-colour-options">
        {CAMPAIGN_COLOURS.map((colour) => (
          <label className="campaign-colour-option" key={colour.value}>
            <input
              type="radio"
              name="campaign-colour"
              disabled={disabled}
              value={colour.value}
              checked={value === colour.value}
              onChange={() => {
                onChange(colour.value);
              }}
            />
            <span
              className="campaign-colour-option__swatch"
              style={{ backgroundColor: colour.value }}
              aria-hidden="true"
            />
            <span>{colour.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default CampaignColourField;
