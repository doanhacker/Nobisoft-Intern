import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // ---- Base variants ----
        default:
          "bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/95",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",

        // ---- Brand variants (Indigo/Violet) ----
        /**
         * brand: gradient indigo→violet, main CTA button
         * Use for: primary search actions, key CTAs
         */
        brand:
          "gradient-brand text-white shadow-brand hover:shadow-brand hover:brightness-110 active:brightness-95 active:scale-[0.99] border-transparent",

        /**
         * brand-outline: indigo border & text, transparent bg
         * Use for: secondary CTAs alongside brand button
         */
        "brand-outline":
          "border-primary text-primary bg-transparent hover:bg-primary/8 active:bg-primary/12",

        /**
         * brand-ghost: subtle brand tint on hover
         * Use for: icon buttons, nav items in indigo context
         */
        "brand-ghost":
          "text-primary hover:bg-primary/10 active:bg-primary/15",

        /**
         * glow: gradient + glow effect for hero search button
         * Use for: THE main search submit button
         */
        glow:
          "gradient-brand glow-brand text-white font-semibold hover:brightness-110 hover:shadow-[0_0_32px_oklch(0.52_0.22_268/0.5),0_6px_20px_oklch(0.52_0.22_268/0.3)] active:brightness-95 active:scale-[0.99] border-transparent transition-shadow duration-200",

        /**
         * soft: very subtle muted background
         * Use for: filter toggles, chips, secondary nav
         */
        soft:
          "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 text-base",
        xl: "h-12 gap-2.5 px-6 text-base rounded-xl font-semibold tracking-wide [&_svg:not([class*='size-'])]:size-5",
        "2xl":
          "h-14 gap-3 px-8 text-lg rounded-xl font-semibold tracking-wide [&_svg:not([class*='size-'])]:size-6",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10",
        "icon-xl": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
