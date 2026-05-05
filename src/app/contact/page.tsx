import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.contact;

export default function ContactPage() {
  redirect("/support");
}
