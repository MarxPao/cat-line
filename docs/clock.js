// web-preview/clock.js
// Provedor de tempo puro e determinístico para o Cat Line
// Permite injeção de relógio falso (FakeClock) para testes e simulações sem chamadas dispersas a Date.now()

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineClock = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  let _fakeTimestamp = null;

  const CatLineClock = {
    /**
     * Retorna o timestamp atual em milissegundos (falso ou real).
     * @returns {number}
     */
    now() {
      return _fakeTimestamp !== null ? _fakeTimestamp : Date.now();
    },

    /**
     * Retorna uma nova instância de Date baseada no relógio atual ou argumento.
     * @param {number|string|Date} [val]
     * @returns {Date}
     */
    newDate(val) {
      if (val !== undefined && val !== null) {
        return new Date(val);
      }
      return new Date(this.now());
    },

    /**
     * Retorna a data no formato YYYY-MM-DD para o dia atual.
     * @returns {string}
     */
    todayStr() {
      const d = this.newDate();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    },

    /**
     * Retorna string ISO 8601 baseada no tempo atual.
     * @returns {string}
     */
    isoString() {
      return this.newDate().toISOString();
    },

    /**
     * Define um instante fixo para simulações e testes determinísticos.
     * @param {number|string|Date} fakeVal
     */
    setFakeTime(fakeVal) {
      if (fakeVal instanceof Date) {
        _fakeTimestamp = fakeVal.getTime();
      } else if (typeof fakeVal === 'string') {
        const parsed = Date.parse(fakeVal);
        if (isNaN(parsed)) {
          throw new Error('Data inválida para setFakeTime: ' + fakeVal);
        }
        _fakeTimestamp = parsed;
      } else if (typeof fakeVal === 'number') {
        _fakeTimestamp = fakeVal;
      } else {
        throw new Error('Valor inválido para setFakeTime');
      }
    },

    /**
     * Avança o tempo simulado em milissegundos.
     * @param {number} ms
     */
    advanceByMs(ms) {
      if (_fakeTimestamp === null) {
        _fakeTimestamp = Date.now();
      }
      _fakeTimestamp += ms;
      return _fakeTimestamp;
    },

    /**
     * Restaura o relógio real do sistema.
     */
    restoreRealTime() {
      _fakeTimestamp = null;
    },

    /**
     * Informa se o modo de relógio falso está ativo.
     * @returns {boolean}
     */
    isFakeTimeActive() {
      return _fakeTimestamp !== null;
    },

    /**
     * Formata um timestamp para hora local pt-BR (HH:MM).
     * @param {number} [ms]
     * @returns {string}
     */
    formatTime(ms) {
      const d = this.newDate(ms);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  };

  return CatLineClock;
}));
