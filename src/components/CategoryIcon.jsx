const iconPaths = {
  politics: ["M4 9h16v2H4V9Zm2 3h2v6h2v-6h2v6h2v-6h2v6h2v2H4v-2h2v-6Zm6-9 8 4H4l8-4Z"],
  culture: [
    "M5 7.5c2 0 3.4.5 4.6 1.5 1.2-1 2.6-1.5 4.6-1.5 1 0 1.9.2 2.8.5v3.1c0 3-2.2 5.5-5.1 6.5l-2.3.8-2.3-.8C4.4 16.6 2.2 14.1 2.2 11.1V8c.9-.3 1.8-.5 2.8-.5Zm0 2c-.3 0-.6 0-.8.1v1.5c0 2 1.5 3.8 3.7 4.5l.7.2V11C7.7 10 6.6 9.5 5 9.5Zm9.2 0c-1.6 0-2.7.5-3.6 1.5v4.8l.7-.2c2.2-.7 3.7-2.5 3.7-4.5V9.6c-.2-.1-.5-.1-.8-.1Z",
    "M17.7 3.1 20.9 6l-1.4 1.5-1.7-1.6-5.7 6.3-1.5-1.3 5.7-6.4-1.1-1 1.3-1.5 1.2 1.1Z",
  ],
  sports: ["M7 4h10v2h3v3c0 2.4-1.7 4.4-4 4.9A5.1 5.1 0 0 1 13 16v2h3v2H8v-2h3v-2a5.1 5.1 0 0 1-3-2.1C5.7 13.4 4 11.4 4 9V6h3V4Zm2 2v4.5a3 3 0 0 0 6 0V6H9Zm-3 2v1c0 1 .5 1.9 1.3 2.4A5 5 0 0 1 7 10.5V8H6Zm11 0v2.5c0 .3 0 .6-.1.9A3 3 0 0 0 18 9V8h-1Z"],
  technology: ["M8 3h8v3h3v12h-3v3H8v-3H5V6h3V3Zm2 2v1h4V5h-4Zm-3 3v8h10V8H7Zm3 11h4v-1h-4v1Zm-1-8h6v2H9v-2Z"],
  science: ["M9 3h6v2h-1v4.2l4.7 7.9A2.5 2.5 0 0 1 16.5 21h-9a2.5 2.5 0 0 1-2.2-3.9L10 9.2V5H9V3Zm3 7-2.3 3.8h4.6L12 10Zm-3.9 6-1.1 1.9a.5.5 0 0 0 .5.8h9a.5.5 0 0 0 .5-.8L15.9 16H8.1Z"],
  history: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm1 2v4.6l3.1 1.8-1 1.7-4.1-2.4V7h2Z"],
  business: ["M9 4h6l1 2h4v13H4V6h4l1-2Zm1.2 2-.4.8h4.4l-.4-.8h-3.6ZM6 8v3h12V8H6Zm0 5v4h12v-4h-5v1h-2v-1H6Z"],
  ethics: ["M11 4h2v3h5v2h-2.1l2.4 5.2A3.5 3.5 0 0 1 12 16a3.5 3.5 0 0 1-6.3-1.8L8.1 9H6V7h5V4Zm-3 8.8h3.8L9.9 8.7 8 12.8Zm8 0-1.9-4.1-1.9 4.1H16ZM11 17h2v2h4v2H7v-2h4v-2Z"],
  education: ["M12 4 3 8l9 4 7-3.1V14h2V8L12 4Zm-5 7.2V15c0 1.8 2.2 3.3 5 3.3s5-1.5 5-3.3v-3.8l-5 2.2-5-2.2Zm2 1.1 3 1.3 3-1.3V15c0 .5-1.1 1.3-3 1.3S9 15.5 9 15v-2.7Z"],
  general: ["M4 5h16v14H4V5Zm2 2v10h12V7H6Zm2 2h8v2H8V9Zm0 4h5v2H8v-2Z"],
};

export function normalizeCategory(category = "General") {
  const lower = String(category).toLowerCase();
  return Object.keys(iconPaths).find((key) => lower.includes(key)) || "general";
}

export default function CategoryIcon({ category }) {
  const key = normalizeCategory(category);

  return (
    <span className="category-icon" data-category={key} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {iconPaths[key].map((path) => <path key={path} d={path} />)}
      </svg>
    </span>
  );
}
