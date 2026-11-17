import { useId } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function TaskSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  const labelId = useId();
  return <div className="ht-field">
    <span id={labelId}>{label}</span>
    <Select value={'value:' + value} onValueChange={option => onChange(option.slice('value:'.length))}>
      <SelectTrigger className="ht-select-trigger" aria-labelledby={labelId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="hermes-tasks ht-select-options" position="popper">
        {options.map(([key, caption]) => <SelectItem className="ht-select-item" value={'value:' + key} key={key}>{caption}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
