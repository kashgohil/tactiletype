import React, { useEffect, useState } from 'react';
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
export const ReportPrintPortal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Guarded rather than created during render: this component is reachable
    // from the prerender build, where there is no document.
    const element = document.createElement('div');
    element.id = 'report-print-root';
    element.className = 'hidden';
    document.body.appendChild(element);
    setHost(element);

    return () => {
      element.remove();
    };
  }, []);

  if (!host) return null;
  return createPortal(children, host);
};
