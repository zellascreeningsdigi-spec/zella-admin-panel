import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleMaps, isMapsConfigured } from '@/lib/googleMapsLoader';

interface Props {
  latitude?: number;
  longitude?: number;
  /** Metres — drawn as a circle so the operator sees the gate they are setting. */
  radiusMeters: number;
  onChange: (lat: number, lng: number) => void;
}

// Fallback centre when no pin is set yet (central India), so the map opens on
// the country rather than the middle of the ocean at (0,0).
const FALLBACK = { lat: 22.9734, lng: 78.6569 };
const FALLBACK_ZOOM = 5;
const PINNED_ZOOM = 18;

/**
 * Optional map for placing or nudging the address pin by hand.
 *
 * Used when the searched address lands slightly off — common for gated
 * layouts and informal addresses, where Places returns the street or society
 * entrance rather than the specific door.
 */
const MapPinPicker = ({ latitude, longitude, radiusMeters, onChange }: Props) => {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // Keep the latest callback without re-initialising the map on every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // A click or drag on the map updates the parent's coordinates, which flow
  // straight back down as props. Without this flag the sync effect would then
  // re-centre and zoom to 18 under the operator's cursor, fighting the gesture
  // they just made. Set while the change originates from the map itself.
  const fromMapRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!isMapsConfigured()) {
      setStatus('error');
      setMessage('Map is not configured on this site. You can still search for the address above.');
      return;
    }
    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        // On a remount the loader's promise is already resolved, so this `.then`
        // can run in a microtask BEFORE React has committed the new DOM and
        // attached the ref. Returning here would leave status at 'loading'
        // forever (permanent spinner, map never usable again), so wait a frame
        // for the commit instead of giving up.
        if (!divRef.current) {
          requestAnimationFrame(() => { if (!cancelled) init(); });
          return;
        }
        init();
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(e?.message || 'Could not load the map.');
      });

    function init() {
      if (cancelled || !divRef.current) return;
      {
        const g = (window as any).google;
        // Defensive: the loader guarantees this, but a partially-initialised
        // API would otherwise throw inside an effect and blank the dialog.
        if (!g?.maps?.Map) {
          setStatus('error');
          setMessage('Google Maps did not finish loading. Please close and reopen the map.');
          return;
        }
        const hasPin = typeof latitude === 'number' && typeof longitude === 'number';
        const center = hasPin ? { lat: latitude!, lng: longitude! } : FALLBACK;

        const map = new g.maps.Map(divRef.current, {
          center,
          zoom: hasPin ? PINNED_ZOOM : FALLBACK_ZOOM,
          mapTypeId: 'hybrid', // satellite + labels: easier to identify a specific house
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
        });
        mapRef.current = map;

        const marker = new g.maps.Marker({
          position: center,
          map,
          draggable: true,
          visible: hasPin,
        });
        markerRef.current = marker;

        const circle = new g.maps.Circle({
          map,
          center,
          radius: radiusMeters,
          strokeColor: '#16a34a',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#16a34a',
          fillOpacity: 0.12,
          visible: hasPin,
        });
        circleRef.current = circle;

        const place = (lat: number, lng: number) => {
          marker.setPosition({ lat, lng });
          marker.setVisible(true);
          circle.setCenter({ lat, lng });
          circle.setVisible(true);
          fromMapRef.current = true;
          onChangeRef.current(lat, lng);
        };

        map.addListener('click', (e: any) => place(e.latLng.lat(), e.latLng.lng()));
        marker.addListener('dragend', (e: any) => place(e.latLng.lat(), e.latLng.lng()));

        setStatus('ready');
      }
    }

    return () => { cancelled = true; };
    // Initialised once; pin/radius updates are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect a pin chosen from the search box, or typed coordinates.
  useEffect(() => {
    if (status !== 'ready' || !markerRef.current) return;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      markerRef.current.setVisible(false);
      circleRef.current?.setVisible(false);
      return;
    }
    const pos = { lat: latitude, lng: longitude };
    markerRef.current.setPosition(pos);
    markerRef.current.setVisible(true);
    circleRef.current?.setCenter(pos);
    circleRef.current?.setVisible(true);

    // Only pan/zoom for a pin set elsewhere (search box, current location).
    // A map-originated change is already where the operator put it.
    if (fromMapRef.current) {
      fromMapRef.current = false;
      return;
    }
    mapRef.current?.setCenter(pos);
    if ((mapRef.current?.getZoom() ?? 0) < PINNED_ZOOM) mapRef.current?.setZoom(PINNED_ZOOM);
  }, [latitude, longitude, status]);

  // Keep the drawn circle in step with the chosen radius.
  useEffect(() => {
    if (status === 'ready') circleRef.current?.setRadius(radiusMeters);
  }, [radiusMeters, status]);

  if (status === 'error') {
    return (
      <div className="h-64 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center p-4">
        <p className="text-xs text-gray-600 text-center">{message}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={divRef} className="h-64 w-full rounded-md border border-gray-300" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-md">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      {status === 'ready' && (
        <p className="text-xs text-gray-500 mt-1">
          Click the map or drag the pin to adjust. The circle shows the area the candidate must be within.
        </p>
      )}
    </div>
  );
};

export default MapPinPicker;
