import * as React from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Simplistic standard button variants
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      default: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
      destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
      outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
      secondary: "bg-muted text-foreground hover:bg-muted/80",
      ghost: "hover:bg-muted hover:text-foreground",
      link: "text-primary-600 underline-offset-4 hover:underline",
    };
    
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    };

    return (
      <Comp
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
