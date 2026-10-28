const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
export default function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <span className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white" style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue} 70% 48%), hsl(${(hue + 40) % 360} 70% 40%))` }} aria-hidden="true">{initials(name)}</span>;
}

