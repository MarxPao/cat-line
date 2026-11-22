/**
 * ics-import-engine.js
 * Lê arquivos de calendário .ics (iCalendar) e gera compromissos datados da Cat Line.
 *
 * Motor puro e 100% offline: não usa relógio, rede nem DOM. Quem chama informa
 * o primeiro dia da janela (fromDayKey) e quantos dias importar (horizonDays).
 *
 * Suporta: DTSTART/DTEND/DURATION, horário UTC, TZID e horário local, RRULE com
 * DAILY, WEEKLY, MONTHLY e YEARLY, INTERVAL, COUNT, UNTIL, BYDAY simples, EXDATE e
 * RECURRENCE-ID. Eventos de dia inteiro e cancelados ficam de fora e são contados.
 * Tudo é convertido para o horário de Brasília, que desde 2019 não tem horário de verão.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineIcsImport = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TARGET_OFFSET_MIN = -180; // America/Sao_Paulo
  const MAX_INSTANCES = 300;
  const MAX_FILE_CHARS = 2000000;
  const MAX_LOOP = 6000;
  const DAY_MS = 86400000;
  const WEEKDAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  // ---------- datas ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKeyFromUtcDate(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function utcDateFromDayKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  function addDays(key, n) { return dayKeyFromUtcDate(new Date(utcDateFromDayKey(key).getTime() + n * DAY_MS)); }
  function diffDays(a, b) { return Math.round((utcDateFromDayKey(a).getTime() - utcDateFromDayKey(b).getTime()) / DAY_MS); }
  function weekday(key) { return utcDateFromDayKey(key).getUTCDay(); }

  /** Offset em minutos da zona em um instante UTC, via Intl. Retorna null se a zona não existir. */
  function zoneOffsetMinutes(tz, utcMs) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).formatToParts(new Date(utcMs));
      const g = {};
      parts.forEach(p => { g[p.type] = Number(p.value); });
      const asUtc = Date.UTC(g.year, g.month - 1, g.day, g.hour, g.minute, g.second);
      return Math.round((asUtc - utcMs) / 60000);
    } catch (e) {
      return null;
    }
  }

  /** Converte horário de parede em uma zona para o horário de parede de Brasília. */
  function wallToBrasilia(y, mo, d, h, mi, tz) {
    const naiveUtc = Date.UTC(y, mo - 1, d, h, mi);
    let offset = 0;
    if (tz) {
      const guess = zoneOffsetMinutes(tz, naiveUtc);
      if (guess === null) return { ms: naiveUtc }; // zona desconhecida: mantém o horário como está
      const refined = zoneOffsetMinutes(tz, naiveUtc - guess * 60000);
      offset = refined === null ? guess : refined;
      return { ms: naiveUtc - offset * 60000 + TARGET_OFFSET_MIN * 60000 };
    }
    return { ms: naiveUtc };
  }

  /** Interpreta o valor de DTSTART/DTEND/UNTIL/EXDATE. Retorna {dayKey, time, allDay, ms}. */
  function parseDateValue(value, params) {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/.exec(String(value || '').trim());
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const hasTime = m[4] !== undefined && !(params && String(params.VALUE || '').toUpperCase() === 'DATE');
    if (!hasTime) {
      const key = y + '-' + pad(mo) + '-' + pad(d);
      return { dayKey: key, time: null, allDay: true, ms: Date.UTC(y, mo - 1, d) };
    }
    const h = Number(m[4]), mi = Number(m[5]);
    let ms;
    if (m[7]) {
      ms = Date.UTC(y, mo - 1, d, h, mi) + TARGET_OFFSET_MIN * 60000;
    } else {
      ms = wallToBrasilia(y, mo, d, h, mi, params && params.TZID ? params.TZID : null).ms;
    }
    const local = new Date(ms);
    return { dayKey: dayKeyFromUtcDate(local), time: pad(local.getUTCHours()) + ':' + pad(local.getUTCMinutes()), allDay: false, ms };
  }

  function parseDuration(value) {
    const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(value || '').trim());
    if (!m) return null;
    return (Number(m[1] || 0) * 7 * 1440) + (Number(m[2] || 0) * 1440) + (Number(m[3] || 0) * 60) + Number(m[4] || 0);
  }

  // ---------- texto ----------
  function unescapeText(s) {
    return String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');
  }
  function cleanTitle(s) {
    const t = unescapeText(s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return (t || 'Compromisso do calendário').slice(0, 80);
  }

  // ---------- leitura do arquivo ----------
  function parseProperty(line) {
    const idx = line.indexOf(':');
    if (idx < 1) return null;
    const left = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const segs = left.split(';');
    const name = segs[0].toUpperCase();
    const params = {};
    segs.slice(1).forEach(p => {
      const eq = p.indexOf('=');
      if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
    });
    return { name, params, value };
  }

  function parseRrule(value) {
    const rule = {};
    String(value || '').split(';').forEach(part => {
      const eq = part.indexOf('=');
      if (eq > 0) rule[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
    });
    return rule;
  }

  /** Lê o texto do .ics e devolve os eventos brutos. */
  function parseIcs(text) {
    const raw = String(text == null ? '' : text).slice(0, MAX_FILE_CHARS);
    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
    const events = [];
    let ev = null;
    let alarmDepth = 0;
    lines.forEach(line => {
      const upper = line.trim().toUpperCase();
      if (upper === 'BEGIN:VEVENT') { ev = { exdates: [] }; alarmDepth = 0; return; }
      if (!ev) return;
      if (upper === 'END:VEVENT') { events.push(ev); ev = null; return; }
      if (upper === 'BEGIN:VALARM') { alarmDepth++; return; }
      if (upper === 'END:VALARM') { alarmDepth = Math.max(0, alarmDepth - 1); return; }
      if (alarmDepth > 0) return;
      const prop = parseProperty(line);
      if (!prop) return;
      switch (prop.name) {
        case 'UID': ev.uid = prop.value.trim(); break;
        case 'SUMMARY': ev.summary = prop.value; break;
        case 'STATUS': ev.status = prop.value.trim().toUpperCase(); break;
        case 'DTSTART': ev.start = parseDateValue(prop.value, prop.params); break;
        case 'DTEND': ev.end = parseDateValue(prop.value, prop.params); break;
        case 'DURATION': ev.durationMin = parseDuration(prop.value); break;
        case 'RRULE': ev.rrule = parseRrule(prop.value); break;
        case 'RECURRENCE-ID': ev.recurrenceId = parseDateValue(prop.value, prop.params); break;
        case 'EXDATE':
          prop.value.split(',').forEach(v => {
            const d = parseDateValue(v, prop.params);
            if (d) ev.exdates.push(d.dayKey);
          });
          break;
        default: break;
      }
    });
    return events;
  }

  // ---------- expansão ----------
  function untilKey(rule) {
    if (!rule.UNTIL) return null;
    const d = parseDateValue(rule.UNTIL, {});
    return d ? d.dayKey : null;
  }

  /** Dias (dayKey) em que o evento acontece dentro da janela, respeitando COUNT, UNTIL e exceções. */
  function expandDays(ev, windowStart, windowEnd, excluded) {
    const first = ev.start.dayKey;
    const rule = ev.rrule;
    const out = [];
    const push = key => { if (key >= windowStart && key <= windowEnd && !excluded.has(key)) out.push(key); };

    if (!rule || !rule.FREQ) { push(first); return out; }

    const interval = Math.max(1, parseInt(rule.INTERVAL || '1', 10) || 1);
    const count = rule.COUNT ? Math.max(1, parseInt(rule.COUNT, 10) || 1) : null;
    const until = untilKey(rule);
    const freq = rule.FREQ.toUpperCase();
    const byDay = rule.BYDAY
      ? rule.BYDAY.split(',').map(s => s.trim().toUpperCase().replace(/^[+-]?\d+/, '')).filter(s => s in WEEKDAYS).map(s => WEEKDAYS[s])
      : null;

    let generated = 0;
    let guard = 0;
    const done = key => (until && key > until) || key > windowEnd;

    if (freq === 'DAILY') {
      for (let key = first; !done(key) && guard++ < MAX_LOOP; key = addDays(key, interval)) {
        if (count !== null && generated >= count) break;
        generated++; push(key);
      }
    } else if (freq === 'WEEKLY') {
      const days = byDay && byDay.length ? byDay : [weekday(first)];
      const startOfWeek = addDays(first, -((weekday(first) + 6) % 7)); // segunda-feira
      for (let key = first; !done(key) && guard++ < MAX_LOOP; key = addDays(key, 1)) {
        const weeksSince = Math.floor(diffDays(key, startOfWeek) / 7);
        if (weeksSince % interval !== 0) continue;
        if (!days.includes(weekday(key))) continue;
        if (count !== null && generated >= count) break;
        generated++; push(key);
      }
    } else if (freq === 'MONTHLY' || freq === 'YEARLY') {
      const [fy, fm, fd] = first.split('-').map(Number);
      const step = freq === 'MONTHLY' ? interval : interval * 12;
      for (let n = 0; guard++ < MAX_LOOP; n++) {
        const total = (fm - 1) + n * step;
        const y = fy + Math.floor(total / 12);
        const mo = (total % 12) + 1;
        const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
        if (fd > lastDay) continue; // dia inexistente neste mês, por exemplo 31
        const key = y + '-' + pad(mo) + '-' + pad(fd);
        if (done(key)) break;
        if (count !== null && generated >= count) break;
        generated++; push(key);
      }
    } else {
      push(first); // frequência não suportada: só a primeira ocorrência
    }
    return out;
  }

  /**
   * Converte o texto do .ics em ocorrências datadas.
   * options: { fromDayKey (obrigatório), horizonDays (padrão 60) }
   */
  function importFromIcs(text, options) {
    const opts = options || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.fromDayKey || '')) throw new Error('fromDayKey inválido');
    const horizon = Math.max(1, Math.min(366, opts.horizonDays || 60));
    const windowStart = opts.fromDayKey;
    const windowEnd = addDays(windowStart, horizon);

    const events = parseIcs(text);
    const summary = { events: events.length, skippedAllDay: 0, skippedCancelled: 0, skippedInvalid: 0, truncated: false };

    // Instâncias alteradas de séries: a série não repete naquele dia
    const overridden = new Map();
    events.forEach(ev => {
      if (ev.recurrenceId && ev.uid) {
        if (!overridden.has(ev.uid)) overridden.set(ev.uid, new Set());
        overridden.get(ev.uid).add(ev.recurrenceId.dayKey);
      }
    });

    const items = [];
    events.forEach((ev, idx) => {
      if (ev.status === 'CANCELLED') { summary.skippedCancelled++; return; }
      if (!ev.start) { summary.skippedInvalid++; return; }
      if (ev.start.allDay) { summary.skippedAllDay++; return; }

      let minutes = 30;
      if (ev.end && !ev.end.allDay) minutes = Math.round((ev.end.ms - ev.start.ms) / 60000);
      else if (Number.isFinite(ev.durationMin)) minutes = ev.durationMin;
      if (!Number.isFinite(minutes) || minutes <= 0) minutes = 30;
      minutes = Math.max(5, Math.min(480, minutes));

      const excluded = new Set(ev.exdates);
      if (ev.uid && overridden.has(ev.uid) && !ev.recurrenceId) overridden.get(ev.uid).forEach(k => excluded.add(k));

      const uid = ev.uid || ('sem-uid-' + idx + '-' + (ev.summary || ''));
      const title = cleanTitle(ev.summary);
      expandDays(ev, windowStart, windowEnd, excluded).forEach(dayKey => {
        items.push({ key: 'ics:' + uid + ':' + dayKey + 'T' + ev.start.time, title, date: dayKey, time: ev.start.time, plannedMinutes: minutes });
      });
    });

    items.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : a.date + a.time > b.date + b.time ? 1 : 0));
    if (items.length > MAX_INSTANCES) { items.length = MAX_INSTANCES; summary.truncated = true; }
    summary.instances = items.length;
    summary.windowStart = windowStart;
    summary.windowEnd = windowEnd;
    return { items, summary };
  }

  // ---------- integração com o app ----------
  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /** Id seguro para atributos HTML: só letras, números, _ e -. */
  function safeId(key) {
    return 'ics_' + key.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40) + '_' + hash(key);
  }

  /** Cria ocorrências no formato do app, pulando as já importadas antes. */
  function toOccurrences(items, existingOccurrences) {
    const have = new Set((Array.isArray(existingOccurrences) ? existingOccurrences : []).map(o => o && o.icsKey).filter(Boolean));
    const out = [];
    let duplicates = 0;
    (items || []).forEach(it => {
      if (have.has(it.key)) { duplicates++; return; }
      have.add(it.key);
      out.push({
        id: safeId(it.key),
        icsKey: it.key,
        title: it.title,
        time: it.time,
        plannedStart: it.date + 'T' + it.time + ':00',
        plannedZone: 'America/Sao_Paulo',
        plannedMinutes: it.plannedMinutes,
        goalId: null,
        stepId: null,
        effort: it.plannedMinutes >= 60 ? 'G' : (it.plannedMinutes >= 30 ? 'M' : 'P'),
        reward: it.plannedMinutes >= 60 ? 20 : (it.plannedMinutes >= 30 ? 10 : 5),
        estimatedDuration: it.plannedMinutes,
        recurrence: 'Data específica',
        maxRuns: 0,
        completedRuns: 0,
        notes: '',
        date: it.date,
        state: 'pending',
        delayMin: 0
      });
    });
    return { occurrences: out, duplicates };
  }

  return { parseIcs, importFromIcs, toOccurrences, safeId, parseDateValue };
});
