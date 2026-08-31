import { useForm } from 'react-hook-form'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage,
  Input, Button,
} from 'opus-dashboard-ui'

export const ClientForm = () => {
  const form = useForm({
    defaultValues: { name: 'Sofia Petrov', email: 'sofia@email.com' },
  })
  return (
    <Form {...form}>
      <form style={{ display: 'grid', gap: 18, maxWidth: 360 }}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormDescription>Shown on the booking confirmation.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button variant="default">Save client</Button>
      </form>
    </Form>
  )
}
