// On-demand loader for the Google Maps JS API.
//
// The script is injected only when a map is actually opened, so case creation
// costs nothing for the common path where the operator just picks an address
// from the search box.
//
// Requires REACT_APP_GOOGLE_MAPS_API_KEY. That key is visible in the browser
// (unavoidable for the JS API), so it must be restricted by HTTP referrer to
// the admin-panel domain in the Google Cloud console, and should NOT be the
// same unrestricted key the backend uses for Places/Geocoding.

let loadPromise: Promise<void> | null = null;

export const mapsApiKey = (): string => process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

export const isMapsConfigured = (): boolean => mapsApiKey().length > 0;

/** Resolves once google.maps is usable. Repeat calls share one script tag. */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  // Check for the constructor, not just the namespace: with `loading=async`
  // google.maps can exist while Map is still undefined, and returning early
  // there is exactly what produces "g.maps.Map is not a constructor".
  if ((window as any).google?.maps?.Map) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = mapsApiKey();
  if (!key) return Promise.reject(new Error('Google Maps key is not configured.'));

  loadPromise = new Promise<void>((resolve, reject) => {
    // Google's script is a small BOOTSTRAP: at its onload it has only defined
    // google.maps.Load/modules and is still fetching the real main.js, so
    // neither google.maps.Map nor importLibrary exists yet. Resolving on
    // onload therefore hands callers a half-built namespace, which is what
    // produced "g.maps.Map is not a constructor".
    //
    // The `callback` parameter is the documented ready signal: Google invokes
    // it only once the API is fully initialised. It must be a global, so a
    // unique name is used and cleaned up afterwards.
    const cbName = `__zellaMapsReady_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    let settled = false;

    const cleanup = () => {
      try { delete (window as any)[cbName]; } catch { /* non-configurable: ignore */ }
    };

    (window as any)[cbName] = () => {
      if (settled) return;
      settled = true;
      cleanup();
      // Belt and braces: the callback fires when the API is ready, but verify
      // the constructor really is there before telling callers to proceed.
      if ((window as any).google?.maps?.Map) {
        resolve();
      } else {
        loadPromise = null;
        reject(new Error('Google Maps loaded but the maps library is unavailable.'));
      }
    };

    const script = document.createElement('script');
    // `loading=async` is what Google asks for when the script is injected this
    // way, and pairs with the callback above. No `libraries` param: this
    // component uses the core google.maps.Marker.
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&loading=async&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      // Allow a later retry rather than caching the failure forever, and drop
      // the failed tag: leaving it means a retry appends a second copy, and
      // Google warns (and misbehaves) when its API is included twice.
      script.remove();
      loadPromise = null;
      reject(new Error('Could not load Google Maps.'));
    };

    // The callback never firing (blocked network, auth failure that aborts
    // init) would otherwise leave the caller waiting on a permanent spinner.
    setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      loadPromise = null;
      reject(new Error('Google Maps timed out while loading. Check the API key and that the Maps JavaScript API is enabled.'));
    }, 15000);

    document.head.appendChild(script);
  });
  return loadPromise;
}
