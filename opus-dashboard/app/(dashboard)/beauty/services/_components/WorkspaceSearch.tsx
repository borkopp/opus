import { SearchIcon, XIcon } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export function WorkspaceSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useDashboardI18n();

  return (
    <InputGroup className="h-11 w-full sm:max-w-sm">
      <InputGroupInput
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <InputGroupAddon align="inline-start">
        <SearchIcon />
      </InputGroupAddon>
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label={t("Clear search", "Исчисти пребарување")}
            size="icon-sm"
            onClick={() => onChange("")}
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
