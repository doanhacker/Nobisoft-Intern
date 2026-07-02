
import { createFileRoute } from "@tanstack/react-router"
import { StyleGuide } from "../pages/StyleGuide"

export const Route = createFileRoute("/style-guide")({
  component: StyleGuide,
})
