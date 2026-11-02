/** Text with a light sweep passing through it (React Bits "Shiny Text"). */
export default function ShinyText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`animate-shine bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: 'linear-gradient(110deg, rgb(var(--c-fg3)) 35%, rgb(var(--c-accent)) 50%, rgb(var(--c-fg3)) 65%)',
        backgroundSize: '200% 100%',
      }}
    >
      {children}
    </span>
  );
}
