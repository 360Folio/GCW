import { notFound } from "next/navigation";

// Any unknown address under /en or /ur shows the translated 404 page.
export default function CatchAll() {
  notFound();
}
