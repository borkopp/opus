import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, CalendarIcon, MessageSquare, Wand, Trash } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export function GreetingHeader({ profile }: { profile: any }) {
  const today = new Date();
  const seedMockData = useMutation(api.dev.seedMockData);
  const clearMockData = useMutation(api.dev.clearMockData);

  const handleSeedData = async () => {
    if (!profile?.orgId) {
      toast.error("Organisation not found");
      return;
    }

    try {
      const promise = seedMockData({ orgId: profile.orgId, targetDateMs: Date.now() });
      toast.promise(promise, {
        loading: 'Seeding mock dashboard data...',
        success: (data) => `Added ${data.totalBookings} bookings, ${data.totalCustomers} customers.`,
        error: 'Failed to seed data',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearData = async () => {
    if (!profile?.orgId) {
      toast.error("Organisation not found");
      return;
    }

    try {
      const promise = clearMockData({ orgId: profile.orgId });
      toast.promise(promise, {
        loading: 'Clearing mock dashboard data...',
        success: (data) => `Cleared ${data.deletedBookingsCount} bookings, ${data.deletedCustomersCount} customers, ${data.deletedConvosCount} AI conversations.`,
        error: 'Failed to clear mock data',
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between w-full  relative z-10">
      <div className="flex items-center gap-4 lg:gap-6 w-full lg:w-auto">
        <div className="flex flex-col items-center justify-center bg-card rounded-[24px] shadow-s dark:shadow-l w-16 h-16 lg:w-20 lg:h-20 shrink-0">
          <span className="font-outfit text-xl lg:text-3xl font-bold leading-none">{format(today, "dd")}</span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-md font-semibold">{format(today, "EEEE")}</span>
          <span className="text-md text-muted-foreground">{format(today, "MMMM")}</span>
        </div>
        {/* <div className="hidden lg:flex h-10 w-[1px] bg-border mx-2"></div> */}

      </div>

      <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
        <Button onClick={handleClearData} variant="outline" className="rounded-full shadow-sm font-semibold border-destructive/40 text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors">
          <Trash className="h-4 w-4" />
        </Button>
        <Button onClick={handleSeedData} variant="outline" className="rounded-full shadow-sm font-semibold border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
          <Wand className="h-4 w-4" />
        </Button>
        <Button variant="terracotta" className="rounded-full shadow-md px-6 py-6 hidden items-center justify-center lg:flex">
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>
    </div>
  );
}
