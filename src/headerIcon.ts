import {
  afterPatch,
  findSP,
  findVar,
  getGamepadNavigationTrees,
  type Patch,
} from "@decky/ui";
import {
  cloneElement,
  createElement,
  isValidElement,
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

// The icon is inserted in three steps:
// find Steam's header, patch its React output, then add a reactive slot before the clock.

export type HeaderSurface = "qam" | "big-picture";

export type HeaderIconState = Readonly<{
  visible: boolean;
  surfaces: ReadonlySet<HeaderSurface>;
  icon: ReactNode;
  text?: string;
  ariaLabel: string;
  onActivate: (surface: HeaderSurface) => void;
}>;

export type HeaderIconOptions = {
  visible?: boolean;
  surfaces?: readonly HeaderSurface[];
  icon: ReactNode;
  text?: string;
  ariaLabel: string;
  onActivate: (surface: HeaderSurface) => void;
};

export type HeaderIconUpdate = Partial<HeaderIconOptions>;

export interface HeaderIconController {
  getSnapshot(): HeaderIconState;
  subscribe(listener: () => void): () => void;
  update(update: HeaderIconUpdate): void;
  setVisible(visible: boolean): void;
  setSurfaces(surfaces: readonly HeaderSurface[]): void;
  dispose(): void;
}

const HOST_ATTRIBUTE = "data-magicpods-header-icon";
const REACT_ELEMENT_KEY = "magicpods-header-icon";
const ALL_SURFACES: readonly HeaderSurface[] = ["qam", "big-picture"];
const HEADER_CHECK_INTERVAL_MS = 1000;
// React Fiber tags for FunctionComponent and SimpleMemoComponent.
const FUNCTION_COMPONENT_TAG = 0;
const SIMPLE_MEMO_COMPONENT_TAG = 15;

type ReactFiber = {
  alternate?: ReactFiber | null;
  return?: ReactFiber | null;
  tag?: number;
  type?: unknown;
  elementType?: unknown;
  memoizedState?: ReactHook | null;
};

type ReactHook = {
  memoizedState?: unknown;
  queue?: { dispatch?: (action: (value: unknown) => unknown) => void };
};

type DeckyPatchedFunction = Function & {
  __deckyOrig?: unknown;
  __deckyPatch?: { hasUnpatched?: boolean; original?: unknown };
};

type ReactFiberState = {
  tag?: number;
  type?: unknown;
};

type NavigationTree = {
  id?: string;
  m_ID?: string;
  Root?: { Element?: Element };
  m_Root?: { m_element?: Element };
  m_window?: Window;
};

type TreeInjectionResult = {
  node: ReactNode;
  containsClock: boolean;
  inserted: boolean;
};

type HeaderComponentExport = {
  type: (...args: unknown[]) => ReactNode;
};

type SteamHeaderItemProps = {
  description: string;
  vrTooltip?: string;
  onActivate?: (event: CustomEvent) => void;
  style?: CSSProperties;
  children?: ReactNode;
} & Record<string, unknown>;

type SteamHeaderItemComponent = (props: SteamHeaderItemProps) => ReactNode;
type SteamClockComponent = ReactElement["type"];

type MountedHeaderComponents = {
  headerFiber?: ReactFiber;
  headerExport?: HeaderComponentExport;
  headerItem?: SteamHeaderItemComponent;
  clock?: SteamClockComponent;
};

const iconContainerStyle: CSSProperties = {
  alignItems: "center",
  boxSizing: "border-box",
  cursor: "pointer",
  display: "flex",
  flex: "0 0 auto",
  gap: "6px",
  height: "40px",
  justifyContent: "center",
  minWidth: "40px",
  paddingInline: "10px",
};

const iconStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  fontSize: "20px",
  justifyContent: "center",
};

const textStyle: CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

export function formatHeaderPercentage(value: number): string {
  const finiteValue = Number.isFinite(value) ? value : 0;
  const percentage = Math.max(0, Math.min(99, Math.round(finiteValue)));
  return `${percentage}%`;
}

// Steam components are minified, so semantic strings in their source are used as markers.
function componentSource(value: unknown, depth = 0): string {
  if (depth > 3) return "";

  try {
    if (typeof value === "function") {
      const original = (value as DeckyPatchedFunction).__deckyOrig;
      if (original && original !== value) {
        const source = componentSource(original, depth + 1);
        if (source) return source;
      }
      return Function.prototype.toString.call(value);
    }

    if (value && typeof value === "object") {
      const wrapper = value as { type?: unknown; render?: unknown };
      return (
        componentSource(wrapper.type, depth + 1) ||
        componentSource(wrapper.render, depth + 1)
      );
    }
  } catch {
    // A foreign or revoked proxy must not interrupt Steam's render path.
  }

  return "";
}

// Decky may leave an inactive patch wrapper in a mounted Fiber after a reload.
function unwrapInactivePatch(value: unknown): unknown {
  let current = value;
  const visited = new Set<unknown>();

  while (typeof current === "function" && !visited.has(current)) {
    visited.add(current);
    const patched = current as DeckyPatchedFunction;
    if (!patched.__deckyPatch?.hasUnpatched) break;
    const original = patched.__deckyOrig ?? patched.__deckyPatch.original;
    if (!original || original === current) break;
    current = original;
  }

  return current;
}

// Steam's header owns a numeric refresh hook whose value is not rendered.
function requestHeaderRender(fiber: ReactFiber): void {
  const hook = fiber.memoizedState;
  const dispatch = hook?.queue?.dispatch;
  if (typeof hook?.memoizedState !== "number" || typeof dispatch !== "function")
    return;

  dispatch((value) => typeof value === "number" ? value + 1 : value);
}

// Fiber access lets an already mounted Steam header adopt the active patch.
function getReactFiber(element: Element): ReactFiber | undefined {
  const fiberProperty = Object.getOwnPropertyNames(element).find(
    (name) =>
      name.startsWith("__reactFiber$") ||
      name.startsWith("__reactInternalInstance$"),
  );

  return fiberProperty
    ? (element as unknown as Record<string, ReactFiber>)[fiberProperty]
    : undefined;
}

// The clock is the only direct header link with text, no accessible label and
// no graphical content.
// This avoids depending on its localized value or hashed CSS class.
function findClockElement(doc: Document): Element | undefined {
  const header = doc.getElementById("header");
  if (!header) return undefined;

  return Array.from(header.children).find(
    (element) =>
      element.getAttribute("role") === "link" &&
      !element.hasAttribute("aria-label") &&
      !element.querySelector("svg, img") &&
      Boolean(element.textContent?.trim()),
  );
}

// Prevent duplicate slots when Steam renders an already patched tree.
function reactTreeContainsIcon(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(reactTreeContainsIcon);
  if (!isValidElement(node)) return false;
  if (node.key === REACT_ELEMENT_KEY) return true;
  return reactTreeContainsIcon(
    (node.props as { children?: ReactNode }).children,
  );
}

// Walk the returned React tree and immutably insert the slot before the clock.
function injectIconBeforeClock(
  node: ReactNode,
  icon: ReactElement,
  clockComponents: ReadonlySet<SteamClockComponent>,
): TreeInjectionResult {
  if (isValidElement(node) && clockComponents.has(node.type)) {
    return { node, containsClock: true, inserted: false };
  }

  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index += 1) {
      const result = injectIconBeforeClock(
        node[index],
        icon,
        clockComponents,
      );
      if (result.inserted) {
        const children = [...node];
        children[index] = result.node;
        return { node: children, containsClock: true, inserted: true };
      }
      if (result.containsClock) {
        return {
          node: [...node.slice(0, index), icon, ...node.slice(index)],
          containsClock: true,
          inserted: true,
        };
      }
    }

    return { node, containsClock: false, inserted: false };
  }

  if (!isValidElement(node)) {
    return { node, containsClock: false, inserted: false };
  }
  const props = node.props as { children?: ReactNode };
  if (props.children === undefined) {
    return { node, containsClock: false, inserted: false };
  }

  const result = injectIconBeforeClock(
    props.children,
    icon,
    clockComponents,
  );
  return result.inserted
    ? {
        node: cloneElement(node, undefined, result.node),
        containsClock: true,
        inserted: true,
      }
    : { node, containsClock: result.containsClock, inserted: false };
}

// Locate the memoized Steam header export using stable source markers.
function isHeaderComponentExport(value: unknown): value is HeaderComponentExport {
  if (!value || typeof value !== "object") return false;
  const source = componentSource(
    (value as { type?: unknown; render?: unknown }).type ??
      (value as { render?: unknown }).render,
  );
  return isHeaderComponentSource(source);
}

function isHeaderComponentSource(source: string): boolean {
  return (
    source.includes("quickAccessHeader") &&
    source.includes("BShowHeader") &&
    source.includes("forcedAppID")
  );
}

// Steam's header item wrapper owns the hover, gamepad-focus and region-specific
// behavior used by the built-in interactive header buttons.
function isSteamHeaderItemComponent(
  value: unknown,
): value is SteamHeaderItemComponent {
  if (typeof value !== "function") return false;
  const source = componentSource(value);
  return (
    source.includes("description") &&
    source.includes("vrTooltip") &&
    source.includes("onActivate") &&
    source.includes("onOKActionDescription")
  );
}

// Big Picture and QAM may render their headers in different documents.
function getTreeDocument(tree: NavigationTree): Document | undefined {
  return (
    tree.Root?.Element?.ownerDocument ??
    tree.m_Root?.m_element?.ownerDocument ??
    tree.m_window?.document
  );
}

function getMountedHeaderDocuments(): Set<Document> {
  const documents = new Set<Document>();

  try {
    const mainDocument = findSP()?.document;
    if (mainDocument) documents.add(mainDocument);
  } catch {
    // The main navigation tree can appear after the plugin initializes.
  }

  try {
    const navigationTrees = getGamepadNavigationTrees();
    if (Array.isArray(navigationTrees)) {
      for (const tree of navigationTrees as NavigationTree[]) {
        const id = tree.id ?? tree.m_ID;
        if (
          id !== "QuickAccess-NA" &&
          id !== "GamepadUI_Full_Root" &&
          id !== "root_1_"
        ) {
          continue;
        }

        const treeDocument = getTreeDocument(tree);
        if (treeDocument) documents.add(treeDocument);
      }
    }
  } catch {
    // QAM navigation trees also appear asynchronously.
  }

  return documents;
}

function inspectMountedHeader(doc: Document): MountedHeaderComponents {
  const result: MountedHeaderComponents = {};
  const header = doc.getElementById("header");

  let fiber = header ? getReactFiber(header) : undefined;
  for (let depth = 0; fiber && depth < 15; depth += 1) {
    if (isHeaderComponentSource(componentSource(fiber.type))) {
      result.headerFiber = fiber;
      const headerExport = fiber.elementType;
      if (isHeaderComponentExport(headerExport)) {
        const descriptor = Object.getOwnPropertyDescriptor(
          headerExport,
          "type",
        );
        if (descriptor?.writable) result.headerExport = headerExport;
      }
      break;
    }
    fiber = fiber.return ?? undefined;
  }

  const clock = findClockElement(doc);
  fiber = clock ? getReactFiber(clock) : undefined;
  for (let depth = 0; fiber && depth < 10; depth += 1) {
    if (isSteamHeaderItemComponent(fiber.type)) {
      result.headerItem = fiber.type;
      const clockFiber = fiber.return;
      const clockComponent = clockFiber?.elementType ?? clockFiber?.type;
      if (clockComponent) {
        result.clock = clockComponent as SteamClockComponent;
      }
      break;
    }
    fiber = fiber.return ?? undefined;
  }

  return result;
}

// Recover the same components from the mounted header when findVar is
// unavailable, and capture the clock's exact React type for tree insertion.
function findMountedHeaderComponents(): MountedHeaderComponents {
  const result: MountedHeaderComponents = {};

  for (const doc of getMountedHeaderDocuments()) {
    const mounted = inspectMountedHeader(doc);
    result.headerExport ??= mounted.headerExport;
    result.headerItem ??= mounted.headerItem;
    result.clock ??= mounted.clock;
    if (result.headerExport && result.headerItem && result.clock) return result;
  }

  return result;
}

function equalSurfaces(
  left: ReadonlySet<HeaderSurface>,
  right: ReadonlySet<HeaderSurface>,
): boolean {
  return left.size === right.size && Array.from(left).every((item) => right.has(item));
}

function normalizeSurfaces(
  surfaces: readonly HeaderSurface[] | undefined,
): ReadonlySet<HeaderSurface> {
  return new Set(surfaces ?? ALL_SURFACES);
}

// Installs one Steam header patch and returns its state/lifecycle controller.
export function installHeaderIcon(
  options: HeaderIconOptions,
): HeaderIconController {
  let disposed = false;
  let patch: Patch | undefined;
  let headerCheckInterval: number | undefined;
  let didWarnAboutTree = false;
  let snapshot: HeaderIconState = {
    visible: options.visible ?? true,
    surfaces: normalizeSurfaces(options.surfaces),
    icon: options.icon,
    text: options.text,
    ariaLabel: options.ariaLabel,
    onActivate: options.onActivate,
  };

  const listeners = new Set<() => void>();
  const liveFiberOriginalStates = new Map<ReactFiber, ReactFiberState>();
  const mountedHeaderFibers = new Set<ReactFiber>();
  const mountedHeaderComponents = findMountedHeaderComponents();
  const clockComponents = new Set<SteamClockComponent>();
  if (mountedHeaderComponents.clock) {
    clockComponents.add(mountedHeaderComponents.clock);
  }
  let steamHeaderItem =
    (findVar(isSteamHeaderItemComponent) as
      | SteamHeaderItemComponent
      | undefined) ??
    mountedHeaderComponents.headerItem;
  if (!steamHeaderItem) {
    console.warn(
      "[MagicPods] Compatible Steam header item was not found; waiting for a mounted header",
    );
  }

  const getSnapshot = () => snapshot;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const publish = (nextSnapshot: HeaderIconState) => {
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  // Every injected slot subscribes to the same state and updates without repatching Steam.
  function HeaderIconSlot({
    surface,
  }: {
    surface: HeaderSurface;
  }): ReactElement | null {
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    if (!state.visible || !state.surfaces.has(surface)) return null;

    const children: ReactNode[] = [
      createElement(
        "span",
        { "aria-hidden": true, key: "icon", style: iconStyle },
        state.icon,
      ),
    ];
    if (state.text !== undefined) {
      children.push(
        createElement("span", { key: "text", style: textStyle }, state.text),
      );
    }

    if (!steamHeaderItem) return null;

    const onActivate = (event: CustomEvent) => {
      event.stopPropagation();
      try {
        getSnapshot().onActivate(surface);
      } catch (error) {
        console.error("[MagicPods] Header action failed", error);
      }
    };
    return createElement(steamHeaderItem, {
      ...({ [HOST_ATTRIBUTE]: "" } as Record<string, string>),
      description: state.ariaLabel,
      vrTooltip: state.ariaLabel,
      title: state.ariaLabel,
      onActivate,
      style: iconContainerStyle,
      children,
    });
  }

  // Patch future header renders and insert the slot into their returned React trees.
  try {
    const headerExport =
      (findVar(isHeaderComponentExport) as HeaderComponentExport | undefined) ??
      mountedHeaderComponents.headerExport;

    if (headerExport) {
      const descriptor = Object.getOwnPropertyDescriptor(headerExport, "type");
      if (descriptor?.writable) {
        patch = afterPatch(
          headerExport,
          "type",
          (args, result: ReactNode) => {
            try {
              if (!result || reactTreeContainsIcon(result)) return result;
              const props = args[0] as { quickAccessHeader?: boolean } | undefined;
              const surface: HeaderSurface = props?.quickAccessHeader
                ? "qam"
                : "big-picture";
              const icon = createElement(HeaderIconSlot, {
                key: REACT_ELEMENT_KEY,
                surface,
              });
              const injection = injectIconBeforeClock(
                result,
                icon,
                clockComponents,
              );
              if (
                !injection.inserted &&
                clockComponents.size > 0 &&
                !didWarnAboutTree
              ) {
                didWarnAboutTree = true;
                console.warn(
                  "[MagicPods] Steam header was found, but its clock subtree changed",
                );
              }
              return injection.node;
            } catch (error) {
              console.warn(
                "[MagicPods] Leaving the Steam header unchanged after an injection error",
                error,
              );
              return result;
            }
          },
        );
      }
    }
  } catch (error) {
    console.warn("[MagicPods] Could not patch Steam's header", error);
  }

  // Already mounted headers keep the old function in Fiber, so replace it temporarily.
  const prepareMountedHeader = (doc: Document) => {
    if (!patch) return;
    const mounted = inspectMountedHeader(doc);
    const fiber = mounted.headerFiber;
    if (!fiber) return;

    const clockAdded = Boolean(
      mounted.clock && !clockComponents.has(mounted.clock),
    );
    if (mounted.clock) clockComponents.add(mounted.clock);
    const headerItemAdded = Boolean(mounted.headerItem && !steamHeaderItem);
    steamHeaderItem ??= mounted.headerItem;

    let changed = false;
    for (const target of [fiber, fiber.alternate]) {
      if (
        target &&
        (target.type !== patch.patchedFunction ||
          target.tag === SIMPLE_MEMO_COMPONENT_TAG)
      ) {
        if (!liveFiberOriginalStates.has(target)) {
          liveFiberOriginalStates.set(target, {
            tag: target.tag,
            type:
              target.type === patch.patchedFunction
                ? patch.original
                : unwrapInactivePatch(target.type),
          });
        }
        target.type = patch.patchedFunction;
        if (target.tag === SIMPLE_MEMO_COMPONENT_TAG) {
          target.tag = FUNCTION_COMPONENT_TAG;
        }
        changed = true;
      }
    }
    if (changed || clockAdded || headerItemAdded) {
      mountedHeaderFibers.add(fiber);
      requestHeaderRender(fiber);
    }
  };

  const prepareMountedHeaders = () => {
    getMountedHeaderDocuments().forEach(prepareMountedHeader);
  };

  const startHeaderCheck = () => {
    if (!patch || disposed || headerCheckInterval !== undefined) return;
    prepareMountedHeaders();
    headerCheckInterval = window.setInterval(
      prepareMountedHeaders,
      HEADER_CHECK_INTERVAL_MS,
    );
  };

  const stopHeaderCheck = () => {
    if (headerCheckInterval === undefined) return;
    window.clearInterval(headerCheckInterval);
    headerCheckInterval = undefined;
  };

  // Steam may replace a mounted header Fiber when an app or QAM is opened.
  // Keep checking only while the custom header icon is visible.
  if (patch) {
    if (snapshot.visible) startHeaderCheck();
  } else {
    console.warn(
      "[MagicPods] Compatible Steam header export was not found; no icon was inserted",
    );
  }

  // Notify React only when the resulting icon state has actually changed.
  const update = (change: HeaderIconUpdate) => {
    if (disposed) return;

    const nextSnapshot: HeaderIconState = {
      visible: change.visible ?? snapshot.visible,
      surfaces:
        change.surfaces === undefined
          ? snapshot.surfaces
          : normalizeSurfaces(change.surfaces),
      icon: "icon" in change ? change.icon : snapshot.icon,
      text: "text" in change ? change.text : snapshot.text,
      ariaLabel: change.ariaLabel ?? snapshot.ariaLabel,
      onActivate: change.onActivate ?? snapshot.onActivate,
    };

    if (
      nextSnapshot.visible === snapshot.visible &&
      equalSurfaces(nextSnapshot.surfaces, snapshot.surfaces) &&
      Object.is(nextSnapshot.icon, snapshot.icon) &&
      nextSnapshot.text === snapshot.text &&
      nextSnapshot.ariaLabel === snapshot.ariaLabel &&
      nextSnapshot.onActivate === snapshot.onActivate
    ) {
      return;
    }

    const visibilityChanged = nextSnapshot.visible !== snapshot.visible;
    publish(nextSnapshot);

    if (visibilityChanged) {
      if (nextSnapshot.visible) startHeaderCheck();
      else stopHeaderCheck();
    }
  };

  // Hide the slot, restore modified Fibers and remove the Steam header patch.
  const dispose = () => {
    if (disposed) return;
    update({ visible: false });
    disposed = true;

    stopHeaderCheck();

    if (patch && !patch.hasUnpatched) patch.unpatch();

    liveFiberOriginalStates.forEach((originalState, fiber) => {
      if (fiber.type === patch?.patchedFunction) {
        fiber.type = originalState.type;
        fiber.tag = originalState.tag;
      }
    });
    mountedHeaderFibers.forEach(requestHeaderRender);
    liveFiberOriginalStates.clear();
    mountedHeaderFibers.clear();
    listeners.clear();
  };

  return {
    getSnapshot,
    subscribe,
    update,
    setVisible: (visible) => update({ visible }),
    setSurfaces: (surfaces) => update({ surfaces }),
    dispose,
  };
}
