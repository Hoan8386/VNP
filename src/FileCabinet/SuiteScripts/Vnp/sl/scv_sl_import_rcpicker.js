/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * scv_sl_import_rcpicker.js
 *
 * Suitelet render 1 trang HTML thuần, gồm 2 bước:
 *
 *   BƯỚC 1 - Chọn Record Type & dữ liệu JSON
 *     - Trang gọi GET /app/recordscatalog/rcendpoint.nl?action=getRecordTypes&data={"structureType":"FLAT"}
 *       bằng fetch (same-origin, dùng luôn session cookie của user đang đăng nhập) để đổ
 *       toàn bộ record type vào 1 <select>; value của mỗi option = script id của record.
 *     - User dán / upload JSON nguồn (1 object hoặc mảng object; key có giá trị là mảng
 *       object được hiểu là sublist).
 *
 *   BƯỚC 2 - Field Mapping
 *     - Trang gọi ngược lại chính Suitelet này: &action=meta&rt=<recordtype>
 *       Server dùng record.create({type: rt, isDynamic: true}) rồi lấy:
 *         + field header : rec.getFields()   + rec.getField()
 *         + field sublist: rec.getSublists() + selectNewLine() + rec.getCurrentSublistField()
 *       Mỗi field trả kèm cờ input = có thể nhập (không disabled / không read-only).
 *     - Hiển thị bảng mapping 3 cột giống CSV Import Assistant:
 *         trái  = field lấy từ JSON truyền vào
 *         giữa  = các cặp đã map
 *         phải  = field của NetSuite (body + từng sublist)
 *     - Xuất mapping ra JSON để dùng cho script import.
 *
 * LƯU Ý KHI DEPLOY:
 *   - Script Deployment: Available Without Login = FALSE (bắt buộc).
 *     Trang phải chạy trong domain <account>.app.netsuite.com để fetch same-origin
 *     kèm session cookie. Nếu bật "Available Without Login" (extforms domain) thì
 *     endpoint recordscatalog sẽ trả về HTML login, không phải JSON.
 *   - Audience: role nào cần dùng. Endpoint chỉ trả về các record type mà role đó thấy được.
 */
define(['N/runtime', 'N/record', 'N/url', 'N/log'], (runtime, record, url, log) => {

    const RC_ENDPOINT = '/app/recordscatalog/rcendpoint.nl';
    const RC_BROWSER = '/app/recordscatalog/rcbrowser.nl?whence=';

    // Field type chỉ để trình bày, không phải field nhập liệu
    const NON_INPUT_TYPES = ['help', 'inlinehtml', 'label'];

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

        const params = context.request.parameters || {};

        // ----- Endpoint JSON: metadata field của 1 record type -----
        if (params.action === 'meta') {
            context.response.setHeader({name: 'Content-Type', value: 'application/json; charset=utf-8'});
            let out;
            try {
                out = buildRecordMeta(params.rt);
            } catch (e) {
                log.error({title: 'buildRecordMeta ' + params.rt, details: e});
                out = {error: (e.message || String(e)), recordType: params.rt};
            }
            context.response.write(JSON.stringify(out));
            return;
        }

        // ----- Trang HTML -----
        const script = runtime.getCurrentScript();
        context.response.setHeader({name: 'Content-Type', value: 'text/html; charset=utf-8'});
        context.response.write(buildPage({
            user: runtime.getCurrentUser().name,
            role: runtime.getCurrentUser().roleId,
            account: runtime.accountId,
            selfUrl: url.resolveScript({scriptId: script.id, deploymentId: script.deploymentId})
        }));
    };

    // =========================================================================
    // SERVER: lấy metadata field từ record.create
    // =========================================================================

    /**
     * Tạo record rỗng theo recordType rồi bóc toàn bộ field header + field sublist.
     * @param {string} recordType script id của record (salesorder, customrecord_xxx...)
     * @returns {{recordType:string, dynamic:boolean, body:Array, sublists:Array}}
     */
    const buildRecordMeta = (recordType) => {
        if (!recordType) throw new Error('Thiếu tham số rt (record type).');

        let rec;
        let dynamic = true;
        try {
            rec = record.create({type: recordType, isDynamic: true});
        } catch (e) {
            dynamic = false;
            rec = record.create({type: recordType, isDynamic: false});  // lỗi ở đây thì bắn ra ngoài
        }

        return {
            recordType: recordType,
            dynamic: dynamic,
            body: getBodyFields(rec),
            sublists: getSublistMeta(rec, dynamic)
        };
    };

    /**
     * Field header. Trả về cả field không nhập được kèm cờ để client tự lọc.
     */
    const getBodyFields = (rec) => {
        const out = [];
        let ids = [];
        try {
            ids = rec.getFields() || [];
        } catch (e) {
            log.error({title: 'getFields', details: e});
        }

        ids.forEach((fieldId) => {
            let fld = null;
            try {
                fld = rec.getField({fieldId: fieldId});
            } catch (e) { /* field ẩn theo feature/permission -> không có metadata */ }

            out.push(fieldMeta(fieldId, fld, true));
        });

        out.sort(sortByLabel);
        return out;
    };

    /**
     * Field của từng sublist.
     * Dynamic mode: selectNewLine rồi getCurrentSublistField -> đủ label/type/mandatory.
     * Standard mode hoặc sublist read-only: fallback getSublistField dòng 0; không đọc được thì chỉ giữ id.
     */
    const getSublistMeta = (rec, dynamic) => {
        const out = [];
        let sublistIds = [];
        try {
            sublistIds = rec.getSublists() || [];
        } catch (e) {
            log.error({title: 'getSublists', details: e});
        }

        sublistIds.forEach((sublistId) => {
            let fieldIds = [];
            try {
                fieldIds = rec.getSublistFields({sublistId: sublistId}) || [];
            } catch (e) {
                return;
            }

            // Mở 1 dòng mới để đọc được metadata field của sublist
            let editable = false;
            if (dynamic) {
                try {
                    rec.selectNewLine({sublistId: sublistId});
                    editable = true;
                } catch (e) { /* sublist read-only: links, systemnotes... */ }
            }

            const fields = fieldIds.map((fieldId) => {
                let fld = null;
                try {
                    fld = editable
                        ? rec.getCurrentSublistField({sublistId: sublistId, fieldId: fieldId})
                        : rec.getSublistField({sublistId: sublistId, fieldId: fieldId, line: 0});
                } catch (e) { /* không đọc được metadata -> vẫn giữ id */ }

                return fieldMeta(fieldId, fld, editable);
            });

            if (editable) {
                try { rec.cancelLine({sublistId: sublistId}); } catch (e) { /* ignore */ }
            }

            fields.sort(sortByLabel);
            out.push({id: sublistId, label: sublistId, editable: editable, fields: fields});
        });

        out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        return out;
    };

    /**
     * @param {string} fieldId
     * @param {Field|null} fld
     * @param {boolean} containerEditable false khi sublist không mở dòng mới được
     */
    const fieldMeta = (fieldId, fld, containerEditable) => {
        const type = fld ? String(fld.type || '') : '';
        return {
            id: fieldId,
            label: (fld && fld.label) ? fld.label : fieldId,
            type: type,
            mandatory: !!(fld && fld.isMandatory),
            disabled: !!(fld && fld.isDisabled),
            readonly: !!(fld && fld.isReadOnly),
            hidden: !!(fld && fld.isDisplay === false),
            input: !!containerEditable && !!fld && !fld.isDisabled && !fld.isReadOnly &&
                NON_INPUT_TYPES.indexOf(type) === -1
        };
    };

    const sortByLabel = (a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id));

    // =========================================================================
    // CLIENT PAGE
    // =========================================================================

    const buildPage = (ctx) => `<!DOCTYPE html>
        <html lang="vi">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Record Type Picker &amp; Field Mapping</title>
        <style>
          :root{
            --ink:#12161c; --ink-2:#4a5563; --line:#dfe3e8;
            --bg:#f5f6f8; --card:#ffffff; --accent:#1b5e9e; --accent-soft:#e8f0f8;
            --ok:#1d6f42; --warn:#a1352b;
            --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
            --sans:"Segoe UI",Roboto,system-ui,-apple-system,sans-serif;
          }
          *{box-sizing:border-box}
          body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 var(--sans)}
          .wrap{max-width:1500px;margin:0 auto;padding:22px 20px 60px}
          header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px}
          h1{font-size:20px;font-weight:650;margin:0;letter-spacing:-.01em}
          h2{font-size:16px;font-weight:650;margin:0 0 14px}
          .meta{font:12px/1.4 var(--mono);color:var(--ink-2)}
          .shell{display:grid;grid-template-columns:210px minmax(0,1fr);gap:18px;align-items:start}
          .steps{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px 14px}
          .steps h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2);margin:0 0 12px}
          .step{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;color:var(--ink-2);font-size:13px}
          .step .num{width:24px;height:24px;border-radius:50%;background:#e7ebf0;color:var(--ink-2);display:flex;align-items:center;justify-content:center;font:600 12px var(--sans);flex:none}
          .step.on{background:var(--accent-soft);color:var(--ink);font-weight:600}
          .step.on .num{background:var(--accent);color:#fff}
          .step.done .num{background:var(--ok);color:#fff}
          .card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:18px}
          .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
          label{display:block;font-size:12px;font-weight:600;color:var(--ink-2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
          input[type=search],input[type=text],select,textarea{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font:14px var(--sans);background:#fff;color:var(--ink)}
          select,textarea{font-family:var(--mono);font-size:13px}
          textarea{min-height:150px;resize:vertical;line-height:1.45}
          select:focus,input:focus,button:focus,textarea:focus{outline:2px solid var(--accent);outline-offset:1px}
          .grow{flex:1 1 260px}
          .count{font:12px var(--mono);color:var(--ink-2);white-space:nowrap}
          .chk{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2);text-transform:none;letter-spacing:0;font-weight:400;margin:0}
          .result{margin-top:16px;padding:14px;border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:6px;background:var(--accent-soft)}
          .result .id{font:600 16px var(--mono);word-break:break-all}
          .result .lbl{font-size:13px;color:var(--ink-2);margin-top:2px}
          .actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center}
          button,a.btn{border:1px solid var(--line);background:#fff;color:var(--ink);padding:7px 12px;border-radius:6px;font:13px var(--sans);cursor:pointer;text-decoration:none;display:inline-block}
          button:hover,a.btn:hover{border-color:var(--accent);color:var(--accent)}
          button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
          button.primary:hover{color:#fff;opacity:.92}
          button[disabled]{opacity:.45;cursor:not-allowed}
          .state{padding:14px;font:13px var(--mono);color:var(--ink-2)}
          .state.err{color:var(--warn);background:#fdf1f0;border:1px solid #f0d4d1;border-radius:6px}
          .hide{display:none}
          .sep{height:1px;background:var(--line);margin:18px 0}

          /* ---- mapping ---- */
          .mapgrid{display:grid;grid-template-columns:1fr 1.35fr 1fr;gap:14px;align-items:start}
          .pane{border:1px solid var(--line);border-radius:6px;background:#fff;display:flex;flex-direction:column;min-height:430px}
          .pane .head{background:#eef1f4;border-bottom:1px solid var(--line);padding:8px 12px;font-weight:650;font-size:13px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center;gap:8px}
          .pane .head .count{font-weight:400}
          .pane .tools{padding:8px 10px;border-bottom:1px solid var(--line)}
          .pane .tools input[type=search]{padding:6px 8px;font-size:13px}
          .pane .body{overflow:auto;max-height:520px;padding:6px 0;flex:1}
          .grp{padding:8px 12px 2px;font-weight:650;font-size:13px;display:flex;gap:6px;align-items:baseline}
          .grp .tag{font:11px var(--mono);color:var(--ink-2);font-weight:400}
          .fld{display:flex;gap:8px;align-items:baseline;padding:4px 12px 4px 26px;cursor:pointer;font-size:13px}
          .fld:hover{background:var(--accent-soft)}
          .fld.sel{background:var(--accent);color:#fff}
          .fld.sel .fid,.fld.sel .req{color:#dbe8f5}
          .fld.used{opacity:.42}
          .fld .fid{font:11px var(--mono);color:var(--ink-2);white-space:nowrap}
          .fld .req{color:var(--warn);font-size:11px}
          .fld .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .maprow{display:grid;grid-template-columns:minmax(0,1fr) 26px minmax(0,1fr) 26px;gap:6px;align-items:center;border:1px solid var(--line);border-radius:20px;padding:5px 10px;margin:0 10px 6px;font-size:13px;background:#fff}
          .maprow.empty{color:#b6bcc4;background:#fbfcfd}
          .maprow.pend{border-color:var(--accent);background:var(--accent-soft);color:var(--ink)}
          .maprow .cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .maprow .arw{text-align:center;color:var(--ink-2)}
          .maprow .del{border:0;background:none;color:var(--ink-2);cursor:pointer;padding:0;font-size:15px;line-height:1}
          .maprow .del:hover{color:var(--warn)}
          .maprow.warn{border-color:#e7b9b3;background:#fdf6f5}
          .hint{font-size:12px;color:var(--ink-2);margin:0 0 10px}
        </style>
        </head>
        <body>
        <div class="wrap">

          <header>
            <h1>Record Type Picker &amp; Field Mapping</h1>
            <div class="meta">acct ${ctx.account} &middot; role ${ctx.role}</div>
          </header>

          <div class="shell">

            <div class="steps">
              <h3>Steps</h3>
              <div class="step on" id="stepNav1"><span class="num">1</span> Chọn Record Type</div>
              <div class="step" id="stepNav2"><span class="num">2</span> Dữ liệu JSON</div>
              <div class="step" id="stepNav3"><span class="num">3</span> Field Mapping</div>
            </div>

            <div>

              <!-- ================= BƯỚC 1 + 2 ================= -->
              <div class="card" id="step1">
                <h2>Record type &amp; dữ liệu JSON</h2>
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

                  <div class="sep"></div>

                  <label for="jsonData">Dữ liệu JSON truyền vào</label>
                  <p class="hint">Dán 1 object hoặc mảng object. Key có giá trị là mảng object sẽ được hiểu là sublist.</p>
                  <textarea id="jsonData" spellcheck="false" placeholder='[{"code":"KH001","name":"Khách hàng A","item":[{"item":"SP01","quantity":2}]}]'></textarea>
                  <div class="actions">
                    <input type="file" id="jsonFile" accept=".json,.txt,application/json" style="width:auto">
                    <span class="count" id="jsonInfo"></span>
                  </div>

                  <div class="actions">
                    <button class="primary" id="btnNext" type="button" disabled>Next &rsaquo;</button>
                    <span class="count" id="nextHint">Chọn record type và nhập JSON để tiếp tục.</span>
                  </div>
                </div>
              </div>

              <!-- ================= BƯỚC 3: MAPPING ================= -->
              <div class="card hide" id="step3">
                <div class="row" style="justify-content:space-between">
                  <h2 style="margin:0">Field Mapping</h2>
                  <div class="count" id="mapMeta"></div>
                </div>

                <div id="mapState" class="state">Đang lấy field của record&hellip;</div>

                <div id="mapUi" class="hide">
                  <p class="hint">Bấm 1 field bên <b>JSON</b> rồi bấm 1 field bên <b>NetSuite</b> (hoặc ngược lại) để tạo 1 dòng mapping. Mặc định chỉ hiện field có thể nhập; bỏ tick để xem toàn bộ.</p>

                  <div class="mapgrid">

                    <!-- trái: JSON -->
                    <div class="pane">
                      <div class="head">Your Fields (JSON) <span class="count" id="cntJson"></span></div>
                      <div class="tools"><input type="search" id="qJson" placeholder="lọc field JSON&hellip;" autocomplete="off"></div>
                      <div class="body" id="paneJson"></div>
                    </div>

                    <!-- giữa: mapping -->
                    <div class="pane">
                      <div class="head">Mapping <span class="count" id="cntMap"></span></div>
                      <div class="tools" style="display:flex;gap:6px;flex-wrap:wrap">
                        <button id="btnAuto" type="button">Tự động map</button>
                        <button id="btnClear" type="button">Xoá hết</button>
                        <button id="btnExport" type="button" class="primary">Xuất JSON mapping</button>
                      </div>
                      <div class="body" id="paneMap" style="padding-top:10px"></div>
                    </div>

                    <!-- phải: NetSuite -->
                    <div class="pane">
                      <div class="head">NetSuite Fields <span class="count" id="cntNs"></span></div>
                      <div class="tools">
                        <input type="search" id="qNs" placeholder="lọc field NetSuite&hellip;" autocomplete="off">
                        <label class="chk" style="margin-top:6px"><input type="checkbox" id="onlyInput" checked> Chỉ field có thể nhập</label>
                      </div>
                      <div class="body" id="paneNs"></div>
                    </div>

                  </div>

                  <div class="actions">
                    <button id="btnBack" type="button">&lsaquo; Quay lại</button>
                  </div>

                  <div id="exportBox" class="hide">
                    <div class="sep"></div>
                    <label for="exportJson">Mapping JSON</label>
                    <textarea id="exportJson" spellcheck="false" readonly></textarea>
                    <div class="actions">
                      <button id="btnCopyMap" type="button" class="primary">Copy mapping</button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <script>
        (function () {
          var ENDPOINT = '${RC_ENDPOINT}?action=getRecordTypes&data=' +
                         encodeURIComponent(JSON.stringify({ structureType: 'FLAT' }));
          var SELF = '${ctx.selfUrl}';

          var all = [];
          var ST = {
            recordType: '', recordLabel: '',
            json: null,      // { body:[key], sublists:[{id, fields:[key]}] }
            ns: null,        // { body:[field], sublists:[{id, editable, fields:[field]}] }
            rows: [],        // [{ src:{grp,key}, tgt:{grp,id,label,type} }]
            pendSrc: null, pendTgt: null
          };

          var el = {
            state:    document.getElementById('state'),
            picker:   document.getElementById('picker'),
            filter:   document.getElementById('filter'),
            hideSub:  document.getElementById('hideSub'),
            listMode: document.getElementById('listMode'),
            select:   document.getElementById('recordType'),
            shown:    document.getElementById('shown'),
            total:    document.getElementById('total'),
            result:   document.getElementById('result'),
            selId:    document.getElementById('selId'),
            selLabel: document.getElementById('selLabel'),
            copy:     document.getElementById('btnCopy'),
            browser:  document.getElementById('btnBrowser'),
            fields:   document.getElementById('btnFields'),
            jsonData: document.getElementById('jsonData'),
            jsonFile: document.getElementById('jsonFile'),
            jsonInfo: document.getElementById('jsonInfo'),
            next:     document.getElementById('btnNext'),
            nextHint: document.getElementById('nextHint'),
            step1:    document.getElementById('step1'),
            step3:    document.getElementById('step3'),
            nav1:     document.getElementById('stepNav1'),
            nav2:     document.getElementById('stepNav2'),
            nav3:     document.getElementById('stepNav3'),
            mapState: document.getElementById('mapState'),
            mapUi:    document.getElementById('mapUi'),
            mapMeta:  document.getElementById('mapMeta'),
            paneJson: document.getElementById('paneJson'),
            paneNs:   document.getElementById('paneNs'),
            paneMap:  document.getElementById('paneMap'),
            qJson:    document.getElementById('qJson'),
            qNs:      document.getElementById('qNs'),
            onlyInput:document.getElementById('onlyInput'),
            cntJson:  document.getElementById('cntJson'),
            cntNs:    document.getElementById('cntNs'),
            cntMap:   document.getElementById('cntMap'),
            auto:     document.getElementById('btnAuto'),
            clear:    document.getElementById('btnClear'),
            exportBtn:document.getElementById('btnExport'),
            exportBox:document.getElementById('exportBox'),
            exportJson:document.getElementById('exportJson'),
            copyMap:  document.getElementById('btnCopyMap'),
            back:     document.getElementById('btnBack')
          };

          // ===================================================================
          // BƯỚC 1: danh sách record type
          // ===================================================================
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
            ST.recordType = id;
            ST.recordLabel = '';
            if (!id) { el.result.classList.add('hide'); syncNext(); return; }
            var opt = el.select.selectedOptions[0];
            ST.recordLabel = (opt && opt.dataset.label) || id;
            el.selId.textContent = id;
            el.selLabel.textContent = ST.recordLabel;
            el.browser.href = '${RC_BROWSER}#/type=record;id=' + encodeURIComponent(id);
            el.fields.href = '${RC_ENDPOINT}?action=getRecordTypeDetail&data=' +
              encodeURIComponent(JSON.stringify({ scriptId: id, detailType: 'SS_ANALYT' }));
            el.result.classList.remove('hide');
            syncNext();
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

          // ===================================================================
          // BƯỚC 2: JSON nguồn
          // ===================================================================
          el.jsonFile.addEventListener('change', function () {
            var f = this.files && this.files[0];
            if (!f) return;
            var fr = new FileReader();
            fr.onload = function () { el.jsonData.value = String(fr.result || ''); syncNext(); };
            fr.readAsText(f);
          });
          el.jsonData.addEventListener('input', syncNext);

          /** Bóc key của JSON: key thường -> body, key có giá trị mảng object -> sublist. */
          function parseJson() {
            var raw = el.jsonData.value.trim();
            if (!raw) return { ok: false, msg: 'Chưa có dữ liệu JSON.' };
            var data;
            try { data = JSON.parse(raw); }
            catch (e) { return { ok: false, msg: 'JSON không hợp lệ: ' + e.message }; }

            var rows = (Array.isArray(data) ? data : [data]).filter(function (r) {
              return r && typeof r === 'object' && !Array.isArray(r);
            });
            if (!rows.length) return { ok: false, msg: 'JSON phải là 1 object hoặc mảng object.' };

            var body = [], seen = {}, subs = {}, subOrder = [];
            rows.forEach(function (r) {
              Object.keys(r).forEach(function (k) {
                var v = r[k];
                if (Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' && !Array.isArray(v[0])) {
                  if (!subs[k]) { subs[k] = { id: k, fields: [], seen: {} }; subOrder.push(k); }
                  v.forEach(function (line) {
                    if (!line || typeof line !== 'object') return;
                    Object.keys(line).forEach(function (sk) {
                      if (!subs[k].seen[sk]) { subs[k].seen[sk] = 1; subs[k].fields.push(sk); }
                    });
                  });
                } else if (!seen[k]) {
                  seen[k] = 1; body.push(k);
                }
              });
            });

            var sublists = subOrder.map(function (k) { return { id: k, fields: subs[k].fields }; });
            return { ok: true, rows: rows.length, json: { body: body, sublists: sublists } };
          }

          function syncNext() {
            var p = parseJson();
            if (p.ok) {
              var n = p.json.body.length;
              p.json.sublists.forEach(function (s) { n += s.fields.length; });
              el.jsonInfo.textContent = p.rows + ' dòng · ' + n + ' field · ' + p.json.sublists.length + ' sublist';
              el.jsonInfo.style.color = '';
            } else {
              el.jsonInfo.textContent = el.jsonData.value.trim() ? p.msg : '';
              el.jsonInfo.style.color = '#a1352b';
            }
            var ready = !!ST.recordType && p.ok;
            el.next.disabled = !ready;
            el.nextHint.textContent = ready
              ? 'Sẵn sàng: ' + ST.recordType
              : (!ST.recordType ? 'Chọn record type để tiếp tục.' : 'Nhập JSON hợp lệ để tiếp tục.');
            el.nav2.classList.toggle('done', p.ok);
            return ready;
          }

          // ===================================================================
          // BƯỚC 3: record.create -> metadata field -> mapping
          // ===================================================================
          el.next.addEventListener('click', function () {
            if (!syncNext()) return;
            ST.json = parseJson().json;
            ST.rows = []; ST.pendSrc = null; ST.pendTgt = null;

            el.step1.classList.add('hide');
            el.step3.classList.remove('hide');
            el.mapUi.classList.add('hide');
            el.exportBox.classList.add('hide');
            el.mapState.className = 'state';
            el.mapState.textContent = 'record.create({ type: "' + ST.recordType + '" }) - đang lấy field header & sublist...';
            el.nav1.classList.add('done'); el.nav1.classList.remove('on');
            el.nav2.classList.add('done');
            el.nav3.classList.add('on');

            fetch(SELF + '&action=meta&rt=' + encodeURIComponent(ST.recordType),
                  { credentials: 'same-origin', headers: { Accept: 'application/json' } })
              .then(function (res) { return res.text(); })
              .then(function (text) {
                var meta;
                try { meta = JSON.parse(text); }
                catch (e) { throw new Error('Suitelet không trả về JSON.'); }
                if (meta.error) throw new Error(meta.error);

                ST.ns = meta;
                var nsCount = meta.body.length;
                meta.sublists.forEach(function (s) { nsCount += s.fields.length; });
                el.mapMeta.textContent = meta.recordType + ' · ' + meta.body.length + ' field header · ' +
                                         meta.sublists.length + ' sublist · ' + nsCount + ' field' +
                                         (meta.dynamic ? '' : ' · standard mode');
                el.mapState.classList.add('hide');
                el.mapUi.classList.remove('hide');
                autoMap();
                drawAll();
              })
              .catch(function (err) {
                el.mapState.className = 'state err';
                el.mapState.textContent = 'Không lấy được field của "' + ST.recordType + '": ' + err.message;
              });
          });

          el.back.addEventListener('click', function () {
            el.step3.classList.add('hide');
            el.step1.classList.remove('hide');
            el.nav3.classList.remove('on');
            el.nav1.classList.add('on'); el.nav1.classList.remove('done');
          });

          // ---------- helper ----------
          function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
          function srcUsed(grp, key) {
            return ST.rows.some(function (r) { return r.src.grp === grp && r.src.key === key; });
          }
          function tgtUsed(grp, id) {
            return ST.rows.some(function (r) { return r.tgt.grp === grp && r.tgt.id === id; });
          }
          function nsGroups() {
            if (!ST.ns) return [];
            var g = [{ id: '', label: 'Body - ' + ST.ns.recordType, fields: ST.ns.body, editable: true }];
            ST.ns.sublists.forEach(function (s) {
              g.push({ id: s.id, label: 'Sublist: ' + s.id, fields: s.fields, editable: s.editable });
            });
            return g;
          }
          function nsField(grp, id) {
            var gs = nsGroups();
            for (var i = 0; i < gs.length; i++) {
              if (gs[i].id !== grp) continue;
              for (var j = 0; j < gs[i].fields.length; j++) if (gs[i].fields[j].id === id) return gs[i].fields[j];
            }
            return null;
          }
          function grpLabel(grp) { return grp ? grp : 'Body'; }
          function esc(s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          }

          // ---------- pane JSON ----------
          function drawJson() {
            var q = norm(el.qJson.value);
            var frag = document.createDocumentFragment();
            var total = 0, shown = 0;

            var groups = [{ id: '', label: 'Body', fields: ST.json.body }];
            ST.json.sublists.forEach(function (s) {
              groups.push({ id: s.id, label: 'Sublist: ' + s.id, fields: s.fields });
            });

            groups.forEach(function (g) {
              total += g.fields.length;
              var hits = g.fields.filter(function (k) { return !q || norm(k).indexOf(q) > -1; });
              if (!hits.length) return;

              var h = document.createElement('div');
              h.className = 'grp';
              h.innerHTML = esc(g.label) + ' <span class="tag">' + hits.length + '</span>';
              frag.appendChild(h);

              hits.forEach(function (k) {
                shown++;
                var d = document.createElement('div');
                d.className = 'fld' + (srcUsed(g.id, k) ? ' used' : '') +
                  (ST.pendSrc && ST.pendSrc.grp === g.id && ST.pendSrc.key === k ? ' sel' : '');
                d.innerHTML = '<span class="nm">' + esc(k) + '</span>';
                d.addEventListener('click', function () { pickSrc(g.id, k); });
                frag.appendChild(d);
              });
            });

            el.paneJson.innerHTML = '';
            el.paneJson.appendChild(frag);
            el.cntJson.textContent = shown + '/' + total;
          }

          // ---------- pane NetSuite ----------
          function drawNs() {
            var q = norm(el.qNs.value);
            var onlyIn = el.onlyInput.checked;
            var frag = document.createDocumentFragment();
            var total = 0, shown = 0;

            nsGroups().forEach(function (g) {
              var pool = g.fields.filter(function (f) { return !onlyIn || f.input; });
              total += pool.length;
              var hits = pool.filter(function (f) {
                return !q || norm(f.id).indexOf(q) > -1 || norm(f.label).indexOf(q) > -1;
              });
              if (!hits.length) return;

              var h = document.createElement('div');
              h.className = 'grp';
              h.innerHTML = esc(g.label) + ' <span class="tag">' + hits.length +
                            (g.editable ? '' : ' · read-only') + '</span>';
              frag.appendChild(h);

              hits.forEach(function (f) {
                shown++;
                var d = document.createElement('div');
                d.className = 'fld' + (tgtUsed(g.id, f.id) ? ' used' : '') +
                  (ST.pendTgt && ST.pendTgt.grp === g.id && ST.pendTgt.id === f.id ? ' sel' : '');
                d.innerHTML = '<span class="nm">' + esc(f.label) +
                              (f.mandatory ? ' <span class="req">*</span>' : '') + '</span>' +
                              '<span class="fid">' + esc(f.id) + ' · ' + esc(f.type || '?') + '</span>';
                d.title = f.label + ' [' + f.id + '] type=' + (f.type || '?') +
                          (f.mandatory ? ' · bắt buộc' : '') + (f.input ? '' : ' · không nhập được');
                d.addEventListener('click', function () { pickTgt(g.id, f.id); });
                frag.appendChild(d);
              });
            });

            el.paneNs.innerHTML = '';
            el.paneNs.appendChild(frag);
            el.cntNs.textContent = shown + '/' + total;
          }

          // ---------- pane mapping ----------
          function drawMap() {
            var frag = document.createDocumentFragment();

            ST.rows.forEach(function (r, i) {
              var f = nsField(r.tgt.grp, r.tgt.id);
              var srcTxt = (r.src.grp ? r.src.grp + ' : ' : '') + r.src.key;
              var tgtTxt = grpLabel(r.tgt.grp) + ' : ' + r.tgt.label;
              var d = document.createElement('div');
              d.className = 'maprow' + (f && !f.input ? ' warn' : '');
              d.innerHTML = '<span class="cell" title="' + esc(srcTxt) + '">' + esc(srcTxt) + '</span>' +
                            '<span class="arw">&#8596;</span>' +
                            '<span class="cell" title="' + esc(tgtTxt + ' [' + r.tgt.id + ']') + '">' + esc(tgtTxt) + '</span>' +
                            '<button class="del" type="button" title="Xoá">&times;</button>';
              d.querySelector('.del').addEventListener('click', function () {
                ST.rows.splice(i, 1); drawAll();
              });
              frag.appendChild(d);
            });

            // dòng đang chờ ghép + các dòng trống cho giống Import Assistant
            var blanks = Math.max(3, 12 - ST.rows.length);
            for (var b = 0; b < blanks; b++) {
              var pend = (b === 0) && (ST.pendSrc || ST.pendTgt);
              var d2 = document.createElement('div');
              d2.className = 'maprow ' + (pend ? 'pend' : 'empty');
              d2.innerHTML = '<span class="cell">' +
                    (pend && ST.pendSrc ? esc((ST.pendSrc.grp ? ST.pendSrc.grp + ' : ' : '') + ST.pendSrc.key) : '&nbsp;') +
                  '</span><span class="arw">&#8596;</span><span class="cell">' +
                    (pend && ST.pendTgt ? esc(grpLabel(ST.pendTgt.grp) + ' : ' + ST.pendTgt.id) : '&nbsp;') +
                  '</span><span></span>';
              frag.appendChild(d2);
            }

            el.paneMap.innerHTML = '';
            el.paneMap.appendChild(frag);
            el.cntMap.textContent = ST.rows.length + ' cặp';
          }

          function drawAll() { drawJson(); drawNs(); drawMap(); }

          function pickSrc(grp, key) {
            ST.pendSrc = (ST.pendSrc && ST.pendSrc.grp === grp && ST.pendSrc.key === key)
              ? null : { grp: grp, key: key };
            tryPair();
          }
          function pickTgt(grp, id) {
            ST.pendTgt = (ST.pendTgt && ST.pendTgt.grp === grp && ST.pendTgt.id === id)
              ? null : { grp: grp, id: id };
            tryPair();
          }
          function tryPair() {
            if (ST.pendSrc && ST.pendTgt) {
              addRow(ST.pendSrc.grp, ST.pendSrc.key, ST.pendTgt.grp, ST.pendTgt.id);
              ST.pendSrc = null; ST.pendTgt = null;
            }
            drawAll();
          }
          /** 1 field NetSuite chỉ nhận 1 nguồn, 1 key JSON chỉ map 1 lần. */
          function addRow(sGrp, sKey, tGrp, tId) {
            var f = nsField(tGrp, tId);
            ST.rows = ST.rows.filter(function (r) {
              return !(r.tgt.grp === tGrp && r.tgt.id === tId) && !(r.src.grp === sGrp && r.src.key === sKey);
            });
            ST.rows.push({
              src: { grp: sGrp, key: sKey },
              tgt: { grp: tGrp, id: tId, label: f ? f.label : tId, type: f ? f.type : '' }
            });
          }

          /** Map tự động theo field id, không có thì theo label (đã chuẩn hoá). */
          function autoMap() {
            var gs = nsGroups();
            function findIn(grp, key) {
              var nk = norm(key), g = null;
              for (var i = 0; i < gs.length; i++) if (gs[i].id === grp) { g = gs[i]; break; }
              if (!g) return null;
              var pool = g.fields.filter(function (f) { return f.input; });
              return pool.filter(function (f) { return norm(f.id) === nk; })[0] ||
                     pool.filter(function (f) { return norm(f.label) === nk; })[0] || null;
            }

            ST.json.body.forEach(function (k) {
              var f = findIn('', k);
              if (f && !tgtUsed('', f.id) && !srcUsed('', k)) addRow('', k, '', f.id);
            });

            ST.json.sublists.forEach(function (s) {
              var target = null;
              for (var i = 0; i < gs.length; i++) if (norm(gs[i].id) === norm(s.id)) { target = gs[i].id; break; }
              if (target === null) return;
              s.fields.forEach(function (k) {
                var f = findIn(target, k);
                if (f && !tgtUsed(target, f.id) && !srcUsed(s.id, k)) addRow(s.id, k, target, f.id);
              });
            });
          }

          el.qJson.addEventListener('input', drawJson);
          el.qNs.addEventListener('input', drawNs);
          el.onlyInput.addEventListener('change', drawNs);
          el.auto.addEventListener('click', function () { autoMap(); drawAll(); });
          el.clear.addEventListener('click', function () {
            ST.rows = []; ST.pendSrc = null; ST.pendTgt = null;
            el.exportBox.classList.add('hide');
            drawAll();
          });

          el.exportBtn.addEventListener('click', function () {
            var out = { recordType: ST.recordType, recordLabel: ST.recordLabel, body: {}, sublists: {} };
            ST.rows.forEach(function (r) {
              if (!r.tgt.grp) {
                out.body[r.tgt.id] = { jsonField: r.src.key, type: r.tgt.type, label: r.tgt.label };
              } else {
                if (!out.sublists[r.tgt.grp]) out.sublists[r.tgt.grp] = { jsonKey: r.src.grp, fields: {} };
                out.sublists[r.tgt.grp].jsonKey = r.src.grp;
                out.sublists[r.tgt.grp].fields[r.tgt.id] = { jsonField: r.src.key, type: r.tgt.type, label: r.tgt.label };
              }
            });
            el.exportJson.value = JSON.stringify(out, null, 2);
            el.exportBox.classList.remove('hide');
            el.exportJson.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });

          el.copyMap.addEventListener('click', function () {
            navigator.clipboard.writeText(el.exportJson.value).then(function () {
              el.copyMap.textContent = 'Đã copy';
              setTimeout(function () { el.copyMap.textContent = 'Copy mapping'; }, 1200);
            });
          });

          syncNext();
        })();
        </script>
        </body>
        </html>`;

    return {onRequest};
});
