document$.subscribe(() => {
  // Prevent duplicate script injection
  if (document.querySelector('script[data-id="bce443d5-24a2-45bc-8615-60bdc29cee4b"]')) return;

  const script = document.createElement("script");
  script.src = "https://cdn.counter.dev/script.js";
  script.setAttribute("data-id", "bce443d5-24a2-45bc-8615-60bdc29cee4b");
  script.setAttribute("data-utcoffset", "8");
  document.body.appendChild(script);
});
