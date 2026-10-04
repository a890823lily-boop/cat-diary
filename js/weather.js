/* 窗外天氣：用手機定位查詢當地天氣（Open-Meteo，免金鑰），給小貓房間用 */
const Weather = (function () {
  'use strict';

  const KEY = 'cat-diary:weather';
  const FALLBACK = { lat: 25.03, lon: 121.56, place: '台北' }; // 不給定位時改用台北
  const STALE = 30 * 6e4; // 30 分鐘更新一次

  let st = read();
  let loading = false;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 忽略 */ }
  }
  function notify() { document.dispatchEvent(new CustomEvent('weather:update')); }

  // WMO 天氣代碼 → 房間要顯示的天氣
  function kindOf(code) {
    if (code >= 95) return 'storm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (code === 45 || code === 48) return 'fog';
    if (code === 3 || code === 2) return 'cloudy';
    return 'clear';
  }

  const LABELS = {
    clear: { icon: '☀️', night: '🌙', text: '晴天' },
    cloudy: { icon: '⛅', night: '☁️', text: '多雲' },
    fog: { icon: '🌫️', night: '🌫️', text: '起霧' },
    rain: { icon: '🌧️', night: '🌧️', text: '下雨' },
    snow: { icon: '🌨️', night: '🌨️', text: '下雪' },
    storm: { icon: '⛈️', night: '⛈️', text: '雷雨' }
  };

  function fetchWeather() {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + st.lat + '&longitude=' + st.lon +
      '&current=temperature_2m,weather_code,is_day&timezone=auto';
    loading = true;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (j) {
      const c = j.current || {};
      st.code = c.weather_code;
      st.kind = kindOf(c.weather_code);
      st.temp = Math.round(c.temperature_2m);
      st.isDay = c.is_day === 1;
      st.at = Date.now();
      st.error = null;
      save();
    }).catch(function () {
      st.error = '暫時查不到天氣（可能沒有網路）';
      save();
    }).then(function () { loading = false; notify(); });
  }

  /* 開啟：要求定位，拒絕或失敗就用台北 */
  function enable() {
    st.on = true;
    st.error = null;
    save();
    notify();
    const useFallback = function () {
      st.lat = FALLBACK.lat; st.lon = FALLBACK.lon; st.place = FALLBACK.place + '（沒有定位）';
      save();
      fetchWeather();
    };
    if (!navigator.geolocation) { useFallback(); return; }
    loading = true;
    notify();
    navigator.geolocation.getCurrentPosition(function (pos) {
      // 只取到小數第二位（約 1 公里），不需要精確位置
      st.lat = Math.round(pos.coords.latitude * 100) / 100;
      st.lon = Math.round(pos.coords.longitude * 100) / 100;
      st.place = '目前位置';
      save();
      fetchWeather();
    }, useFallback, { enableHighAccuracy: false, timeout: 10000, maximumAge: 36e5 });
  }

  function disable() {
    st = { on: false };
    save();
    notify();
  }

  function refresh(force) {
    if (!st.on || loading || st.lat == null) return;
    if (!force && st.at && Date.now() - st.at < STALE) return;
    fetchWeather();
  }

  function current() {
    if (!st.on || !st.kind) return null;
    const cold = st.temp <= 15;
    const hot = st.temp >= 31;
    const lb = LABELS[st.kind];
    return { kind: st.kind, temp: st.temp, isDay: st.isDay, cold: cold, hot: hot, place: st.place, at: st.at,
      icon: st.isDay ? lb.icon : lb.night, text: lb.text };
  }

  return {
    enabled: function () { return !!st.on; },
    loading: function () { return loading; },
    error: function () { return st.error; },
    current: current,
    enable: enable,
    disable: disable,
    refresh: refresh,
    kindOf: kindOf
  };
})();
