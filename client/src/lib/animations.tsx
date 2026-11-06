import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode } from "react";

// Animation duration constants
export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.4,
};

// Common animation variants
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// Stagger animation for lists
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: "easeOut",
    }
  },
};

// Page transition wrapper
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: ANIMATION_DURATION.normal, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Card animation wrapper
export function AnimatedCard({ 
  children, 
  delay = 0,
  className = "" 
}: { 
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: ANIMATION_DURATION.normal, 
        delay,
        ease: "easeOut" 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// List animation wrapper
export function AnimatedList({ 
  children,
  className = ""
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// List item animation wrapper
export function AnimatedListItem({ 
  children,
  className = ""
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Number counter animation
export function AnimatedNumber({ 
  value, 
  duration = ANIMATION_DURATION.slow 
}: { 
  value: number;
  duration?: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: ANIMATION_DURATION.fast }}
    >
      <motion.span
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 15,
          duration 
        }}
      >
        {value.toLocaleString()}
      </motion.span>
    </motion.span>
  );
}

// Skeleton loading animation
export function AnimatedSkeleton({ 
  className = "",
  width = "100%",
  height = "20px"
}: { 
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <motion.div
      className={`bg-muted rounded ${className}`}
      style={{ width, height }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Pulse animation for status indicators
export function PulseIndicator({ 
  color = "green",
  size = 8
}: { 
  color?: string;
  size?: number;
}) {
  const colorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  return (
    <span className="relative inline-flex">
      <motion.span
        className={`absolute inline-flex h-${size} w-${size} rounded-full ${colorClasses[color as keyof typeof colorClasses]} opacity-75`}
        animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <span className={`relative inline-flex h-${size} w-${size} rounded-full ${colorClasses[color as keyof typeof colorClasses]}`} />
    </span>
  );
}

// Success checkmark animation
export function SuccessCheckmark({ size = 24 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 15 
      }}
    >
      <motion.path
        d="M5 12l5 5L20 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ 
          duration: ANIMATION_DURATION.slow,
          ease: "easeOut",
          delay: ANIMATION_DURATION.fast 
        }}
      />
    </motion.svg>
  );
}

// Error shake animation
export function ErrorShake({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={{ x: [0, -10, 10, -10, 10, 0] }}
      transition={{ 
        duration: ANIMATION_DURATION.slow,
        ease: "easeInOut" 
      }}
    >
      {children}
    </motion.div>
  );
}

// Loading spinner
export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <motion.div
      className="inline-block"
      animate={{ rotate: 360 }}
      transition={{ 
        duration: 1,
        repeat: Infinity,
        ease: "linear" 
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="60"
          strokeDashoffset="20"
          className="opacity-25"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="60"
          strokeDashoffset="60"
        />
      </svg>
    </motion.div>
  );
}