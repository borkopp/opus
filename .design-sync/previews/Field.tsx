import {
  FieldGroup, Field, FieldLabel, FieldContent, FieldDescription, FieldError,
  FieldSet, FieldLegend, FieldSeparator, Input, Switch,
} from 'opus-dashboard-ui'

export const FormFields = () => (
  <FieldGroup style={{ maxWidth: 380 }}>
    <Field>
      <FieldLabel htmlFor="f-name">Service name</FieldLabel>
      <Input id="f-name" defaultValue="Men's Haircut" />
      <FieldDescription>Shown to clients in the booking flow.</FieldDescription>
    </Field>
    <Field>
      <FieldLabel htmlFor="f-price">Price</FieldLabel>
      <Input id="f-price" aria-invalid defaultValue="-5" />
      <FieldError>Price must be greater than zero.</FieldError>
    </Field>
  </FieldGroup>
)

export const HorizontalToggle = () => (
  <FieldSet style={{ maxWidth: 380 }}>
    <FieldLegend>Booking options</FieldLegend>
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="f-online">Accept online bookings</FieldLabel>
          <FieldDescription>Let clients book themselves 24/7.</FieldDescription>
        </FieldContent>
        <Switch id="f-online" defaultChecked />
      </Field>
      <FieldSeparator />
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="f-deposit">Require deposit</FieldLabel>
        </FieldContent>
        <Switch id="f-deposit" />
      </Field>
    </FieldGroup>
  </FieldSet>
)
