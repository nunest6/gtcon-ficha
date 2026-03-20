



function showTab(id, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
  else {
    document.querySelectorAll('.tab-btn').forEach(b => {
      if (b.getAttribute('onclick')?.includes(`'${id}'`)) b.classList.add('active');
    });
  }
  updateSidebar(id);
}

function updateSidebar(tab) {
  const maps = {
    cadastro: ['Status','Dados Empresa','Contato','Soc. & Filiais','Dores / SPIN'],
    reuniao: ['Reuniões Registradas'],
    comercial: ['Consultor','Origem do Lead','Participantes'],
    dp: ['Vínculos','Benefícios','Adicionais','SST','Passivos','Particularidades DP'],
    fiscal: ['Eng. Fiscal','Emissor de NF','Estoque & SPED'],
    tributario: ['Auditor — Cruzamento'],
    contabil: ['ERP','Contas Bancárias','Contab. Anterior','Mapa de Riscos'],
    parametros: ['Calendário SLA','Relatórios','Key Users','Checklist Saída'],
    particularidades: ['Erros Encontrados','Manual Mensal','Observações','Diagnóstico Final'],
    db: ['Lista de Clientes','Buscar por SCI / CNPJ','Nova Ficha','Exportar Dados'],
    admin: ['Adicionar Usuário','Lista de Usuários'],
    log: ['Todos os Registros','Filtrar por Tipo'],
  };
  const sb = document.getElementById('sidebar');
  const items = maps[tab] || [];
  sb.innerHTML = '<div class="sidebar-group"><div class="sidebar-label">Nesta aba</div>' +
    items.map(i => `<button class="side-btn"><span class="side-icon">›</span>${i}</button>`).join('') +
    '</div>';
  if (tab === 'db') { renderDBTable(); updateDBStats(); }
  if (tab === 'admin') renderAdminUserList();
  if (tab === 'log') renderLog();
}





const EDIT_PERMISSIONS = {
  'Administrativo': [],  
  'Comercial':      [],  
  'Contábil':       ['contabil','fiscal'],
  'Dep. Pessoal':   ['dp'],
  'Fiscal':         ['fiscal'],
  'Diretoria':      ['cadastro','comercial','dp','fiscal','contabil','parametros','particularidades'],
  'TI':             ['cadastro','comercial','dp','fiscal','contabil','parametros','particularidades'],
  'Financeiro':     ['cadastro'],
  'Societário':     ['cadastro'],
};

function getEditableTabsForUser() {
  if (!currentUser) return [];
  if (currentUser.perfil === 'admin') return '__all__';
  return EDIT_PERMISSIONS[currentUser.dept] || [];
}

function _tp() {
  const editableTabs = getEditableTabsForUser();
  const allEditablePanels = ['cadastro','comercial','dp','fiscal','contabil','parametros','particularidades'];

  allEditablePanels.forEach(tab => {
    const panel = document.getElementById('panel-' + tab);
    const banner = document.getElementById('banner-panel-' + tab);
    if (!panel) return;

    const canEdit = editableTabs === '__all__' || editableTabs.includes(tab);

    if (canEdit) {
      
      panel.querySelectorAll('input, select, textarea').forEach(el => {
        if (!el.classList.contains('api-filled')) {
          el.removeAttribute('disabled');
          el.style.pointerEvents = '';
        }
      });
      panel.querySelectorAll('label.co, label.ro, .status-chip').forEach(el => {
        el.style.pointerEvents = '';
      });
      panel.style.pointerEvents = '';
      panel.querySelectorAll('.card').forEach(card => card.style.opacity = '');
      if (banner) banner.classList.remove('show');
    } else {
      
      panel.style.pointerEvents = 'none';
      panel.querySelectorAll('.card').forEach(card => card.style.opacity = '0.72');
      if (banner) banner.classList.add('show');
    }
  });
}




function isComercial() {
  return currentUser && currentUser.dept === 'Comercial' && currentUser.perfil !== 'admin';
}

function clientePertenceAoUsuario(cliente) {
  if (!isComercial()) return true; 
  const consultor = (cliente.comercial?.consultor || '').trim().toLowerCase();
  const nomeUsuario = (currentUser.nome || '').trim().toLowerCase();
  
  return consultor === nomeUsuario;
}




const LOG_KEY = 'gtcon_log';
const LOG_MAX = 500; 


async function _lg() {
  try {
    const rows = await _sf('GET', 'logs?order=ts.desc&limit=500');
    return (rows || []).map(r => ({
      id: r.id, ts: r.ts, tipo: r.tipo, acao: r.acao,
      usuario: r.usuario, login: r.login, dept: r.dept,
      detalhes: r.detalhes || {},
    }));
  } catch(e) { return []; }
}
async function saveLogs() {} 

function registrarLog(tipo, acao, detalhes = {}) {
  if (!currentUser) return;
  
  _sf('POST', 'logs', {
    ts:       new Date().toISOString(),
    tipo,
    acao,
    usuario:  currentUser.nome,
    login:    currentUser.usuario,
    dept:     currentUser.dept,
    detalhes,
  }).catch(e => console.warn('registrarLog:', e));
}

function registrarDiff(clienteAntes, clienteDepois) {
  const campos = [
    ['cadastro.razao_social','Razão Social'],
    ['cadastro.nome_fantasia','Nome Fantasia'],
    ['cadastro.cnpj','CNPJ'],
    ['cadastro.regime','Regime Tributário'],
    ['cadastro.situacao','Situação'],
    ['cadastro.fat_mensal','Fat. Mensal'],
    ['cadastro.fat_anual','Fat. Anual'],
    ['cadastro.resp_legal','Responsável Legal'],
    ['cadastro.resp_cpf','CPF Responsável'],
    ['cadastro.email_assinatura','E-mail Assinatura'],
    ['cadastro.telefone','Telefone'],
    ['cadastro.porte','Porte'],
    ['cadastro.data_abertura','Data Abertura'],
    ['cadastro.endereco','Endereço'],
    ['cadastro.escrit_anterior_nome','Escritório Anterior'],
    ['cadastro.escrit_anterior_tel','Tel. Escritório Anterior'],
    ['cadastro.escrit_anterior_email','E-mail Escritório Anterior'],
    ['comercial.consultor','Consultor'],
    ['comercial.consultor_usuario','Usuário Consultor'],
    ['comercial.lead_origem','Origem Lead'],
    ['dp.clt','CLT'],
    ['dp.estagiarios','Estagiários'],
    ['dp.prolabore','Pró-labore'],
    ['dp.sind_patronal','Sindicato Patronal'],
    ['dp.sind_laboral','Sindicato Laboral'],
    ['fiscal.apuracao','Apuração Fiscal'],
    ['fiscal.emissor','Emissor NF'],
    ['contabil.erp','ERP'],
    ['contabil.balancete','Balancete'],
    ['parametros.dia_ponto','Dia Ponto'],
    ['parametros.dia_guias','Dia Guias'],
    ['parametros.imp_contabil','Implantação Contábil'],
    ['parametros.imp_fiscal','Implantação Fiscal'],
    ['parametros.imp_dp','Implantação DP'],
    ['parametros.op_contabil','Operacional Contábil'],
    ['parametros.op_fiscal','Operacional Fiscal'],
    ['parametros.op_dp','Operacional DP'],
  ];

  const diffs = [];
  campos.forEach(([path, label]) => {
    const keys = path.split('.');
    const antes  = keys.reduce((o,k) => o?.[k], clienteAntes);
    const depois = keys.reduce((o,k) => o?.[k], clienteDepois);
    if (String(antes||'').trim() !== String(depois||'').trim() && (antes || depois)) {
      diffs.push({ campo: label, de: antes || '—', para: depois || '—' });
    }
  });

  if (!diffs.length) return;

  const nome = clienteDepois.cadastro?.razao_social || clienteDepois.cadastro?.cnpj || 'Cliente';
  _sf('POST', 'logs', {
    ts:       new Date().toISOString(),
    tipo:     'ficha',
    acao:     `Ficha atualizada: ${nome}`,
    usuario:  currentUser.nome,
    login:    currentUser.usuario,
    dept:     currentUser.dept,
    detalhes: { cliente: nome, diffs },
  }).catch(e => console.warn('registrarDiff:', e));
}

function exportarLogCSV() {
  const logs = _lg().slice().reverse();
  if (!logs.length) { _t('Nenhum registro no log.', 'err'); return; }

  const linhas = [['Data/Hora','Usuário','Login','Dept','Tipo','Ação','Campo','De','Para']];

  logs.forEach(l => {
    const dt = new Date(l.ts).toLocaleString('pt-BR');
    const diffs = l.detalhes?.diffs || [];
    if (diffs.length) {
      diffs.forEach(d => {
        linhas.push([dt, l.usuario, l.login, l.dept, l.tipo, l.acao, d.campo, d.de, d.para]);
      });
    } else {
      linhas.push([dt, l.usuario, l.login, l.dept, l.tipo, l.acao, '', '', '']);
    }
  });

  const csv = linhas.map(row => row.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gtcon_log_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  _t('📥 Log exportado com sucesso!', 'ok');
}

async function renderLog() {
  const container = document.getElementById('log-container');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">⏳ Carregando...</div>';

  const q    = (document.getElementById('log-search')?.value || '').toLowerCase();
  const tipo = document.getElementById('log-filter-tipo')?.value || '';

  let logs = await _lg(); 

  if (q) logs = logs.filter(l =>
    (l.usuario||'').toLowerCase().includes(q) ||
    (l.acao||'').toLowerCase().includes(q) ||
    (l.detalhes?.cliente||'').toLowerCase().includes(q) ||
    (l.login||'').toLowerCase().includes(q)
  );
  if (tipo) logs = logs.filter(l => l.tipo === tipo);

  if (!logs.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Nenhum registro encontrado.</div>';
    return;
  }

  const icons = { login: '🔑', ficha: '📄', usuario: '👤' };
  const cores = { login: 'var(--accent2)', ficha: 'var(--success)', usuario: 'var(--warning)' };

  container.innerHTML = logs.map(l => {
    const dt = new Date(l.ts);
    const hora = dt.toLocaleString('pt-BR');
    const diffs = l.detalhes?.diffs || [];
    const diffHtml = diffs.map(d => `
      <div class="log-diff-row">
        <span class="log-campo">${d.campo}</span>
        <span class="log-de">${d.de}</span>
        <span style="color:var(--muted);">→</span>
        <span class="log-para">${d.para}</span>
      </div>`).join('');

    return `<div class="log-entry">
      <div class="log-icon">${icons[l.tipo] || '📌'}</div>
      <div class="log-body">
        <div>
          <span class="log-who" style="color:${cores[l.tipo]||'var(--text)'};">@${l.login}</span>
          <span class="log-action"> (${l.dept}) — ${l.acao}</span>
        </div>
        ${diffs.length ? `<div class="log-diff">${diffHtml}</div>` : ''}
      </div>
      <div class="log-time">${hora}</div>
    </div>`;
  }).join('');
}

async function limparLog() {
  if (!confirm('Limpar todo o log? Esta ação não pode ser desfeita.')) return;
  try {
    await _sf('DELETE', 'logs?id=gt.0');
    renderLog();
    _t('Log limpo.', 'inf');
  } catch(e) {
    _t('Erro ao limpar log: ' + e.message, 'err');
  }
}




function selR(el, name) {
  document.querySelectorAll(`[onclick*="selR"][onclick*="'${name}'"]`).forEach(e => e.classList.remove('sel'));
  el.classList.add('sel');
}
function togC(el, e) {
  if (e && e.target && e.target.type === 'checkbox') {
    
    el.classList.toggle('sel', e.target.checked);
    return;
  }
  if (e) e.preventDefault();
  const cb = el.querySelector('input[type=checkbox]');
  const novoEstado = !el.classList.contains('sel');
  el.classList.toggle('sel', novoEstado);
  if (cb) cb.checked = novoEstado;
}
function selStatus(el, groupId, cls) {
  document.querySelectorAll(`#${groupId} .status-chip`).forEach(c => {
    c.className = 'status-chip';
  });
  el.classList.add(cls);
}
function toggleCheckLine(el) {
  el.classList.toggle('checked');
  if (el.classList.contains('checked')) el.querySelector('.check-box').textContent = '✓';
  else el.querySelector('.check-box').textContent = '';
}




function fmtCNPJ(el) {
  let v = el.value.replace(/\D/g,'').slice(0,14);
  v = v.replace(/^(\d{2})(\d)/,'$1.$2');
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/,'.$1/$2');
  v = v.replace(/(\d{4})(\d)/,'$1-$2');
  el.value = v;
}
function autoFmtSearch(el) {
  
  const raw = el.value.replace(/\D/g,'');
  if (raw.length > 5) fmtCNPJ(el);
  
}
function fmtCur(el) {
  let v = el.value.replace(/\D/g,'');
  v = (parseInt(v||0)/100).toFixed(2);
  el.value = 'R$ ' + v.replace('.',',').replace(/(\d)(?=(\d{3})+,)/g,'$1.');
}




async function buscarCNPJ() {
  const input = document.getElementById('cnpj_input').value.trim();
  const raw = input.replace(/\D/g,'');

  
  if (raw.length !== 14) {
    
    const q = input.toLowerCase();
    const found = _gc().find(c =>
      (c.cadastro?.codigo_sci||'').toLowerCase() === q ||
      (c.cadastro?.codigo_sci||'').toLowerCase().includes(q)
    );
    if (found) {
      loadClient(found);
      _t(`✅ Cliente "${found.cadastro?.razao_social}" encontrado pelo Código SCI!`, 'ok');
    } else {
      _t('CNPJ inválido ou código SCI não encontrado. Verifique e tente novamente.', 'err');
    }
    return;
  }

  const btn = document.getElementById('btn-buscar');
  const icon = document.getElementById('buscar-icon');
  btn.disabled = true;
  icon.innerHTML = '<span class="spin"></span>';
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
    if (!res.ok) throw new Error('CNPJ não encontrado');
    const d = await res.json();
    fillCNPJ(d, raw);
    _t('✅ Dados da Receita Federal carregados!', 'ok');
  } catch(e) {
    try {
      const r2 = await fetch(`https://receitaws.com.br/v1/cnpj/${raw}`);
      const d2 = await r2.json();
      if (d2.status === 'ERROR') throw new Error(d2.message);
      fillCNPJAlt(d2, raw);
      _t('✅ Dados carregados (fonte alternativa)', 'ok');
    } catch(e2) {
      _t('Erro: ' + e.message, 'err');
    }
  } finally { btn.disabled = false; icon.textContent = '🔍'; }
}

function renderCNAEs(lista) {
  const container = document.getElementById('cnaes-container');
  if (!container) return;
  if (!lista || !lista.length) {
    container.innerHTML = '<div style="font-size:11.5px;color:var(--dim);font-style:italic;">Nenhum CNAE encontrado.</div>';
    return;
  }
  container.innerHTML = lista.map((c, i) => {
    const isPrincipal = i === 0;
    return `<div class="cnae-item" data-cnae="${c.codigo} – ${c.descricao}" style="display:flex;align-items:flex-start;gap:8px;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--rsm);font-size:12px;">
      <span style="font-family:var(--mono);color:var(--accent2);flex-shrink:0;font-size:11.5px;">${c.codigo}</span>
      <span style="color:var(--text);flex:1;">${c.descricao}</span>
      ${isPrincipal ? '<span style="font-size:10px;padding:1px 7px;background:rgba(16,185,129,.12);color:var(--success);border-radius:8px;flex-shrink:0;">Principal</span>' : ''}
    </div>`;
  }).join('');
}

function fillCNPJ(d, raw) {
  const cnpjFmt = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');
  sv('cnpj_principal', cnpjFmt);
  sv('cnpj_input', cnpjFmt);
  sv('razao_social', d.razao_social || '');
  sv('nome_fantasia', d.nome_fantasia || '');
  sv('data_abertura', d.data_inicio_atividade ? d.data_inicio_atividade.split('-').reverse().join('/') : '');
  sv('porte', d.porte || '');
  sv('situacao', d.descricao_situacao_cadastral || '');
  const end = [d.logradouro, d.numero, d.complemento, d.bairro, d.municipio+'/'+d.uf, d.cep].filter(Boolean).join(', ');
  sv('endereco_completo', end);

  const cnaes = [];
  if (d.cnae_fiscal && d.cnae_fiscal_descricao)
    cnaes.push({ codigo: d.cnae_fiscal, descricao: d.cnae_fiscal_descricao });
  if (d.cnaes_secundarios && d.cnaes_secundarios.length)
    d.cnaes_secundarios.forEach(c => cnaes.push({ codigo: c.codigo, descricao: c.descricao }));
  renderCNAEs(cnaes);

  
  if (d.qsa && d.qsa.length) preencherQSA(d.qsa.map(s => ({
    nome:  s.nome_socio || '',
    cpf:   s.cpf_cnpj_socio || '',
    qual:  s.qualificacao_socio || '',
    pais:  s.pais_socio || '',
  })));

  const nm = d.razao_social || '';
  _ac(nm);
}

function fillCNPJAlt(d, raw) {
  const cnpjFmt = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');
  sv('cnpj_principal', cnpjFmt); sv('cnpj_input', cnpjFmt);
  sv('razao_social', d.nome || ''); sv('nome_fantasia', d.fantasia || '');
  sv('data_abertura', d.abertura || ''); sv('porte', d.porte || '');
  sv('situacao', d.situacao || '');
  const end = [d.logradouro, d.numero, d.complemento, d.bairro, d.municipio+'/'+d.uf, d.cep].filter(Boolean).join(', ');
  sv('endereco_completo', end);

  const cnaes = [];
  if (d.atividade_principal?.[0])
    cnaes.push({ codigo: d.atividade_principal[0].code, descricao: d.atividade_principal[0].text });
  if (d.atividades_secundarias?.length)
    d.atividades_secundarias.forEach(c => cnaes.push({ codigo: c.code, descricao: c.text }));
  renderCNAEs(cnaes);

  
  if (d.qsa && d.qsa.length) preencherQSA(d.qsa.map(s => ({
    nome:  s.nome || '',
    cpf:   s.cpf || s.cpf_cnpj || '',
    qual:  s.qual || s.qualificacao || '',
    pais:  s.pais || '',
  })));

  const nm = d.nome || '';
  _ac(nm);
}

function _ac(nome, consultor) {
  const btnPdf = document.getElementById('btn-gerar-pdf');
  if (!nome) {
    document.getElementById('cliente-ativo-chip').style.display = 'none';
    if (btnPdf) btnPdf.style.display = 'none';
    return;
  }
  if (btnPdf) btnPdf.style.display = '';
  document.getElementById('cliente-ativo-nome').textContent = nome;
  const elCons = document.getElementById('cliente-ativo-consultor');
  if (elCons) {
    const cons = consultor || document.getElementById('consultor_nome')?.value || '';
    if (cons) { elCons.textContent = '🤝 ' + cons; elCons.style.display = ''; }
    else { elCons.style.display = 'none'; }
  }
  document.getElementById('cliente-ativo-chip').style.display = 'flex';
}
function sv(id, val) { const el = document.getElementById(id); if(el) el.value = val; }




let partCnt=0, socioCnt=2, bancoCnt=2, filialRows=0, erroCnt=0, riscoCnt=5;

let contatoCnt = 0;
function _bc() {
  const isAdmin = currentUser?.perfil === 'admin';
  ['consultor_usuario', 'consultor_nome'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!isAdmin) {
      
      el.classList.add('api-filled');
      el.style.pointerEvents = 'none';
      el.readOnly = true;
    } else {
      el.classList.remove('api-filled');
      el.style.pointerEvents = '';
      el.readOnly = false;
    }
  });
  
  const lockInfo = document.getElementById('consultor-lock-info');
  if (lockInfo) {
    lockInfo.textContent = isAdmin ? '✏️ Editável (admin)' : '🔒 Editável apenas pelo admin';
    lockInfo.style.color = isAdmin ? 'var(--success)' : 'var(--muted)';
  }
}

function addRespExtra(dados = {}) {
  const container = document.getElementById('resp-extras');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'resp-extra-item';
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:flex-end;';
  div.innerHTML = `
    <div class="fg"><label>Nome</label><input type="text" class="re-nome" placeholder="Nome do responsável" value="${dados.nome||''}"></div>
    <div class="fg"><label>Cargo / Área</label><input type="text" class="re-cargo" placeholder="Ex: Financeiro" value="${dados.cargo||''}"></div>
    <div class="fg"><label>E-mail</label><input type="email" class="re-email" placeholder="email@empresa.com.br" value="${dados.email||''}"></div>
    <div style="padding-bottom:2px;"><button class="btn btn-d btn-sm" onclick="this.closest('.resp-extra-item').remove()">✕</button></div>`;
  container.appendChild(div);
}

function addContato() {
  contatoCnt++;
  const id = 'contato-' + contatoCnt;
  const div = document.createElement('div');
  div.className = 'contato-extra';
  div.id = id;
  div.innerHTML = `
    <div class="fg">
      <label>Nome</label>
      <input type="text" placeholder="Nome completo">
    </div>
    <div class="fg">
      <label>Setor / Área</label>
      <select>
        <option value="">— Selecione —</option>
        <option>Financeiro</option>
        <option>RH / Dep. Pessoal</option>
        <option>Fiscal / Contábil</option>
        <option>Diretoria</option>
        <option>Administrativo</option>
        <option>TI / Sistemas</option>
        <option>Outros</option>
      </select>
    </div>
    <div class="fg">
      <label>E-mail</label>
      <input type="email" placeholder="email@empresa.com.br">
    </div>
    <div class="fg">
      <label>Telefone / WhatsApp</label>
      <input type="tel" placeholder="(00) 00000-0000">
    </div>
    <button class="btn btn-d btn-sm" onclick="this.closest('.contato-extra').remove()" style="margin-bottom:1px;">✕</button>`;
  document.getElementById('contatos-extras').appendChild(div);
}

function addParticipante() {
  partCnt++;
  const div = document.createElement('div');
  div.className = 'g g3';
  div.style.marginBottom = '8px';
  div.innerHTML = `
    <div class="fg s2"><label>Nome (Cliente)</label><input type="text" placeholder="Nome completo"></div>
    <div class="fg"><label>Cargo</label><input type="text" placeholder="Função"></div>`;
  document.getElementById('participantes-cliente').appendChild(div);
}

function preencherQSA(socios) {
  if (!socios || !socios.length) return;
  const container = document.getElementById('socios-container');
  if (!container) return;

  
  container.innerHTML = '';
  socioCnt = 1;

  socios.forEach((s, idx) => {
    const n = socioCnt++;
    const adm = (s.qual || '').toLowerCase().includes('administrador') ||
                (s.qual || '').toLowerCase().includes('sócio-admin') ? 'sim' : 'nao';
    const div = document.createElement('div');
    div.className = 'g g3';
    div.style.marginBottom = '8px';
    div.id = 'socio-' + n;
    div.innerHTML = `
      <div class="fg s2">
        <label>Sócio ${n} — Nome</label>
        <input type="text" placeholder="Nome completo" value="${s.nome}" class="api-filled">
      </div>
      <div class="fg">
        <label>Participação (%)</label>
        <input type="number" placeholder="0" min="0" max="100">
      </div>
      <div class="fg">
        <label>Administrador?</label>
        <div class="radio-row">
          <label class="ro${adm==='sim'?' sel':''}" onclick="selR(this,'socio${n}_adm')">
            <input type="radio" name="socio${n}_adm" value="sim"${adm==='sim'?' checked':''}>Sim
          </label>
          <label class="ro${adm==='nao'?' sel':''}" onclick="selR(this,'socio${n}_adm')">
            <input type="radio" name="socio${n}_adm" value="nao"${adm==='nao'?' checked':''}>Não
          </label>
        </div>
      </div>
      ${s.cpf ? `<div class="fg"><label>CPF/CNPJ</label><input type="text" value="${s.cpf}" class="api-filled"></div>` : ''}
      ${s.qual ? `<div class="fg s2"><label>Qualificação</label><input type="text" value="${s.qual}" class="api-filled"></div>` : ''}
      <div class="fg" style="align-self:end">
        <button class="btn btn-d btn-sm" onclick="this.closest('.g').remove()">✕ Remover</button>
      </div>`;
    container.appendChild(div);
  });

  _t(`QSA preenchido — ${socios.length} sócio(s) importado(s) da RFB.`, 'ok');
}

function addSocio() {
  const n = socioCnt++;
  const div = document.createElement('div');
  div.className = 'g g3';
  div.style.marginBottom = '8px';
  div.innerHTML = `
    <div class="fg s2"><label>Sócio ${n} — Nome</label><input type="text" placeholder="Nome completo"></div>
    <div class="fg"><label>Participação (%)</label><input type="number" placeholder="0" min="0" max="100"></div>
    <div class="fg"><label>Administrador?</label>
      <div class="radio-row">
        <label class="ro" onclick="selR(this,'socio${n}_adm')"><input type="radio" name="socio${n}_adm" value="sim">Sim</label>
        <label class="ro" onclick="selR(this,'socio${n}_adm')"><input type="radio" name="socio${n}_adm" value="nao">Não</label>
      </div>
    </div>`;
  document.getElementById('socios-container').appendChild(div);
}

function addFilialRow() {
  const tbody = document.getElementById('filiais-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" placeholder="00.000.000/0002-00" oninput="fmtCNPJ(this)"></td>
    <td><input type="text" placeholder="Cidade/UF"></td>
    <td><select><option value="">—</option><option>Simples</option><option>Presumido</option><option>Real</option></select></td>
    <td><input type="text" placeholder="R$ 0,00" oninput="fmtCur(this)"></td>
    <td><input type="number" placeholder="0" min="0" style="width:70px"></td>
    <td><input type="text" placeholder="Responsável local"></td>
    <td><button class="btn btn-d btn-sm" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
}

function addBanco() {
  const n = bancoCnt++;
  const div = document.createElement('div');
  div.className = 'g g4';
  div.style.marginBottom = '8px';
  div.innerHTML = `
    <div class="fg s2"><label>Banco ${n}</label><input type="text" placeholder="Nome do banco"></div>
    <div class="fg"><label>Agência</label><input type="text" placeholder="0000"></div>
    <div class="fg"><label>Conta</label><input type="text" placeholder="00000-0"></div>
    <div class="fg s2"><label>Acesso PJ?</label>
      <div class="radio-row">
        <label class="ro" onclick="selR(this,'banco${n}_acesso')"><input type="radio" name="banco${n}_acesso" value="sim">Sim</label>
        <label class="ro" onclick="selR(this,'banco${n}_acesso')"><input type="radio" name="banco${n}_acesso" value="nao">Não</label>
      </div>
    </div>
    <div class="fg s2" style="align-self:end;"><button class="btn btn-d btn-sm" onclick="this.closest('.g').remove()">✕ Remover</button></div>`;
  document.getElementById('bancos-container').appendChild(div);
}

function addRisco() {
  const n = riscoCnt++;
  const div = document.createElement('div');
  div.className = 'risk-item';
  div.innerHTML = `
    <div class="risk-num r-info">${n}</div>
    <div style="flex:1">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;font-weight:600;">RISCO ADICIONAL</div>
      <input type="text" placeholder="Descreva o risco identificado...">
    </div>
    <button class="btn btn-d btn-sm" onclick="this.parentElement.remove()" style="margin-top:2px;">✕</button>`;
  document.getElementById('riscos-container').appendChild(div);
}

function addCheckItem() {
  const input = document.getElementById('new_check');
  const text = input.value.trim();
  if (!text) return;
  const div = document.createElement('div');
  div.className = 'check-line';
  div.onclick = function() { toggleCheckLine(this); };
  div.innerHTML = `<div class="check-box"></div><span class="check-text">${text}</span>`;
  document.getElementById('checklist-saida').appendChild(div);
  input.value = '';
}

function addErro() {
  erroCnt++;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:flex-start;';
  div.id = 'erro-' + erroCnt;
  div.innerHTML = `
    <input type="text" placeholder="Descreva o erro encontrado..." style="flex:1">
    <input type="date" style="width:150px">
    <select style="width:120px"><option value="aberto">Em aberto</option><option value="resolvido">Resolvido</option></select>
    <button class="btn btn-d btn-sm" onclick="this.closest('div').remove()">✕</button>`;
  document.getElementById('erros-container').appendChild(div);
}







const SB_URL = 'https://jvhkczdtfulegikcpiov.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2aGtjemR0ZnVsZWdpa2NwaW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTkxNjEsImV4cCI6MjA4ODczNTE2MX0.HEETVDQUNJRLG8GusxhcZ8kmxx9Uo9JoBB0MoSUdjTg';

async function _sf(method, endpoint, body) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
  };
  
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=minimal';
  }
  const res = await fetch(`${SB_URL}/rest/v1/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.details || `HTTP ${res.status}`);
  }
  if (res.status === 204 || method === 'DELETE' || method === 'PATCH') return null;
  return res.json();
}


async function api(method, path, body) {
  try {
    
    if (method === 'GET' && path === '/api/clientes') {
      const rows = await _sf('GET', 'clientes?select=dados&order=created_at.desc');
      const clientes = (rows || []).map(r => typeof r.dados === 'string' ? JSON.parse(r.dados) : r.dados);
      _r7 = clientes;
      return { ok: true, clientes, total: clientes.length };
    }

    
    if (method === 'GET' && path === '/api/stats') {
      const rows = await _sf('GET', 'clientes?select=dados&order=created_at.desc');
      const clientes = (rows || []).map(r => typeof r.dados === 'string' ? JSON.parse(r.dados) : r.dados);
      const ativos = clientes.filter(c => (c.cadastro?.situacao||'').toUpperCase().includes('ATIVA')).length;
      return { ok: true, total: clientes.length, ativos, ultimo_salvo: clientes[0]?.meta?.savedAt || null };
    }

    
    if (method === 'POST' && path === '/api/cliente') {
      const cnpj = body?.cadastro?.cnpj?.replace(/\D/g,'') || '';
      const sci  = body?.cadastro?.codigo_sci || '';
      body.meta.savedAt = new Date().toISOString();

      
      let existing = null;
      if (cnpj) {
        const rows = await _sf('GET', `clientes?cnpj=eq.${cnpj}&select=id`);
        if (rows?.length) existing = rows[0];
      }
      if (!existing && sci) {
        const rows = await _sf('GET', `clientes?sci=eq.${encodeURIComponent(sci)}&select=id`);
        if (rows?.length) existing = rows[0];
      }

      if (existing) {
        
        await _sf('PATCH', `clientes?id=eq.${existing.id}`, { dados: body });
        return { ok: true, mensagem: 'Atualizado' };
      } else {
        
        await _sf('POST', 'clientes', { cnpj: cnpj || null, sci: sci || null, dados: body });
        return { ok: true, mensagem: 'Salvo' };
      }
    }

    
    if (method === 'DELETE' && path.startsWith('/api/cliente')) {
      const cnpj = new URLSearchParams(path.split('?')[1]).get('cnpj');
      await _sf('DELETE', `clientes?cnpj=eq.${cnpj}`);
      return { ok: true };
    }

    return { ok: false, erro: 'Rota desconhecida' };
  } catch(e) {
    console.error('Supabase error:', e);
    _t(`Erro banco de dados: ${e.message}`, 'err');
    return { ok: false, erro: e.message };
  }
}


async function _gd() {
  try {
    const rows = await _sf('GET', 'clientes?select=dados&order=created_at.desc');
    return (rows || []).map(r => typeof r.dados === 'string' ? JSON.parse(r.dados) : r.dados);
  } catch(e) { return []; }
}




function collectData() {
  const gv = id => document.getElementById(id)?.value || '';
  const gr = name => document.querySelector(`[name="${name}"]:checked`)?.value || '';
  const ramos = Array.from(document.querySelectorAll('[name="ramo"]:checked')).map(el => el.value);
  const cnaesEls = document.querySelectorAll('#cnaes-container .cnae-item');
  const cnaes = Array.from(cnaesEls).map(el => el.dataset.cnae || el.textContent.trim());
  
  const getChip = groupId => {
    const sel = document.querySelector(`#${groupId} .status-chip[class*="sel-"]`);
    if (!sel) return '';
    const cls = Array.from(sel.classList).find(c => c.startsWith('sel-'));
    return JSON.stringify({ texto: sel.textContent.trim(), cls });
  };
  return {
    meta: { savedAt: new Date().toISOString() },
    cadastro: {
      status_onboarding: getChip('status-onboarding'),
      status_complexidade: getChip('status-complexidade'),
      razao_social: gv('razao_social'), nome_fantasia: gv('nome_fantasia'),
      cnpj: gv('cnpj_principal'), codigo_sci: gv('codigo_sci'),
      data_abertura: gv('data_abertura'),
      porte: gv('porte'), situacao: gv('situacao'),
      endereco: gv('endereco_completo'),
      ramos, cnaes,
      regime: gr('regime'), fat_mensal: gv('fat_mensal'),
      fat_anual: gv('fat_anual'), grupo_nome: _r2?.nome || gv('grupo_empresas') || '',
      grupo_id: _r2?.id || '',
      prefeituras: Array.from(document.querySelectorAll('.prefeitura-item')).map(el => ({
        nome:  el.querySelector('.pref-nome')?.value  || '',
        login: el.querySelector('.pref-login')?.value || '',
        senha: el.querySelector('.pref-senha')?.value || '',
      })).filter(p => p.nome || p.login),
      resp_legal: gv('resp_legal'), resp_cpf: gv('resp_cpf'),
      email_assinatura: gv('email_assinatura'), telefone: gv('telefone'),
      escrit_anterior_nome: gv('escrit_anterior_nome'),
      escrit_anterior_tel: gv('escrit_anterior_tel'),
      escrit_anterior_email: gv('escrit_anterior_email'),
      outros_contatos: Array.from(document.querySelectorAll('#contatos-extras .contato-extra')).map(el => ({
        nome:     el.querySelectorAll('input')[0]?.value || '',
        setor:    el.querySelector('select')?.value || '',
        email:    el.querySelectorAll('input')[1]?.value || '',
        telefone: el.querySelectorAll('input')[2]?.value || '',
      })).filter(c => c.nome || c.email),
      competencia_inicio: gv('competencia_inicio'),
      licitacoes: gr('licitacoes'), ecommerce: gr('ecommerce'),
      ecommerce_plat: gv('ecommerce_plat'), cert: gr('cert_digital'),
      cert_venc: gv('cert_vencimento'),
    },
    comercial: {
      consultor_usuario: gv('consultor_usuario'),
      consultor: gv('consultor_nome'),
    },
    dp: {
      clt: gv('dp_clt'), estagiarios: gv('dp_estagiarios'),
      prolabore: gv('dp_prolabore'), autonomos: gv('dp_autonomos'),
      sind_patronal: gv('sind_patronal'), sind_laboral: gv('sind_laboral'),
      ponto: gr('ponto'), insalub: gr('insalub'), periculosidade: gr('periculosidade'),
      sst_docs: gr('sst_docs'), sst_resp: gr('sst_resp'),
      passivos_obs: gv('dp_passivos_obs'),
    },
    fiscal: {
      apuracao: gr('apuracao'), icms_st: gr('icms_st'),
      vol_saida: gv('vol_saida'),
      vol_entrada: gv('vol_entrada'),
      obs: gv('obs_fiscal'),
      rec_mercadorias:  gr('rec_mercadorias'),
      rec_servicos:     gr('rec_servicos'),
      rec_industria:    gr('rec_industria'),
      rec_financeira:   gr('rec_financeira'),
      rec_aluguel:      gr('rec_aluguel'),
      rec_exportacao:   gr('rec_exportacao'),
      rec_isenta:       gr('rec_isenta'),
      rec_segregacao:   gr('rec_segregacao'),
      vende_cf: gr('vende_cf'),
      perfil_comercial: gr('perfil_comercial'),
      ecommerce: gr('ecommerce'),
      ecommerce_plat: gv('ecommerce_plat'),
      notas_entrada_100: gr('notas_entrada_100'),
      notas_saida_100: gr('notas_saida_100'),
      part_pis_cofins: gv('part_pis_cofins'),
      part_irpj_csll:  gv('part_irpj_csll'),
      part_iss:        gv('part_iss'),
      part_icms:       gv('part_icms'),
      part_ipi:        gv('part_ipi'),
      part_das:        gv('part_das'),
      
      compra_insumos:      gr('compra_insumos'),
      compra_revenda:      gr('compra_revenda'),
      compra_ativo:        gr('compra_ativo'),
      compra_servicos_pc:  gr('compra_servicos_pc'),
      forn_simples:        gr('forn_simples'),
      forn_exterior:       gr('forn_exterior'),
      obs_compras:         gv('obs_compras'),
      
      pc_regime:        gr('pc_regime'),
      pc_monofasico:    gr('pc_monofasico'),
      pc_exclusoes:     gr('pc_exclusoes'),
      pc_cred_presumido:gr('pc_cred_presumido'),
      pc_cred_insumos:  gr('pc_cred_insumos'),
      pc_ciap:          gr('pc_ciap'),
      
      irpj_forma:       gr('irpj_forma'),
      irpj_periodo:     gr('irpj_periodo'),
      irpj_distribuicao:gr('irpj_distribuicao'),
      irpj_jscp:        gr('irpj_jscp'),
      irpj_prejuizo:    gr('irpj_prejuizo'),
      irpj_adicoes:     gr('irpj_adicoes'),
      
      iss_obrigado:     gr('iss_obrigado'),
      iss_retido:       gr('iss_retido'),
      iss_municipio:    gv('iss_municipio'),
      iss_aliquota:     gv('iss_aliquota'),
      iss_outro_mun:    gr('iss_outro_mun'),
      iss_tomado:       gr('iss_tomado'),
      
      icms_contrib:     gr('icms_contrib'),
      icms_difal:       gr('icms_difal'),
      icms_apuracao:    gr('icms_apuracao'),
      icms_antecipacao: gr('icms_antecipacao'),
      icms_saldo_credor:gr('icms_saldo_credor'),
      icms_multiestado: gr('icms_multiestado'),
      
      ipi_contrib:      gr('ipi_contrib'),
      ipi_credito:      gr('ipi_credito'),
      ipi_ncm:          gr('ipi_ncm'),
      ipi_suspensao:    gr('ipi_suspensao'),
      
      das_anexo:        gr('das_anexo'),
      das_sublimite:    gr('das_sublimite'),
      das_risco_exclusao:gr('das_risco_exclusao'),
      das_parcelamento: gr('das_parcelamento'),
      das_vedadas:      gr('das_vedadas'),
      das_limite:       gr('das_limite'),
    },
    contabil: {
      bancos_pj: Array.from(document.querySelectorAll('#bancos-container .g')).map(el => ({
        banco:   el.querySelectorAll('input')[0]?.value || '',
        agencia: el.querySelectorAll('input')[1]?.value || '',
        conta:   el.querySelectorAll('input')[2]?.value || '',
        acesso:  el.querySelector('input[type=radio]:checked')?.value || '',
      })).filter(b => b.banco || b.agencia || b.conta),
      balancete: gr('balancete'), imobilizado: gr('imobilizado'),
      licitacoes: gr('licitacoes'),
      tem_imobilizado: gr('tem_imobilizado'),
      laudo_avaliacao: gr('laudo_avaliacao'),
      metodo_depreciacao: gr('metodo_depreciacao'),
      imob_sistema: gr('imob_sistema'),
      imob_obs: gv('imob_obs'),
      desp_dedutiveis:    gr('desp_dedutiveis'),
      desp_nao_dedutiveis:gr('desp_nao_dedutiveis'),
      desp_custo_depto:   gr('desp_custo_depto'),
      desp_custo_produto: gr('desp_custo_produto'),
      desp_retiradas:     gr('desp_retiradas'),
      desp_adiantamentos: gr('desp_adiantamentos'),
      contab_anterior: gv('contab_anterior'),
      desp_cmv:          gr('desp_cmv'),
      desp_folha:        gr('desp_folha'),
      desp_prolabore:    gr('desp_prolabore'),
      desp_depreciacao:  gr('desp_depreciacao'),
      desp_financeiras:  gr('desp_financeiras'),
      desp_leasing:      gr('desp_leasing'),
      desp_centro_custo: gr('desp_centro_custo'),
      desp_rateio:       gr('desp_rateio'),
      desp_obs:          gv('desp_obs'),
      plano_contas: Array.from(document.querySelectorAll('[name="pc"]:checked')).map(el => el.value),
      plano_contas_obs: gv('plano_contas_obs'),
      r_cadastral: gv('risco_cadastral'), r_tributario: gv('risco_tributario'),
      r_trabalhista: gv('risco_trabalhista'), r_tecnologico: gv('risco_tecnologico'),
    },
    parametros: {
      dia_ponto: gv('dia_ponto'), dia_extratos: gv('dia_extratos'), dia_guias: gv('dia_guias'),
      envio_guias: gr('envio_guias'),
      imp_contabil: gv('imp_contabil'), imp_contabil_email: gv('imp_contabil_email'),
      imp_fiscal: gv('imp_fiscal'), imp_fiscal_email: gv('imp_fiscal_email'),
      imp_dp: gv('imp_dp'), imp_dp_email: gv('imp_dp_email'),
      op_contabil: gv('op_contabil'), op_contabil_email: gv('op_contabil_email'),
      op_fiscal: gv('op_fiscal'), op_fiscal_email: gv('op_fiscal_email'),
      op_dp: gv('op_dp'), op_dp_email: gv('op_dp_email'),
      resp_extras: Array.from(document.querySelectorAll('.resp-extra-item')).map(el => ({
        nome: el.querySelector('.re-nome')?.value || '',
        email: el.querySelector('.re-email')?.value || '',
        cargo: el.querySelector('.re-cargo')?.value || '',
      })).filter(r => r.nome),
      resp_tecnico: gv('resp_tecnico'), data_corte: gv('data_corte'),
      outros_relatorios: gv('outros_relatorios'),
    },
    reunioes: _r0,
    particularidades: {
      erp: gr('erp'), erp_outro: gv('erp_outro'), erp_integ: gr('erp_integ'),
      depts: Array.from(document.querySelectorAll('[name="depts"]:checked')).map(el => el.value),
      instrucoes: gv('part_instrucoes'), avisos: gv('part_avisos'),
      obs_gerais: gv('obs_gerais'), diagnostico: gv('diagnostico_final'),
      resumo: gv('resumo_reuniao'),
    },
  };
}

async function saveAll() {
  const d = collectData();
  if (!d.cadastro.razao_social && !d.cadastro.cnpj) {
    _t('Preencha ao menos o CNPJ ou Razão Social antes de salvar', 'err'); return;
  }

  
  if (_r4) {
    const nome = d.cadastro?.razao_social || d.cadastro?.cnpj || 'este cliente';
    if (!confirm(`Confirmar alterações em "${nome}"?`)) return;
  }
  if (!_r4 && d.cadastro.cnpj) {
    const cnpjNovo = d.cadastro.cnpj.replace(/\D/g,'');
    const jaExiste = (await _gd()).find(c => c.cadastro?.cnpj?.replace(/\D/g,'') === cnpjNovo);
    if (jaExiste) {
      const nome = jaExiste.cadastro?.razao_social || cnpjNovo;
      _t(`Duplicidade! "${nome}" já está cadastrado com este CNPJ. Localize-o na aba Clientes.`, 'err');
      return;
    }
  }

  

  
  const chaveId = d.cadastro.cnpj?.replace(/\D/g,'') || d.cadastro.codigo_sci;
  const antes = _r7.find(c =>
    c.cadastro?.cnpj?.replace(/\D/g,'') === chaveId ||
    c.cadastro?.codigo_sci === d.cadastro.codigo_sci
  );
  if (antes) {
    registrarDiff(antes, d);
  } else {
    registrarLog('ficha', `Nova ficha criada: ${d.cadastro.razao_social || d.cadastro.cnpj || 'Cliente'}`);
  }

  const btn = document.querySelector('[onclick="saveAll()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }
  const res = await api('POST', '/api/cliente', d);
  if (btn) { btn.disabled = false; btn.innerHTML = '💾 Salvar'; }
  if (res?.ok) {
    _t(`${res.mensagem || 'Salvo'} com sucesso.`, 'ok');
    updateClientCountBadge();
    _r4 = true;
    
    if (_r6) { clearInterval(_r6); _r6 = null; }
    if (_r5) await _lt(_r5);
    _av();
    
    setTimeout(async () => {
      await entrarModoEdicao();
    }, 400);
  }
}

function exportJSON() {
  const d = collectData();
  const blob = new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ficha_${(d.cadastro.razao_social||'cliente').replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  _t('JSON desta ficha exportado!', 'inf');
}

async function exportAllJSON() {
  const res = await api('GET', '/api/clientes');
  if (!res?.ok || !res.clientes.length) { _t('Nenhum cliente para exportar','err'); return; }
  const blob = new Blob([JSON.stringify(res.clientes,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gtcon_clientes_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  _t(`${res.clientes.length} fichas exportadas!`, 'inf');
}

function resetForm() {
  
  
  document.querySelectorAll('input:not([type=radio]):not([type=checkbox]),select,textarea').forEach(el => el.value='');
  document.querySelectorAll('.ro.sel,.co.sel').forEach(el => el.classList.remove('sel'));
  document.querySelectorAll('[name="ramo"]').forEach(el => { el.checked = false; el.closest('.co')?.classList.remove('sel'); });
  document.querySelectorAll('.status-chip').forEach(el => el.className='status-chip');
  document.querySelectorAll('.check-line.checked').forEach(el => {
    el.classList.remove('checked'); el.querySelector('.check-box').textContent='';
  });
  const cc = document.getElementById('cnaes-container');
  if (cc) cc.innerHTML = '<div style="font-size:11.5px;color:var(--dim);font-style:italic;">Busque um CNPJ para carregar os CNAEs automaticamente.</div>';
  document.getElementById('contatos-extras').innerHTML = '';
  const pc = document.getElementById('prefeituras-container');
  if (pc) { pc.innerHTML = ''; prefCnt = 0; addPrefeitura(); }
  document.getElementById('cliente-ativo-chip').style.display = 'none';

  
  _r5 = null;
  _r3 = false;
  if (_r6) { clearInterval(_r6); _r6 = null; }
  const bar = document.getElementById('edit-mode-bar');
  if (bar) bar.classList.remove('show');
  
  _r0 = [];
  _r1 = [];
  _rr();
  renderParticChips();
}

function clearAll() {
  if (!confirm('Limpar todos os campos?')) return;
  resetForm();
  _t('Formulário limpo','inf');
}




let _r7 = [];
let _r4 = false; 

async function _gc() {
  const res = await api('GET', '/api/clientes');
  if (res?.ok) { _r7 = res.clientes; return res.clientes; }
  return _r7; 
}

async function updateClientCountBadge() {
  const res = await api('GET', '/api/stats');
  
  if (res?.ok) updateDBStats();
}

async function updateDBStats() {
  const res = await api('GET', '/api/stats');
  const el = id => document.getElementById(id);
  if (!res?.ok || !el('db-total')) return;
  el('db-total').textContent = res.total;
  el('db-ativos').textContent = res.ativos;
  if (res.ultimo_salvo) {
    el('db-ultima').textContent = new Date(res.ultimo_salvo).toLocaleDateString('pt-BR');
  }
}

async function deleteClient(cnpj, e) {
  e.stopPropagation();
  if (currentUser?.perfil !== 'admin') { _t('Apenas administradores podem excluir clientes.', 'err'); return; }
  const nome = _r7.find(c => c.cadastro?.cnpj?.replace(/\D/g,'') === cnpj)?.cadastro?.razao_social || cnpj;
  if (!confirm(`Excluir "${nome}"?\nEssa ação não pode ser desfeita.`)) return;
  const res = await api('DELETE', `/api/cliente?cnpj=${cnpj}`);
  if (res?.ok) {
    registrarLog('ficha', `Cliente excluído: ${nome}`);
    _t('Cliente excluído', 'inf');
    updateClientCountBadge();
    await renderDBTable();
    await updateDBStats();
    await renderModalList();
  }
}

function loadClient(data) {
  resetForm();
  _r4 = true; 
  const sv = (id, val) => { const el = document.getElementById(id); if(el) el.value = val||''; };

  
  const restoreChip = (groupId, json) => {
    if (!json) return;
    try {
      const { texto, cls } = JSON.parse(json);
      document.querySelectorAll(`#${groupId} .status-chip`).forEach(chip => {
        if (chip.textContent.trim() === texto) {
          chip.classList.add(cls);
        }
      });
    } catch(e) {}
  };
  restoreChip('status-onboarding',   data.cadastro?.status_onboarding);
  restoreChip('status-complexidade', data.cadastro?.status_complexidade);

  sv('razao_social', data.cadastro?.razao_social);
  sv('nome_fantasia', data.cadastro?.nome_fantasia);
  sv('cnpj_principal', data.cadastro?.cnpj);
  sv('cnpj_input', data.cadastro?.cnpj);
  sv('codigo_sci', data.cadastro?.codigo_sci);
  sv('data_abertura', data.cadastro?.data_abertura);
  sv('porte', data.cadastro?.porte);
  sv('situacao', data.cadastro?.situacao);
  sv('endereco_completo', data.cadastro?.endereco);
  sv('fat_mensal', data.cadastro?.fat_mensal);
  sv('fat_anual', data.cadastro?.fat_anual);
  sv('resp_legal', data.cadastro?.resp_legal);
  sv('resp_cpf', data.cadastro?.resp_cpf);
  sv('email_assinatura', data.cadastro?.email_assinatura);
  sv('telefone', data.cadastro?.telefone);
  sv('ecommerce_plat', data.cadastro?.ecommerce_plat);
  sv('cert_vencimento', data.cadastro?.cert_venc);

  
  if (data.cadastro?.ramos?.length) {
    data.cadastro.ramos.forEach(val => {
      const el = document.querySelector(`[name="ramo"][value="${val}"]`);
      if (el) { el.checked = true; el.closest('.co')?.classList.add('sel'); }
    });
  }

  
  const prefContainer = document.getElementById('prefeituras-container');
  if (prefContainer) {
    prefContainer.innerHTML = '';
    prefCnt = 0;
    const prefs = data.cadastro?.prefeituras || [];
    if (prefs.length) { prefs.forEach(p => addPrefeitura(p)); }
    else { addPrefeitura(); }
  }

  
  if (data.cadastro?.cnaes?.length) {
    const container = document.getElementById('cnaes-container');
    if (container) {
      container.innerHTML = data.cadastro.cnaes.map((c, i) => {
        const parts = c.split(' – ');
        const codigo = parts[0] || c;
        const desc = parts.slice(1).join(' – ') || '';
        return `<div class="cnae-item" data-cnae="${c}" style="display:flex;align-items:flex-start;gap:8px;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--rsm);font-size:12px;">
          <span style="font-family:var(--mono);color:var(--accent2);flex-shrink:0;font-size:11.5px;">${codigo}</span>
          <span style="color:var(--text);flex:1;">${desc}</span>
          ${i===0 ? '<span style="font-size:10px;padding:1px 7px;background:rgba(16,185,129,.12);color:var(--success);border-radius:8px;flex-shrink:0;">Principal</span>' : ''}
        </div>`;
      }).join('');
    }
  }

  sv('consultor_usuario', data.comercial?.consultor_usuario);
  sv('consultor_nome', data.comercial?.consultor);
  sv('data_diagnostico', data.comercial?.data);
  sv('lead_outros', data.comercial?.lead_outros);
  sv('participantes_gtcon', data.comercial?.gtcon);

  sv('escrit_anterior_nome',  data.cadastro?.escrit_anterior_nome);
  sv('escrit_anterior_tel',   data.cadastro?.escrit_anterior_tel);
  sv('escrit_anterior_email', data.cadastro?.escrit_anterior_email);
  
  const contEls = document.getElementById('contatos-extras');
  if (contEls) {
    contEls.innerHTML = '';
    contatoCnt = 0;
    (data.cadastro?.outros_contatos || []).forEach(c => {
      addContato();
      const items = contEls.querySelectorAll('.contato-extra');
      const el = items[items.length - 1];
      if (!el) return;
      const inputs = el.querySelectorAll('input');
      const sel = el.querySelector('select');
      if (inputs[0]) inputs[0].value = c.nome     || '';
      if (sel)       sel.value        = c.setor    || '';
      if (inputs[1]) inputs[1].value  = c.email    || '';
      if (inputs[2]) inputs[2].value  = c.telefone || '';
    });
  }
  sv('competencia_inicio',     data.cadastro?.competencia_inicio);

  sv('dp_clt', data.dp?.clt);
  sv('dp_estagiarios', data.dp?.estagiarios);
  sv('dp_prolabore', data.dp?.prolabore);
  sv('dp_autonomos', data.dp?.autonomos);
  sv('sind_patronal', data.dp?.sind_patronal);
  sv('sind_laboral', data.dp?.sind_laboral);
  sv('dp_passivos_obs', data.dp?.passivos_obs);

  sv('emissor_sistema', data.fiscal?.emissor);
  sv('vol_saida', data.fiscal?.vol_saida);
  sv('vol_entrada', data.fiscal?.vol_entrada);
  sv('obs_fiscal', data.fiscal?.obs);

  sv('erp_outro', data.contabil?.erp_outro);
  sv('contab_anterior', data.contabil?.contab_anterior);
  
  const bancosEl = document.getElementById('bancos-container');
  if (bancosEl) {
    bancosEl.innerHTML = '';
    bancoCnt = 1;
    const bancos = data.contabil?.bancos_pj || [];
    
    const lista = bancos.length ? bancos : [{ banco:'', agencia:'', conta:'', acesso:'' }];
    lista.forEach((b, i) => {
      const n = bancoCnt++;
      const div = document.createElement('div');
      div.className = 'g g4';
      div.style.marginBottom = '8px';
      div.id = 'banco-' + n;
      const simSel = b.acesso === 'sim' ? ' sel' : '';
      const naoSel = b.acesso === 'nao' ? ' sel' : '';
      const simChk = b.acesso === 'sim' ? ' checked' : '';
      const naoChk = b.acesso === 'nao' ? ' checked' : '';
      div.innerHTML = '<div class="fg s2"><label>Banco ' + n + '</label><input type="text" placeholder="Nome do banco" value="' + (b.banco||'') + '"></div>'
        + '<div class="fg"><label>Ag\u00eancia</label><input type="text" placeholder="0000" value="' + (b.agencia||'') + '"></div>'
        + '<div class="fg"><label>Conta</label><input type="text" placeholder="00000-0" value="' + (b.conta||'') + '"></div>'
        + '<div class="fg s2"><label>Acesso PJ?</label><div class="radio-row">'
        + '<label class="ro' + simSel + '" onclick="selR(this,\'banco' + n + '_acesso\')"><input type="radio" name="banco' + n + '_acesso" value="sim"' + simChk + '>Sim</label>'
        + '<label class="ro' + naoSel + '" onclick="selR(this,\'banco' + n + '_acesso\')"><input type="radio" name="banco' + n + '_acesso" value="nao"' + naoChk + '>N\u00e3o</label>'
        + '</div></div>'
        + (n > 1 ? '<div class="fg s2" style="align-self:end;"><button class="btn btn-d btn-sm" onclick="this.closest(\'.g\').remove()">\u2715 Remover</button></div>' : '');
      bancosEl.appendChild(div);
    });
  }
  sv('risco_cadastral', data.contabil?.r_cadastral);
  sv('risco_tributario', data.contabil?.r_tributario);
  sv('risco_trabalhista', data.contabil?.r_trabalhista);
  sv('risco_tecnologico', data.contabil?.r_tecnologico);

  sv('dia_ponto', data.parametros?.dia_ponto);
  sv('dia_extratos', data.parametros?.dia_extratos);
  sv('dia_guias', data.parametros?.dia_guias);
  sv('imp_contabil',       data.parametros?.imp_contabil);
  sv('imp_contabil_email', data.parametros?.imp_contabil_email);
  sv('imp_fiscal',         data.parametros?.imp_fiscal);
  sv('imp_fiscal_email',   data.parametros?.imp_fiscal_email);
  sv('imp_dp',             data.parametros?.imp_dp);
  sv('imp_dp_email',       data.parametros?.imp_dp_email);
  sv('op_contabil',        data.parametros?.op_contabil);
  sv('op_contabil_email',  data.parametros?.op_contabil_email);
  sv('op_fiscal',          data.parametros?.op_fiscal);
  sv('op_fiscal_email',    data.parametros?.op_fiscal_email);
  sv('op_dp',              data.parametros?.op_dp);
  sv('op_dp_email',        data.parametros?.op_dp_email);
  
  const respExtrasContainer = document.getElementById('resp-extras');
  if (respExtrasContainer) {
    respExtrasContainer.innerHTML = '';
    (data.parametros?.resp_extras || []).forEach(r => addRespExtra(r));
  }
  sv('key_financeiro', data.parametros?.key_fin);
  sv('key_rh', data.parametros?.key_rh);
  sv('key_fiscal', data.parametros?.key_fiscal);
  sv('resp_tecnico', data.parametros?.resp_tecnico);
  sv('data_corte', data.parametros?.data_corte);

  sv('part_instrucoes', data.particularidades?.instrucoes);
  sv('part_avisos', data.particularidades?.avisos);
  sv('obs_gerais', data.particularidades?.obs_gerais);
  sv('diagnostico_final', data.particularidades?.diagnostico);
  sv('resumo_reuniao', data.particularidades?.resumo);

  
  
  _r2 = data.cadastro?.grupo_id
    ? { id: data.cadastro.grupo_id, nome: data.cadastro.grupo_nome || '' }
    : (data.cadastro?.grupo_empresas ? { id: '', nome: data.cadastro.grupo_empresas } : null);
  const inputGrupo = document.getElementById('grupo_empresas');
  if (inputGrupo) inputGrupo.value = _r2?.nome || '';
  renderGrupoBadge();
  sv('outros_relatorios', data.parametros?.outros_relatorios);

  
  function setRadio(name, value) {
    if (!value) return;
    const el = document.querySelector(`[name="${name}"][value="${value}"]`);
    if (el) {
      el.checked = true;
      el.closest('.ro')?.classList.add('sel');
    }
  }
  setRadio('regime',        data.cadastro?.regime);
  setRadio('grupo_eco',     data.cadastro?.grupo_eco);
  setRadio('licitacoes',    data.cadastro?.licitacoes);
  setRadio('ecommerce',     data.cadastro?.ecommerce);
  setRadio('cert_digital',  data.cadastro?.cert);
  setRadio('envio_guias',   data.parametros?.envio_guias);
  setRadio('ponto',         data.dp?.ponto);
  setRadio('insalub',       data.dp?.insalub);
  setRadio('periculosidade',data.dp?.periculosidade);
  setRadio('sst_docs',      data.dp?.sst_docs);
  setRadio('sst_resp',      data.dp?.sst_resp);
  setRadio('apuracao',      data.fiscal?.apuracao);
  setRadio('icms_st',       data.fiscal?.icms_st);
  setRadio('estoque',       data.fiscal?.estoque);
  setRadio('sped',          data.fiscal?.sped);
  setRadio('vende_cf',          data.fiscal?.vende_cf);
  ['rec_mercadorias','rec_servicos','rec_industria','rec_financeira',
   'rec_aluguel','rec_exportacao','rec_isenta','rec_segregacao'].forEach(k => setRadio(k, data.fiscal?.[k]));
  setRadio('perfil_comercial',  data.fiscal?.perfil_comercial);
  setRadio('ecommerce',         data.fiscal?.ecommerce);
  sv('ecommerce_plat',          data.fiscal?.ecommerce_plat);
  setRadio('notas_entrada_100', data.fiscal?.notas_entrada_100);
  setRadio('notas_saida_100',   data.fiscal?.notas_saida_100);
  sv('part_pis_cofins',      data.fiscal?.part_pis_cofins);
  sv('part_irpj_csll',      data.fiscal?.part_irpj_csll);
  sv('part_iss',            data.fiscal?.part_iss);
  sv('part_icms',           data.fiscal?.part_icms);
  sv('part_ipi',            data.fiscal?.part_ipi);
  sv('part_das',            data.fiscal?.part_das);
  sv('obs_compras',         data.fiscal?.obs_compras);
  sv('iss_municipio',       data.fiscal?.iss_municipio);
  sv('iss_aliquota',        data.fiscal?.iss_aliquota);
  const fiscalRadios = ['compra_insumos','compra_revenda','compra_ativo','compra_servicos_pc',
    'forn_simples','forn_exterior','credito_pc_compras','credito_icms_compras',
    'pc_regime','pc_monofasico','pc_exclusoes','pc_cred_presumido','pc_cred_insumos','pc_ciap',
    'irpj_forma','irpj_periodo','irpj_distribuicao','irpj_jscp','irpj_prejuizo','irpj_adicoes',
    'iss_obrigado','iss_retido','iss_outro_mun','iss_tomado',
    'icms_contrib','icms_difal','icms_apuracao','icms_antecipacao','icms_saldo_credor','icms_multiestado',
    'ipi_contrib','ipi_credito','ipi_ncm','ipi_suspensao',
    'das_anexo','das_sublimite','das_risco_exclusao','das_parcelamento','das_vedadas','das_limite'];
  fiscalRadios.forEach(k => setRadio(k, data.fiscal?.[k]));
  sv('part_irpj_csll',      data.fiscal?.part_irpj_csll);
  sv('part_iss',            data.fiscal?.part_iss);
  sv('part_icms',           data.fiscal?.part_icms);
  sv('part_ipi',            data.fiscal?.part_ipi);
  sv('part_das',            data.fiscal?.part_das);
  
  setRadio('erp',           data.particularidades?.erp || data.contabil?.erp);
  setRadio('erp_integ',     data.particularidades?.erp_integ || data.contabil?.erp_integ);
  sv('erp_outro',           data.particularidades?.erp_outro || data.contabil?.erp_outro);
  
  const _depts = data.particularidades?.depts || [];
  document.querySelectorAll('[name="depts"]').forEach(el => {
    el.checked = _depts.includes(el.value);
    const lbl = el.closest('label');
    if (lbl) lbl.classList.toggle('sel', el.checked);
  });
  setRadio('balancete',          data.contabil?.balancete);
  setRadio('imobilizado',        data.contabil?.imobilizado);
  setRadio('licitacoes',         data.contabil?.licitacoes);
  setRadio('tem_imobilizado',    data.contabil?.tem_imobilizado);
  setRadio('laudo_avaliacao',    data.contabil?.laudo_avaliacao);
  setRadio('metodo_depreciacao', data.contabil?.metodo_depreciacao);
  setRadio('imob_sistema',       data.contabil?.imob_sistema);
  ['desp_dedutiveis','desp_nao_dedutiveis','desp_custo_depto',
   'desp_custo_produto','desp_retiradas','desp_adiantamentos'
  ].forEach(k => setRadio(k, data.contabil?.[k]));
  sv('imob_obs',                 data.contabil?.imob_obs);
  sv('desp_obs',                 data.contabil?.desp_obs);
  sv('plano_contas_obs',         data.contabil?.plano_contas_obs);
  ['desp_cmv','desp_folha','desp_prolabore','desp_depreciacao',
   'desp_financeiras','desp_leasing','desp_centro_custo','desp_rateio'].forEach(k => setRadio(k, data.contabil?.[k]));
  
  const pcSel = data.contabil?.plano_contas || [];
  document.querySelectorAll('[name="pc"]').forEach(el => {
    el.checked = pcSel.includes(el.value);
    el.closest('label')?.classList.toggle('sel', el.checked);
  });
  atualizarContadorPC();
  sv('imob_obs',                 data.contabil?.imob_obs);
  setRadio('lead_origem',   data.comercial?.lead_origem);

  
  _r0 = data.reunioes || [];
  _r1 = [];
  _rr();
  renderParticChips();
  aplicarBloqueioParticipantes();

  const nm = data.cadastro?.razao_social || '';
  _ac(nm);
  showTab('cadastro', null);
  _t(`"${nm || 'Ficha'}" carregada com sucesso!`, 'ok');
}

async function renderDBTable() {
  const wrap = document.getElementById('db-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px;">⏳ Carregando...</div>`;
  const q = (document.getElementById('db-search-input')?.value || '').toLowerCase();
  const all = (await _gc())
    .filter(c => clientePertenceAoUsuario(c))
    .filter(c => {
      if (!q) return true;
      return (c.cadastro?.razao_social||'').toLowerCase().includes(q)
        || (c.cadastro?.cnpj||'').replace(/\D/g,'').includes(q.replace(/\D/g,''))
        || (c.cadastro?.nome_fantasia||'').toLowerCase().includes(q)
        || (c.cadastro?.codigo_sci||'').toLowerCase().includes(q);
    });

  if (!all.length) {
    const msg = q ? `Nenhum resultado para "<strong>${q}</strong>".` : 'Nenhum cliente cadastrado ainda.';
    const sub = q ? 'Tente buscar por nome, CNPJ ou código SCI.' : 'Clique em "Nova Ficha" para começar.';
    wrap.innerHTML = `<div class="db-empty"><div class="de-icon">${q ? '🔍' : '📂'}</div><p>${msg}</p><small>${sub}</small></div>`;
    return;
  }

  wrap.innerHTML = `<table class="db-table">
    <thead><tr>
      <th>Cód. SCI</th><th>Razão Social</th><th>CNPJ</th><th>Regime</th><th>Situação</th><th>Atualizado</th>${currentUser?.perfil === 'admin' ? '<th></th>' : ''}
    </tr></thead>
    <tbody>${all.map(c => {
      const cnpjRaw = c.cadastro?.cnpj?.replace(/\D/g,'') || '';
      const dt = c.meta?.savedAt ? new Date(c.meta.savedAt).toLocaleDateString('pt-BR') : '—';
      const sit = c.cadastro?.situacao || '—';
      const sitColor = sit.toUpperCase().includes('ATIVA') ? 'var(--success)' : 'var(--muted)';
      const reg = c.cadastro?.regime || '—';
      const sci = c.cadastro?.codigo_sci || '—';
      const consultor = c.comercial?.consultor ? `<div style="font-size:10px;color:var(--muted);margin-top:2px;">👤 ${c.comercial.consultor}</div>` : '';
      return `<tr style="cursor:pointer;" onclick='abrirCliente(${JSON.stringify(c)})' title="Clique para abrir a ficha">
        <td><span style="font-family:var(--mono);font-size:12px;color:var(--accent2);font-weight:600;">${sci}</span></td>
        <td>
          <div class="db-razao">${c.cadastro?.razao_social||'(sem nome)'}</div>
          <div style="font-size:10.5px;color:var(--muted)">${c.cadastro?.nome_fantasia||''}</div>
          ${consultor}
        </td>
        <td class="db-cnpj">${c.cadastro?.cnpj||'—'}</td>
        <td><span style="font-size:11.5px">${reg}</span></td>
        <td><span style="font-size:11.5px;color:${sitColor}">${sit}</span></td>
        <td class="db-cnpj">${dt}</td>
        ${currentUser?.perfil === 'admin' ? `<td onclick="event.stopPropagation()"><button class="db-del-btn" onclick="deleteClient('${cnpjRaw}',event)">✕</button></td>` : ''}
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function abrirCliente(data) {
  _r4 = true;
  if (_r5 && _r3) sairModoEdicao();
  loadClient(data);
  _bc();
  updateTribTabs();
  showTab('cadastro', document.querySelector('.tab-btn'));
  const nome = data.cadastro?.razao_social || data.cadastro?.cnpj || 'Cliente';
  const cnpj = (data.cadastro?.cnpj||'').replace(/\D/g,'');
  _r5 = cnpj;
  _ac(nome, data.comercial?.consultor || data.cadastro?.consultor_nome);
  const bar = document.getElementById('edit-mode-bar');
  if (bar) bar.classList.add('show');
  _av();
  if (cnpj) setTimeout(() => verificarTravaAtiva(cnpj), 400);
  setTimeout(() => verificarDadosSPED(), 300);
}




function openClientModal() {
  document.getElementById('client-modal').classList.add('open');
  document.getElementById('modal-search-input').value = '';
  renderModalList();
  setTimeout(() => document.getElementById('modal-search-input').focus(), 100);
}
function closeClientModal() {
  document.getElementById('client-modal').classList.remove('open');
}
async function renderModalList() {
  const q = (document.getElementById('modal-search-input')?.value || '').toLowerCase();
  const all = (await _gc())
    .filter(c => clientePertenceAoUsuario(c))  
    .filter(c => {
      if (!q) return true;
      return (c.cadastro?.razao_social||'').toLowerCase().includes(q)
        || (c.cadastro?.cnpj||'').includes(q)
        || (c.cadastro?.nome_fantasia||'').toLowerCase().includes(q)
        || (c.cadastro?.codigo_sci||'').toLowerCase().includes(q);
    });
  const list = document.getElementById('modal-client-list');
  if (!list) return;
  if (!all.length) {
    list.innerHTML = `<div class="modal-empty"><div class="me-icon">${q ? '🔍' : '📂'}</div>
      <div>${q ? 'Nenhum cliente encontrado.' : 'Nenhum cliente salvo ainda.'}</div></div>`;
    return;
  }
  list.innerHTML = all.map(c => {
    const cnpjRaw = c.cadastro?.cnpj?.replace(/\D/g,'') || '';
    const initials = (c.cadastro?.razao_social||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const dt = c.meta?.savedAt ? new Date(c.meta.savedAt).toLocaleDateString('pt-BR') : '';
    const sit = c.cadastro?.situacao || '';
    const sitClass = sit.toUpperCase().includes('ATIVA') ? '' : 'warn';
    const sci = c.cadastro?.codigo_sci ? `<span style="font-family:var(--mono);font-size:10px;color:var(--accent2);background:rgba(37,99,235,.1);padding:1px 6px;border-radius:4px;">SCI ${c.cadastro.codigo_sci}</span>` : '';
    return `<div class="client-list-item" onclick='loadClient(${JSON.stringify(c)});closeClientModal()'>
      <div class="cli-avatar">${initials}</div>
      <div class="cli-info">
        <div class="cli-razao">${c.cadastro?.razao_social||'(sem nome)'}</div>
        <div class="cli-cnpj">${c.cadastro?.cnpj||'—'}${c.cadastro?.nome_fantasia ? ' · '+c.cadastro.nome_fantasia : ''}</div>
      </div>
      <div class="cli-meta">
        ${sci}
        ${sit ? `<span class="cli-badge ${sitClass}">${sit}</span>` : ''}
        <span class="cli-date">${dt}</span>
        <button class="cli-del" onclick="deleteClient('${cnpjRaw}',event)" title="Excluir" ${currentUser?.perfil !== 'admin' ? 'style="display:none"' : ''}>✕</button>
      </div>
    </div>`;
  }).join('');
}


document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeClientModal();
});




let prefCnt = 0;
function addPrefeitura(dados) {
  prefCnt++;
  const id = 'pref-' + prefCnt;
  const div = document.createElement('div');
  div.id = id;
  div.className = 'prefeitura-item';
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end;background:var(--surface2);border:1px solid var(--border);border-radius:var(--rsm);padding:12px;';
  div.innerHTML = `
    <div class="fg">
      <label>Prefeitura / Portal</label>
      <input type="text" class="pref-nome" placeholder="Ex: Pref. São Paulo" value="${dados?.nome||''}">
    </div>
    <div class="fg">
      <label>Usuário / Login</label>
      <input type="text" class="pref-login" placeholder="CPF, CNPJ ou e-mail" value="${dados?.login||''}">
    </div>
    <div class="fg">
      <label>Senha</label>
      <div style="position:relative;">
        <input type="password" class="pref-senha" placeholder="••••••••" value="${dados?.senha||''}"
          style="width:100%;padding-right:36px;">
        <button type="button" onclick="toggleSenhaPref(this)"
          style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);font-size:15px;line-height:1;">👁</button>
      </div>
    </div>
    <div>
      <button class="btn btn-d btn-sm" onclick="this.closest('.prefeitura-item').remove()">✕</button>
    </div>`;
  document.getElementById('prefeituras-container').appendChild(div);
}

function toggleSenhaPref(btn) {
  const input = btn.previousElementSibling;
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁'; }
}








let currentUser = null;


let usuariosDB = [];


const _am = { nome: 'Admin Master', usuario: 'admin', dept: 'Diretoria', perfil: 'admin', senha: 'gtcon@2025', master: true };


async function _lu() {
  try {
    const rows = await _sf('GET', 'usuarios?order=created_at.asc');
    usuariosDB = (rows || []).map(r => ({
      id:            r.id,
      nome:          r.nome,
      usuario:       r.usuario,
      senha:         r.senha,
      dept:          r.dept,
      perfil:        r.perfil,
      master:        r.master,
      primeiroAcesso: r.primeiro_acesso,
    }));
    
    if (!usuariosDB.find(u => u.master)) {
      usuariosDB.unshift({ ..._am, id: 'master' });
    }
  } catch(e) {
    console.error('_lu:', e);
    usuariosDB = [{ ..._am, id: 'master' }];
  }
}

async function _su(u) {
  
  const headers_upsert = {
    'Content-Type': 'application/json',
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Prefer': 'resolution=merge-duplicates,return=minimal',
  };
  const payload = {
    id:              u.id,
    nome:            u.nome,
    usuario:         u.usuario,
    senha:           u.senha,
    dept:            u.dept,
    perfil:          u.perfil || 'usuario',
    master:          u.master || false,
    primeiro_acesso: u.primeiroAcesso !== false,
  };
  const res = await fetch(`${SB_URL}/rest/v1/usuarios`, {
    method: 'POST',
    headers: headers_upsert,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.details || `HTTP ${res.status}`);
  }
}

async function deleteUsuario(id) {
  await _sf('DELETE', `usuarios?id=eq.${id}`);
}


async function saveUsuarios() {
  for (const u of usuariosDB) {
    if (!u.master) await _su(u);
  }
}

async function resetarUsuarios() {
  if (!confirm('Isso vai redefinir o acesso e restaurar apenas o admin master.\nUsuários não-master cadastrados serão removidos.\n\nContinuar?')) return;
  try {
    
    await _sf('DELETE', 'usuarios?master=eq.false');
    await _lu();
  } catch(e) { console.error(e); }
  document.getElementById('login-usuario').value = 'admin';
  document.getElementById('login-senha').value = '';
  document.getElementById('login-err').textContent = '✅ Acesso redefinido. Use: usuário "admin" e senha "gtcon@2025"';
  document.getElementById('login-err').classList.add('show');
  document.getElementById('login-senha').focus();
}

async function fazerLogin() {
  const usuario = document.getElementById('login-usuario').value.trim().toLowerCase();
  const senha   = document.getElementById('login-senha').value;
  const err     = document.getElementById('login-err');
  const btn     = document.getElementById('btn-login');

  if (!usuario || !senha) {
    err.textContent = 'Preencha usuário e senha.';
    err.classList.add('show'); return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Entrando...'; }
  err.classList.remove('show');

  await _lu();
  const match = usuariosDB.find(u => u.usuario.toLowerCase() === usuario);

  if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }

  if (!match) {
    err.textContent = 'Usuário não encontrado. Solicite acesso ao administrador.';
    err.classList.add('show'); return;
  }

  if (match.senha !== senha) {
    err.textContent = 'Senha incorreta. Tente novamente.';
    err.classList.add('show');
    document.getElementById('login-senha').value = '';
    document.getElementById('login-senha').focus();
    return;
  }

  err.classList.remove('show');
  currentUser = { ...match };

  
  if (match.primeiroAcesso) {
    document.getElementById('redef-nova').value = '';
    document.getElementById('redef-confirma').value = '';
    document.getElementById('redef-err').style.display = 'none';
    document.getElementById('modal-redef-senha').style.display = 'flex';
    setTimeout(() => document.getElementById('redef-nova').focus(), 100);
    return;
  }

  aplicarSessao();
}

async function confirmarRedefinicaoSenha() {
  const nova     = document.getElementById('redef-nova').value;
  const confirma = document.getElementById('redef-confirma').value;
  const errEl    = document.getElementById('redef-err');

  if (nova.length < 6) {
    errEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    errEl.style.display = 'block'; return;
  }
  if (nova !== confirma) {
    errEl.textContent = 'As senhas não coincidem. Verifique e tente novamente.';
    errEl.style.display = 'block'; return;
  }

  
  _lu();
  const idx = usuariosDB.findIndex(u => u.usuario === currentUser.usuario);
  if (idx >= 0) {
    usuariosDB[idx].senha = nova;
    delete usuariosDB[idx].primeiroAcesso;
    saveUsuarios();
    currentUser = { ...usuariosDB[idx] };
  }

  document.getElementById('modal-redef-senha').style.display = 'none';
  registrarLog('usuario', `Senha redefinida pelo usuário: @${currentUser.usuario}`);
  aplicarSessao();
}

function abrirModalSenhaAdmin() {
  document.getElementById('admin-codigo-passe').value = '';
  document.getElementById('admin-nova-senha').value = '';
  document.getElementById('admin-confirma-senha').value = '';
  document.getElementById('admin-senha-err').style.display = 'none';
  document.getElementById('modal-senha-admin').style.display = 'flex';
  setTimeout(() => document.getElementById('admin-codigo-passe').focus(), 100);
}

function fecharModalSenhaAdmin() {
  document.getElementById('modal-senha-admin').style.display = 'none';
}

async function confirmarSenhaAdmin() {
  const codigo   = document.getElementById('admin-codigo-passe').value;
  const nova     = document.getElementById('admin-nova-senha').value;
  const confirma = document.getElementById('admin-confirma-senha').value;
  const errEl    = document.getElementById('admin-senha-err');

  if (codigo !== '3829E7d1#') {
    errEl.textContent = 'Código de autorização incorreto.';
    errEl.style.display = 'block';
    document.getElementById('admin-codigo-passe').value = '';
    document.getElementById('admin-codigo-passe').focus();
    return;
  }
  if (nova.length < 6) {
    errEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    errEl.style.display = 'block'; return;
  }
  if (nova !== confirma) {
    errEl.textContent = 'As senhas não coincidem.';
    errEl.style.display = 'block'; return;
  }

  await _lu();
  const idx = usuariosDB.findIndex(u => u.master);
  if (idx >= 0) {
    usuariosDB[idx].senha = nova;
    _am.senha = nova;
    try { await _su(usuariosDB[idx]); } catch(e) { console.error(e); }
  }

  fecharModalSenhaAdmin();
  registrarLog('usuario', 'Senha do admin master alterada via código passe');
  _t('✅ Senha do admin atualizada com sucesso!', 'ok');
}

function fazerLogout() {
  if (currentUser) {
    registrarLog('login', 'Logout realizado');
    if (_r5 && _r3) _lt(_r5);
    if (_r6) { clearInterval(_r6); _r6 = null; }
  }
  currentUser = null;
  resetForm();
  document.getElementById('user-chip').style.display = 'none';
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-usuario').value = '';
  document.getElementById('login-senha').value = '';
}




let _dadosCNPJNova = null;

function novaFicha() {
  _dadosCNPJNova = null;
  document.getElementById('nova-ficha-cnpj').value = '';
  document.getElementById('nova-ficha-preview').style.display = 'none';
  document.getElementById('nova-ficha-err').style.display = 'none';
  document.getElementById('nova-ficha-dup').style.display = 'none';
  document.getElementById('btn-criar-ficha').disabled = true;
  document.getElementById('btn-criar-ficha').style.opacity = '.4';
  document.getElementById('nova-ficha-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('nova-ficha-cnpj').focus(), 100);
}

function fecharNovaFicha() {
  document.getElementById('nova-ficha-modal').style.display = 'none';
}

function fmtCnpjNova(el) {
  let v = el.value.replace(/\D/g,'').slice(0,14);
  if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5');
  else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/,'$1.$2.$3/$4');
  else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/,'$1.$2.$3');
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3})/,'$1.$2');
  el.value = v;
  
  document.getElementById('nova-ficha-preview').style.display = 'none';
  document.getElementById('nova-ficha-err').style.display = 'none';
  document.getElementById('nova-ficha-dup').style.display = 'none';
  document.getElementById('btn-criar-ficha').disabled = true;
  document.getElementById('btn-criar-ficha').style.opacity = '.4';
  _dadosCNPJNova = null;
}

async function buscarCNPJNova() {
  const raw = document.getElementById('nova-ficha-cnpj').value.replace(/\D/g,'');
  const errEl = document.getElementById('nova-ficha-err');
  if (raw.length !== 14) {
    errEl.textContent = 'CNPJ inválido. Digite os 14 dígitos.';
    errEl.style.display = 'block'; return;
  }
  errEl.style.display = 'none';
  const btn = document.getElementById('btn-buscar-nova');
  btn.textContent = '⏳'; btn.disabled = true;

  let data = null;
  try {
    
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
    if (r.ok) data = await r.json();
  } catch(e) {}

  if (!data || data.status === 'ERROR') {
    try {
      
      const r = await fetch(`https://publica.cnpj.ws/cnpj/${raw}`);
      if (r.ok) {
        const d = await r.json();
        
        data = {
          razao_social: d.razao_social,
          nome_fantasia: d.estabelecimento?.nome_fantasia || '',
          cnae_fiscal: d.estabelecimento?.atividade_principal?.id,
          cnae_fiscal_descricao: d.estabelecimento?.atividade_principal?.descricao,
          cnaes_secundarios: (d.estabelecimento?.atividades_secundarias || []).map(a => ({ codigo: a.id, descricao: a.descricao })),
          descricao_situacao_cadastral: d.estabelecimento?.situacao_cadastral,
          data_inicio_atividade: d.estabelecimento?.data_inicio_atividade,
          porte: d.porte?.descricao || '',
          logradouro: d.estabelecimento?.logradouro,
          numero: d.estabelecimento?.numero,
          complemento: d.estabelecimento?.complemento,
          bairro: d.estabelecimento?.bairro,
          municipio: d.estabelecimento?.cidade?.nome,
          uf: d.estabelecimento?.estado?.sigla,
          cep: d.estabelecimento?.cep,
        };
      }
    } catch(e) {}
  }

  if (!data || data.status === 'ERROR') {
    try {
      
      const r = await fetch(`https://receitaws.com.br/v1/cnpj/${raw}`);
      if (r.ok) data = await r.json();
    } catch(e) {}
  }

  btn.textContent = 'Buscar'; btn.disabled = false;

  if (!data || data.status === 'ERROR' || data.tipo === 'service_error') {
    errEl.textContent = data?.message || data?.detalhes || 'CNPJ não encontrado na Receita Federal. Verifique e tente novamente.';
    errEl.style.display = 'block'; return;
  }

  _dadosCNPJNova = data;

  
  const clientes = await _gd();
  const jaExiste = clientes.find(c => c.cadastro?.cnpj?.replace(/\D/g,'') === raw);
  const dupEl = document.getElementById('nova-ficha-dup');
  const dupNome = document.getElementById('nova-ficha-dup-nome');
  const btnCriar = document.getElementById('btn-criar-ficha');

  if (jaExiste) {
    const nome = jaExiste.cadastro?.razao_social || jaExiste.cadastro?.cnpj || 'Cliente';
    const sci  = jaExiste.cadastro?.codigo_sci ? ` — SCI: ${jaExiste.cadastro.codigo_sci}` : '';
    dupNome.textContent = `${nome}${sci}`;
    dupEl.style.display = 'block';
    
    btnCriar.disabled = true;
    btnCriar.style.opacity = '.4';
    btnCriar.title = 'Cliente já cadastrado — localize-o na aba Clientes';
  } else {
    dupEl.style.display = 'none';
    btnCriar.disabled = false;
    btnCriar.style.opacity = '1';
    btnCriar.title = '';
  }
  const sit = data.descricao_situacao_cadastral || data.situacao || '';
  const sitColor = sit.toUpperCase().includes('ATIVA') ? 'var(--success)' : 'var(--warning)';
  document.getElementById('nf-razao').textContent   = data.razao_social || '';
  document.getElementById('nf-fantasia').textContent = data.nome_fantasia || '';
  document.getElementById('nf-cnpj').textContent    = document.getElementById('nova-ficha-cnpj').value;
  document.getElementById('nf-sit').textContent     = sit;
  document.getElementById('nf-sit').style.color     = sitColor;
  document.getElementById('nf-porte').textContent   = data.porte || data.descricao_porte || '';
  document.getElementById('nova-ficha-preview').style.display = 'block';
  document.getElementById('btn-criar-ficha').disabled = false;
  document.getElementById('btn-criar-ficha').style.opacity = '1';
}

function criarFicha() {
  const dadosCapturados = _dadosCNPJNova;
  const rawCapturado = document.getElementById('nova-ficha-cnpj').value.replace(/\D/g,'');
  fecharNovaFicha();
  resetForm();
  _r4 = false;
  _r5 = rawCapturado || null;

  if (dadosCapturados) {
    if (dadosCapturados.cnae_fiscal !== undefined) {
      fillCNPJ(dadosCapturados, rawCapturado);
    } else {
      fillCNPJAlt(dadosCapturados, rawCapturado);
    }
  }

  
  selStatus(document.querySelector('#status-onboarding .status-chip'), 'status-onboarding', 'sel-red');

  _ac(dadosCapturados?.razao_social || dadosCapturados?.nome || '');
  showTab('cadastro', document.querySelector('.tab-btn'));
  const bar = document.getElementById('edit-mode-bar');
  if (bar) bar.classList.add('show');
  _ae(); 
}

function criarFichaSemCNPJ() {
  fecharNovaFicha();
  resetForm();
  _r4 = false;

  
  selStatus(document.querySelector('#status-onboarding .status-chip'), 'status-onboarding', 'sel-red');

  showTab('cadastro', document.querySelector('.tab-btn'));
}

function aplicarSessao() {
  document.getElementById('login-overlay').classList.add('hidden');

  const initials = currentUser.nome.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-name-chip').textContent = currentUser.nome.split(' ')[0];
  document.getElementById('user-dept-chip').textContent = currentUser.dept;
  document.getElementById('user-chip').style.display = 'flex';

  const isAdmin = currentUser.perfil === 'admin';
  document.querySelectorAll('.tab-admin-only').forEach(el => {
    el.style.display = isAdmin ? 'flex' : 'none';
  });

  const btnLimpar = document.querySelector('[onclick="clearAll()"]');
  if (btnLimpar) btnLimpar.style.display = isAdmin ? '' : 'none';

  _tp();
  _bc();
  registrarLog('login', 'Login realizado');

  
  showTab('db', document.querySelectorAll('.tab-btn')[7]);
  _t(`👋 Bem-vindo(a), ${currentUser.nome.split(' ')[0]}!`, 'ok');
  updateClientCountBadge();
}


async function adicionarUsuario() {
  const nome    = document.getElementById('new-user-nome').value.trim();
  const usuario = document.getElementById('new-user-usuario').value.trim().toLowerCase();
  const dept    = document.getElementById('new-user-dept').value;
  const perfil  = document.getElementById('new-user-perfil').value;

  if (!nome || !usuario || !dept) {
    _t('Preencha todos os campos do usuário.', 'err'); return;
  }

  await _lu();
  if (usuariosDB.find(u => u.usuario.toLowerCase() === usuario)) {
    _t(`Usuário "@${usuario}" já existe.`, 'err'); return;
  }

  const novoUsuario = { id: Date.now().toString(), nome, usuario, dept, perfil, senha: '123456', primeiroAcesso: true };
  try {
    await _su(novoUsuario);
    usuariosDB.push(novoUsuario);
  } catch(e) {
    _t(`Erro ao salvar: ${e.message}`, 'err'); return;
  }

  document.getElementById('new-user-nome').value = '';
  document.getElementById('new-user-usuario').value = '';
  document.getElementById('new-user-dept').value = '';
  document.getElementById('new-user-perfil').value = 'usuario';
  renderAdminUserList();
  registrarLog('usuario', `Usuário criado: ${nome} (@${usuario}) — ${dept} [${perfil}]`);
  _t(`✅ "${nome}" (@${usuario}) adicionado! Senha padrão: 123456`, 'ok');
}

async function alterarSenha(id) {
  const u = usuariosDB.find(u => u.id === id);
  if (!u) return;
  if (u.master) { _t('Use o botão "Alterar senha do Admin" para o admin master.', 'err'); return; }
  if (!confirm(`Resetar senha de "${u.nome}" (@${u.usuario}) para o padrão 123456?\n\nO usuário será solicitado a criar uma nova senha no próximo login.`)) return;
  u.senha = '123456';
  u.primeiroAcesso = true;
  try {
    await _su(u);
  } catch(e) {
    _t(`Erro ao alterar senha: ${e.message}`, 'err'); return;
  }
  renderAdminUserList();
  _t(`🔑 Senha de "@${u.usuario}" resetada para 123456.`, 'ok');
}

async function removerUsuario(id) {
  const u = usuariosDB.find(u => u.id === id);
  if (!u) return;
  if (u.master) { _t('O admin master não pode ser removido.', 'err'); return; }
  if (!confirm(`Remover "${u.nome}" (@${u.usuario})?`)) return;
  try {
    await deleteUsuario(id);
    usuariosDB = usuariosDB.filter(u => u.id !== id);
  } catch(e) {
    _t(`Erro ao remover: ${e.message}`, 'err'); return;
  }
  renderAdminUserList();
  registrarLog('usuario', `Usuário removido: ${u.nome} (@${u.usuario})`);
  _t(`"${u.nome}" removido.`, 'inf');
}

async function renderAdminUserList() {
  await _lu();
  const list = document.getElementById('admin-user-list');
  if (!list) return;
  if (!usuariosDB.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px;">Nenhum usuário cadastrado.</div>';
    return;
  }
  list.innerHTML = usuariosDB.map(u => `
    <div class="admin-user-card">
      <div class="user-avatar" style="width:36px;height:36px;font-size:12px;border-radius:8px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0;">
        ${u.nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
      </div>
      <div class="admin-user-info">
        <div class="admin-user-name">${u.nome}${u.master ? ' <span style="font-size:10px;color:var(--muted);">(master)</span>' : ''}</div>
        <div class="admin-user-meta">
          <span style="font-family:var(--mono);font-size:11px;color:var(--accent2);">@${u.usuario}</span>
          · ${u.dept}
        </div>
      </div>
      <span class="admin-badge ${u.perfil === 'admin' ? 'adm' : 'usr'}">${u.perfil === 'admin' ? 'Admin' : 'Usuário'}</span>
      <button class="btn btn-s btn-sm" onclick="alterarSenha('${u.id}')">🔑 Alterar senha</button>
      ${!u.master ? `<button class="btn btn-d btn-sm" onclick="removerUsuario('${u.id}')">✕ Remover</button>` : ''}
    </div>
  `).join('');
}

function _t(msg, type='inf') {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `_t ${type}`;
  t.innerHTML = `<span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.transition='.25s'; t.style.opacity='0'; setTimeout(()=>t.remove(),250); }, 3200);
}


async function migrarUsuariosLocalStorage() {
  const KEY = 'gtcon_usuarios';
  const raw = localStorage.getItem(KEY);
  if (!raw) return; 
  try {
    const local = JSON.parse(raw);
    if (!local || !local.length) { localStorage.removeItem(KEY); return; }
    
    const existentes = await _sf('GET', 'usuarios?select=usuario');
    const jaExistem = new Set((existentes||[]).map(u => u.usuario));
    let migrados = 0;
    for (const u of local) {
      if (u.master) continue; 
      if (jaExistem.has(u.usuario)) continue; 
      try {
        await _sf('POST', 'usuarios', {
          id:              u.id || Date.now().toString(),
          nome:            u.nome,
          usuario:         u.usuario,
          senha:           u.senha || '123456',
          dept:            u.dept || 'Geral',
          perfil:          u.perfil || 'usuario',
          master:          false,
          primeiro_acesso: u.primeiroAcesso !== false,
        });
        migrados++;
      } catch(e) { console.warn('Migração skip:', u.usuario, e.message); }
    }
    if (migrados > 0) {
      console.log(`✅ Migração: ${migrados} usuário(s) movidos para Supabase`);
      _t(`✅ ${migrados} usuário(s) migrados para o banco centralizado.`, 'ok');
    }
    localStorage.removeItem(KEY); 
    
    await migrarLogsLocalStorage();
  } catch(e) { console.error('migrarUsuariosLocalStorage:', e); }
}

async function migrarLogsLocalStorage() {
  const raw = localStorage.getItem('gtcon_log');
  if (!raw) return;
  try {
    const logs = JSON.parse(raw);
    if (!logs || !logs.length) { localStorage.removeItem('gtcon_log'); return; }
    for (const l of logs.slice(-200)) { 
      await _sf('POST', 'logs', {
        ts:       l.ts || new Date().toISOString(),
        tipo:     l.tipo || 'sistema',
        acao:     l.acao || '',
        usuario:  l.usuario || '',
        login:    l.login || '',
        dept:     l.dept || '',
        detalhes: l.detalhes || {},
      }).catch(() => {});
    }
    localStorage.removeItem('gtcon_log');
    console.log('✅ Logs migrados para Supabase');
  } catch(e) { console.error('migrarLogsLocalStorage:', e); }
}


function abrirSPED() { abrirAuditor(); } 

function abrirAuditor() {
  const cnpj = document.getElementById('cnpj_principal')?.value?.replace(/\D/g,'') || '';
  const nome = document.getElementById('razao_social')?.value || '';
  if (!cnpj && !nome) {
    _t('Salve o cadastro do cliente antes de abrir o Auditor.', 'err'); return;
  }
  if (!currentUser) { _t('Faça login primeiro.', 'err'); return; }

  const token = btoa(unescape(encodeURIComponent(JSON.stringify({
    usuario: currentUser.usuario,
    nome: currentUser.nome,
    dept: currentUser.dept,
    perfil: currentUser.perfil
  }))));

  const params = new URLSearchParams({ cnpj, nome, token });
  window.open(`auditor.html?${params}`, '_blank');
}

async function verificarDadosSPED() {
  const cnpj = document.getElementById('cnpj_principal')?.value?.replace(/\D/g,'') || '';
  if (!cnpj) return;
  try {
    const rows = await _sf('GET', `sped_dados?cnpj=eq.${cnpj}&select=exercicio,tipo,updated_at&order=updated_at.desc&limit=5`);
    if (rows && rows.length) {
      const exers = [...new Set(rows.map(r => r.exercicio))].sort().reverse();
      const badge = document.getElementById('sped-status-badge');
      if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = `Dados: ${exers.join(', ')}`;
      }
      const badgeTrib = document.getElementById('sped-status-badge-trib');
      if (badgeTrib) {
        badgeTrib.style.display = 'inline-block';
        badgeTrib.textContent = `Dados: ${exers.join(', ')}`;
      }
    }
  } catch(e) {}
}




function switchTribTab(tab, btn) {
  document.querySelectorAll('.trib-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.trib-tab').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('trib-' + tab);
  if (panel) panel.style.display = '';
  if (btn) btn.classList.add('active');
}
function updateTribTabs() {
  const map = {pis_cofins:'part_pis_cofins',irpj_csll:'part_irpj_csll',iss:'part_iss',icms:'part_icms',ipi:'part_ipi',das:'part_das'};
  document.querySelectorAll('.trib-tab').forEach(btn => {
    const m = btn.getAttribute('onclick')?.match(/switchTribTab\('(\w+)'/);
    if (!m) return;
    const val = document.getElementById(map[m[1]])?.value?.trim();
    btn.classList.toggle('filled', !!val);
  });
}





let _r3 = false;
let _r5 = null;
let _r6 = null;
const _lk = 10; 


function _av() {
  _r3 = false;
  const paineis = ['cadastro','comercial','dp','fiscal','contabil','parametros','particularidades'];
  paineis.forEach(tab => {
    const panel = document.getElementById('panel-' + tab);
    if (!panel) return;
    
    panel.dataset.viewMode = '1';
    panel.querySelectorAll('input:not(.api-filled), select, textarea').forEach(el => {
      el.style.pointerEvents = 'none';
      el.style.userSelect    = 'none';
    });
    panel.querySelectorAll('button:not(#btn-entrar-edicao):not(#btn-sair-edicao):not(#btn-salvar-header):not(#btn-salvar-flutuante)').forEach(el => {
      el.style.pointerEvents = 'none';
      el.style.opacity       = '0.45';
    });
    panel.querySelectorAll('label.co, label.ro, .status-chip').forEach(el => {
      el.style.pointerEvents = 'none';
    });
  });
  const badge = document.getElementById('edit-mode-badge');
  if (badge) { badge.className = 'view-badge'; badge.textContent = '👁 Visualização'; }
  const btnEdit   = document.getElementById('btn-entrar-edicao');
  const btnSair   = document.getElementById('btn-sair-edicao');
  const btnSalvar = document.getElementById('btn-salvar-flutuante');
  if (btnEdit)   btnEdit.style.display   = '';
  if (btnSair)   btnSair.style.display   = 'none';
  if (btnSalvar) btnSalvar.style.display = 'none';
}


function _ae() {
  _r3 = true;
  const paineis = ['cadastro','comercial','dp','fiscal','contabil','parametros','particularidades'];
  
  paineis.forEach(tab => {
    const panel = document.getElementById('panel-' + tab);
    if (!panel) return;
    delete panel.dataset.viewMode;
    panel.querySelectorAll('input, select, textarea').forEach(el => {
      el.style.pointerEvents = '';
      el.style.userSelect    = '';
    });
    panel.querySelectorAll('button').forEach(el => {
      el.style.pointerEvents = '';
      el.style.opacity       = '';
    });
    panel.querySelectorAll('label.co, label.ro, .status-chip').forEach(el => {
      el.style.pointerEvents = '';
    });
  });
  _tp();      
  _bc(); 
  const badge = document.getElementById('edit-mode-badge');
  if (badge) { badge.className = 'edit-badge'; badge.textContent = '✏️ Editando'; }
  const btnEdit   = document.getElementById('btn-entrar-edicao');
  const btnSair   = document.getElementById('btn-sair-edicao');
  const btnSalvar = document.getElementById('btn-salvar-flutuante');
  if (btnEdit)   btnEdit.style.display   = 'none';
  if (btnSair)   btnSair.style.display   = '';
  if (btnSalvar) btnSalvar.style.display = '';
}


async function _at(cnpj) {
  if (!cnpj || !currentUser) return { ok: false, msg: 'Sem cliente ou usuário.' };
  try {
    
    await _sf('DELETE', `edit_locks?expires_at=lt.${new Date().toISOString()}`);
    
    const rows = await _sf('GET', `edit_locks?cnpj=eq.${cnpj}&select=usuario,nome,locked_at`);
    if (rows && rows.length) {
      const lock = rows[0];
      const desde = new Date(lock.locked_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
      return { ok: false, msg: `${lock.nome} (@${lock.usuario}) desde ${desde}` };
    }
    
    const expires = new Date(Date.now() + _lk * 60000).toISOString();
    await _sf('POST', 'edit_locks', {
      cnpj,
      usuario: currentUser.usuario,
      nome:    currentUser.nome,
      locked_at: new Date().toISOString(),
      expires_at: expires,
    });
    return { ok: true };
  } catch(e) {
    console.warn('_at:', e);
    return { ok: true }; 
  }
}


async function _rt(cnpj) {
  if (!cnpj || !currentUser) return;
  try {
    const expires = new Date(Date.now() + _lk * 60000).toISOString();
    await _sf('PATCH', `edit_locks?cnpj=eq.${cnpj}&usuario=eq.${currentUser.usuario}`, {
      expires_at: expires,
      locked_at:  new Date().toISOString(),
    });
  } catch(e) { console.warn('_rt:', e); }
}


async function _lt(cnpj) {
  if (!cnpj || !currentUser) return;
  try {
    await _sf('DELETE', `edit_locks?cnpj=eq.${cnpj}&usuario=eq.${currentUser.usuario}`);
  } catch(e) { console.warn('_lt:', e); }
}


async function entrarModoEdicao() {
  if (!_r4 && !document.getElementById('cnpj_principal')?.value) {
    
    _ae();
    return;
  }
  const cnpj = document.getElementById('cnpj_principal')?.value?.replace(/\D/g,'') || _r5 || '';
  const btn = document.getElementById('btn-entrar-edicao');
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  const result = await _at(cnpj);
  if (btn) { btn.disabled = false; btn.textContent = '✏️ Editar'; }
  if (!result.ok) {
    const info = document.getElementById('edit-lock-info');
    if (info) {
      info.innerHTML = `<span class="lock-badge">🔒 ${result.msg}</span>`;
    }
    _t(`🔒 ${result.msg}`, 'err');
    return;
  }
  _r5 = cnpj;
  const info = document.getElementById('edit-lock-info');
  if (info) info.innerHTML = '';
  
  if (_r6) clearInterval(_r6);
  _r6 = setInterval(() => _rt(_r5), 3 * 60 * 1000);
  _ae();
}


async function sairModoEdicao(salvar) {
  if (_r6) { clearInterval(_r6); _r6 = null; }
  if (_r5) await _lt(_r5);
  _av();
}


async function verificarTravaAtiva(cnpj) {
  if (!cnpj) return;
  try {
    await _sf('DELETE', `edit_locks?expires_at=lt.${new Date().toISOString()}`);
    const rows = await _sf('GET', `edit_locks?cnpj=eq.${cnpj}&select=usuario,nome,locked_at`);
    const info = document.getElementById('edit-lock-info');
    const btnEdit = document.getElementById('btn-entrar-edicao');
    if (rows && rows.length) {
      const lock = rows[0];
      
      if (lock.usuario === currentUser?.usuario) {
        await _sf('DELETE', `edit_locks?cnpj=eq.${cnpj}`);
        if (info) info.innerHTML = '';
        if (btnEdit) { btnEdit.disabled = false; btnEdit.style.opacity = '1'; }
        return;
      }
      const desde = new Date(lock.locked_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
      if (info) info.innerHTML = `<span class="lock-badge">🔒 ${lock.nome} editando desde ${desde}</span>`;
      if (btnEdit) { btnEdit.disabled = true; btnEdit.style.opacity = '.4'; btnEdit.title = `${lock.nome} está editando`; }
    } else {
      if (info) info.innerHTML = '';
      if (btnEdit) { btnEdit.disabled = false; btnEdit.style.opacity = '1'; btnEdit.title = ''; }
    }
  } catch(e) { console.warn('verificarTravaAtiva:', e); }
}



let _r0 = [];
let _r1 = []; 
let _ra = false;


function toggleParticDropdown() {
  const wrap = document.getElementById('reuniao-partic-select-wrap');
  
  if (_r1.length > 0 && currentUser?.perfil !== 'admin') return;
  _ra = !_ra;
  const dd = document.getElementById('reuniao-partic-dropdown');
  if (!dd) return;
  if (_ra) {
    dd.style.display = '';
    renderParticDropdown('');
    setTimeout(() => document.getElementById('reuniao-partic-search')?.focus(), 50);
  } else {
    dd.style.display = 'none';
  }
}


document.addEventListener('click', (e) => {
  if (!e.target.closest('#reuniao-partic-select-wrap')) {
    const dd = document.getElementById('reuniao-partic-dropdown');
    if (dd) dd.style.display = 'none';
    _ra = false;
  }
});


function renderParticDropdown(filtro) {
  const lista = document.getElementById('reuniao-partic-lista');
  if (!lista) return;
  const f = filtro.toLowerCase();
  const users = usuariosDB.filter(u =>
    (!f || u.nome.toLowerCase().includes(f) || u.usuario.toLowerCase().includes(f))
  );
  if (!users.length) {
    lista.innerHTML = '<div style="padding:16px;text-align:center;color:var(--dim);font-size:12px">Nenhum usuário encontrado</div>';
    return;
  }
  const selecionadosIds = new Set(_r1.map(p => p.id));
  lista.innerHTML = users.map(u => {
    const iniciais = u.nome.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    const jaSel = selecionadosIds.has(u.id);
    return `<div class="partic-dropdown-item${jaSel ? ' selecionado' : ''}" onclick="selecionarPartic('${u.id}')">
      <div class="partic-avatar">${iniciais}</div>
      <div style="flex:1;min-width:0">
        <div class="partic-info-nome">${u.nome}</div>
        <div style="display:flex;gap:4px;align-items:center">
          <span class="partic-info-user">@${u.usuario}</span>
          <span class="partic-info-dept">${u.dept || ''}</span>
        </div>
      </div>
      ${jaSel ? '<span style="font-size:11px;color:var(--success)">✓</span>' : ''}
    </div>`;
  }).join('');
}


function filtrarParticDropdown(v) {
  renderParticDropdown(v);
}


function selecionarPartic(userId) {
  const u = usuariosDB.find(u => u.id === userId);
  if (!u || _r1.find(p => p.id === userId)) return;
  _r1.push({ id: u.id, nome: u.nome, usuario: u.usuario, dept: u.dept });
  renderParticChips();
  renderParticDropdown(document.getElementById('reuniao-partic-search')?.value || '');
  aplicarBloqueioParticipantes();
}


function removerPartic(userId) {
  if (currentUser?.perfil !== 'admin') return;
  _r1 = _r1.filter(p => p.id !== userId);
  renderParticChips();
  renderParticDropdown('');
  aplicarBloqueioParticipantes();
}


function renderParticChips() {
  const container = document.getElementById('reuniao-partic-chips');
  if (!container) return;
  if (!_r1.length) {
    container.innerHTML = '';
    container.style.marginBottom = '0';
    return;
  }
  container.style.marginBottom = '8px';
  const isAdmin = currentUser?.perfil === 'admin';
  container.innerHTML = _r1.map(p => `
    <span class="partic-chip">
      <span class="partic-chip-nome">${p.nome}</span>
      <span class="partic-chip-user">@${p.usuario}</span>
      ${isAdmin ? `<button class="partic-chip-del" onclick="removerPartic('${p.id}')" title="Remover">✕</button>` : ''}
    </span>`).join('');
}


function aplicarBloqueioParticipantes() {
  const isAdmin = currentUser?.perfil === 'admin';
  const temPartic = _r1.length > 0;
  const input = document.getElementById('reuniao-partic-input');
  const lockInfo = document.getElementById('reuniao-partic-lock');
  const searchWrap = document.getElementById('reuniao-partic-select-wrap');

  if (temPartic && !isAdmin) {
    
    if (input) {
      input.style.pointerEvents = 'none';
      input.style.opacity = '.55';
      input.style.cursor = 'default';
      input.style.background = 'var(--surface3)';
    }
    if (lockInfo) {
      lockInfo.textContent = 'Editável apenas pelo admin';
      lockInfo.style.color = 'var(--muted)';
    }
  } else {
    if (input) {
      input.style.pointerEvents = '';
      input.style.opacity = '';
      input.style.cursor = 'pointer';
      input.style.background = 'var(--surface)';
    }
    if (lockInfo) {
      lockInfo.textContent = isAdmin ? 'Editável (admin)' : 'Editável apenas pelo admin após registro';
      lockInfo.style.color = 'var(--dim)';
    }
  }
}


function limparParticipantes() {
  _r1 = [];
  renderParticChips();
  const dd = document.getElementById('reuniao-partic-dropdown');
  if (dd) dd.style.display = 'none';
  _ra = false;
}




async function adicionarReuniao() {
  const topico = document.getElementById('reuniao_topico')?.value?.trim();
  const data   = document.getElementById('reuniao_data')?.value;
  const hora   = document.getElementById('reuniao_hora')?.value;
  const depts       = Array.from(document.querySelectorAll('[name="reuniao_depts"]:checked')).map(el => el.value);
  const link        = document.getElementById('reuniao_link')?.value?.trim() || '';
  const transcricao = document.getElementById('reuniao_transcricao')?.value?.trim() || '';

  if (!topico) { _t('Informe o tópico da reunião.', 'err'); return; }
  if (!data)   { _t('Informe a data da reunião.', 'err');   return; }

  const reuniaoId = Date.now();
  const reuniao = {
    id: reuniaoId,
    topico,
    data,
    hora: hora || '',
    participantes: [..._r1],
    depts,
    link,
    transcricao,
    arquivo_nome: _r9?.name || '',
    arquivo_url:  '',
    criadoEm: new Date().toISOString(),
    criadoPor: currentUser?.nome || '',
  };

  
  if (_r9) {
    try {
      const url = await uploadArquivoReuniao(_r9, reuniaoId);
      reuniao.arquivo_url  = url;
    } catch(e) {
      _t(`Arquivo não enviado: ${e.message}`, 'err');
    }
  }

  _r0.unshift(reuniao);
  _rr();
  limparFormReuniao();
  limparArquivoReuniao();

  
  await _sr();
}

async function _sr() {
  
  const cnpj = document.getElementById('cnpj_principal')?.value?.replace(/\D/g,'') || '';
  const sci  = document.getElementById('codigo_sci')?.value || '';
  if (!cnpj && !sci) {
    _t('Salve a ficha do cliente primeiro antes de registrar reuniões.', 'err');
    return;
  }

  try {
    
    let existing = null;
    if (cnpj) {
      const rows = await _sf('GET', `clientes?cnpj=eq.${cnpj}&select=id,dados`);
      if (rows?.length) existing = rows[0];
    }
    if (!existing && sci) {
      const rows = await _sf('GET', `clientes?sci=eq.${encodeURIComponent(sci)}&select=id,dados`);
      if (rows?.length) existing = rows[0];
    }

    if (!existing) {
      _t('Salve a ficha do cliente antes de registrar reuniões.', 'err');
      return;
    }

    
    const dadosAtuais = typeof existing.dados === 'string'
      ? JSON.parse(existing.dados)
      : (existing.dados || {});

    dadosAtuais.reunioes = _r0;
    dadosAtuais.meta = { ...(dadosAtuais.meta || {}), savedAt: new Date().toISOString() };

    await _sf('PATCH', `clientes?id=eq.${existing.id}`, { dados: dadosAtuais });
    _t('Reunião registrada e salva.', 'ok');
  } catch(e) {
    _t('Reunião registrada localmente — salve a ficha para persistir.', 'inf');
    console.error('_sr:', e);
  }
}

async function removerReuniao(id) {
  if (!confirm('Remover este registro de reunião?')) return;
  _r0 = _r0.filter(r => r.id !== id);
  _rr();
  await _sr();
}

function limparFormReuniao() {
  ['reuniao_topico','reuniao_link','reuniao_transcricao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['reuniao_data','reuniao_hora'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('[name="reuniao_depts"]').forEach(el => {
    el.checked = false;
    el.closest('label')?.classList.remove('sel');
  });
  limparParticipantes();
  aplicarBloqueioParticipantes();
}

function _rr() {
  const container = document.getElementById('reunioes-lista');
  if (!container) return;

  if (!_r0.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--dim);font-size:13px">Nenhuma reunião registrada ainda.</div>';
    return;
  }

  const deptLabels = { contabil: 'Contábil', fiscal: 'Fiscal', tributario: 'Tributário', dp: 'DP' };

  container.innerHTML = _r0.map(r => {
    const dataFmt = r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : '';
    const horaFmt = r.hora ? ` às ${r.hora}` : '';
    const deptBadges = (r.depts || []).map(d =>
      `<span class="reuniao-dept-badge">${deptLabels[d] || d}</span>`
    ).join('');

    return `
    <div class="reuniao-card">
      <div class="reuniao-header">
        <div class="reuniao-topico">${r.topico}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span class="reuniao-data">${dataFmt}${horaFmt}</span>
          <button class="reuniao-del" onclick="removerReuniao(${r.id})" title="Remover">✕</button>
        </div>
      </div>
      ${r.participantes && r.participantes.length ? `
      <div class="reuniao-participantes" style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;color:var(--dim);margin-right:2px">Participantes:</span>
        ${r.participantes.map(p => `<span class="partic-chip" style="font-size:11px">
          <span class="partic-chip-nome">${p.nome}</span>
          <span class="partic-chip-user">@${p.usuario}</span>
        </span>`).join('')}
      </div>` : ''}
      ${deptBadges ? `<div class="reuniao-depts">${deptBadges}</div>` : ''}
      ${r.link ? `<div style="margin-top:8px"><a href="${r.link}" target="_blank" style="font-size:11.5px;color:var(--accent);text-decoration:none;font-weight:500">Acessar gravação/reunião →</a></div>` : ''}
      ${r.transcricao ? `<div style="margin-top:8px;padding:10px 12px;background:var(--surface2);border-radius:var(--r-sm);font-size:12px;color:var(--text-2);line-height:1.6;white-space:pre-wrap;border-left:3px solid var(--border)">${r.transcricao}</div>` : ''}
      ${r.arquivo_url ? `
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="color:var(--navy);flex-shrink:0"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".6"/></svg>
          <span style="font-size:12px;color:var(--text-2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.arquivo_nome || 'Anexo'}</span>
          <a href="${r.arquivo_url}" ${r.arquivo_url.startsWith('data:') ? `download="${r.arquivo_nome||'anexo'}"` : 'target="_blank"'} style="font-size:11.5px;font-weight:600;color:var(--accent);text-decoration:none;flex-shrink:0">Baixar →</a>
        </div>` : ''}
      ${r.criadoPor ? `<div style="font-size:10.5px;color:var(--dim);margin-top:8px">Registrado por ${r.criadoPor}</div>` : ''}
    </div>`;
  }).join('');
}



async function trocarCliente() {
  if (_r3) {
    const escolha = await confirmarAcaoComDados();
    if (escolha === 'cancelar') return;
    if (escolha === 'salvar') {
      await saveAll();
      return; 
    }
    
    if (_r6) { clearInterval(_r6); _r6 = null; }
    if (_r5) await _lt(_r5);
    resetForm();
  }
  openClientModal();
}


function confirmarAcaoComDados() {
  return new Promise(resolve => {
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,13,48,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)';
    overlay.innerHTML = `
      <div style="background:var(--surface);border-radius:var(--r-lg);padding:32px 36px;width:380px;max-width:95vw;box-shadow:var(--shadow-xl);text-align:center">
        <div style="font-size:16px;font-weight:700;color:var(--navy);margin-bottom:8px">Ficha em edição</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.6">Você está editando esta ficha.<br>O que deseja fazer antes de trocar de cliente?</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button id="acao-salvar" class="btn btn-ok" style="width:100%;justify-content:center;font-size:13px">Salvar e trocar</button>
          <button id="acao-descartar" class="btn btn-s" style="width:100%;justify-content:center;font-size:13px;color:var(--danger);border-color:rgba(190,18,60,.25)">Descartar alterações</button>
          <button id="acao-cancelar" class="btn btn-s" style="width:100%;justify-content:center;font-size:13px">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#acao-salvar').onclick    = () => { document.body.removeChild(overlay); resolve('salvar'); };
    overlay.querySelector('#acao-descartar').onclick = () => { document.body.removeChild(overlay); resolve('descartar'); };
    overlay.querySelector('#acao-cancelar').onclick  = () => { document.body.removeChild(overlay); resolve('cancelar'); };
    overlay.onclick = (e) => { if (e.target===overlay) { document.body.removeChild(overlay); resolve('cancelar'); } };
  });
}


let _r8 = [];
let _r2 = null; 

async function carregarGrupos() {
  try {
    const rows = await _sf('GET', 'grupos_economicos?order=nome.asc');
    _r8 = rows || [];
  } catch(e) { _r8 = []; }
}

function filtrarGruposInput(valor) {
  const dd = document.getElementById('grupos-dropdown');
  if (!dd) return;
  const v = valor.trim().toLowerCase();

  
  const matchingGroups = _r8.filter(g =>
    !v || g.nome.toLowerCase().includes(v)
  );

  let html = '';
  
  if (v && !_r8.find(g => g.nome.toLowerCase() === v)) {
    html += `<div class="grupos-dd-item grupos-dd-criar" onclick="criarEselecionarGrupo('${valor.replace(/'/g,"\'")}')">
      <span style="color:var(--navy);font-weight:600">+ Criar "${valor}"</span>
    </div>`;
  }
  
  if (!matchingGroups.length && !v) {
    html += '<div style="padding:14px 16px;color:var(--dim);font-size:12px;text-align:center">Nenhum grupo cadastrado</div>';
  }
  matchingGroups.forEach(g => {
    const sel = _r2?.id === g.id;
    html += `<div class="grupos-dd-item${sel?' grupos-dd-sel':''}" onclick="selecionarGrupo('${g.id}','${g.nome.replace(/'/g,"\'")}')">
      <span style="font-weight:500">${g.nome}</span>
      ${sel ? '<span style="color:var(--success);font-size:12px;margin-left:auto">✓</span>' : ''}
    </div>`;
  });

  dd.innerHTML = html;
  dd.style.display = (html && document.getElementById('grupo_empresas') === document.activeElement) ? '' : 'none';
  if (document.getElementById('grupo_empresas') === document.activeElement) dd.style.display = '';
}

function selecionarGrupo(id, nome) {
  _r2 = {id, nome};
  const input = document.getElementById('grupo_empresas');
  if (input) input.value = nome;
  const dd = document.getElementById('grupos-dropdown');
  if (dd) dd.style.display = 'none';
  renderGrupoBadge();
}

async function criarEselecionarGrupo(nome) {
  if (!nome.trim()) return;
  try {
    const id = 'grp_' + Date.now();
    await _sf('POST', 'grupos_economicos', { id, nome: nome.trim() });
    _r8.push({id, nome: nome.trim()});
    _r8.sort((a,b) => a.nome.localeCompare(b.nome));
    selecionarGrupo(id, nome.trim());
    _t('Grupo criado.', 'ok');
  } catch(e) { _t('Erro ao criar grupo: ' + e.message, 'err'); }
}

function renderGrupoBadge() {
  const badge = document.getElementById('grupo-selecionado-badge');
  if (!badge) return;
  if (!_r2) { badge.style.display = 'none'; return; }
  badge.style.display = 'flex';
  badge.innerHTML = `
    <span style="font-size:11.5px;font-weight:600;padding:3px 10px;background:rgba(1,25,87,.08);border:1px solid rgba(1,25,87,.2);border-radius:20px;color:var(--navy)">${_r2.nome}</span>
    <button onclick="removerGrupo()" style="background:none;border:none;cursor:pointer;color:var(--dim);font-size:12px;padding:2px 4px" title="Remover grupo">✕</button>`;
}

function removerGrupo() {
  _r2 = null;
  const input = document.getElementById('grupo_empresas');
  if (input) input.value = '';
  renderGrupoBadge();
}


document.addEventListener('click', e => {
  if (!e.target.closest('#grupos-dropdown') && e.target.id !== 'grupo_empresas') {
    const dd = document.getElementById('grupos-dropdown');
    if (dd) dd.style.display = 'none';
  }
});

function abrirModalGrupos() {
  
  const overlay = document.createElement('div');
  overlay.id = 'modal-grupos-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,13,48,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)';
  const lista = _r8.map(g => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
      <span style="flex:1;font-size:13px;font-weight:500">${g.nome}</span>
      <button onclick="excluirGrupo('${g.id}')" style="background:none;border:1px solid rgba(190,18,60,.2);color:var(--danger);border-radius:4px;padding:3px 9px;cursor:pointer;font-size:11.5px;font-family:var(--sans)">Excluir</button>
    </div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--dim);font-size:13px">Nenhum grupo cadastrado</div>';
  overlay.innerHTML = `
    <div style="background:var(--surface);border-radius:var(--r-lg);width:420px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:var(--shadow-xl)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:14px;font-weight:700;color:var(--navy)">Grupos Econômicos</span>
        <button onclick="document.body.removeChild(document.getElementById('modal-grupos-overlay'))" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:16px">✕</button>
      </div>
      <div style="overflow-y:auto;flex:1">${lista}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if(e.target===overlay) document.body.removeChild(overlay); };
}

async function excluirGrupo(id) {
  if (!confirm('Excluir este grupo? Clientes vinculados não serão afetados.')) return;
  try {
    await _sf('DELETE', `grupos_economicos?id=eq.${id}`);
    _r8 = _r8.filter(g => g.id !== id);
    if (_r2?.id === id) removerGrupo();
    
    document.body.removeChild(document.getElementById('modal-grupos-overlay'));
    abrirModalGrupos();
    _t('Grupo excluído.', 'ok');
  } catch(e) { _t('Erro: ' + e.message, 'err'); }
}



let _r9 = null; 

function previewArquivoReuniao(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    _t('Arquivo muito grande. Máximo 20MB.', 'err');
    input.value = '';
    return;
  }
  _r9 = file;
  const preview = document.getElementById('reuniao-arquivo-preview');
  const nome    = document.getElementById('reuniao-arquivo-nome');
  const size    = document.getElementById('reuniao-arquivo-size');
  const label   = document.getElementById('reuniao-upload-label');
  if (nome)  nome.textContent  = file.name;
  if (size)  size.textContent  = formatFileSize(file.size);
  if (label) label.textContent = file.name;
  if (preview) preview.style.display = 'flex';
}

function limparArquivoReuniao() {
  _r9 = null;
  const input   = document.getElementById('reuniao_arquivo');
  const preview = document.getElementById('reuniao-arquivo-preview');
  const label   = document.getElementById('reuniao-upload-label');
  if (input)   input.value = '';
  if (preview) preview.style.display = 'none';
  if (label)   label.textContent = 'Clique para selecionar ou arraste o arquivo aqui';
}

function formatFileSize(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function uploadArquivoReuniao(file, reuniaoId) {
  const cnpj = document.getElementById('cnpj_principal')?.value?.replace(/\D/g,'') || 'sem-cnpj';
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${cnpj}/${reuniaoId}.${ext}`;

  
  const res = await fetch(`${SB_URL}/storage/v1/object/reunioes-arquivos/${path}`, {
    method: 'POST',
    headers: {
      'apikey':        SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type':  file.type || 'application/octet-stream',
      'x-upsert':      'true',
      'Cache-Control': '3600',
    },
    body: file,
  });

  if (res.ok) {
    return `${SB_URL}/storage/v1/object/public/reunioes-arquivos/${path}`;
  }

  
  
  const errBody = await res.json().catch(() => ({}));
  const errMsg  = errBody.message || errBody.error || `HTTP ${res.status}`;

  if (file.size <= 500 * 1024) {
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result); 
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  throw new Error(`Storage: ${errMsg}. Para arquivos > 500KB, crie o bucket "reunioes-arquivos" no Supabase Storage.`);
}




function atualizarContadorPC() {
  const total = document.querySelectorAll('[name="pc"]:checked').length;
  const el = document.getElementById('pc-count');
  if (el) el.textContent = total === 0 ? '0 contas selecionadas' : `${total} conta${total > 1 ? 's' : ''} selecionada${total > 1 ? 's' : ''}`;
}

function limparPlanoContas() {
  document.querySelectorAll('[name="pc"]').forEach(el => {
    el.checked = false;
    el.closest('label')?.classList.remove('sel');
  });
  atualizarContadorPC();
}



async function gerarPDFDiagnostico() {
  
  if (!window.jspdf) {
    try {
      await new Promise((resolve, reject) => {
        const s1 = document.createElement('script');
        s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s1.onload = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
          s2.onload = resolve;
          s2.onerror = reject;
          document.head.appendChild(s2);
        };
        s1.onerror = reject;
        document.head.appendChild(s1);
      });
    } catch(e) {
      _t('Erro ao carregar biblioteca PDF. Verifique sua conexão.', 'err');
      return;
    }
  }
  const d = collectData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const navy  = [1, 25, 87];
  const navyL = [26, 77, 184];
  const gray1 = [240, 244, 250];
  const gray2 = [220, 227, 240];
  const white = [255, 255, 255];
  const dark  = [13, 24, 54];
  const muted = [90, 106, 138];
  const W = 210, M = 14;
  let y = 0;

  
  const safe = v => (v == null || v === '') ? '—' : String(v);
  const chip = v => { try { const p = JSON.parse(v); return p.texto || '—'; } catch { return safe(v); } };
  const yesno = v => v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : safe(v);
  const pct = v => v ? v + '%' : '—';

  function newPage() {
    doc.addPage();
    y = 14;
    
    doc.setFillColor(...navy);
    doc.rect(0, 0, W, 10, 'F');
    doc.setFontSize(8); doc.setTextColor(...white);
    doc.text('GTCON BRASIL — Diagnóstico Operacional', M, 7);
    const razao = safe(d.cadastro?.razao_social);
    doc.text(razao, W - M, 7, { align: 'right' });
    y = 18;
  }

  function checkPage(needed = 12) {
    if (y + needed > 278) newPage();
  }

  function section(title) {
    checkPage(18);
    doc.setFillColor(...navy);
    doc.rect(M, y, W - M * 2, 8, 'F');
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text(title.toUpperCase(), M + 4, y + 5.5);
    y += 12;
    doc.setTextColor(...dark);
  }

  function subsection(title) {
    checkPage(10);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navyL);
    doc.text(title, M, y);
    y += 5;
    doc.setTextColor(...dark);
  }

  function row(label, value, highlight = false) {
    checkPage(7);
    const val = safe(value);
    if (val === '—' && !highlight) return; 
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      tableWidth: W - M * 2,
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, lineColor: gray2, lineWidth: 0.2 },
      headStyles: { fillColor: gray1, textColor: dark, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 58, fillColor: gray1, textColor: muted, fontStyle: 'bold' },
        1: { cellWidth: 'auto', textColor: dark },
      },
      body: [[label, val]],
      showHead: false,
    });
    y = doc.lastAutoTable.finalY + 1;
  }

  function rows(pairs) {
    const body = pairs
      .map(([l, v]) => [l, safe(v)])
      .filter(([, v]) => v !== '—');
    if (!body.length) return;
    checkPage(body.length * 7 + 4);
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      tableWidth: W - M * 2,
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, lineColor: gray2, lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: 58, fillColor: gray1, textColor: muted, fontStyle: 'bold' },
        1: { cellWidth: 'auto', textColor: dark },
      },
      body,
      showHead: false,
    });
    y = doc.lastAutoTable.finalY + 2;
  }

  function listRow(label, arr) {
    if (!arr || !arr.length) return;
    row(label, arr.join(', '));
  }

  
  
  
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 55, 'F');

  
  doc.setFontSize(28); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('Gtcon', M, 28);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.setTextColor(173, 178, 218);
  doc.text('BRASIL', M, 37);

  
  doc.setDrawColor(255, 255, 255, 0.2);
  doc.line(M, 42, W - M, 42);

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 240);
  doc.text('Diagnóstico Operacional — Ficha Técnica', M, 50);

  
  y = 65;
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...dark);
  doc.text(safe(d.cadastro?.razao_social), M, y); y += 8;

  if (d.cadastro?.nome_fantasia) {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(safe(d.cadastro.nome_fantasia), M, y); y += 6;
  }

  doc.setFontSize(9); doc.setTextColor(...muted);
  const metaItems = [
    d.cadastro?.cnpj && `CNPJ: ${d.cadastro.cnpj}`,
    d.cadastro?.competencia_inicio && `Competência: ${d.cadastro.competencia_inicio}`,
    d.cadastro?.situacao && `Situação: ${d.cadastro.situacao}`,
    `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,
  ].filter(Boolean);
  doc.text(metaItems.join('   |   '), M, y); y += 8;

  
  const statusOn = chip(d.cadastro?.status_onboarding);
  const statusCx = chip(d.cadastro?.status_complexidade);
  if (statusOn !== '—' || statusCx !== '—') {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navyL);
    if (statusOn !== '—') { doc.text(`Onboarding: ${statusOn}`, M, y); }
    if (statusCx !== '—') { doc.text(`Complexidade: ${statusCx}`, M + 70, y); }
    y += 8;
  }

  
  doc.setDrawColor(...gray2); doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y); y += 8;

  
  
  
  section('1. Cadastro Geral');
  const c = d.cadastro || {};
  rows([
    ['Razão Social',        c.razao_social],
    ['Nome Fantasia',       c.nome_fantasia],
    ['CNPJ',               c.cnpj],
    ['Código SCI',         c.codigo_sci],
    ['Data de Abertura',   c.data_abertura],
    ['Porte',              c.porte],
    ['Situação Cadastral', c.situacao],
    ['Endereço',           c.endereco],
    ['Regime Tributário',  c.regime],
    ['Faturamento Mensal', c.fat_mensal],
    ['Faturamento Anual',  c.fat_anual],
    ['Grupo Econômico',    c.grupo_nome],
    ['Competência Início', c.competencia_inicio],
    ['Responsável Legal',  c.resp_legal],
    ['CPF Responsável',    c.resp_cpf],
    ['E-mail Assinatura',  c.email_assinatura],
    ['Telefone',           c.telefone],
    ['Certificado Digital',c.cert],
    ['Venc. Certificado',  c.cert_venc],
    ['Contador Anterior',  c.escrit_anterior_nome],
    ['Tel. Ant.',          c.escrit_anterior_tel],
    ['Email Ant.',         c.escrit_anterior_email],
  ]);

  if (c.ramos?.length)     row('Ramos de Atividade', c.ramos.join(', '));
  if (c.cnaes?.length) {
    const cnaeStr = c.cnaes.map(cn => typeof cn === 'object' ? `${cn.codigo} — ${cn.descricao}` : cn).join(' | ');
    row('CNAEs', cnaeStr);
  }

  
  if (c.prefeituras?.length) {
    subsection('Acessos — Prefeituras / Portais');
    const body = c.prefeituras.map(p => [p.nome, p.login, p.senha ? '••••••' : '—']);
    checkPage(body.length * 7 + 6);
    doc.autoTable({
      startY: y, margin: { left: M, right: M }, tableWidth: W - M * 2,
      styles: { fontSize: 8, cellPadding: { top:2, bottom:2, left:3, right:3 }, lineColor: gray2, lineWidth: 0.2 },
      head: [['Portal / Prefeitura', 'Login', 'Senha']],
      headStyles: { fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 8 },
      body,
    });
    y = doc.lastAutoTable.finalY + 3;
  }

  
  const com = d.comercial || {};
  if (com.consultor) rows([['Responsável Comercial', com.consultor]]);

  
  
  
  section('2. Departamento Pessoal');
  const dp = d.dp || {};
  rows([
    ['CLT',               dp.clt],
    ['Estagiários',       dp.estagiarios],
    ['Pró-labore',        dp.prolabore],
    ['Autônomos',         dp.autonomos],
    ['Sind. Patronal',    dp.sind_patronal],
    ['Sind. Laboral',     dp.sind_laboral],
    ['Controle de Ponto', dp.ponto],
    ['Insalubridade',     yesno(dp.insalub)],
    ['Periculosidade',    yesno(dp.periculosidade)],
    ['Docs SST',          dp.sst_docs],
    ['Resp. SST',         dp.sst_resp],
    ['Passivos / Obs.',   dp.passivos_obs],
  ]);

  
  
  
  section('3. Fiscal');
  const f = d.fiscal || {};
  subsection('Engenharia Fiscal');
  rows([
    ['Regime de Apuração',      f.apuracao],
    ['ICMS-ST',                 f.icms_st],
    ['Perfil Comercial',        f.perfil_comercial],
    ['Vende para B2C',          yesno(f.vende_cf)],
    ['e-Commerce',              yesno(f.ecommerce)],
    ['Plataforma',              f.ecommerce_plat],
    ['Notas Entrada 100%',      f.notas_entrada_100],
    ['Notas Saída 100%',        f.notas_saida_100],
    ['Vol. Saída (mês)',        f.vol_saida],
    ['Vol. Entrada (mês)',      f.vol_entrada],
    ['Observações',             f.obs],
  ]);

  subsection('Tipos de Receita');
  const recSim = [
    f.rec_mercadorias==='sim' && 'Mercadorias',
    f.rec_servicos==='sim'    && 'Serviços',
    f.rec_industria==='sim'   && 'Industrialização',
    f.rec_financeira==='sim'  && 'Financeira',
    f.rec_aluguel==='sim'     && 'Aluguéis',
    f.rec_exportacao==='sim'  && 'Exportação',
    f.rec_isenta==='sim'      && 'Isentas/NT',
  ].filter(Boolean);
  if (recSim.length) row('Receitas', recSim.join(', '));
  row('Segregação realizada', f.rec_segregacao);

  subsection('Compras & Insumos');
  rows([
    ['Insumos produção',  yesno(f.compra_insumos)],
    ['Mercadorias revenda', yesno(f.compra_revenda)],
    ['Ativo imobilizado', yesno(f.compra_ativo)],
    ['Serviços c/ PIS/COFINS', yesno(f.compra_servicos_pc)],
    ['Fornec. Simples',   f.forn_simples],
    ['Fornec. Exterior',  yesno(f.forn_exterior)],
    ['Obs. Compras',      f.obs_compras],
  ]);

  subsection('Particularidades por Tributo');
  const tribRows = [
    ['PIS/COFINS — Regime',     f.pc_regime],
    ['PIS/COFINS — Monofásico', yesno(f.pc_monofasico)],
    ['PIS/COFINS — Exclusões',  yesno(f.pc_exclusoes)],
    ['PIS/COFINS — Cred. Presumido', yesno(f.pc_cred_presumido)],
    ['PIS/COFINS — Cred. Insumos', f.pc_cred_insumos],
    ['PIS/COFINS — CIAP',       f.pc_ciap],
    ['PIS/COFINS — Obs.',       f.part_pis_cofins],
    ['IRPJ — Forma',            f.irpj_forma],
    ['IRPJ — Periodicidade',    f.irpj_periodo],
    ['IRPJ — Distribuição',     yesno(f.irpj_distribuicao)],
    ['IRPJ — JSCP',             yesno(f.irpj_jscp)],
    ['IRPJ — Prejuízo',         yesno(f.irpj_prejuizo)],
    ['IRPJ — Obs.',             f.part_irpj_csll],
    ['ISS — Obrigado',          yesno(f.iss_obrigado)],
    ['ISS — Retido',            f.iss_retido],
    ['ISS — Município',         f.iss_municipio],
    ['ISS — Alíquota',          f.iss_aliquota ? f.iss_aliquota + '%' : null],
    ['ISS — Obs.',              f.part_iss],
    ['ICMS — Contribuinte',     f.icms_contrib],
    ['ICMS — DIFAL',            yesno(f.icms_difal)],
    ['ICMS — Apuração',         yesno(f.icms_apuracao)],
    ['ICMS — Antecipação',      yesno(f.icms_antecipacao)],
    ['ICMS — Saldo Credor',     yesno(f.icms_saldo_credor)],
    ['ICMS — Multiestado',      yesno(f.icms_multiestado)],
    ['ICMS — Obs.',             f.part_icms],
    ['IPI — Contribuinte',      f.ipi_contrib],
    ['IPI — Crédito',           f.ipi_credito],
    ['IPI — NCMs',              f.ipi_ncm],
    ['IPI — Obs.',              f.part_ipi],
    ['DAS — Anexo',             f.das_anexo ? 'Anexo ' + f.das_anexo : null],
    ['DAS — Sublimite',         yesno(f.das_sublimite)],
    ['DAS — Risco Exclusão',    yesno(f.das_risco_exclusao)],
    ['DAS — Parcelamento',      yesno(f.das_parcelamento)],
    ['DAS — Obs.',              f.part_das],
  ];
  rows(tribRows);

  
  
  
  section('4. Contábil');
  const ct = d.contabil || {};
  subsection('Contabilidade Anterior');
  rows([
    ['Balancete Exerc. Ant.',  yesno(ct.balancete)],
    ['Controle Imobilizado',   yesno(ct.imobilizado)],
    ['Nome Escritório Ant.',   ct.contab_anterior],
    ['Licitações',             yesno(ct.licitacoes)],
  ]);

  subsection('Imobilizado');
  rows([
    ['Bens Imobilizados',      yesno(ct.tem_imobilizado)],
    ['Laudo de Avaliação',     yesno(ct.laudo_avaliacao)],
    ['Método Depreciação',     ct.metodo_depreciacao],
    ['Controle Sistema',       ct.imob_sistema],
    ['Observações',            ct.imob_obs],
  ]);

  subsection('Custos & Despesas');
  rows([
    ['CMV/CPV relevante',      yesno(ct.desp_cmv)],
    ['Folha como custo',       yesno(ct.desp_folha)],
    ['Pró-labore contabil.',   yesno(ct.desp_prolabore)],
    ['Depreciação relevante',  yesno(ct.desp_depreciacao)],
    ['Despesas financeiras',   yesno(ct.desp_financeiras)],
    ['Leasing/Arrendamento',   yesno(ct.desp_leasing)],
    ['Centro de Custos',       ct.desp_centro_custo],
    ['Rateio entre unidades',  yesno(ct.desp_rateio)],
    ['Dedutiveis mapeadas',    ct.desp_dedutiveis],
    ['Desp. não dedutíveis',   yesno(ct.desp_nao_dedutiveis)],
    ['Custo por Depto.',       yesno(ct.desp_custo_depto)],
    ['Custo por Produto',      yesno(ct.desp_custo_produto)],
    ['Retiradas Sócios',       ct.desp_retiradas],
    ['Adiantamentos Sócios',   yesno(ct.desp_adiantamentos)],
    ['Observações',            ct.desp_obs],
  ]);

  subsection('Mapa de Riscos');
  rows([
    ['Risco Cadastral',   ct.r_cadastral],
    ['Risco Tributário',  ct.r_tributario],
    ['Risco Trabalhista', ct.r_trabalhista],
    ['Risco Tecnológico', ct.r_tecnologico],
  ]);

  
  
  
  section('5. Parâmetros Operacionais');
  const p = d.parametros || {};
  rows([
    ['Dia Fechamento Ponto',    p.dia_ponto],
    ['Dia Extratos',           p.dia_extratos],
    ['Dia Venc. Guias',        p.dia_guias],
    ['Envio de Guias',         p.envio_guias],
    ['Data de Corte',          p.data_corte],
    ['Resp. Técnico',          p.resp_tecnico],
  ]);

  
  if (p.resp_extras?.length) {
    subsection('Key Users / Responsáveis');
    const body = p.resp_extras.map(r => [r.nome, r.cargo, r.email]);
    checkPage(body.length * 7 + 8);
    doc.autoTable({
      startY: y, margin: { left: M, right: M }, tableWidth: W - M * 2,
      styles: { fontSize: 8, cellPadding: { top:2, bottom:2, left:3, right:3 }, lineColor: gray2, lineWidth: 0.2 },
      head: [['Nome', 'Cargo / Área', 'E-mail']],
      headStyles: { fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 8 },
      body,
    });
    y = doc.lastAutoTable.finalY + 3;
  }

  
  
  
  section('6. Particularidades');
  const pt = d.particularidades || {};
  rows([
    ['ERP',              pt.erp],
    ['Outro ERP',        pt.erp_outro],
    ['Integração ERP',   pt.erp_integ],
    ['Depts. Envolvidos', pt.depts?.join(', ')],
    ['Instruções',       pt.instrucoes],
    ['Avisos',           pt.avisos],
    ['Obs. Gerais',      pt.obs_gerais],
    ['Diagnóstico Final',pt.diagnostico],
  ]);

  
  
  
  if (_r0?.length) {
    section('7. Reuniões Registradas');
    _r0.slice(0, 10).forEach((r, i) => {
      const dataFmt = r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : '';
      subsection(`${i + 1}. ${r.topico || '—'} — ${dataFmt}${r.hora ? ' às ' + r.hora : ''}`);
      const participantes = (r.participantes || []).map(p => `${p.nome} (@${p.usuario})`).join(', ');
      rows([
        ['Participantes', participantes || null],
        ['Departamentos', r.depts?.join(', ') || null],
        ['Link',          r.link || null],
        ['Ata / Transcrição', r.transcricao || null],
        ['Registrado por', r.criadoPor || null],
      ]);
    });
  }

  
  
  
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(`Página ${i} de ${total}`, W - M, 293, { align: 'right' });
    doc.text('Documento confidencial — uso interno GTCON Brasil', M, 293);
  }

  
  const nome = safe(d.cadastro?.razao_social).replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'cliente';
  doc.save(`Diagnostico_${nome.replace(/ /g,'_')}.pdf`);
  _t('PDF gerado com sucesso!', 'ok');
}

document.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('reuniao-upload-area');
  if (!area) return;
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', ()  => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const input = document.getElementById('reuniao_arquivo');
    if (input) {
      
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      previewArquivoReuniao(input);
    }
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  carregarGrupos();
  showTab('db', document.querySelector('[onclick*="db"]'));
  migrarUsuariosLocalStorage(); 
  document.getElementById('data_diagnostico').valueAsDate = new Date();
  _lu();
  addPrefeitura(); 
  setTimeout(() => document.getElementById('login-usuario')?.focus(), 100);
});
