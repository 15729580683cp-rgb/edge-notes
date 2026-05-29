import type { ReactNode } from "react";

import type { DrawerState } from "../../types/editor";

export function WindowFrame({
  children,
  drawerState,
}: {
  children: ReactNode;
  drawerState: DrawerState;
}) {
  return (
    <section className={`window-frame drawer-${drawerState}`} data-drawer-state={drawerState}>
      {children}
    </section>
  );
}
