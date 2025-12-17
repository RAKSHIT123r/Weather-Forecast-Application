const elements = {
  form: document.getElementById('searchForm'),
  input: document.getElementById('cityInput'),
  status: document.getElementById('status'),
  loading: document.getElementById('loading'),
  location: document.getElementById('location'),
  date: document.getElementById('date'),
  timezone: document.getElementById('timezone'),
  currentText: document.getElementById('currentText'),
  currentIcon: document.getElementById('currentIcon'),
  temp: document.getElementById('temp'),
  forecast: document.getElementById('forecast'),
  details: document.getElementById('details'),
  canvas: document.getElementById('fxCanvas'),
  sparkTemp: document.getElementById('sparkTemp'),
  sparkRain: document.getElementById('sparkRain'),
  tempRange: document.getElementById('tempRange'),
  rainRange: document.getElementById('rainRange'),
  tempUnitToggle: document.getElementById('tempUnitToggle'),
  tempUnitC: document.getElementById('tempUnitC'),
  tempUnitF: document.getElementById('tempUnitF')
};

const WEEKDAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

let tempUnit = localStorage.getItem('tempUnit') || 'celsius'; 

function celsiusToFahrenheit(c) {
  return (c * 9/5) + 32;
}

function fahrenheitToCelsius(f) {
  return (f - 32) * 5/9;
}

function convertTemp(value, fromUnit, toUnit) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
    return celsiusToFahrenheit(value);
  }
  if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
    return fahrenheitToCelsius(value);
  }
  return value;
}

function updateTempUnitToggle() {
  if (tempUnit === 'celsius') {
    elements.tempUnitC.classList.add('active');
    elements.tempUnitC.classList.remove('inactive');
    elements.tempUnitF.classList.add('inactive');
    elements.tempUnitF.classList.remove('active');
  } else {
    elements.tempUnitF.classList.add('active');
    elements.tempUnitF.classList.remove('inactive');
    elements.tempUnitC.classList.add('inactive');
    elements.tempUnitC.classList.remove('active');
  }
  localStorage.setItem('tempUnit', tempUnit);
}

// Fetch helper with timeout
async function fetchWithTimeout(resource, options = {}, timeout = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(resource, { signal: controller.signal, ...options });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Simple caching for last successful fetch
function saveCache(place, data) {
  try {
    localStorage.setItem('weather:last', JSON.stringify({ place, data, ts: Date.now() }));
  } catch (e) { /* ignore */ }
}

function loadCache() {
  try {
    const v = localStorage.getItem('weather:last');
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

function showLoading(show) {
  elements.loading.classList.toggle('show', !!show);
  elements.loading.setAttribute('aria-hidden', show ? 'false' : 'true');
}

// Show loading only after a short delay to avoid flicker for quick responses.
function showLoadingDelayed(delay = 300) {
  let timer = setTimeout(() => showLoading(true), delay);
  return function cancelShow() { clearTimeout(timer); showLoading(false); };
}

function setStatus(msg, isError = false) {
  elements.status.textContent = msg || '';
  elements.status.setAttribute('role', isError ? 'alert' : 'status');
}

function toCelsiusString(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const converted = tempUnit === 'fahrenheit' 
    ? convertTemp(value, 'celsius', 'fahrenheit')
    : value;
  const rounded = Math.round(converted);
  const unit = tempUnit === 'fahrenheit' ? '°F' : '°C';
  return rounded + unit;
}

function weatherCodeToInfo(code, isDay = true) {
  
  const map = {
    0:  { text: 'Clear sky', icon: isDay ? '☀️' : '🌙', theme: 'theme-clear' },
    1:  { text: 'Mainly clear', icon: isDay ? '🌤️' : '🌤️', theme: 'theme-clear' },
    2:  { text: 'Partly cloudy', icon: '⛅', theme: 'theme-clouds' },
    3:  { text: 'Overcast', icon: '☁️', theme: 'theme-clouds' },
    45: { text: 'Fog', icon: '🌫️', theme: 'theme-haze' },
    48: { text: 'Depositing rime fog', icon: '🌫️', theme: 'theme-haze' },
    51: { text: 'Light drizzle', icon: '🌦️', theme: 'theme-rain' },
    53: { text: 'Drizzle', icon: '🌦️', theme: 'theme-rain' },
    55: { text: 'Dense drizzle', icon: '🌧️', theme: 'theme-rain' },
    56: { text: 'Freezing drizzle', icon: '🌧️', theme: 'theme-rain' },
    57: { text: 'Freezing drizzle', icon: '🌧️', theme: 'theme-rain' },
    61: { text: 'Slight rain', icon: '🌦️', theme: 'theme-rain' },
    63: { text: 'Rain', icon: '🌧️', theme: 'theme-rain' },
    65: { text: 'Heavy rain', icon: '🌧️', theme: 'theme-rain' },
    66: { text: 'Freezing rain', icon: '🌧️', theme: 'theme-rain' },
    67: { text: 'Freezing rain', icon: '🌧️', theme: 'theme-rain' },
    71: { text: 'Slight snow', icon: '🌨️', theme: 'theme-snow' },
    73: { text: 'Snow', icon: '🌨️', theme: 'theme-snow' },
    75: { text: 'Heavy snow', icon: '❄️', theme: 'theme-snow' },
    77: { text: 'Snow grains', icon: '❄️', theme: 'theme-snow' },
    80: { text: 'Rain showers', icon: '🌧️', theme: 'theme-rain' },
    81: { text: 'Rain showers', icon: '🌧️', theme: 'theme-rain' },
    82: { text: 'Heavy showers', icon: '🌧️', theme: 'theme-rain' },
    85: { text: 'Snow showers', icon: '🌨️', theme: 'theme-snow' },
    86: { text: 'Heavy snow showers', icon: '❄️', theme: 'theme-snow' },
    95: { text: 'Thunderstorm', icon: '⛈️', theme: 'theme-thunder' },
    96: { text: 'Thunderstorm with hail', icon: '⛈️', theme: 'theme-thunder' },
    99: { text: 'Thunderstorm with hail', icon: '⛈️', theme: 'theme-thunder' }
  };
  return map[code] || { text: '—', icon: '❔', theme: 'theme-clouds' };
}

function setThemeByCode(code, isDay) {
  const { theme } = weatherCodeToInfo(code, isDay);
  const cls = ['theme-clear','theme-clouds','theme-rain','theme-snow','theme-thunder','theme-haze'];
  for (const c of cls) document.body.classList.remove(c);
  document.body.classList.add(theme);
  startFx(theme);
}

function fmtDate(dateStr, tz) {
  const dt = new Date(dateStr + 'T12:00:00');
  return dt.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: tz || undefined });
}

function dayName(dateStr, tz) {
  const dt = new Date(dateStr + 'T12:00:00');
  return WEEKDAY[dt.getDay()];
}

async function geocodeCity(name) {
  const base = 'https://geocoding-api.open-meteo.com/v1/search';
  const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const queries = [];
  const n = normalize(name);
  if (n) queries.push(n);
  const parts = n.split(',').map(p => normalize(p)).filter(Boolean);
  if (parts[0]) queries.push(parts[0]);
  if (parts[1]) queries.push(`${parts[0]}, ${parts[1]}, India`);
  queries.push('Chandigarh, India');

  for (const q of queries) {
    const url = new URL(base);
    url.searchParams.set('name', q);
    url.searchParams.set('count', '5');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    const res = await fetchWithTimeout(url.href, {}, 7000);
    if (!res.ok) continue;
    const data = await res.json();
    const place = data.results && data.results[0];
    if (place) {
      return {
        name: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone
      };
    }
  }
  throw new Error('Place not found');
}

async function fetchForecast(lat, lon, tz) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', tz || 'auto');
  url.searchParams.set('current', 'temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m,apparent_temperature,uv_index');
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability');
  url.searchParams.set('forecast_hours', '48');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max');
  const res = await fetchWithTimeout(url.href, {}, 7000);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

function renderCurrent(place, data) {
  const current = data.current || {};
  const isDay = current.is_day === 1;
  const info = weatherCodeToInfo(current.weather_code, isDay);
  document.body.classList.toggle('is-night', !isDay);
  elements.location.textContent = place.name;
  elements.date.textContent = new Date().toLocaleString(undefined, { dateStyle: 'full', timeZone: place.timezone });
  elements.timezone.textContent = place.timezone || '';
  elements.currentText.textContent = info.text;
  elements.currentIcon.textContent = info.icon;
  elements.temp.textContent = toCelsiusString(current.temperature_2m);
  setThemeByCode(current.weather_code, isDay);
}

function renderForecast(data) {
  const d = data.daily;
  if (!d) return;
  const items = [];
  for (let i = 0; i < Math.min(7, (d.time || []).length); i++) {
    const code = d.weather_code[i];
    const info = weatherCodeToInfo(code, true);
    const min = d.temperature_2m_min[i];
    const max = d.temperature_2m_max[i];
    const precip = d.precipitation_probability_max ? d.precipitation_probability_max[i] : null;
    const date = d.time[i];
    items.push(
      `<div class="day-card" aria-label="${fmtDate(date, data.timezone)}">
        <div class="top">
          <div class="name">${dayName(date, data.timezone)}</div>
          <div class="emoji" aria-hidden="true">${info.icon}</div>
        </div>
        <div class="detail">${info.text}</div>
        <div class="temps">
          <div class="temp-max">${toCelsiusString(max)}</div>
          <div class="temp-min">${toCelsiusString(min)}</div>
        </div>
        <div class="precip">${precip !== null && precip !== undefined ? `Rain: ${precip}%` : ''}</div>
      </div>`
    );
  }
  elements.forecast.innerHTML = items.join('');
 
  const cards = elements.forecast.querySelectorAll('.day-card');
  cards.forEach((el, idx) => {
    setTimeout(() => el.classList.add('reveal'), 60 * idx);
  });
}

function renderDetails(data) {
  const cur = data.current || {};
  const d = data.daily || {};
  const sunrise = d.sunrise ? new Date(d.sunrise[0]) : null;
  const sunset = d.sunset ? new Date(d.sunset[0]) : null;
  const uv = cur.uv_index != null ? cur.uv_index : (d.uv_index_max ? d.uv_index_max[0] : null);
  const rows = [
    { label: 'Humidity', value: cur.relative_humidity_2m != null ? cur.relative_humidity_2m + '%' : '—' },
    { label: 'Wind', value: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) + ' km/h' : '—' },
    { label: 'UV Index', value: uv != null ? Math.round(uv) : '—' },
    { label: 'Feels Like', value: cur.apparent_temperature != null ? toCelsiusString(cur.apparent_temperature) : '—' },
    { label: 'Sunrise', value: sunrise ? sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
    { label: 'Sunset', value: sunset ? sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' }
  ];
  elements.details.innerHTML = rows.map(r => `
    <div class="detail-card">
      <div class="detail-label">${r.label}</div>
      <div class="detail-value">${r.value}</div>
    </div>
  `).join('');
}

function drawSparkline(canvas, values, color) {
  if (!canvas || !values || values.length === 0) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2);
  const h = canvas.height = 100 * Math.min(window.devicePixelRatio || 1, 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 8;
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = pad + (w - pad * 2) * (i / (values.length - 1));
    const y = h - pad - (h - pad * 2) * ((v - min) / range);
    return [x, y];
  });

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255,255,255,0.2)');
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.stroke();
  
  ctx.lineTo(points[points.length - 1][0], h - pad);
  ctx.lineTo(points[0][0], h - pad);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.25;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function renderHourlySparks(place, data) {
  const hourly = data.hourly || {};
  const times = hourly.time || [];
  const temps = hourly.temperature_2m || [];
  const rains = hourly.precipitation_probability || [];
  if (times.length === 0) return;
  
  const now = Date.now();
  let startIdx = 0;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]).getTime();
    if (t >= now) { startIdx = i; break; }
  }
  const subTemps = temps.slice(startIdx, startIdx + 24);
  const subRains = rains.slice(startIdx, startIdx + 24);
  if (subTemps.length) {
    const tMin = Math.min(...subTemps);
    const tMax = Math.max(...subTemps);
    const convertedMin = tempUnit === 'fahrenheit' 
      ? convertTemp(tMin, 'celsius', 'fahrenheit')
      : tMin;
    const convertedMax = tempUnit === 'fahrenheit' 
      ? convertTemp(tMax, 'celsius', 'fahrenheit')
      : tMax;
    const unit = tempUnit === 'fahrenheit' ? '°F' : '°C';
    elements.tempRange.textContent = `${Math.round(convertedMin)}${unit} – ${Math.round(convertedMax)}${unit}`;
  
    const convertedTemps = subTemps.map(t => tempUnit === 'fahrenheit' 
      ? convertTemp(t, 'celsius', 'fahrenheit')
      : t);
    drawSparkline(elements.sparkTemp, convertedTemps, '#7aa2ff');
  }
  if (subRains.length) {
    const rMin = Math.min(...subRains);
    const rMax = Math.max(...subRains);
    elements.rainRange.textContent = `${Math.round(rMin)}% – ${Math.round(rMax)}%`;
    drawSparkline(elements.sparkRain, subRains, '#48d597');
  }
}


let lastPlace = null;
let lastData = null;

async function updateByCity(city) {
  setStatus('Searching...');
  const cancelLoad = showLoadingDelayed();
  try {
    const place = await geocodeCity(city);
    setStatus('Fetching forecast...');
    const data = await fetchForecast(place.latitude, place.longitude, place.timezone);
    lastPlace = place;
    lastData = data;
    saveCache(place, data);
    renderCurrent(place, data);
    renderForecast(data);
    renderDetails(data);
    renderHourlySparks(place, data);
    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Something went wrong', true);
  } finally {
    cancelLoad();
  }
}

elements.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = elements.input.value.trim();
  if (!q) {
    setStatus('Please enter a city name', true);
    elements.input.focus();
    return;
  }
  updateByCity(q);
});

let fx = { ctx: null, w: 0, h: 0, anim: 0, particles: [] };
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.w = elements.canvas.width = Math.floor(window.innerWidth * dpr);
  fx.h = elements.canvas.height = Math.floor(window.innerHeight * dpr);
  elements.canvas.style.width = '100vw';
  elements.canvas.style.height = '100vh';
  fx.ctx = elements.canvas.getContext('2d');
  fx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);

function startFx(theme) {
  cancelAnimationFrame(fx.anim);
  if (!fx.ctx) resizeCanvas();
  fx.particles = [];
  const count = Math.floor(window.innerWidth / 6);
  if (theme === 'theme-rain' || theme === 'theme-thunder') {
    for (let i = 0; i < count; i++) fx.particles.push({ x: Math.random()*fx.w, y: Math.random()*fx.h, v: 4+Math.random()*6, l: 8+Math.random()*14 });
    loopRain();
  } else if (theme === 'theme-snow') {
    for (let i = 0; i < count/2; i++) fx.particles.push({ x: Math.random()*fx.w, y: Math.random()*fx.h, r: 1+Math.random()*2, vx: -0.5+Math.random(), vy: 0.6+Math.random()*1.2 });
    loopSnow();
  } else if (theme === 'theme-clouds' || theme === 'theme-haze') {
    for (let i = 0; i < 12; i++) fx.particles.push({ x: Math.random()*fx.w, y: Math.random()*fx.h*0.6, r: 80+Math.random()*160, vx: 0.1+Math.random()*0.2 });
    loopClouds();
  } else {
    for (let i = 0; i < 20; i++) fx.particles.push({ x: Math.random()*fx.w, y: Math.random()*fx.h, r: 1+Math.random()*2, vx: 0.2+Math.random()*0.3, vy: -0.2-Math.random()*0.3 });
    loopSparkle();
  }
}
function loopRain() {
  const c = fx.ctx; c.clearRect(0,0,fx.w,fx.h); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1;
  for (const p of fx.particles) { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x, p.y+p.l); c.stroke(); p.y += p.v; p.x += 0.8; if (p.y > fx.h) { p.y = -p.l; p.x = Math.random()*fx.w; } }
  fx.anim = requestAnimationFrame(loopRain);
}
function loopSnow() {
  const c = fx.ctx; c.clearRect(0,0,fx.w,fx.h); c.fillStyle = 'rgba(255,255,255,0.9)';
  for (const p of fx.particles) { c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI*2); c.fill(); p.x += p.vx; p.y += p.vy; if (p.y > fx.h) { p.y = -5; p.x = Math.random()*fx.w; } if (p.x > fx.w) p.x = -5; if (p.x < -5) p.x = fx.w; }
  fx.anim = requestAnimationFrame(loopSnow);
}
function loopClouds() {
  const c = fx.ctx; c.clearRect(0,0,fx.w,fx.h); c.fillStyle = 'rgba(255,255,255,0.12)';
  for (const p of fx.particles) { c.beginPath(); c.ellipse(p.x, p.y, p.r*1.4, p.r, 0, 0, Math.PI*2); c.fill(); p.x += p.vx; if (p.x - p.r*1.4 > fx.w) { p.x = -p.r*1.4; p.y = Math.random()*fx.h*0.6; } }
  fx.anim = requestAnimationFrame(loopClouds);
}
function loopSparkle() {
  const c = fx.ctx; c.clearRect(0,0,fx.w,fx.h); c.fillStyle = 'rgba(255,255,255,0.5)';
  for (const p of fx.particles) { c.fillRect(p.x, p.y, 1.5, 1.5); p.x += p.vx; p.y += p.vy; if (p.y < -5) { p.y = fx.h+5; p.x = Math.random()*fx.w; } if (p.x > fx.w) p.x = -5; }
  fx.anim = requestAnimationFrame(loopSparkle);
}

async function reverseGeocode(lat, lon) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  const res = await fetchWithTimeout(url.href, {}, 7000);
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  const place = data.results && data.results[0];
  return place ? {
    name: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone
  } : { name: `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`, latitude: lat, longitude: lon, timezone: 'auto' };
}

async function updateByCoords(lat, lon) {
  setStatus('Fetching your location weather...');
  const cancelLoad = showLoadingDelayed();
  try {
    let place;
    try {
      place = await reverseGeocode(lat, lon);
    } catch (err) {
      // Reverse geocoding can fail (rate limits/CORS). Use coords as a fallback place object.
      console.warn('Reverse geocoding failed, using coordinates as place', err);
      place = { name: `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`, latitude: lat, longitude: lon, timezone: 'auto' };
    }

    try {
      const data = await fetchForecast(place.latitude, place.longitude, place.timezone);
      lastPlace = place;
      lastData = data;
      saveCache(place, data);
      renderCurrent(place, data);
      renderForecast(data);
      renderDetails(data);
      renderHourlySparks(place, data);
      setStatus('');
      return;
    } catch (err) {
      console.error('Fetching weather for coordinates failed', err);
      // If fetching by coords fails, try IP geolocation as a fallback, then default city
      const got = await tryIPGeolocation();
      if (!got) {
        setStatus('Failed to load your location. Showing weather for Chandigarh, India.', true);
        await updateByCity('Chandigarh, India');
      } else {
        setStatus('');
      }
    }
  } catch (e) {
    console.error(e);
    setStatus('Failed to load your location. Please enter a city to search.', true);
  } finally {
    cancelLoad();
  }
}

async function tryIPGeolocation() {
  try {
    setStatus('Detecting location by IP...');
    // minimal spinner; no need to block UI for long
    const res = await fetchWithTimeout('https://ipapi.co/json/', {}, 4000);
    if (!res.ok) throw new Error('IP lookup failed');
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      await updateByCoords(parseFloat(data.latitude), parseFloat(data.longitude));
      return true;
    }
    return false;
  } catch (e) {
    console.warn('IP geolocation failed', e);
    return false;
  } finally {
    showLoading(false);
  }
}

elements.tempUnitToggle.addEventListener('click', () => {
  tempUnit = tempUnit === 'celsius' ? 'fahrenheit' : 'celsius';
  updateTempUnitToggle();

  if (lastPlace && lastData) {
    renderCurrent(lastPlace, lastData);
    renderForecast(lastData);
    renderDetails(lastData);
    renderHourlySparks(lastPlace, lastData);
  }
});


(async function init() {
  resizeCanvas();
  updateTempUnitToggle();
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');

  startFx('theme-clouds');

  const cached = loadCache();
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
    // Show cached data immediately to avoid spinner
    lastPlace = cached.place;
    lastData = cached.data;
    renderCurrent(lastPlace, lastData);
    renderForecast(lastData);
    renderDetails(lastData);
    renderHourlySparks(lastPlace, lastData);
    setStatus('Showing recent data. Updating in background...');

    // Update in background
    (async () => {
      if (q) await updateByCity(q);
      else {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => updateByCoords(pos.coords.latitude, pos.coords.longitude), async () => { await tryIPGeolocation(); });
        } else {
          await tryIPGeolocation();
        }
      }
    })();
    return;
  }

  if (q) {
    elements.input.value = q;
    updateByCity(q);
    return;
  }

  // No cache and no q: attempt quick geolocation but do not block UI — fallback to default city after short delay
  let resolved = false;
  const fallbackTimer = setTimeout(() => {
    if (!resolved) {
      setStatus('Taking too long to detect location. Showing default city.');
      updateByCity('Chandigarh, India');
    }
  }, 1500);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      resolved = true; clearTimeout(fallbackTimer);
      await updateByCoords(position.coords.latitude, position.coords.longitude);
    }, async (error) => {
      resolved = true; clearTimeout(fallbackTimer);
      console.error('Geolocation error:', error);
      const got = await tryIPGeolocation();
      if (!got) {
        setStatus('Location not detected. Showing Chandigarh, India.');
        updateByCity('Chandigarh, India');
      }
    }, { timeout: 5000, maximumAge: 600000 });
  } else {
    const got = await tryIPGeolocation();
    clearTimeout(fallbackTimer);
    if (!got) {
      setStatus('Geolocation not supported. Showing Chandigarh, India.');
      updateByCity('Chandigarh, India');
    }
  }
})();
