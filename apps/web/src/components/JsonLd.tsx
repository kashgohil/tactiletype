import { useEffect } from 'react';

/**
 * Injects a JSON-LD block for the lifetime of the mounting component.
 *
 * Rendering `<script>` from JSX is unreliable — React treats its children as
 * text but the tag never executes as a module, and on route change the old
 * block can linger. Managing the node by `id` in an effect keeps exactly one
 * block per key and guarantees it is removed when the page unmounts, so two
 * content routes can never both have their graph in the head at once.
 */
export function JsonLd({ id, data }: { id: string; data: unknown }) {
  const json = JSON.stringify(data);

  useEffect(() => {
    const elementId = `jsonld-${id}`;
    let el = document.getElementById(elementId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = elementId;
      document.head.appendChild(el);
    }
    el.textContent = json;

    return () => {
      document.getElementById(elementId)?.remove();
    };
  }, [id, json]);

  return null;
}
