import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const variants = cva('inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:opacity-50 disabled:pointer-events-none', { variants: { variant: { default: 'bg-orange-500 text-black hover:bg-orange-400', outline: 'border border-stone-600 text-white hover:bg-stone-800' } }, defaultVariants: { variant: 'default' } })
// shadcn/ui pattern: owned source, Radix Slot, cva, clsx and tailwind-merge.
export function Button({ className, variant, asChild = false, ...props }: ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button'
  return <Component className={twMerge(clsx(variants({ variant }), className))} {...props} />
}
