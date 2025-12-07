"use client";

import { motion } from "framer-motion";

/**
 * @component MotionFadeIn
 * @description A wrapper component that applies a fade-in animation to its children when they come into view.
 * @param children - The child components to be wrapped and animated. 
 * @returns {JSX.Element} The wrapped and animated children.
 * @author House Wolf Dev Team
 */
export default function MotionFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  );
}
