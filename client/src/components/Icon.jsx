const paths = {
  droplet: 'M12 3c3 4.2 6 7.2 6 10.5a6 6 0 0 1-12 0C6 10.2 9 7.2 12 3z',
  bread: 'M4 11a4 4 0 0 1 3-6.7c1.4-1 3.2-1 5 0 1.8-1 3.6-1 5 0A4 4 0 0 1 20 11v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z',
};
export default function Icon({ name, size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d={paths[name] || paths.heart} />
    </svg>
  );
}
