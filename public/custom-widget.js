(function () {
  // 1. Rilevamento automatico della configurazione del Tenant
  const currentScript = document.currentScript;
  const tenantId = currentScript ? currentScript.getAttribute('data-tenant') : 'sipro-energy';
  const brandColor = currentScript ? (currentScript.getAttribute('data-color') || '#05b6d4') : '#05b6d4';

  const SUPABASE_URL = "https://hmpxgbzykwwqgfzifdlc.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcHhnYnp5a3d3cWdmemlmZGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA0NjAsImV4cCI6MjA5OTM4NjQ2MH0.eAq1O2IOiSRPYewnBTi9xuxeJlPxVa5OIW6f7qN9hIw";

  // 2. Iniezione stili CSS isolati per evitare conflitti con il foglio stile del sito ospite
  const css = `
    #fe-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #fe-trigger {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${brandColor};
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s ease;
    }
    #fe-trigger:hover {
      transform: scale(1.08);
    }
    #fe-window {
      display: none;
      width: 360px;
      height: auto;
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      position: absolute;
      bottom: 80px;
      right: 0;
      overflow: hidden;
      color: #f4f4f5;
    }
    #fe-header {
      background-color: #09090b;
      padding: 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #fe-header-title {
      font-weight: 700;
      font-size: 14px;
      color: #fff;
    }
    #fe-close {
      cursor: pointer;
      color: #a1a1aa;
    }
    #fe-close:hover {
      color: #fff;
    }
    #fe-body {
      padding: 20px;
    }
    .fe-step {
      display: none;
    }
    .fe-step.active {
      display: block;
    }
    .fe-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a1a1aa;
      margin-bottom: 6px;
      display: block;
    }
    .fe-input {
      width: 100%;
      background-color: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
      color: #fff;
      margin-bottom: 16px;
      box-sizing: border-box;
    }
    .fe-input:focus {
      outline: none;
      border-color: ${brandColor};
    }
    .fe-btn {
      width: 100%;
      background-color: ${brandColor};
      border: none;
      color: #09090b;
      font-weight: 700;
      padding: 12px;
      border-radius: 10px;
      font-size: 13px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .fe-btn:hover {
      opacity: 0.9;
    }
    #fe-success-msg {
      text-align: center;
      color: #10b981;
      font-size: 13px;
      font-weight: 600;
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.innerHTML = css;
  document.head.appendChild(styleEl);

  // 3. Creazione del DOM del Widget
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'fe-widget-container';
  widgetContainer.innerHTML = `
    <div id="fe-trigger">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#09090b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
      </svg>
    </div>
    <div id="fe-window">
      <div id="fe-header">
        <span id="fe-header-title">Analisi Solare Satellitare AI</span>
        <span id="fe-close">✕</span>
      </div>
      <div id="fe-body">
        
        <!-- Step 1: Dati Anagrafici -->
        <div id="fe-step-1" class="fe-step active">
          <label class="fe-label">Come ti chiami?</label>
          <input type="text" id="fe-name" class="fe-input" placeholder="Es: Mario Rossi">
          
          <label class="fe-label">Numero di Telefono</label>
          <input type="tel" id="fe-phone" class="fe-input" placeholder="Es: 3401234567">
          
          <button id="fe-next-1" class="fe-btn">Continua</button>
        </div>

        <!-- Step 2: Dati Immobile -->
        <div id="fe-step-2" class="fe-step">
          <label class="fe-label">Indirizzo Completo del Tetto</label>
          <input type="text" id="fe-address" class="fe-input" placeholder="Es: Via Roma 15, Ariano nel Polesine">
          
          <label class="fe-label">Costo Medio Bolletta Elettrica Mensile (€)</label>
          <input type="number" id="fe-bill" class="fe-input" placeholder="Es: 150">
          
          <button id="fe-submit" class="fe-btn">Verifica Idoneità Tetto</button>
        </div>

        <!-- Step 3: Successo -->
        <div id="fe-step-3" class="fe-step">
          <div id="fe-success-msg">
            <span style="font-size: 32px; display:block; margin-bottom: 12px;">☀️</span>
            Richiesta di analisi registrata!<br><br>
            <span style="color:#a1a1aa; font-weight: normal; font-size:12px; line-height: 1.5; display:block;">
              I nostri tecnici qualificati stanno elaborando il report geometrico del tuo tetto. Ti contatteremo a breve per presentarti il progetto preliminare senza impegno.
            </span>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(widgetContainer);

  // 4. Gestione Interazioni
  const trigger = document.getElementById('fe-trigger');
  const win = document.getElementById('fe-window');
  const closeBtn = document.getElementById('fe-close');
  const next1 = document.getElementById('fe-next-1');
  const submitBtn = document.getElementById('fe-submit');

  const step1 = document.getElementById('fe-step-1');
  const step2 = document.getElementById('fe-step-2');
  const step3 = document.getElementById('fe-step-3');

  trigger.addEventListener('click', () => {
    win.style.display = win.style.display === 'block' ? 'none' : 'block';
  });

  closeBtn.addEventListener('click', () => {
    win.style.display = 'none';
  });

  next1.addEventListener('click', () => {
    const name = document.getElementById('fe-name').value;
    const phone = document.getElementById('fe-phone').value;
    if (!name.trim() || !phone.trim()) {
      alert("Compila tutti i campi per procedere con l'analisi.");
      return;
    }
    step1.classList.remove('active');
    step2.classList.add('active');
  });

  // 5. Invio dati diretto a Supabase
  submitBtn.addEventListener('click', async () => {
    const name = document.getElementById('fe-name').value;
    const phone = document.getElementById('fe-phone').value;
    const address = document.getElementById('fe-address').value;
    const bill = document.getElementById('fe-bill').value;

    if (!address.trim() || !bill.trim()) {
      alert("Inserisci l'indirizzo e l'importo della bolletta per calcolare la produzione teorica.");
      return;
    }

    submitBtn.innerText = "Calcolo in corso...";
    submitBtn.disabled = true;

    try {
      const payload = {
        tenant_id: tenantId,
        customer_name: name,
        customer_phone: phone,
        address: address,
        monthly_bill_euro: parseFloat(bill),
        notes: "Lead acquisito automaticamente da Widget Solare Satellitare fluttuante.",
        status: "nuovo"
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        step2.classList.remove('active');
        step3.classList.add('active');
      } else {
        throw new Error("Errore durante l'invio dei dati");
      }
    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore di comunicazione. Riprova tra pochi istanti.");
      submitBtn.innerText = "Verifica Idoneità Tetto";
      submitBtn.disabled = false;
    }
  });
})();
