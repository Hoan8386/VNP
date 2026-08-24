/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * scv_sl_import_rcpicker.js
 *
 * Suitelet render 1 trang HTML thuần:
 *   1. Trang gọi GET /app/recordscatalog/rcendpoint.nl?action=getRecordTypes&data={"structureType":"FLAT"}
 *      bằng fetch (same-origin, dùng luôn session cookie của user đang đăng nhập).
 *   2. Đổ toàn bộ record type vào 1 <select>; value của mỗi option = field "id"
 *      (script id của record, vd: salesorder, customrecord_xxx).
 *   3. User chọn -> hiển thị id đã chọn, copy id, mở Records Browser của record đó.
 *
 * LƯU Ý KHI DEPLOY:
 *   - Script Deployment: Available Without Login = FALSE (bắt buộc).
 *     Trang phải chạy trong domain <account>.app.netsuite.com để fetch same-origin
 *     kèm session cookie. Nếu bật "Available Without Login" (extforms domain) thì
 *     endpoint recordscatalog sẽ trả về HTML login, không phải JSON.
 *   - Audience: role nào cần dùng. Endpoint chỉ trả về các record type mà role đó thấy được.
 */
define(['N/runtime'], (runtime) => {

    const RC_ENDPOINT = '/app/recordscatalog/rcendpoint.nl';
    const RC_BROWSER = '/app/recordscatalog/rcbrowser.nl?whence=';

    /**
     * @param {Object} context
     * @param {ServerRequest} context.request
     * @param {ServerResponse} context.response
     */
    const onRequest = (context) => {
        if (context.request.method !== 'GET') {
            context.response.write('Method not supported.');
            return;
        }

        context.response.setHeader({name: 'Content-Type', value: 'text/html; charset=utf-8'});
        context.response.write(buildPage({
            user: runtime.getCurrentUser().name, role: runtime.getCurrentUser().roleId, account: runtime.accountId
        }));
    };

    const buildPage = (ctx) => `<!DOCTYPE html>
        <html lang="vi">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Record Type Picker</title>
        <style>
          :root{
            --ink:#12161c; --ink-2:#4a5563; --line:#dfe3e8;
            --bg:#f5f6f8; --card:#ffffff; --accent:#1b5e9e; --accent-soft:#e8f0f8;
            --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
            --sans:"Segoe UI",Roboto,system-ui,-apple-system,sans-serif;
          }
          *{box-sizing:border-box}
          body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 var(--sans)}
          .wrap{max-width:900px;margin:0 auto;padding:28px 20px 60px}
          header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}
          h1{font-size:20px;font-weight:650;margin:0;letter-spacing:-.01em}
          .meta{font:12px/1.4 var(--mono);color:var(--ink-2)}
          .card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:18px}
          .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
          label{display:block;font-size:12px;font-weight:600;color:var(--ink-2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
          input[type=search],select{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font:14px var(--sans);background:#fff;color:var(--ink)}
          select{font-family:var(--mono);font-size:13px}
          select:focus,input:focus,button:focus{outline:2px solid var(--accent);outline-offset:1px}
          .grow{flex:1 1 260px}
          .count{font:12px var(--mono);color:var(--ink-2);white-space:nowrap}
          .chk{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2)}
          .result{margin-top:16px;padding:14px;border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:6px;background:var(--accent-soft)}
          .result .id{font:600 16px var(--mono);word-break:break-all}
          .result .lbl{font-size:13px;color:var(--ink-2);margin-top:2px}
          .actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
          button,a.btn{border:1px solid var(--line);background:#fff;color:var(--ink);padding:7px 12px;border-radius:6px;font:13px var(--sans);cursor:pointer;text-decoration:none;display:inline-block}
          button:hover,a.btn:hover{border-color:var(--accent);color:var(--accent)}
          button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
          .state{padding:14px;font:13px var(--mono);color:var(--ink-2)}
          .state.err{color:#a1352b;background:#fdf1f0;border:1px solid #f0d4d1;border-radius:6px}
          .hide{display:none}
        </style>
        </head>
        <body>
        <div class="wrap">
        
          <header>
            <h1>Record Type Picker</h1>
            <div class="meta">acct ${ctx.account} &middot; role ${ctx.role}</div>
          </header>
        
          <div class="card">
            <div id="state" class="state">Đang tải danh sách record type&hellip;</div>
        
            <div id="picker" class="hide">
              <div class="row">
                <div class="grow">
                  <label for="filter">Lọc theo tên hoặc id</label>
                  <input id="filter" type="search" placeholder="sales order, customrecord, transaction&hellip;" autocomplete="off">
                </div>
                <div class="count"><span id="shown">0</span>/<span id="total">0</span> record</div>
              </div>
        
              <div class="row">
                <label class="chk"><input type="checkbox" id="hideSub"> Ẩn subtype</label>
                <label class="chk"><input type="checkbox" id="listMode"> Hiển thị dạng danh sách</label>
              </div>
        
              <label for="recordType">Record type</label>
              <select id="recordType" size="1"></select>
        
              <div id="result" class="result hide">
                <div class="id" id="selId"></div>
                <div class="lbl" id="selLabel"></div>
                <div class="actions">
                  <button class="primary" id="btnCopy" type="button">Copy id</button>
                  <a class="btn" id="btnBrowser" target="_blank" rel="noopener">Mở Records Browser</a>
                  <a class="btn" id="btnFields" target="_blank" rel="noopener">Xem field JSON</a>
                </div>
              </div>
            </div>
          </div>
        
        </div>
        
        <script>
        (function () {
          var ENDPOINT = '${RC_ENDPOINT}?action=getRecordTypes&data=' +
                         encodeURIComponent(JSON.stringify({ structureType: 'FLAT' }));
        
          var all = [];
          var el = {
            state:   document.getElementById('state'),
            picker:  document.getElementById('picker'),
            filter:  document.getElementById('filter'),
            hideSub: document.getElementById('hideSub'),
            listMode:document.getElementById('listMode'),
            select:  document.getElementById('recordType'),
            shown:   document.getElementById('shown'),
            total:   document.getElementById('total'),
            result:  document.getElementById('result'),
            selId:   document.getElementById('selId'),
            selLabel:document.getElementById('selLabel'),
            copy:    document.getElementById('btnCopy'),
            browser: document.getElementById('btnBrowser'),
            fields:  document.getElementById('btnFields')
          };
        
          fetch(ENDPOINT, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(function (res) {
              if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
              return res.text();
            })
            .then(function (text) {
              var json;
              try { json = JSON.parse(text); }
              catch (e) {
                throw new Error('Endpoint trả về không phải JSON. Kiểm tra deployment có đang chạy ở domain đăng nhập không (Available Without Login phải = false).');
              }
              // Response: { data: [ { id, label, isSubtype, subtypeOf, ... } ] }
              all = json.data || json.records || (Array.isArray(json) ? json : []);
              if (!all.length) throw new Error('Endpoint trả về 0 record type cho role hiện tại.');
        
              all.sort(function (a, b) {
                return String(a.label || a.id).localeCompare(String(b.label || b.id));
              });
        
              el.total.textContent = all.length;
              el.state.classList.add('hide');
              el.picker.classList.remove('hide');
              render();
            })
            .catch(function (err) {
              el.state.className = 'state err';
              el.state.textContent = 'Không tải được record type: ' + err.message;
            });
        
          function render() {
            var q = el.filter.value.trim().toLowerCase();
            var noSub = el.hideSub.checked;
            var keep = el.select.value;
        
            var rows = all.filter(function (r) {
              if (noSub && r.isSubtype) return false;
              if (!q) return true;
              return String(r.id).toLowerCase().indexOf(q) > -1 ||
                     String(r.label || '').toLowerCase().indexOf(q) > -1;
            });
        
            var frag = document.createDocumentFragment();
            var ph = document.createElement('option');
            ph.value = ''; ph.textContent = '-- Chọn record type --';
            frag.appendChild(ph);
        
            rows.forEach(function (r) {
              var o = document.createElement('option');
              o.value = r.id;                                  // <- value = id của record
              o.textContent = (r.label || r.id) + '  \\u2014  ' + r.id + (r.isSubtype ? '  (subtype)' : '');
              o.dataset.label = r.label || r.id;
              frag.appendChild(o);
            });
        
            el.select.innerHTML = '';
            el.select.appendChild(frag);
            el.select.value = keep;
            el.shown.textContent = rows.length;
            if (el.select.value !== keep) showSelection();
          }
        
          function showSelection() {
            var id = el.select.value;
            if (!id) { el.result.classList.add('hide'); return; }
            var opt = el.select.selectedOptions[0];
            el.selId.textContent = id;
            el.selLabel.textContent = opt.dataset.label || '';
            el.browser.href = '${RC_BROWSER}#/type=record;id=' + encodeURIComponent(id);
            el.fields.href = '${RC_ENDPOINT}?action=getRecordTypeDetail&data=' +
              encodeURIComponent(JSON.stringify({ scriptId: id, detailType: 'SS_ANALYT' }));
            el.result.classList.remove('hide');
          }
        
          el.filter.addEventListener('input', render);
          el.hideSub.addEventListener('change', render);
          el.listMode.addEventListener('change', function () {
            el.select.size = this.checked ? 16 : 1;
          });
          el.select.addEventListener('change', showSelection);
        
          el.copy.addEventListener('click', function () {
            var id = el.select.value;
            if (!id) return;
            navigator.clipboard.writeText(id).then(function () {
              el.copy.textContent = 'Đã copy';
              setTimeout(function () { el.copy.textContent = 'Copy id'; }, 1200);
            });
          });
        })();
        </script>
        </body>
        </html>`;

    return {onRequest};
});
