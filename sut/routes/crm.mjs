import { send } from '../lib.mjs';
import { randomUUID } from 'node:crypto';

// Salesforce-style REST API mock (subset of /services/data/vXX.X)
export const API_VERSION = 'v60.0';
const PREFIX = { Lead: '00Q', Account: '001', Contact: '003', Opportunity: '006' };
const REQUIRED = { Lead: ['LastName', 'Company'], Account: ['Name'], Contact: ['LastName'], Opportunity: ['Name', 'StageName', 'CloseDate'] };
export const STAGES = ['Prospecting', 'Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'];
const LEAD_STATUS = ['Open - Not Contacted', 'Working - Contacted', 'Closed - Converted', 'Closed - Not Converted'];
const USERS = { 'qa.admin@crm.test': { password: 'Sales#2026', securityToken: 'TKN123' } };
const CLIENTS = { 'connected-app-qa': 'c0nn3cted-s3cret' };

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const newId = (type) => PREFIX[type] + '5g' + Array.from({ length: 13 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
const tokens = new Set(['00DTEST!uiSessionToken']);
let db;
function seed() {
  db = { Lead: [], Account: [], Contact: [], Opportunity: [] };
  const add = (type, fields) => { const r = { Id: newId(type), CreatedDate: '2026-10-01T09:00:00.000+0000', ...fields }; db[type].push(r); return r; };
  add('Lead', { FirstName: 'Hannah', LastName: 'Vogel', Company: 'Alpenblick Hotels', Email: 'h.vogel@alpenblick.example', Status: 'Open - Not Contacted', LeadSource: 'Web', IsConverted: false });
  add('Lead', { FirstName: 'Lukas', LastName: 'Brandt', Company: 'Brandt Logistik GmbH', Email: 'lukas@brandt.example', Status: 'Working - Contacted', LeadSource: 'Trade Show', IsConverted: false });
  add('Lead', { FirstName: 'Sofia', LastName: 'Rossi', Company: 'Rossi Retail SpA', Email: 'sofia@rossi.example', Status: 'Open - Not Contacted', LeadSource: 'Partner', IsConverted: false });
  const acc = add('Account', { Name: 'Isar Outdoor AG', Industry: 'Retail', BillingCountry: 'Germany' });
  add('Account', { Name: 'Nordsee Foods', Industry: 'Food & Beverage', BillingCountry: 'Germany' });
  add('Opportunity', { Name: 'Isar Outdoor - Spring Range 2027', AccountId: acc.Id, StageName: 'Qualification', Amount: 48000, CloseDate: '2027-02-28', Probability: 20 });
  add('Opportunity', { Name: 'Isar Outdoor - Store Fixtures', AccountId: acc.Id, StageName: 'Proposal/Price Quote', Amount: 12500, CloseDate: '2026-12-15', Probability: 75 });
}
seed();

const err = (res, status, errorCode, message, fields) => send(res, status, [{ message, errorCode, ...(fields ? { fields } : {}) }]);
const authorized = (ctx) => {
  const h = ctx.req.headers.authorization || '';
  if (h.startsWith('Bearer ') && tokens.has(h.slice(7))) return true;
  err(ctx.res, 401, 'INVALID_SESSION_ID', 'Session expired or invalid');
  return false;
};
const withAttrs = (type, r, fields) => {
  const out = { attributes: { type, url: `/services/data/${API_VERSION}/sobjects/${type}/${r.Id}` } };
  for (const f of fields || Object.keys(r)) out[f] = r[f] ?? null;
  return out;
};

function createRecord(type, body) {
  if (!db[type]) return { status: 404, body: [{ errorCode: 'NOT_FOUND', message: `The requested resource does not exist` }] };
  const missing = REQUIRED[type].filter((f) => body[f] === undefined || body[f] === '');
  if (missing.length) return { status: 400, body: [{ message: `Required fields are missing: [${missing.join(', ')}]`, errorCode: 'REQUIRED_FIELD_MISSING', fields: missing }] };
  if (type === 'Opportunity' && !STAGES.includes(body.StageName)) return { status: 400, body: [{ message: `bad value for restricted picklist field: ${body.StageName}`, errorCode: 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST', fields: ['StageName'] }] };
  if (type === 'Lead' && body.Status && !LEAD_STATUS.includes(body.Status)) return { status: 400, body: [{ message: `bad value for restricted picklist field: ${body.Status}`, errorCode: 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST', fields: ['Status'] }] };
  if (body.Email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.Email)) return { status: 400, body: [{ message: 'Email: invalid email address: ' + body.Email, errorCode: 'INVALID_EMAIL_ADDRESS', fields: ['Email'] }] };
  const rec = { Id: newId(type), CreatedDate: new Date().toISOString().replace('Z', '+0000'), ...(type === 'Lead' ? { Status: 'Open - Not Contacted', IsConverted: false } : {}), ...body };
  db[type].push(rec);
  return { status: 201, body: { id: rec.Id, success: true, errors: [] } };
}

// Minimal SOQL: SELECT a,b FROM X [WHERE f = 'v' AND g LIKE '%v%' AND n > 5] [ORDER BY f [DESC]] [LIMIT n]
export function soql(q) {
  const m = q.trim().match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i);
  if (!m) throw Object.assign(new Error('unexpected token: malformed query'), { code: 'MALFORMED_QUERY' });
  const [, fieldList, type, where, orderBy, dir, limit] = m;
  if (!db[type]) throw Object.assign(new Error(`sObject type '${type}' is not supported.`), { code: 'INVALID_TYPE' });
  const fields = fieldList.split(',').map((f) => f.trim());
  if (fields.length === 1 && /^COUNT\(\)$/i.test(fields[0])) return { type, count: true, fields, records: filter(db[type], where) };
  let rows = filter(db[type], where);
  if (orderBy) rows = [...rows].sort((a, b) => String(a[orderBy] ?? '').localeCompare(String(b[orderBy] ?? ''), undefined, { numeric: true }) * (dir?.toUpperCase() === 'DESC' ? -1 : 1));
  if (limit) rows = rows.slice(0, Number(limit));
  return { type, fields, records: rows };
}
function filter(rows, where) {
  if (!where) return rows;
  const conds = where.split(/\s+AND\s+/i).map((c) => {
    const cm = c.trim().match(/^(\w+)\s*(=|!=|>|<|>=|<=|LIKE)\s*(?:'((?:[^'\\]|\\.)*)'|(\d+(?:\.\d+)?)|(true|false|null))$/i);
    if (!cm) throw Object.assign(new Error(`unexpected token: ${c}`), { code: 'MALFORMED_QUERY' });
    const value = cm[3] !== undefined ? cm[3] : cm[4] !== undefined ? Number(cm[4]) : cm[5].toLowerCase() === 'null' ? null : cm[5].toLowerCase() === 'true';
    return { field: cm[1], op: cm[2].toUpperCase(), value };
  });
  return rows.filter((r) => conds.every(({ field, op, value }) => {
    const v = r[field] ?? null;
    switch (op) {
      case '=': return v === value;
      case '!=': return v !== value;
      case '>': return v > value;
      case '<': return v < value;
      case '>=': return v >= value;
      case '<=': return v <= value;
      case 'LIKE': return new RegExp('^' + String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i').test(String(v ?? ''));
    }
  }));
}

function handle(method, urlPath, body) {
  const base = `/services/data/${API_VERSION}`;
  if (!urlPath.startsWith(base)) return { status: 404, body: [{ errorCode: 'NOT_FOUND', message: 'The requested resource does not exist' }] };
  const p = urlPath.slice(base.length).split('?')[0].split('/').filter(Boolean);
  if (p[0] !== 'sobjects') return { status: 404, body: [{ errorCode: 'NOT_FOUND', message: 'The requested resource does not exist' }] };
  const [, type, id] = p;
  if (!db[type]) return { status: 404, body: [{ errorCode: 'NOT_FOUND', message: 'The requested resource does not exist' }] };
  if (method === 'POST' && !id) return createRecord(type, body || {});
  const rec = db[type].find((r) => r.Id === id || r.Id.slice(0, 15) === id);
  if (!rec) return { status: 404, body: [{ errorCode: 'NOT_FOUND', message: 'The requested resource does not exist' }] };
  if (method === 'GET') return { status: 200, body: withAttrs(type, rec) };
  if (method === 'PATCH') {
    if (body?.Id) return { status: 400, body: [{ errorCode: 'INVALID_FIELD_FOR_INSERT_UPDATE', message: 'Unable to create/update fields: Id', fields: ['Id'] }] };
    if (type === 'Opportunity' && body?.StageName && !STAGES.includes(body.StageName)) return { status: 400, body: [{ errorCode: 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST', message: `bad value for restricted picklist field: ${body.StageName}`, fields: ['StageName'] }] };
    Object.assign(rec, body);
    return { status: 204, body: '' };
  }
  if (method === 'DELETE') { db[type] = db[type].filter((r) => r !== rec); return { status: 204, body: '' }; }
  return { status: 405, body: [{ errorCode: 'METHOD_NOT_ALLOWED', message: `HTTP Method '${method}' not allowed` }] };
}

export function register(r) {
  r.post('/services/__reset', ({ res }) => { seed(); send(res, 200, { reset: true }); });
  r.post('/services/oauth2/token', ({ req, res, body }) => {
    const host = `http://${req.headers.host}`;
    const ok = () => { const t = `00D5g00000QA${randomUUID().replace(/-/g, '').slice(0, 10)}!${randomUUID().replace(/-/g, '')}`; tokens.add(t); send(res, 200, { access_token: t, instance_url: host, id: `${host}/id/00D5g00000QAORG/0055g00000QAUSR`, token_type: 'Bearer', issued_at: String(Date.now()), signature: 'mock-signature' }); };
    if (body.grant_type === 'password') {
      const u = USERS[body.username];
      if (!u || body.password !== u.password + u.securityToken) return send(res, 400, { error: 'invalid_grant', error_description: 'authentication failure' });
      if (body.client_id && CLIENTS[body.client_id] !== body.client_secret) return send(res, 400, { error: 'invalid_client', error_description: 'invalid client credentials' });
      return ok();
    }
    if (body.grant_type === 'client_credentials') {
      if (CLIENTS[body.client_id] !== body.client_secret) return send(res, 400, { error: 'invalid_client', error_description: 'invalid client credentials' });
      return ok();
    }
    send(res, 400, { error: 'unsupported_grant_type', error_description: 'grant type not supported' });
  });
  // UI login (the Lightning login page does not use the security token)
  r.post('/crm/api/login', ({ res, body }) => {
    const u = USERS[body.username];
    if (!u || u.password !== body.password) return send(res, 401, { error: 'INVALID_LOGIN', message: 'Please check your username and password. If you still can\'t log in, contact your Salesforce administrator.' });
    const t = `00D5g00000QAUI!${randomUUID().replace(/-/g, '')}`;
    tokens.add(t);
    send(res, 200, { sessionId: t, userName: 'QA Admin' });
  });
  r.get(`/services/data`, ({ res }) => send(res, 200, [{ label: "Spring '24", url: `/services/data/${API_VERSION}`, version: API_VERSION.slice(1) }]));
  r.get(`/services/data/${API_VERSION}/limits`, (ctx) => { if (authorized(ctx)) send(ctx.res, 200, { DailyApiRequests: { Max: 15000, Remaining: 14872 } }); });
  r.get(`/services/data/${API_VERSION}/query`, (ctx) => {
    if (!authorized(ctx)) return;
    try {
      const out = soql(ctx.query.get('q') || '');
      if (out.count) return send(ctx.res, 200, { totalSize: out.records.length, done: true, records: [] });
      send(ctx.res, 200, { totalSize: out.records.length, done: true, records: out.records.map((x) => withAttrs(out.type, x, out.fields)) });
    } catch (e) { err(ctx.res, 400, e.code || 'MALFORMED_QUERY', e.message); }
  });
  r.get(`/services/data/${API_VERSION}/sobjects/:type/describe`, (ctx) => {
    if (!authorized(ctx)) return;
    const t = ctx.params.type;
    if (!db[t]) return err(ctx.res, 404, 'NOT_FOUND', 'The requested resource does not exist');
    send(ctx.res, 200, { name: t, keyPrefix: PREFIX[t], createable: true, fields: [...new Set(['Id', ...REQUIRED[t], ...db[t].flatMap(Object.keys)])].map((n) => ({ name: n, nillable: !REQUIRED[t].includes(n) })) });
  });
  for (const method of ['get', 'post', 'patch', 'delete']) {
    r[method](`/services/data/${API_VERSION}/sobjects/:type`, (ctx) => { if (!authorized(ctx)) return; const o = handle(method.toUpperCase(), ctx.url.pathname, ctx.body); send(ctx.res, o.status, o.body); });
    r[method](`/services/data/${API_VERSION}/sobjects/:type/:id`, (ctx) => { if (!authorized(ctx)) return; const o = handle(method.toUpperCase(), ctx.url.pathname, ctx.body); send(ctx.res, o.status, o.body); });
  }
  r.post(`/services/data/${API_VERSION}/composite`, (ctx) => {
    if (!authorized(ctx)) return;
    const { allOrNone = false, compositeRequest = [] } = ctx.body;
    if (compositeRequest.length > 25) return err(ctx.res, 400, 'INVALID_INPUT', 'compositeRequest can contain at most 25 subrequests');
    const snapshot = JSON.stringify(db);
    const refs = {};
    const out = [];
    let failed = false;
    for (const sub of compositeRequest) {
      const resolve = (v) => typeof v === 'string' ? v.replace(/@\{(\w+)\.(\w+)\}/g, (_, ref, f) => refs[ref]?.[f] ?? '') : v;
      const url = resolve(sub.url);
      const body = sub.body ? Object.fromEntries(Object.entries(sub.body).map(([k, v]) => [k, resolve(v)])) : undefined;
      if (failed && allOrNone) { out.push({ body: [{ errorCode: 'PROCESSING_HALTED', message: 'The transaction was rolled back since another operation in the same transaction failed.' }], httpHeaders: {}, httpStatusCode: 400, referenceId: sub.referenceId }); continue; }
      const resp = handle(sub.method, url, body);
      if (resp.status >= 400) failed = true;
      refs[sub.referenceId] = resp.body;
      out.push({ body: resp.body || null, httpHeaders: resp.status === 201 ? { Location: `${url}/${resp.body.id}` } : {}, httpStatusCode: resp.status, referenceId: sub.referenceId });
    }
    if (failed && allOrNone) {
      db = JSON.parse(snapshot);
      out.forEach((o) => { if (o.httpStatusCode < 400) { o.httpStatusCode = 400; o.body = [{ errorCode: 'PROCESSING_HALTED', message: 'The transaction was rolled back since another operation in the same transaction failed.' }]; } });
    }
    send(ctx.res, 200, { compositeResponse: out });
  });
  // Custom Apex REST endpoint used by the "Convert" button
  r.post('/services/apexrest/LeadConvert/:id', (ctx) => {
    if (!authorized(ctx)) return;
    const lead = db.Lead.find((l) => l.Id === ctx.params.id);
    if (!lead) return err(ctx.res, 404, 'NOT_FOUND', 'Lead not found');
    if (lead.IsConverted) return err(ctx.res, 400, 'CANNOT_UPDATE_CONVERTED_LEAD', 'Lead has already been converted');
    const acc = { Id: newId('Account'), Name: lead.Company, Industry: lead.Industry || null };
    const con = { Id: newId('Contact'), FirstName: lead.FirstName, LastName: lead.LastName, Email: lead.Email, AccountId: acc.Id };
    const opp = { Id: newId('Opportunity'), Name: `${lead.Company} - New Business`, AccountId: acc.Id, StageName: 'Prospecting', Amount: ctx.body.amount ?? null, CloseDate: ctx.body.closeDate || '2027-03-31', Probability: 10 };
    db.Account.push(acc); db.Contact.push(con); db.Opportunity.push(opp);
    Object.assign(lead, { IsConverted: true, Status: 'Closed - Converted', ConvertedAccountId: acc.Id, ConvertedContactId: con.Id, ConvertedOpportunityId: opp.Id });
    send(ctx.res, 200, { leadId: lead.Id, accountId: acc.Id, contactId: con.Id, opportunityId: opp.Id });
  });
}
