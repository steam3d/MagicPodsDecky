import {
  afterPatch,
  findClassModule,
  findModuleDetailsByExport,
  findSP,
  Focusable,
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
// find Steam's header, patch its React output, then add a reactive slot after the battery.

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
const BOOTSTRAP_INTERVAL_MS = 500;
const BOOTSTRAP_TIMEOUT_MS = 10_000;
const BATTERY_SOURCE_MARKERS = [
  "#Header_BatteryFull",
  "#Header_BatteryPercentage",
  "#HeaderActions_PowerSettings",
  "BatteryIconVerticalStack",
];

type ReactFiber = {
  alternate?: ReactFiber | null;
  return?: ReactFiber | null;
  type?: unknown;
  elementType?: unknown;
  memoizedProps?: unknown;
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
  inserted: boolean;
};

type HeaderClasses = {
  HeaderItem: string;
  Clickable: string;
  Clock: string;
};

// Reuse Steam's header classes to get the native spacing, focus and text styles.
const headerClasses = findClassModule(
  (module) =>
    Boolean(
      module.Header &&
        module.HeaderItem &&
        module.Clickable &&
        module.Clock &&
        module.BatteryIconVerticalStack,
    ),
) as HeaderClasses | undefined;

const headerItemClassName = headerClasses
  ? `${headerClasses.HeaderItem} ${headerClasses.Clickable} ${headerClasses.Clock}`
  : undefined;

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

// Fiber access is needed only for Steam headers mounted before the plugin loads.
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

// Find Steam's real battery element without relying on hashed class names.
function isBatteryElement(element: Element): boolean {
  let fiber = getReactFiber(element);
  let hasBatteryProps = false;
  let hasBatterySourceMarker = false;

  for (let depth = 0; fiber && depth < 10; depth += 1) {
    const props = fiber.memoizedProps;
    if (props && typeof props === "object") {
      hasBatteryProps ||= "neverShowBatteryPercent" in props;
    }

    for (const component of [fiber.type, fiber.elementType]) {
      const source = componentSource(component);
      hasBatteryProps ||= source.includes("neverShowBatteryPercent");
      hasBatterySourceMarker ||= BATTERY_SOURCE_MARKERS.some((marker) =>
        source.includes(marker),
      );
    }

    if (hasBatteryProps && hasBatterySourceMarker) return true;
    fiber = fiber.return ?? undefined;
  }

  return false;
}

function findBatteryElement(doc: Document): HTMLElement | undefined {
  return Array.from(doc.querySelectorAll<HTMLElement>('[role="link"]')).find(
    isBatteryElement,
  );
}

// Recognize the battery wrapper inside the React tree returned by Steam's header.
function isBatteryWrapperElement(value: ReactNode): value is ReactElement {
  if (!isValidElement(value)) return false;
  const source = componentSource(value.type);
  return (
    source.includes("neverShowBatteryPercent") &&
    source.includes("sayFull") &&
    source.includes("IN_VR")
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

// Walk the returned React tree and immutably insert the slot after the battery.
function injectIconAfterBattery(
  node: ReactNode,
  icon: ReactElement,
): TreeInjectionResult {
  if (Array.isArray(node)) {
    const batteryIndex = node.findIndex(isBatteryWrapperElement);
    if (batteryIndex >= 0) {
      return {
        node: [
          ...node.slice(0, batteryIndex + 1),
          icon,
          ...node.slice(batteryIndex + 1),
        ],
        inserted: true,
      };
    }

    for (let index = 0; index < node.length; index += 1) {
      const result = injectIconAfterBattery(node[index], icon);
      if (result.inserted) {
        const children = [...node];
        children[index] = result.node;
        return { node: children, inserted: true };
      }
    }

    return { node, inserted: false };
  }

  if (!isValidElement(node)) return { node, inserted: false };
  const props = node.props as { children?: ReactNode };
  if (props.children === undefined) return { node, inserted: false };

  if (isBatteryWrapperElement(props.children)) {
    return {
      node: cloneElement(node, undefined, [props.children, icon]),
      inserted: true,
    };
  }

  const result = injectIconAfterBattery(props.children, icon);
  return result.inserted
    ? {
        node: cloneElement(node, undefined, result.node),
        inserted: true,
      }
    : { node, inserted: false };
}

// Locate the memoized Steam header export using stable source markers.
function isHeaderComponentExport(value: unknown): value is {
  type: (...args: unknown[]) => ReactNode;
} {
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
  let bootstrapInterval: number | undefined;
  let bootstrapTimeout: number | undefined;
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
  const liveFiberOriginalTypes = new Map<ReactFiber, unknown>();
  const preparedDocuments = new WeakSet<Document>();

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

    return createElement(Focusable, {
      ...({ [HOST_ATTRIBUTE]: "" } as Record<string, string>),
      "aria-label": state.ariaLabel,
      className: headerItemClassName,
      title: state.ariaLabel,
      onActivate: (event: CustomEvent) => {
        event.stopPropagation();
        try {
          getSnapshot().onActivate(surface);
        } catch (error) {
          console.error("[MagicPods] Header action failed", error);
        }
      },
      onOKActionDescription: state.ariaLabel,
      style: iconContainerStyle,
      children,
    });
  }

  // Patch future header renders and insert the slot into their returned React trees.
  try {
    const [, headerExport] =
      findModuleDetailsByExport(isHeaderComponentExport);

    if (headerExport && isHeaderComponentExport(headerExport)) {
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
              const injection = injectIconAfterBattery(result, icon);
              if (!injection.inserted && !didWarnAboutTree) {
                didWarnAboutTree = true;
                console.warn(
                  "[MagicPods] Steam header was found, but its battery subtree changed",
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
    if (!patch || preparedDocuments.has(doc)) return;
    const battery = findBatteryElement(doc);
    if (!battery) return;

    let fiber = getReactFiber(battery);
    for (let depth = 0; fiber && depth < 25; depth += 1) {
      if (isHeaderComponentSource(componentSource(fiber.type))) {
        for (const target of [fiber, fiber.alternate]) {
          if (target && target.type !== patch.patchedFunction) {
            liveFiberOriginalTypes.set(target, target.type);
            target.type = patch.patchedFunction;
          }
        }
        preparedDocuments.add(doc);
        return;
      }
      fiber = fiber.return ?? undefined;
    }
  };

  const prepareMountedHeaders = () => {
    getMountedHeaderDocuments().forEach(prepareMountedHeader);
  };

  // Search briefly for asynchronously mounted QAM/header documents, then stop polling.
  if (patch) {
    prepareMountedHeaders();
    bootstrapInterval = window.setInterval(
      prepareMountedHeaders,
      BOOTSTRAP_INTERVAL_MS,
    );
    bootstrapTimeout = window.setTimeout(() => {
      if (bootstrapInterval !== undefined) {
        window.clearInterval(bootstrapInterval);
        bootstrapInterval = undefined;
      }
    }, BOOTSTRAP_TIMEOUT_MS);
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

    publish(nextSnapshot);
  };

  // Hide the slot, restore modified Fibers and remove the Steam header patch.
  const dispose = () => {
    if (disposed) return;
    update({ visible: false });
    disposed = true;

    if (bootstrapInterval !== undefined) {
      window.clearInterval(bootstrapInterval);
    }
    if (bootstrapTimeout !== undefined) {
      window.clearTimeout(bootstrapTimeout);
    }

    liveFiberOriginalTypes.forEach((originalType, fiber) => {
      if (fiber.type === patch?.patchedFunction) fiber.type = originalType;
    });
    liveFiberOriginalTypes.clear();

    if (patch && !patch.hasUnpatched) patch.unpatch();
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
