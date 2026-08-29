import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/registry/ui/field"
import { Input } from "@/registry/ui/input"

export function InputFile() {
  return (
    <Field>
      <FieldLabel htmlFor="picture">Picture</FieldLabel>
      <Input id="picture" type="file" />
      <FieldDescription>Select a picture to upload.</FieldDescription>
    </Field>
  )
}
