/**
 * DOM types
 */
type ContainerProperty = {
  _reactRootContainer?: FiberRoot;
  __reactContainer: Fiber; // RootFiber
};
type Container = (Document | HTMLElement) & ContainerProperty;
interface DOMEventNamesForReact {
  name: string;
}

type ListeningMarker = `__ListeningMarker__`;
declare const ListeningMarker = "ListeningMarker";
