
let meds = JSON.parse(localStorage.getItem('medications')) || [];

function saveMeds() {
  localStorage.setItem('medications', JSON.stringify(meds));
}

function renderMeds() {
  const medList = document.getElementById('medList');
  medList.innerHTML = '';
  const today = new Date().toISOString().split('T')[0];
  const log = JSON.parse(localStorage.getItem('medLogs')) || {};

  meds.forEach((med, index) => {
    med.times?.forEach(time => {
      const doseKey = `${med.name}-${time}-${today}`;
      const alreadyTaken = log[today]?.some(entry => entry.doseKey === doseKey);
      const li = document.createElement('li');
      li.innerHTML = `${med.name} (${med.dosage}) at ${time} [Stock: ${med.stock || 0}]
        <button class="done" onclick="markTaken(${index}, '${time}')" ${alreadyTaken ? 'disabled' : ''}>
        ${alreadyTaken ? '✔ Taken' : 'Taken'}</button>`;
      medList.appendChild(li);
    });
  });
}

function markTaken(index, time) {
  const med = meds[index];
  const today = new Date().toISOString().split('T')[0];
  const log = JSON.parse(localStorage.getItem('medLogs')) || {};
  const doseKey = `${med.name}-${time}-${today}`;

  if (!log[today]) log[today] = [];
  if (log[today].some(entry => entry.doseKey === doseKey)) return;

  log[today].push({ ...med, time, doseKey });

  med.stock = Math.max(0, (med.stock || 0) - parseInt(med.dosage));
  saveMeds();
  localStorage.setItem('medLogs', JSON.stringify(log));
  renderMeds();
  renderCalendar();
}

function renderCalendar() {
  const calendarLog = document.getElementById('calendarLog');
  const log = JSON.parse(localStorage.getItem('medLogs')) || {};
  const today = new Date();
  calendarLog.innerHTML = '';

  for (let offset = -6; offset <= 1; offset++) {
    const date = new Date();
    date.setDate(today.getDate() + offset);
    const dateStr = date.toISOString().split('T')[0];
    const taken = log[dateStr] || [];
    const expected = meds.flatMap(m => m.times?.map(() => m.name) || []);
    const takenNames = taken.map(m => m.name);
    let status = 'none';
    if (offset > 0) status = 'future';
    else {
      const matched = [...new Set(takenNames)].filter(name => expected.includes(name)).length;
      if (matched === expected.length) status = 'complete';
      else if (matched > 0) status = 'partial';
      else status = 'missed';
    }

    const div = document.createElement('div');
    div.className = `calendar-day ${status}`;
    div.innerHTML = `<strong>${dateStr}</strong><br/>Taken: ${taken.length} / ${expected.length}<br/>
      ${taken.map(m => m.name).join(', ') || 'None'}`;
    calendarLog.appendChild(div);
  }
}

function viewFullList() {
  const fullList = document.getElementById('fullMedList');
  fullList.innerHTML = '';
  if (!meds.length) return (fullList.innerHTML = '<p>No medications found.</p>');

  const grouped = {};
  meds.forEach((med, index) => {
    if (!grouped[med.name]) grouped[med.name] = [];
    grouped[med.name].push({ ...med, index });
  });

  Object.entries(grouped).forEach(([name, group]) => {
    const details = document.createElement('details');
    details.open = false;
    const summary = document.createElement('summary');
    summary.textContent = `${name} (${group.length} schedule${group.length > 1 ? 's' : ''})`;
    details.appendChild(summary);

    group.forEach(item => {
      const div = document.createElement('div');
      div.className = 'med-group';
      div.innerHTML = `
        Dose: ${item.dosage}, Times: ${item.times?.join(', ') || 'N/A'}<br/>
        Stock: <input type="number" value="${item.stock || 0}" id="stock-${item.index}" />
        <button onclick="updateStock(${item.index})">Update</button>
      `;
      details.appendChild(div);
    });

    fullList.appendChild(details);
  });
}

function updateStock(index) {
  const input = document.getElementById(`stock-${index}`);
  const value = parseInt(input.value);
  if (!isNaN(value)) {
    meds[index].stock = value;
    saveMeds();
    alert("Stock updated.");
  }
}

function viewStock() {
  const stockList = meds.map(m => `${m.name}: ${m.stock || 0} pills`).join('\n');
  alert(stockList || "No stock info.");
}

document.getElementById('medForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('medName').value.trim();
  const qty = parseInt(document.getElementById('qty').value);
  const doses = parseInt(document.getElementById('dosesPerDay').value);
  const recurring = document.getElementById('recurring').checked;
  const fixed = document.getElementById('fixedPeriod').checked;
  const weeks = parseInt(document.getElementById('weeks').value);

  if (!name || isNaN(qty) || isNaN(doses)) {
    alert("Please fill out required fields.");
    return;
  }

  const times = [];
  const baseHour = 8;
  for (let i = 0; i < doses; i++) {
    const hour = String(baseHour + i * Math.floor(12 / doses)).padStart(2, '0');
    times.push(`${hour}:00`);
  }

  const newMed = {
    name,
    dosage: `${qty}`,
    times,
    stock: 0,
    recurring: recurring,
    weeks: fixed ? weeks : null
  };

  meds.push(newMed);
  saveMeds();
  renderMeds();
  renderCalendar();
  document.getElementById('medForm').reset();
  document.getElementById('weeks').style.display = 'none';
});

document.getElementById('fixedPeriod').addEventListener('change', () => {
  document.getElementById('weeks').style.display = 'inline';
});
document.getElementById('recurring').addEventListener('change', () => {
  if (document.getElementById('recurring').checked) {
    document.getElementById('weeks').style.display = 'none';
    document.getElementById('fixedPeriod').checked = false;
  }
});

renderMeds();
renderCalendar();

function viewWeeklyTimeline() {
  const fullList = document.getElementById('fullMedList');
  fullList.innerHTML = '<h3>📅 Weekly Timeline</h3>';
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  meds.forEach(med => {
    const div = document.createElement('div');
    div.className = 'med-group';
    let table = '<table border="1" style="width:100%;margin-bottom:10px;"><tr><th>Date</th>';
    med.times.forEach(t => table += `<th>${t}</th>`);
    table += '</tr>';

    days.forEach(date => {
      table += `<tr><td>${date}</td>`;
      med.times.forEach(t => {
        const takenLog = JSON.parse(localStorage.getItem('medLogs')) || {};
        const taken = takenLog[date]?.some(e => e.name === med.name && e.time === t);
        table += `<td style="text-align:center;">${taken ? '✔' : '❌'}</td>`;
      });
      table += '</tr>';
    });
    table += '</table>';
    div.innerHTML = `<strong>${med.name}</strong><br/>${table}`;
    fullList.appendChild(div);
  });
}
