import type { Metadata } from "next";

import { NotificationMockups } from "@/components/mockups/notification-mockups";

export const metadata: Metadata = {
  title: "iOS Notification Mockups · AI Outage Concierge",
  robots: { index: false },
};

export default function MockupsPage() {
  return <NotificationMockups />;
}
