import {
  Component,
  inject,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../shared/icon.component';
import { BackendService, CommunityImpact, Place } from '../../core/backend.service';
import { MapsService } from '../../core/maps.service';
import { reportStatus } from '../../core/report-status';
import { startDictation } from '../../core/dictation';
import { SpeechService } from '../../core/speech.service';
import { preciseLocation } from '../../core/precise-location';
import { RevealDirective } from '../../shared/reveal.directive';
@Component({
  selector: 'app-map',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, IconComponent, RevealDirective],
  templateUrl: './map.component.html',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  backend = inject(BackendService);
  maps = inject(MapsService);
  zone = inject(NgZone);
  private changes = inject(ChangeDetectorRef);
  private speech = inject(SpeechService);
  @ViewChild('reportVideo') video?: ElementRef<HTMLVideoElement>;
  photo = '';
  cameraActive = false;
  cameraOpening = false;
  cameraError = '';
  accuracy: number | null = null;
  locationSource: 'gps' | 'manual' | 'reported' | null = null;
  locationConfirmed = false;
  adjustingLocation = false;
  private cancelLocation?: () => void;
  private cancelMapLocation?: () => void;
  private accuracyCircle?: google.maps.Circle;
  private currentLocationMarker?: google.maps.marker.AdvancedMarkerElement;
  private stream?: MediaStream;
  private cameraRequest = 0;
  private locationRequest = 0;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private refreshing?: Promise<void>;
  readonly categories: Record<string, string> = {
    no_ramp: 'Falta de rampa', blocked_sidewalk: 'Vereda obstruida',
    stairs: 'Escaleras sin alternativa', narrow_access: 'Acceso muy estrecho',
    damaged_surface: 'Superficie en mal estado', other: 'Otra barrera',
  };
  @ViewChild('map') mapElement!: ElementRef<HTMLDivElement>;
  @ViewChild('reportDialog') dialog!: ElementRef<HTMLDialogElement>;
  places: Place[] = [];
  loading = true;
  mapError = '';
  error = '';
  success = '';
  search = '';
  filter = 'all';
  categoryFilter = 'all';
  impact?: CommunityImpact;
  feedbackPlaceId = '';
  nearby: Array<Place & { distance: number }> = [];
  nearbyLoading = false;
  nearbyError = '';
  status = reportStatus;
  map?: google.maps.Map;
  markers: google.maps.marker.AdvancedMarkerElement[] = [];
  selected?: google.maps.marker.AdvancedMarkerElement;
  private destroyed = false;
  private recognition: ReturnType<typeof startDictation> = null;
  form = {
    name: '',
    latitude: null as number | null,
    longitude: null as number | null,
    category: 'other',
    description: '',
  };
  saving = false;
  formError = '';
  locating = false;
  mapLocating = false;
  mapLocationError = '';
  listening = false;
  get filtered() {
    return this.places.filter(
      (p) =>
        p.name.toLowerCase().includes(this.search.toLowerCase()) &&
        (this.filter === 'all' ||
          this.status(p.report_count).level === this.filter) &&
        (this.categoryFilter === 'all' ||
          (p.categories ?? []).includes(this.categoryFilter)),
    );
  }
  get total() {
    return this.places.reduce((n, p) => n + Number(p.report_count), 0);
  }
  get hotspots() {
    return this.places.slice(0, 3).map(place => place.name).join(' · ');
  }
  async ngAfterViewInit() {
    void this.refresh();
    try {
      const mapId = await this.maps.load();
      if (this.destroyed) return;
      this.map = new google.maps.Map(this.mapElement.nativeElement, {
        center: { lat: -12.0464, lng: -77.0428 },
        zoom: 14,
        mapId,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'cooperative',
      });
      this.map.addListener('click', (e: google.maps.MapMouseEvent) =>
        this.zone.run(() => {
          if (e.latLng) {
            this.form.latitude = Number(e.latLng.lat().toFixed(6));
            this.form.longitude = Number(e.latLng.lng().toFixed(6));
            this.manualLocation();
            if (this.adjustingLocation) this.resumeReport();
          }
        }),
      );
      this.renderMarkers();
      this.markSelection();
    } catch (e) {
      if (!this.destroyed) this.mapError = (e as Error).message;
    }
    if (!this.destroyed) this.refreshTimer = setInterval(() => {
      if (!document.hidden) void this.refresh(true);
    }, 30000);
  }
  refresh(background = false): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    if (this.refreshing) {
      return background ? this.refreshing : this.refreshing.then(() => this.refresh());
    }
    const task = this.loadPlaces(background);
    this.refreshing = task;
    void task.finally(() => { if (this.refreshing === task) this.refreshing = undefined; });
    return task;
  }
  private async loadPlaces(background: boolean) {
    if (!background) this.loading = true;
    this.error = '';
    try {
      const places = await this.backend.places();
      if (this.destroyed) return;
      this.places = places;
      this.renderMarkers();
      try {
        this.impact = await this.backend.communityImpact();
      } catch {
        // The map stays useful while a project is being upgraded with the
        // optional impact migration.
        this.impact = undefined;
      }
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }
  renderMarkers() {
    if (!this.map) return;
    this.markers.forEach((m) => (m.map = null));
    this.markers = this.filtered.map((p) => {
      const badge = document.createElement('span');
      badge.className = 'map-badge ' + this.status(p.report_count).level;
      badge.textContent = '⚠ ' + p.report_count;
      const m = new google.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position: { lat: p.latitude, lng: p.longitude },
        content: badge,
        title:
          p.name +
          ': ' +
          p.report_count +
          ' reportes. ' +
          this.status(p.report_count).label + '. ' +
          (p.categories ?? []).map(c => this.categories[c] || c).join(', '),
      });
      m.addListener('click', () => this.zone.run(() => this.openReport(p)));
      return m;
    });
  }
  async confirmPlace(place: Place, state: 'present' | 'resolved') {
    if (this.feedbackPlaceId) return;
    this.feedbackPlaceId = place.id;
    this.error = '';
    try {
      await this.backend.feedback(place.id, state);
      this.success = state === 'present'
        ? 'Confirmaste que la barrera sigue presente. Gracias por mantener el mapa actualizado.'
        : 'Registraste una mejora resuelta. Gracias por compartir la actualización.';
      await this.refresh();
      this.speech.read(this.success);
    } catch (e) {
      this.error = (e as Error).message;
      this.speech.read(this.error);
    } finally {
      this.feedbackPlaceId = '';
    }
  }
  findNearby() {
    this.nearbyError = '';
    if (!navigator.geolocation) {
      this.nearbyError = 'Tu navegador no permite buscar barreras cercanas.';
      return;
    }
    this.nearbyLoading = true;
    navigator.geolocation.getCurrentPosition(
      (position) => this.zone.run(() => {
        const { latitude, longitude } = position.coords;
        this.nearby = this.places
          .map(place => ({ ...place, distance: this.distanceMeters(latitude, longitude, place.latitude, place.longitude) }))
          .filter(place => place.distance <= 500)
          .sort((a, b) => a.distance - b.distance);
        this.nearbyLoading = false;
        const message = this.nearby.length
          ? `${this.nearby.length} barreras reportadas a menos de 500 metros. La más cercana está a ${Math.round(this.nearby[0].distance)} metros.`
          : 'No hay barreras reportadas a menos de 500 metros.';
        this.speech.read(message);
      }),
      () => this.zone.run(() => {
        this.nearbyLoading = false;
        this.nearbyError = 'No pudimos obtener tu ubicación para buscar alertas cercanas.';
      }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }
  private distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const rad = (value: number) => value * Math.PI / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  markSelection() {
    if (
      !this.map ||
      this.form.latitude === null ||
      this.form.longitude === null
    )
      return;
    if (this.selected) this.selected.map = null;
    this.selected = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: { lat: this.form.latitude, lng: this.form.longitude },
      title: 'Ubicación seleccionada',
      gmpDraggable: true,
    });
    this.selected.addListener('dragend', (event: google.maps.MapMouseEvent) => this.zone.run(() => {
      if (!event.latLng) return;
      this.form.latitude = Number(event.latLng.lat().toFixed(6));
      this.form.longitude = Number(event.latLng.lng().toFixed(6));
      this.manualLocation();
    }));
    this.accuracyCircle?.setMap(null);
    if (this.locationSource === 'gps' && this.accuracy !== null) {
      this.accuracyCircle = new google.maps.Circle({
        map: this.map, center: { lat: this.form.latitude, lng: this.form.longitude },
        radius: this.accuracy, fillColor: '#064fe8', fillOpacity: 0.12,
        strokeColor: '#064fe8', strokeOpacity: 0.6, strokeWeight: 1, clickable: false,
      });
    }
  }
  private stopLocation() {
    this.locationRequest++;
    this.cancelLocation?.();
    this.cancelLocation = undefined;
    this.locating = false;
  }
  private stopMapLocation() {
    this.cancelMapLocation?.();
    this.cancelMapLocation = undefined;
    this.mapLocating = false;
  }
  centerOnCurrentLocation() {
    this.stopMapLocation();
    this.mapLocationError = '';
    if (!this.map || !navigator.geolocation) {
      this.mapLocationError = 'Tu navegador no ofrece ubicación para centrar el mapa.';
      return;
    }
    this.mapLocating = true;
    this.cancelMapLocation = preciseLocation(
      navigator.geolocation,
      (position) => this.zone.run(() => {
        if (this.destroyed || !this.mapLocating) return;
        const location = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        this.map?.panTo(location);
        this.map?.setZoom(18);
        if (!this.currentLocationMarker) {
          const dot = document.createElement('span');
          dot.className = 'current-location-marker';
          dot.setAttribute('aria-hidden', 'true');
          this.currentLocationMarker = new google.maps.marker.AdvancedMarkerElement({
            map: this.map,
            position: location,
            content: dot,
            title: 'Tu ubicación actual',
          });
        } else {
          this.currentLocationMarker.position = location;
          this.currentLocationMarker.map = this.map;
        }
      }),
      (error) => this.zone.run(() => {
        if (this.destroyed || !this.mapLocating) return;
        this.mapLocating = false;
        if (error) this.mapLocationError = error;
      }),
    );
  }
  manualLocation() {
    this.stopLocation();
    this.accuracy = null;
    this.locationSource = 'manual';
    this.locationConfirmed = false;
    this.accuracyCircle?.setMap(null);
    if (this.form.latitude !== null && this.form.longitude !== null &&
        Number.isFinite(this.form.latitude) && Number.isFinite(this.form.longitude) &&
        Math.abs(this.form.latitude) <= 90 && Math.abs(this.form.longitude) <= 180) this.markSelection();
  }
  useCurrentEstimate() {
    this.stopLocation();
  }
  adjustLocation() {
    this.adjustingLocation = true;
    this.close();
    this.map?.setZoom(19);
    if (this.form.latitude !== null && this.form.longitude !== null) {
      this.map?.panTo({ lat: this.form.latitude, lng: this.form.longitude });
    }
    this.mapElement.nativeElement.scrollIntoView({ block: 'center', behavior: 'auto' });
    this.mapElement.nativeElement.focus();
  }
  resumeReport() {
    this.adjustingLocation = false;
    this.dialog.nativeElement.showModal();
  }
  openNewReport() {
    this.stopLocation();
    this.photo = '';
    this.accuracy = null;
    this.locationSource = null;
    this.locationConfirmed = false;
    this.accuracyCircle?.setMap(null);
    if (this.selected) this.selected.map = null;
    this.selected = undefined;
    this.form = {
      name: '', latitude: null, longitude: null, category: 'other', description: '',
    };
    this.openReport();
  }
  openReport(place?: Place) {
    this.adjustingLocation = false;
    this.formError = '';
    this.success = '';
    if (place) {
      this.stopLocation();
      this.photo = '';
      this.accuracy = null;
      this.locationSource = 'reported';
      this.locationConfirmed = false;
      this.accuracyCircle?.setMap(null);
      this.form = {
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        category: 'other',
        description: '',
      };
      this.map?.panTo({ lat: place.latitude, lng: place.longitude });
      this.markSelection();
    }
    this.dialog.nativeElement.showModal();
    if (this.backend.identity()) {
      this.changes.detectChanges();
      if (this.form.latitude === null || this.form.longitude === null) this.locate();
      if (!this.photo) void this.startCamera();
    }
  }
  async startCamera() {
    this.stopCamera();
    const request = this.cameraRequest;
    this.cameraOpening = true;
    this.cameraError = '';
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('No pudimos abrir la cámara aquí. Puedes adjuntar una foto del lugar.');
      let stream: MediaStream;
      try {
        // Prefer the rear camera for documenting a barrier. Some phones expose
        // only one camera to the browser, so retry without that preference.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false,
        });
      } catch (error) {
        const name = (error as DOMException).name;
        if (name !== 'NotFoundError' && name !== 'OverconstrainedError') throw error;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (this.destroyed || request !== this.cameraRequest || !this.dialog.nativeElement.open) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      this.stream = stream;
      this.cameraActive = true;
      this.changes.detectChanges();
      const video = this.video?.nativeElement;
      if (!video) throw new Error('Vuelve a abrir el formulario para tomar la foto.');
      video.srcObject = stream;
      await video.play();
      this.speech.read('Cámara lista. Apunta hacia la barrera y pulsa Tomar foto.');
    } catch (error) {
      if (this.destroyed || request !== this.cameraRequest) return;
      this.stopCamera();
      const name = (error as DOMException).name;
      this.cameraError = name === 'NotAllowedError'
        ? 'Necesitamos permiso para usar la cámara. Actívalo en tu dispositivo o adjunta una foto.'
        : name === 'NotFoundError'
          ? 'No se encontró una cámara disponible. Cierra otra app que esté usando la cámara, revisa el permiso o adjunta una foto.'
          : name === 'NotReadableError'
            ? 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo nuevamente, o adjunta una foto.'
            : 'No se pudo iniciar la cámara. Puedes adjuntar una foto o continuar sin ella.';
    } finally {
      if (request === this.cameraRequest) this.cameraOpening = false;
    }
  }
  stopCamera() {
    this.cameraRequest++;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = undefined;
    this.cameraActive = false;
    this.cameraOpening = false;
    if (this.video) this.video.nativeElement.srcObject = null;
  }
  private encodePhoto(source: CanvasImageSource, width: number, height: number) {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL('image/jpeg', 0.7);
    if (photo.length > 699000) throw new Error('La foto es demasiado grande. Intenta con una imagen más sencilla.');
    this.photo = photo;
    if (!this.form.name.trim()) this.form.name = 'Barrera en mi ubicación';
    if (!this.form.description.trim()) this.form.description = 'Barrera de acceso documentada en la fotografía del lugar.';
  }
  capturePhoto() {
    const video = this.video?.nativeElement;
    if (!video?.videoWidth) { this.cameraError = 'La cámara aún está iniciando. Intenta nuevamente.'; return; }
    try {
      this.encodePhoto(video, video.videoWidth, video.videoHeight);
      this.stopCamera();
      this.speech.read('Foto lista. Revisa la ubicación y el tipo de barrera. Confirma el envío para publicarla en el mapa.');
    } catch (e) { this.cameraError = (e as Error).message; }
  }
  async attachPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.stopCamera();
    const request = this.cameraRequest;
    this.cameraError = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.cameraError = 'Usa una imagen JPG, PNG o WebP de hasta 10 MB.'; return;
    }
    try {
      const image = await createImageBitmap(file);
      try {
        if (this.destroyed || request !== this.cameraRequest || !this.dialog.nativeElement.open) return;
        this.encodePhoto(image, image.width, image.height);
      } finally { image.close(); }
    } catch { this.cameraError = 'No se pudo preparar la imagen. Intenta con otra foto.'; }
  }
  locate() {
    this.stopLocation();
    const request = ++this.locationRequest;
    this.locating = true;
    this.accuracy = null;
    this.locationSource = null;
    this.locationConfirmed = false;
    this.form.latitude = null;
    this.form.longitude = null;
    this.accuracyCircle?.setMap(null);
    if (this.selected) this.selected.map = null;
    this.formError = '';
    if (!navigator.geolocation) {
      this.formError =
        'No pudimos usar tu ubicación. Selecciona el punto en el mapa.';
      this.locating = false;
      return;
    }
    this.cancelLocation = preciseLocation(navigator.geolocation,
      (p) =>
        this.zone.run(() => {
          if (this.destroyed || request !== this.locationRequest) return;
          this.accuracy = Math.ceil(p.coords.accuracy);
          this.locationSource = 'gps';
          this.form.latitude = Number(p.coords.latitude.toFixed(6));
          this.form.longitude = Number(p.coords.longitude.toFixed(6));
          this.map?.panTo({
            lat: this.form.latitude,
            lng: this.form.longitude,
          });
          this.markSelection();
          if (this.accuracy <= 50) this.map?.setZoom(18);
        }),
      (error) =>
        this.zone.run(() => {
          if (this.destroyed || request !== this.locationRequest) return;
          if (error) this.formError = error;
          this.locating = false;
        }),
    );
  }
  dictate() {
    if (this.listening) {
      this.recognition?.stop();
      this.listening = false;
      return;
    }
    this.listening = true;
    this.recognition = startDictation(
      (t) => this.zone.run(() => (this.form.description = t.slice(0, 1000))),
      (e) =>
        this.zone.run(() => {
          this.formError = e;
          this.listening = false;
        }),
      () => this.zone.run(() => (this.listening = false)),
    );
  }
  async submit() {
    if (this.saving || this.locating || this.listening) return;
    this.formError = '';
    const f = this.form;
    if (this.locationSource === 'gps' && this.accuracy !== null && this.accuracy > 25 && !this.locationConfirmed) {
      this.formError = 'La ubicación es aproximada. Ajusta el punto o confirma que corresponde al lugar antes de enviar.';
      return;
    }
    if (
      f.latitude === null ||
      f.longitude === null ||
      !Number.isFinite(f.latitude) ||
      !Number.isFinite(f.longitude) ||
      Math.abs(f.latitude) > 90 ||
      Math.abs(f.longitude) > 180
    ) {
      this.formError = 'Selecciona una ubicación válida para el reporte.';
      return;
    }
    this.saving = true;
    try {
      const result = await this.backend.report({
        ...f,
        photo: this.photo || undefined,
        name: f.name.trim(),
        description: f.description.trim(),
        latitude: f.latitude,
        longitude: f.longitude,
      });
      this.stopCamera();
      this.photo = '';
      this.accuracy = null;
      this.locationSource = null;
      this.locationConfirmed = false;
      this.accuracyCircle?.setMap(null);
      this.search = '';
      this.filter = 'all';
      this.dialog.nativeElement.close();
      this.success =
        'Reporte registrado. Gracias por ayudar a identificar barreras.';
      this.form = {
        name: '',
        latitude: null,
        longitude: null,
        category: 'other',
        description: '',
      };
      await this.refresh();
      const place = this.places.find(p => p.id === result.place_id);
      this.map?.panTo({ lat: place?.latitude ?? f.latitude, lng: place?.longitude ?? f.longitude });
      if (this.selected) this.selected.map = null;
      this.selected = undefined;
      this.speech.read('Reporte registrado. La advertencia ya está disponible para la comunidad.');
    } catch (e) {
      this.formError = (e as Error).message;
    } finally {
      this.saving = false;
    }
  }
  close() {
    if (!this.saving) {
      this.onClose();
      this.dialog.nativeElement.close();
    }
  }
  onCancel(event: Event) {
    if (this.saving) event.preventDefault();
    else this.onClose();
  }
  onClose() {
    this.stopCamera();
    this.stopLocation();
    this.recognition?.abort();
    this.listening = false;
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.stopCamera();
    this.stopLocation();
    this.stopMapLocation();
    this.accuracyCircle?.setMap(null);
    clearInterval(this.refreshTimer);
    this.recognition?.abort();
    this.markers.forEach((m) => (m.map = null));
    if (this.selected) this.selected.map = null;
    if (this.currentLocationMarker) this.currentLocationMarker.map = null;
    if (this.map) google.maps.event.clearInstanceListeners(this.map);
  }
}
