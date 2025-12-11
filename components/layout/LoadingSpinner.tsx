/**
 * @component LoadingSpinner - Component to display a loading spinner
 * @description Renders a centered loading spinner with animation.
 * @author House Wolf Dev Team
 */
 export default function LoadingSpinner({
  size = 16,
  color = "purple-400",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div
        className={`animate-spin rounded-full h-${size} w-${size} border-t-2 border-b-2 border-${color}`}
      ></div>
      <p className="text-foreground-muted mt-4">Loading...</p>
    </div>
  );
}
