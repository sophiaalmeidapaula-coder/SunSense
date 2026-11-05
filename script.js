/**
 * ============================================================
 *  SUNSENSE — Motor Interativo de Simulação Solar
 *  Versão: 1.0.0 | Novembro 2026
 *  Módulos: LDR, Posição Solar, Coletor, Conversor,
 *           Gráfico Diurno, Espectro, Quiz Educativo
 * ============================================================
 */

const SunSense = (() => {
  'use strict';

  // ============ PALETA GLOBAL (espelha CSS) ============
  const PALETTE = {
    sun1: '#FFD166', sun2: '#FF9F1C', sun3: '#E85D04',
    sky1: '#1B2A4E', sky2: '#2C3E6B', bg: '#0F1626',
    card: '#1A2340', text: '#E8ECF4', muted: '#A8B2C9',
    success: '#06D6A0', danger: '#EF476F'
  };

  // ============ UTILITÁRIOS MATEMÁTICOS ============
  const Utils = {
    deg2rad: d => d * Math.PI / 180,
    rad2deg: r => r * 180 / Math.PI,
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    format: (n, d = 2) => Number(n).toFixed(d)
  };

  // ============================================================
  //  MÓDULO 1 — SIMULADOR DE LDR (Resistor Dependente de Luz)
  // ============================================================
  class SimuladorLDR {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;
      this.gamma = 0.8;          // expoente típico CdS
      this.rDark = 1_000_000;    // 1 MΩ no escuro
      this.r10 = 10_000;         // 10 kΩ @ 10 lux
      this.vcc = 5;              // alimentação
      this.rFixo = 10_000;       // resistor do divisor
      this.render();
      this.bindEvents();
      this.update();
    }

    // R(Lux) = R10 * (Lux/10)^(-gamma)
    resistencia(lux) {
      if (lux <= 0.1) return this.rDark;
      return this.r10 * Math.pow(lux / 10, -this.gamma);
    }

    render() {
      this.container.innerHTML = `
        <div class="ldr-sim" style="background:var(--card);padding:2rem;border-radius:16px;">
          <h3 style="color:var(--accent);margin-bottom:1rem;">⚡ Simulador de LDR em Tempo Real</h3>
          <p style="color:var(--muted);font-size:0.95rem;margin-bottom:1.5rem;">
            Ajuste a iluminância e veja como o LDR responde: resistência, corrente e tensão de saída.
          </p>

          <div style="margin-bottom:1.5rem;">
            <label style="color:var(--text);font-weight:500;">☀️ Iluminância: <span id="ldr-lux-val" style="color:var(--accent);">100</span> lux</label>
            <input type="range" id="ldr-lux" min="0" max="100000" value="100" step="1"
                   style="width:100%;accent-color:var(--sun-2);">
            <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:0.8rem;">
              <span>Escuro (0)</span><span>Crepúsculo (10)</span><span>Interior (500)</span><span>Sol (100k)</span>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1.5rem;">
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Resistência</div>
              <div id="ldr-r" style="color:var(--sun-1);font-size:1.4rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Corrente</div>
              <div id="ldr-i" style="color:var(--sun-2);font-size:1.4rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Vout (ADC)</div>
              <div id="ldr-v" style="color:var(--success);font-size:1.4rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Leitura ADC 10b</div>
              <div id="ldr-adc" style="color:var(--danger);font-size:1.4rem;font-weight:700;">—</div>
            </div>
          </div>

          <canvas id="ldr-canvas" width="700" height="180" style="width:100%;background:#0a1020;border-radius:10px;"></canvas>
          <p style="color:var(--muted);font-size:0.8rem;margin-top:0.5rem;text-align:center;">
            Curva característica R × Lux (escala log-log)
          </p>
        </div>
      `;
    }

    bindEvents() {
      const slider = this.container.querySelector('#ldr-lux');
      slider.addEventListener('input', e => {
        this.lux = parseFloat(e.target.value);
        this.container.querySelector('#ldr-lux-val').textContent = this.lux.toLocaleString('pt-BR');
        this.update();
      });
    }

    update() {
      const lux = this.lux || 100;
      const R = this.resistencia(lux);
      const I = this.vcc / (R + this.rFixo);
      const Vout = this.vcc * R / (R + this.rFixo);
      const adc = Math.round((Vout / this.vcc) * 1023);

      this.container.querySelector('#ldr-r').textContent = this.formatResistance(R);
      this.container.querySelector('#ldr-i').textContent = this.formatCurrent(I);
      this.container.querySelector('#ldr-v').textContent = Utils.format(Vout, 2) + ' V';
      this.container.querySelector('#ldr-adc').textContent = adc;

      this.drawCurve(lux);
    }

    formatResistance(R) {
      if (R >= 1e6) return Utils.format(R / 1e6, 2) + ' MΩ';
      if (R >= 1e3) return Utils.format(R / 1e3, 2) + ' kΩ';
      return Utils.format(R, 0) + ' Ω';
    }

    formatCurrent(I) {
      if (I < 1e-6) return Utils.format(I * 1e9, 2) + ' nA';
      if (I < 1e-3) return Utils.format(I * 1e6, 2) + ' µA';
      return Utils.format(I * 1e3, 2) + ' mA';
    }

    drawCurve(currentLux) {
      const canvas = this.container.querySelector('#ldr-canvas');
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Eixos
      ctx.strokeStyle = PALETTE.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, 20); ctx.lineTo(50, H - 30); ctx.lineTo(W - 20, H - 30);
      ctx.stroke();

      // Labels
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '11px Segoe UI';
      ctx.fillText('R (Ω)', 10, 15);
      ctx.fillText('Lux', W - 40, H - 10);

      // Curva log-log
      ctx.strokeStyle = PALETTE.sun2;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const logMin = 0, logMax = 5;      // lux 1 → 100000
      const rMin = 100, rMax = 1e6;
      const logRMin = Math.log10(rMin), logRMax = Math.log10(rMax);

      for (let i = 0; i <= 200; i++) {
        const logLux = logMin + (logMax - logMin) * i / 200;
        const lux = Math.pow(10, logLux);
        const R = this.resistencia(lux);
        const logR = Math.log10(R);
        const x = 50 + (W - 70) * i / 200;
        const y = H - 30 - (H - 50) * (logR - logRMin) / (logRMax - logRMin);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Ponto atual
      if (currentLux > 0) {
        const logLux = Math.log10(currentLux);
        const R = this.resistencia(currentLux);
        const logR = Math.log10(R);
        const x = 50 + (W - 70) * (logLux - logMin) / (logMax - logMin);
        const y = H - 30 - (H - 50) * (logR - logRMin) / (logRMax - logRMin);
        ctx.fillStyle = PALETTE.danger;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PALETTE.text;
        ctx.fillText(`${currentLux} lux → ${this.formatResistance(R)}`, x + 10, y - 5);
      }
    }
  }

  // ============================================================
  //  MÓDULO 2 — CALCULADORA DE POSIÇÃO SOLAR (algoritmo NOAA simplificado)
  // ============================================================
  class CalculadoraSolar {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;
      this.render();
      this.bindEvents();
      this.calcular();
    }

    render() {
      this.container.innerHTML = `
        <div style="background:var(--card);padding:2rem;border-radius:16px;">
          <h3 style="color:var(--accent);margin-bottom:1rem;">🌍 Calculadora de Posição Solar</h3>
          <p style="color:var(--muted);font-size:0.95rem;margin-bottom:1.5rem;">
            Informe latitude, longitude, data e hora para calcular elevação e azimute do Sol (algoritmo NOAA).
          </p>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1.5rem;">
            <div>
              <label style="color:var(--text);font-size:0.9rem;">Latitude (°)</label>
              <input type="number" id="solar-lat" value="-23.55" step="0.01"
                     style="width:100%;padding:0.5rem;background:#0a1020;border:1px solid rgba(255,209,102,0.2);color:var(--text);border-radius:6px;">
            </div>
            <div>
              <label style="color:var(--text);font-size:0.9rem;">Longitude (°)</label>
              <input type="number" id="solar-lon" value="-46.63" step="0.01"
                     style="width:100%;padding:0.5rem;background:#0a1020;border:1px solid rgba(255,209,102,0.2);color:var(--text);border-radius:6px;">
            </div>
            <div>
              <label style="color:var(--text);font-size:0.9rem;">Data</label>
              <input type="date" id="solar-date"
                     style="width:100%;padding:0.5rem;background:#0a1020;border:1px solid rgba(255,209,102,0.2);color:var(--text);border-radius:6px;">
            </div>
            <div>
              <label style="color:var(--text);font-size:0.9rem;">Hora (local)</label>
              <input type="time" id="solar-time" value="12:00"
                     style="width:100%;padding:0.5rem;background:#0a1020;border:1px solid rgba(255,209,102,0.2);color:var(--text);border-radius:6px;">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;">
            <div style="background:#0a1020;padding:1.2rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.85rem;">Elevação Solar</div>
              <div id="solar-elev" style="color:var(--sun-1);font-size:1.8rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1.2rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.85rem;">Azimute</div>
              <div id="solar-az" style="color:var(--sun-2);font-size:1.8rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1.2rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.85rem;">Massa de Ar (AM)</div>
              <div id="solar-am" style="color:var(--success);font-size:1.8rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1.2rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.85rem;">Irradiância Direta Est.</div>
              <div id="solar-irr" style="color:var(--danger);font-size:1.8rem;font-weight:700;">—</div>
            </div>
          </div>

          <canvas id="solar-canvas" width="400" height="400" style="width:100%;max-width:400px;margin:2rem auto;display:block;background:#0a1020;border-radius:50%;"></canvas>
        </div>
      `;
    }

    bindEvents() {
      ['solar-lat', 'solar-lon', 'solar-date', 'solar-time'].forEach(id => {
        this.container.querySelector('#' + id).addEventListener('change', () => this.calcular());
      });
      // Data padrão = hoje
      const hoje = new Date().toISOString().split('T')[0];
      this.container.querySelector('#solar-date').value = hoje;
    }

    // Algoritmo NOAA simplificado
    calcular() {
      const lat = parseFloat(this.container.querySelector('#solar-lat').value);
      const lon = parseFloat(this.container.querySelector('#solar-lon').value);
      const dateStr = this.container.querySelector('#solar-date').value;
      const timeStr = this.container.querySelector('#solar-time').value || '12:00';

      const [y, m, d] = dateStr.split('-').map(Number);
      const [h, min] = timeStr.split(':').map(Number);
      const decimalHour = h + min / 60;

      // Dia do ano
      const date = new Date(y, m - 1, d);
      const start = new Date(y, 0, 0);
      const diff = date - start;
      const dayOfYear = Math.floor(diff / 86400000);

      // Fração do ano (gamma)
      const gamma = 2 * Math.PI / 365 * (dayOfYear - 1);

      // Equação do tempo (minutos)
      const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma)
                     - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma)
                     - 0.040849 * Math.sin(2 * gamma));

      // Declinação solar (rad)
      const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
                 - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
                 - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

      // Hora solar
      const timeOffset = eqtime + 4 * lon; // minutos
      const tst = (decimalHour * 60 + timeOffset) % 1440; // true solar time em minutos
      const ha = Utils.deg2rad((tst / 4) - 180); // hour angle em rad

      const latRad = Utils.deg2rad(lat);

      // Elevação
      const sinElev = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(ha);
      const elev = Utils.rad2deg(Math.asin(Utils.clamp(sinElev, -1, 1)));

      // Azimute
      const cosAz = (Math.sin(decl) - Math.sin(latRad) * sinElev) / (Math.cos(latRad) * Math.cos(Utils.deg2rad(elev)));
      let az = Utils.rad2deg(Math.acos(Utils.clamp(cosAz, -1, 1)));
      if (ha > 0) az = 360 - az;

      // Massa de ar (Kasten & Young 1989)
      let AM = elev > 0 ? 1 / (Math.cos(Utils.deg2rad(90 - elev)) + 0.50572 * Math.pow(90 - elev + 6.07995, -1.6364)) : 99;

      // Irradiância direta estimada (modelo simplificado com atenuação atmosférica)
      const I0 = 1361; // constante solar
      const Idir = elev > 0 ? I0 * Math.exp(-0.14 * AM) * sinElev : 0;

      // Atualiza display
      this.container.querySelector('#solar-elev').textContent = Utils.format(elev, 1) + '°';
      this.container.querySelector('#solar-az').textContent = Utils.format(az, 1) + '°';
      this.container.querySelector('#solar-am').textContent = elev > 0 ? Utils.format(AM, 2) : '—';
      this.container.querySelector('#solar-irr').textContent = elev > 0 ? Utils.format(Idir, 0) + ' W/m²' : 'Noite';

      this.drawCompass(elev, az);
    }

    drawCompass(elev, az) {
      const canvas = this.container.querySelector('#solar-canvas');
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) / 2 - 20;
      ctx.clearRect(0, 0, W, H);

      // Fundo circular
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      grad.addColorStop(0, '#1B2A4E');
      grad.addColorStop(1, '#0a1020');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Círculos concêntricos (elevação)
      ctx.strokeStyle = 'rgba(168,178,201,0.2)';
      ctx.lineWidth = 1;
      for (let e = 30; e <= 60; e += 30) {
        const r = R * (1 - e / 90);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }

      // Linhas cardinais
      ctx.strokeStyle = 'rgba(168,178,201,0.3)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.stroke();

      // Cardinais
      ctx.fillStyle = PALETTE.muted;
      ctx.font = 'bold 14px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('N', cx, cy - R + 15);
      ctx.fillText('S', cx, cy + R - 5);
      ctx.fillText('L', cx + R - 15, cy + 5);
      ctx.fillText('O', cx - R + 15, cy + 5);

      // Sol
      if (elev > 0) {
        const sunR = R * (1 - elev / 90);
        const sunAngle = Utils.deg2rad(az - 90); // N=0, L=90 (sentido horário)
        const sx = cx + sunR * Math.cos(sunAngle);
        const sy = cy + sunR * Math.sin(sunAngle);

        // Halo
        const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30);
        halo.addColorStop(0, 'rgba(255,209,102,0.8)');
        halo.addColorStop(1, 'rgba(255,209,102,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.fill();

        // Sol
        ctx.fillStyle = PALETTE.sun1;
        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = PALETTE.text;
        ctx.font = '11px Segoe UI';
        ctx.fillText(`${Utils.format(elev, 0)}°`, sx, sy - 18);
      } else {
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '14px Segoe UI';
        ctx.fillText('🌙 Sol abaixo do horizonte', cx, cy);
      }
    }
  }

  // ============================================================
  //  MÓDULO 3 — SIMULADOR DE COLETOR SOLAR (Lei do Cosseno)
  // ============================================================
  class SimuladorColetor {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;
      this.render();
      this.bindEvents();
      this.update();
    }

    render() {
      this.container.innerHTML = `
        <div style="background:var(--card);padding:2rem;border-radius:16px;">
          <h3 style="color:var(--accent);margin-bottom:1rem;">🏠 Simulador de Coletor Solar</h3>
          <p style="color:var(--muted);font-size:0.95rem;margin-bottom:1.5rem;">
            Ajuste inclinação (tilt) e orientação (azimute) do coletor. A energia captada segue <code>E = E₀·cos(θ)</code>.
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
            <div>
              <label style="color:var(--text);">📐 Inclinação (tilt): <span id="col-tilt-val" style="color:var(--accent);">30</span>°</label>
              <input type="range" id="col-tilt" min="0" max="90" value="30" style="width:100%;accent-color:var(--sun-2);">
            </div>
            <div>
              <label style="color:var(--text);">🧭 Orientação (azimute): <span id="col-az-val" style="color:var(--accent);">0</span>° (Norte)</label>
              <input type="range" id="col-az" min="-180" max="180" value="0" style="width:100%;accent-color:var(--sun-2);">
              <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:0.75rem;">
                <span>-180° (S)</span><span>0° (N)</span><span>+180° (S)</span>
              </div>
            </div>
          </div>

          <canvas id="col-canvas" width="600" height="300" style="width:100%;background:#0a1020;border-radius:10px;"></canvas>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-top:1.5rem;">
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Ângulo de incidência</div>
              <div id="col-theta" style="color:var(--sun-1);font-size:1.3rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Fator cos(θ)</div>
              <div id="col-cos" style="color:var(--sun-2);font-size:1.3rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Irradiância captada</div>
              <div id="col-irr" style="color:var(--success);font-size:1.3rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Perda vs. ótimo</div>
              <div id="col-perda" style="color:var(--danger);font-size:1.3rem;font-weight:700;">—</div>
            </div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      ['col-tilt', 'col-az'].forEach(id => {
        this.container.querySelector('#' + id).addEventListener('input', e => {
          this.container.querySelector('#' + id + '-val').textContent = e.target.value;
          this.update();
        });
      });
    }

    update() {
      const tilt = parseFloat(this.container.querySelector('#col-tilt').value);
      const az = parseFloat(this.container.querySelector('#col-az').value);

      // Simulação: Sol ao meio-dia, elevação 60°, azimute 0° (Norte, HS)
      const sunElev = 60;
      const sunAz = 0;

      // Ângulo de incidência (fórmula simplificada)
      const theta = Math.abs(tilt - (90 - sunElev)) + Math.abs(az - sunAz) * 0.5;
      const thetaRad = Utils.deg2rad(Utils.clamp(theta, 0, 90));
      const cosT = Math.cos(thetaRad);

      const E0 = 1000; // W/m² ao meio-dia
      const Ecap = E0 * cosT;
      const perda = (1 - cosT) * 100;

      this.container.querySelector('#col-theta').textContent = Utils.format(theta, 1) + '°';
      this.container.querySelector('#col-cos').textContent = Utils.format(cosT, 3);
      this.container.querySelector('#col-irr').textContent = Utils.format(Ecap, 0) + ' W/m²';
      this.container.querySelector('#col-perda').textContent = Utils.format(perda, 1) + '%';

      this.draw(tilt, az, theta);
    }

    draw(tilt, az, theta) {
      const canvas = this.container.querySelector('#col-canvas');
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Céu
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
      sky.addColorStop(0, '#2C3E6B');
      sky.addColorStop(1, '#1B2A4E');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.7);

      // Chão
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(0, H * 0.7, W, H * 0.3);

      // Sol
      const sunX = W * 0.75, sunY = H * 0.2;
      const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
      halo.addColorStop(0, 'rgba(255,209,102,0.9)');
      halo.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(sunX, sunY, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.sun1;
      ctx.beginPath(); ctx.arc(sunX, sunY, 20, 0, Math.PI * 2); ctx.fill();

      // Raios
      ctx.strokeStyle = 'rgba(255,209,102,0.4)';
      ctx.lineWidth = 1.5;
      const panelX = W * 0.35, panelBaseY = H * 0.7;
      for (let i = 0; i < 5; i++) {
        const offset = (i - 2) * 15;
        ctx.beginPath();
        ctx.moveTo(sunX + offset, sunY + 20);
        ctx.lineTo(panelX + offset, panelBaseY - 40);
        ctx.stroke();
      }

      // Painel (inclinado conforme tilt)
      const panelLen = 120;
      const tiltRad = Utils.deg2rad(tilt);
      const px1 = panelX - panelLen / 2 * Math.cos(tiltRad);
      const py1 = panelBaseY - panelLen / 2 * Math.sin(tiltRad);
      const px2 = panelX + panelLen / 2 * Math.cos(tiltRad);
      const py2 = panelBaseY + panelLen / 2 * Math.sin(tiltRad);

      ctx.strokeStyle = PALETTE.sun2;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px1, py1); ctx.lineTo(px2, py2);
      ctx.stroke();

      // Suporte
      ctx.strokeStyle = PALETTE.muted;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(panelX, panelBaseY);
      ctx.lineTo(panelX, panelBaseY - 20);
      ctx.stroke();

      // Labels
      ctx.fillStyle = PALETTE.text;
      ctx.font = '12px Segoe UI';
      ctx.fillText(`Tilt: ${tilt}°`, panelX - 30, panelBaseY + 30);
      ctx.fillText(`Az: ${az}°`, panelX - 30, panelBaseY + 45);
      ctx.fillText(`θ = ${Utils.format(theta, 1)}°`, panelX + 60, panelBaseY - 50);
      ctx.fillText('☀ Sol', sunX - 15, sunY - 30);
    }
  }

  // ============================================================
  //  MÓDULO 4 — CONVERSOR DE UNIDADES (lux ↔ W/m²)
  // ============================================================
  class ConversorUnidades {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;
      // Fatores de conversão aproximados (lux → W/m²)
      this.fatores = {
        'Sol direto (meio-dia)': 0.0079,
        'Sol manhã/tarde': 0.0085,
        'Céu nublado': 0.0095,
        'Luz fluorescente': 0.013,
        'Luz incandescente': 0.015,
        'LED branco': 0.012
      };
      this.render();
      this.bindEvents();
    }

    render() {
      const opts = Object.keys(this.fatores).map(k => `<option value="${k}">${k}</option>`).join('');
      this.container.innerHTML = `
        <div style="background:var(--card);padding:2rem;border-radius:16px;">
          <h3 style="color:var(--accent);margin-bottom:1rem;">🔄 Conversor Lux ↔ W/m²</h3>
          <p style="color:var(--muted);font-size:0.95rem;margin-bottom:1.5rem;">
            A conversão depende do espectro da fonte. Escolha o tipo de luz:
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
            <div>
              <label style="color:var(--text);">Valor em Lux</label>
              <input type="number" id="conv-lux" value="100000" step="100"
                     style="width:100%;padding:0.6rem;background:#0a1020;border:1px solid rgba(255,209,102,0.2);color:var(--text);border-radius:6px;font-size:1.1rem;">
            </div>
            <div>
              <label style="color:var(--text);">Tipo de fonte</label>
              <select id="conv-fonte" style="width:100%;padding:0.6rem;background:#0a1020;border:1px solid rgba(255,209,102,0.2);color:var(--text);border-radius:6px;">
                ${opts}
              </select>
            </div>
          </div>

          <div style="background:#0a1020;padding:1.5rem;border-radius:10px;text-align:center;">
            <div style="color:var(--muted);font-size:0.9rem;">Irradiância equivalente</div>
            <div id="conv-result" style="color:var(--sun-1);font-size:2.2rem;font-weight:800;margin:0.5rem 0;">—</div>
            <div id="conv-detail" style="color:var(--muted);font-size:0.85rem;">—</div>
          </div>

          <div style="margin-top:1rem;padding:1rem;background:rgba(239,71,111,0.1);border-left:3px solid var(--danger);border-radius:6px;">
            <strong style="color:var(--danger);">⚠️ Atenção:</strong>
            <span style="color:var(--muted);font-size:0.9rem;">
              Lux mede luz <em>percebida pelo olho humano</em> (pico em 555 nm). W/m² mede energia total.
              A conversão é aproximada e depende do espectro da fonte.
            </span>
          </div>
        </div>
      `;
    }

    bindEvents() {
      ['conv-lux', 'conv-fonte'].forEach(id => {
        this.container.querySelector('#' + id).addEventListener('input', () => this.converter());
      });
      this.converter();
    }

    converter() {
      const lux = parseFloat(this.container.querySelector('#conv-lux').value) || 0;
      const fonte = this.container.querySelector('#conv-fonte').value;
      const fator = this.fatores[fonte];
      const wm2 = lux * fator;

      this.container.querySelector('#conv-result').textContent = Utils.format(wm2, 1) + ' W/m²';
      this.container.querySelector('#conv-detail').textContent =
        `${lux.toLocaleString('pt-BR')} lux × ${fator} = ${Utils.format(wm2, 2)} W/m²`;
    }
  }

  // ============================================================
  //  MÓDULO 5 — GRÁFICO DE VARIAÇÃO DIURNA (Canvas)
  // ============================================================
  class GraficoDiurno {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;
      this.lat = -23.55;
      this.render();
      this.bindEvents();
      this.desenhar();
    }

    render() {
      this.container.innerHTML = `
        <div style="background:var(--card);padding:2rem;border-radius:16px;">
          <h3 style="color:var(--accent);margin-bottom:1rem;">📈 Curva de Irradiância Diurna</h3>
          <p style="color:var(--muted);font-size:0.95rem;margin-bottom:1.5rem;">
            Simulação da irradiância solar ao longo do dia para diferentes estações do ano.
          </p>

          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem;">
            <button class="estacao-btn" data-est="verao" style="padding:0.5rem 1rem;background:var(--sun-2);color:#fff;border:none;border-radius:20px;cursor:pointer;">Verão</button>
            <button class="estacao-btn" data-est="equinocio" style="padding:0.5rem 1rem;background:var(--sky-2);color:#fff;border:none;border-radius:20px;cursor:pointer;">Equinócio</button>
            <button class="estacao-btn" data-est="inverno" style="padding:0.5rem 1rem;background:var(--sky-3);color:#fff;border:none;border-radius:20px;cursor:pointer;">Inverno</button>
          </div>

          <canvas id="diurno-canvas" width="800" height="350" style="width:100%;background:#0a1020;border-radius:10px;"></canvas>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-top:1.5rem;">
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Pico do dia</div>
              <div id="diurno-pico" style="color:var(--sun-1);font-size:1.3rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Nascer do sol</div>
              <div id="diurno-nascer" style="color:var(--success);font-size:1.3rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Pôr do sol</div>
              <div id="diurno-por" style="color:var(--danger);font-size:1.3rem;font-weight:700;">—</div>
            </div>
            <div style="background:#0a1020;padding:1rem;border-radius:10px;text-align:center;">
              <div style="color:var(--muted);font-size:0.8rem;">Insolação</div>
              <div id="diurno-insol" style="color:var(--sun-2);font-size:1.3rem;font-weight:700;">—</div>
            </div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      this.container.querySelectorAll('.estacao-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          this.container.querySelectorAll('.estacao-btn').forEach(b => b.style.background = PALETTE.sky2);
          e.target.style.background = PALETTE.sun2;
          this.estacao = e.target.dataset.est;
          this.desenhar();
        });
      });
    }

    // Declinação solar por estação (HS)
    getDeclinacao() {
      switch (this.estacao) {
        case 'verao': return -23.44;   // Dez HS: Sol no trópico de Capricórnio
        case 'inverno': return 23.44;  // Jun HS
        default: return 0;             // Equinócio
      }
    }

    desenhar() {
      const canvas = this.container.querySelector('#diurno-canvas');
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const decl = Utils.deg2rad(this.getDeclinacao());
      const lat = Utils.deg2rad(this.lat);

      // Ângulo horário do nascer do sol
      const cosHA = -Math.tan(lat) * Math.tan(decl);
      let haNascer, nascer, por;
      if (cosHA < -1) { haNascer = Math.PI; nascer = 0; por = 24; } // sol da meia-noite
      else if (cosHA > 1) { haNascer = 0; nascer = 12; por = 12; }  // noite polar
      else {
        haNascer = Math.acos(cosHA);
        const durDia = 24 * haNascer / Math.PI;
        nascer = 12 - durDia / 2;
        por = 12 + durDia / 2;
      }

      // Eixos
      ctx.strokeStyle = PALETTE.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, 30); ctx.lineTo(60, H - 40); ctx.lineTo(W - 20, H - 40);
      ctx.stroke();

      // Grid horário
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '11px Segoe UI';
      for (let h = 0; h <= 24; h += 3) {
        const x = 60 + (W - 80) * h / 24;
        ctx.fillText(h + 'h', x - 10, H - 20);
        ctx.strokeStyle = 'rgba(168,178,201,0.1)';
        ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, H - 40); ctx.stroke();
      }
      ctx.fillText('Irradiância (W/m²)', 10, 20);

      // Curva de irradiância
      ctx.strokeStyle = PALETTE.sun2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      let pico = 0;
      let started = false;
      for (let h = 0; h <= 24; h += 0.1) {
        const ha = Utils.deg2rad((h - 12) * 15);
        const sinElev = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
        const elev = Utils.rad2deg(Math.asin(Utils.clamp(sinElev, -1, 1)));
        const irr = elev > 0 ? 1361 * Math.exp(-0.14 / sinElev) * sinElev : 0;
        const x = 60 + (W - 80) * h / 24;
        const y = H - 40 - (H - 70) * irr / 1200;
        if (irr > pico) pico = irr;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Preenchimento abaixo da curva
      ctx.lineTo(W - 20, H - 40);
      ctx.lineTo(60, H - 40);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 30, 0, H - 40);
      grad.addColorStop(0, 'rgba(255,159,28,0.4)');
      grad.addColorStop(1, 'rgba(255,159,28,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Atualiza dados
      this.container.querySelector('#diurno-pico').textContent = Utils.format(pico, 0) + ' W/m²';
      this.container.querySelector('#diurno-nascer').textContent = this.formatHora(nascer);
      this.container.querySelector('#diurno-por').textContent = this.formatHora(por);
      this.container.querySelector('#diurno-insol').textContent = Utils.format(por - nascer, 1) + ' h';
    }

    formatHora(h) {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }

  // ============================================================
  //  MÓDULO 6 — QUIZ EDUCATIVO (com localStorage)
  // ============================================================
  class QuizEducativo {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;
      this.perguntas = [
        {
          q: 'Qual é o princípio físico de funcionamento de um LDR de CdS?',
          opts: ['Efeito fotovoltaico', 'Efeito fotocondutivo', 'Efeito termoelétrico', 'Efeito piezoelétrico'],
          resp: 1
        },
        {
          q: 'Qual o valor aproximado da constante solar (fora da atmosfera)?',
          opts: ['100 W/m²', '500 W/m²', '1361 W/m²', '5000 W/m²'],
          resp: 2
        },
        {
          q: 'No Hemisfério Sul, qual a orientação ideal de um coletor solar fixo?',
          opts: ['Sul', 'Norte', 'Leste', 'Oeste'],
          resp: 1
        },
        {
          q: 'Qual sensor tem resposta mais linear à irradiância?',
          opts: ['LDR de CdS', 'Fotodiodo de Si', 'Termistor', 'Ambos iguais'],
          resp: 1
        },
        {
          q: 'A Lei do Cosseno diz que a irradiância efetiva é:',
          opts: ['E = E₀ · sen(θ)', 'E = E₀ · cos(θ)', 'E = E₀ / θ', 'E = E₀ · θ²'],
          resp: 1
        },
        {
          q: 'O padrão AM1.5 representa:',
          opts: ['Espectro solar no espaço', 'Espectro solar com Sol a 48,2° do zênite', 'Espectro de LED branco', 'Espectro de lâmpada incandescente'],
          resp: 1
        },
        {
          q: 'Qual a principal limitação de um LDR para medição precisa?',
          opts: ['Alta velocidade', 'Não-linearidade e deriva térmica', 'Custo elevado', 'Baixa sensibilidade'],
          resp: 1
        },
        {
          q: 'Um piranômetro profissional mede:',
          opts: ['Apenas luz visível', 'Irradiância hemisférica (300–3000 nm)', 'Apenas UV', 'Temperatura do Sol'],
          resp: 1
        }
      ];
      this.indice = 0;
      this.acertos = 0;
      this.render();
    }

    render() {
      this.container.innerHTML = `
        <div style="background:var(--card);padding:2rem;border-radius:16px;">
          <h3 style="color:var(--accent);margin-bottom:1rem;">🎓 Quiz SunSense</h3>
          <p style="color:var(--muted);font-size:0.95rem;margin-bottom:1.5rem;">
            Teste seus conhecimentos sobre sensores e radiação solar!
          </p>

          <div id="quiz-progress" style="display:flex;gap:0.3rem;margin-bottom:1.5rem;"></div>

          <div id="quiz-body"></div>
        </div>
      `;
      this.mostrarPergunta();
    }

    mostrarPergunta() {
      const body = this.container.querySelector('#quiz-body');
      const prog = this.container.querySelector('#quiz-progress');

      // Barra de progresso
      prog.innerHTML = this.perguntas.map((_, i) =>
        `<div style="flex:1;height:6px;border-radius:3px;background:${
          i < this.indice ? PALETTE.success : i === this.indice ? PALETTE.sun2 : PALETTE.sky2
        };"></div>`
      ).join('');

      if (this.indice >= this.perguntas.length) {
        this.finalizar();
        return;
      }

      const p = this.perguntas[this.indice];
      body.innerHTML = `
        <div style="background:#0a1020;padding:1.5rem;border-radius:10px;margin-bottom:1rem;">
          <div style="color:var(--muted);font-size:0.85rem;margin-bottom:0.5rem;">
            Pergunta ${this.indice + 1} de ${this.perguntas.length}
          </div>
          <div style="color:var(--text);font-size:1.1rem;font-weight:500;">${p.q}</div>
        </div>
        <div id="quiz-opts" style="display:grid;gap:0.75rem;"></div>
      `;

      const opts = body.querySelector('#quiz-opts');
      p.opts.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.style.cssText = 'padding:1rem;background:#1A2340;border:2px solid rgba(255,209,102,0.2);color:var(--text);border-radius:10px;cursor:pointer;text-align:left;font-size:1rem;transition:all 0.2s;';
        btn.onmouseenter = () => btn.style.borderColor = PALETTE.sun2;
        btn.onmouseleave = () => btn.style.borderColor = 'rgba(255,209,102,0.2)';
        btn.onclick = () => this.responder(i, btn);
        opts.appendChild(btn);
      });
    }

    responder(i, btn) {
      const p = this.perguntas[this.indice];
      const opts = this.container.querySelectorAll('#quiz-opts button');
      opts.forEach(b => b.disabled = true);

      if (i === p.resp) {
        btn.style.background = 'rgba(6,214,160,0.2)';
        btn.style.borderColor = PALETTE.success;
        this.acertos++;
      } else {
        btn.style.background = 'rgba(239,71,111,0.2)';
        btn.style.borderColor = PALETTE.danger;
        opts[p.resp].style.background = 'rgba(6,214,160,0.2)';
        opts[p.resp].style.borderColor = PALETTE.success;
      }

      setTimeout(() => {
        this.indice++;
        this.mostrarPergunta();
      }, 1200);
    }

    finalizar() {
      const pct = Math.round(this.acertos / this.perguntas.length * 100);
      let msg, emoji;
      if (pct === 100) { msg = 'Perfeito! Você é um expert em radiação solar!'; emoji = '🏆'; }
      else if (pct >= 75) { msg = 'Excelente! Domínio sólido do assunto.'; emoji = '🌟'; }
      else if (pct >= 50) { msg = 'Bom! Revise alguns conceitos para melhorar.'; emoji = '📚'; }
      else { msg = 'Continue estudando! O Sol vai brilhar pra você.'; emoji = '🌱'; }

      // Salva no localStorage
      try {
        const hist = JSON.parse(localStorage.getItem('sunsense_quiz') || '[]');
        hist.push({ data: new Date().toISOString(), acertos: this.acertos, total: this.perguntas.length });
        localStorage.setItem('sunsense_quiz', JSON.stringify(hist.slice(-10)));
      } catch (e) {}

      this.container.querySelector('#quiz-body').innerHTML = `
        <div style="background:#0a1020;padding:2rem;border-radius:10px;text-align:center;">
          <div style="font-size:4rem;margin-bottom:1rem;">${emoji}</div>
          <div style="color:var(--sun-1);font-size:2.5rem;font-weight:800;margin-bottom:0.5rem;">
            ${this.acertos}/${this.perguntas.length}
          </div>
          <div style="color:var(--muted);font-size:1.1rem;margin-bottom:1rem;">${msg}</div>
          <button onclick="location.reload()" style="padding:0.75rem 2rem;background:var(--sun-2);color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:1rem;">
            🔄 Refazer Quiz
          </button>
        </div>
      `;
    }
  }

  // ============================================================
  //  MÓDULO 7 — ANIMAÇÃO DO ESPECTRO INTERATIVO
  // ============================================================
  class EspectroInterativo {
    constructor() {
      const espectro = document.querySelector('.spectrum');
      if (!espectro) return;

      const bandas = [
        { nome: 'UV-C (100–280 nm)', cor: '#2d0040', info: 'Absorvido pela camada de ozônio. Ionizante.' },
        { nome: 'UV-B (280–315 nm)', cor: '#4B0082', info: 'Causa queimaduras solares. Parcialmente filtrado.' },
        { nome: 'UV-A (315–380 nm)', cor: '#6A0DAD', info: 'Envelhecimento da pele. Atinge a superfície.' },
        { nome: 'Violeta (380–450 nm)', cor: '#0000FF', info: 'Alta energia. Visível.' },
        { nome: 'Azul (450–495 nm)', cor: '#00BFFF', info: 'Espalhamento Rayleigh (céu azul).' },
        { nome: 'Verde (495–570 nm)', cor: '#00FF00', info: 'Pico de sensibilidade do olho humano (555 nm).' },
        { nome: 'Amarelo (570–590 nm)', cor: '#FFFF00', info: 'Região de máxima potência solar.' },
        { nome: 'Laranja (590–620 nm)', cor: '#FFA500', info: 'Pico de sensibilidade do LDR de CdS (~540 nm).' },
        { nome: 'Vermelho (620–780 nm)', cor: '#FF0000', info: 'Importante para fotossíntese.' },
        { nome: 'Infravermelho (>780 nm)', cor: '#400000', info: 'Calor. ~50% da energia solar total.' }
      ];

      // Tooltip
      const tip = document.createElement('div');
      tip.style.cssText = 'position:fixed;background:#0a1020;border:1px solid #FFD166;color:#E8ECF4;padding:0.75rem 1rem;border-radius:8px;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:1000;font-size:0.9rem;max-width:280px;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
      document.body.appendChild(tip);

      espectro.addEventListener('mousemove', e => {
        const rect = espectro.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const idx = Math.floor(x * bandas.length);
        const b = bandas[Utils.clamp(idx, 0, bandas.length - 1)];
        tip.innerHTML = `<strong style="color:#FFD166;">${b.nome}</strong><br>${b.info}`;
        tip.style.opacity = '1';
        tip.style.left = (e.clientX + 15) + 'px';
        tip.style.top = (e.clientY + 15) + 'px';
      });
      espectro.addEventListener('mouseleave', () => tip.style.opacity = '0');
    }
  }

  // ============================================================
  //  INICIALIZAÇÃO
  // ============================================================
  function init() {
    console.log('%c☀️ SunSense v1.0', 'color:#FFD166;font-size:20px;font-weight:bold;');
    console.log('%cMotor interativo carregado com sucesso', 'color:#A8B2C9;');

    new SimuladorLDR('sim-ldr');
    new CalculadoraSolar('calc-solar');
    new SimuladorColetor('sim-coletor');
    new ConversorUnidades('conversor');
    new GraficoDiurno('grafico-diurno');
    new QuizEducativo('quiz');
    new EspectroInterativo();

    // Smooth scroll para nav
    document.querySelectorAll('nav a').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (href.startsWith('#')) {
          e.preventDefault();
          const el = document.querySelector(href);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // Aguarda DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { SimuladorLDR, CalculadoraSolar, SimuladorColetor, ConversorUnidades, GraficoDiurno, QuizEducativo };
})();
