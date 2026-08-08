import type React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Hosts the report as a direct child of <body> for the duration of a print.
 *
 * Printing in place doesn't work: the sheet sits deep inside the page, and the
 * usual `visibility: hidden` trick leaves every ancestor's box occupying space,
 * so the PDF opens on blank pages. As a body child it can be isolated with one
 * rule and paginates as ordinary static content.
 *
 * Mounted only while a print is in flight, so an ordinary Ctrl+P on the
 * analytics page still prints the page.
 */
export const ReportPrintPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Built *and attached* during render, which is unusual enough to explain.
  //
  // The report measures itself to paginate, from a layout effect. React runs
  // layout effects bottom-up, so the child measures before this component's own
  // effects run — and an element that is not yet in the document reports every
  // offsetWidth and offsetHeight as 0. Attaching from an effect therefore gave
  // the child nothing to measure: it fell back to one unpaginated page, which
  // printed with no footers and blocks split across sheets.
  //
  // Parked off-screen rather than `display: none` for the same reason: a
  // display:none subtree has no layout either. The print block in index.css
  // returns it to the flow.
  //
  // `null` on the server, where this is reachable from the prerender build.
  // Creates and attaches, and does nothing else. Development double-invokes
  // this initializer, so it must not touch anything outside the element it
  // returns: removing "the existing host" here detached the very node React
  // went on to keep, and the dialog printed a blank page.
  const [host] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const element = document.createElement('div');
    element.id = 'report-print-root';
    element.style.cssText = 'position:absolute;top:0;left:-10000px;width:210mm';
    document.body.appendChild(element);
    return element;
  });

  useEffect(() => {
    if (!host) return;

    // Whichever element React kept is the real one; a twin from the doubled
    // initializer is discarded here, where it is safe to do so.
    document.querySelectorAll('#report-print-root').forEach((element) => {
      if (element !== host) element.remove();
    });
    // Cheap insurance: measurement needs this in the document.
    if (!host.isConnected) document.body.appendChild(host);

    return () => {
      host.remove();
    };
  }, [host]);

  if (!host) return null;
  return createPortal(children, host);
};
