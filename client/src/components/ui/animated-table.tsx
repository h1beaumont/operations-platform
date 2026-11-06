import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReactNode } from "react";

// Animation variants for table rows
const tableRowVariants = {
  initial: { 
    opacity: 0, 
    y: 10 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: 0.2
    }
  }
};

// Stagger container for table body
const tableBodyVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    }
  }
};

// Animated Table Row component
export function AnimatedTableRow({ 
  children, 
  className,
  ...props 
}: { 
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <motion.tr
      variants={tableRowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...props}
    >
      {children}
    </motion.tr>
  );
}

// Animated Table Body component
export function AnimatedTableBody({ 
  children, 
  className,
  ...props 
}: { 
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <motion.tbody
      variants={tableBodyVariants}
      initial="initial"
      animate="animate"
      className={className}
      {...props}
    >
      {children}
    </motion.tbody>
  );
}

// Export regular table components for convenience
export { Table, TableCell, TableHead, TableHeader };