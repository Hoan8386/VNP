/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/runtime', 'N/url', '../common/scv_common_input_data.js'],

    (query, runtime, url, commonData) => {

        // Escape ký tự đặc biệt để nhúng an toàn vào HTML
        const escapeHtml = (s) => String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        /**
         * Lấy danh sách subsidiary (id + name) đang active → render thành các thẻ <option>.
         * Default chọn sẵn subsidiary của user hiện tại (runtime.getCurrentUser).
         * @returns {string} chuỗi HTML các option
         */
        const getSubsidiaryOptions = () => {
            const rows = query.runSuiteQL({
                query: "select id, name from subsidiary where isinactive = 'F' order by id"
            }).asMappedResults();

            const defaultId = String(runtime.getCurrentUser().subsidiary || '');

            return rows
                .map(o => {
                    const selected = String(o.id) === defaultId ? ' selected' : '';
                    return `<option value="${escapeHtml(o.id)}"${selected}>${escapeHtml(o.name)}</option>`;
                })
                .join('');
        };

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            scriptContext.response.write({ output: buildHtml(getSubsidiaryOptions(), getProcessUrl())});
        }

        /**
         * Resolve URL của Suitelet xử lý để client gọi bằng fetch/ajax
         * @returns {string} URL của Suitelet xử lý
         */
        const getProcessUrl = () => url.resolveScript({
            scriptId: 'customscript_scv_sl_input_data_process',
            deploymentId: 'customdeploy_scv_sl_input_data_process'
        });

        const buildHtml = (subsidiaryOptions, processUrl) => `<!DOCTYPE html>
            <html lang="vi">
            <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width,initial-scale=1"/>
            <title>File Reader</title>
            <style>
            :root {
              --bg:       #f8f7f4;
              --surface:  #ffffff;
              --border:   #e2e0d8;
              --border2:  #c8c5bb;
              --text:     #1c1b18;
              --muted:    #6b6960;
              --muted2:   #a09d93;
              --accent:   #2a5bd7;
              --accent-bg:#eef2fd;
              --accent-dk:#1a3fa0;
              --green:    #0e7c5b;
              --green-bg: #e6f7f1;
              --orange:   #c45e12;
              --orange-bg:#fdf0e6;
              --purple:   #6d28d9;
              --purple-bg:#f0ebfe;
              --red:      #b91c1c;
              --red-bg:   #fef2f2;
              --radius:   10px;
              --shadow:   0 1px 4px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.05);
            }
            
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px}
            
            /* ── HEADER ── */
            .header{background:var(--surface);border-bottom:1px solid var(--border);padding:0 2rem;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:100}
            .logo{font-size:16px;font-weight:600;letter-spacing:-.3px;color:var(--text)}
            .logo span{color:var(--accent)}
            .home-link{font-size:12px;font-weight:500;color:var(--accent);text-decoration:none;padding:5px 12px;border:1px solid var(--border);border-radius:99px;background:var(--bg);transition:all .15s;white-space:nowrap}
            .home-link:hover{background:var(--accent-bg);border-color:var(--accent)}
            .supported-types{display:flex;gap:6px;flex-wrap:wrap}
            .type-pill{font-size:11px;font-weight:500;padding:3px 8px;border-radius:99px;border:1px solid var(--border);color:var(--muted);background:var(--bg);letter-spacing:.02em}
            
            /* ── LAYOUT ── */
            .layout{display:grid;grid-template-columns:320px 1fr;min-height:calc(100vh - 56px)}
            
            /* ── LEFT PANEL ── */
            .left-panel{border-right:1px solid var(--border);background:var(--surface);display:flex;flex-direction:column;overflow:hidden}
            
            .drop-zone{
              margin:1.25rem;
              border:1.5px dashed var(--border2);
              border-radius:var(--radius);
              padding:2rem 1rem;
              text-align:center;
              cursor:pointer;
              transition:all .2s;
              background:var(--bg);
            }
            .drop-zone:hover,.drop-zone.drag-over{border-color:var(--accent);background:var(--accent-bg)}
            .drop-zone input{display:none}
            .drop-icon{font-size:2rem;margin-bottom:.5rem;display:block}
            .drop-title{font-size:14px;font-weight:600;color:var(--accent);margin-bottom:.2rem}
            .drop-hint{font-size:12px;color:var(--muted2);line-height:1.6}
            
            /* ── FILE INFO ── */
            .file-info{margin:0 1.25rem 1rem;display:none;flex-direction:column;gap:8px}
            .file-card{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px}
            .file-card-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}
            .file-icon-lg{font-size:1.8rem}
            .file-meta{flex:1;min-width:0}
            .file-name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
            .file-size{font-size:11px;color:var(--muted2);margin-top:2px}
            .kind-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap}
            
            .stats-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}
            .stat-item{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:7px 10px}
            .stat-item-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}
            .stat-item-val{font-size:16px;font-weight:600;color:var(--text)}
            
            /* ── OCR SETTINGS ── */
            .ocr-settings{margin:0 1.25rem 1rem;display:none;background:var(--orange-bg);border:1px solid #f5c48a;border-radius:8px;padding:12px}
            .ocr-settings-title{font-size:12px;font-weight:600;color:var(--orange);margin-bottom:8px}
            .ocr-settings label{font-size:12px;color:var(--orange);display:block;margin-bottom:4px}
            .ocr-settings select{width:100%;font-size:12px;padding:5px 8px;border:1px solid #f5c48a;border-radius:6px;background:#fff;margin-bottom:8px;color:var(--text)}
            .ocr-settings select:last-child{margin-bottom:0}
            
            /* ── WARNINGS ── */
            .warnings-box{margin:0 1.25rem 1rem;display:none;background:var(--orange-bg);border:1px solid #f5c48a;border-radius:8px;padding:10px 12px;font-size:12px;color:var(--orange);line-height:1.7}
            
            /* ── PROGRESS ── */
            .progress-box{margin:0 1.25rem 1rem;display:none;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px}
            .progress-status{font-size:12px;color:var(--text);margin-bottom:6px;display:flex;justify-content:space-between}
            .progress-track{background:var(--bg);border-radius:99px;height:6px;overflow:hidden;margin-bottom:6px}
            .progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),#5b8ef0);border-radius:99px;transition:width .3s;width:0}
            .progress-detail{font-size:11px;color:var(--muted2)}
            
            /* OCR page previews */
            .page-previews{margin:0 1.25rem 1rem;display:none;flex-wrap:wrap;gap:6px}
            .preview-item{position:relative;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:#fff}
            .preview-item canvas{display:block;width:72px;height:auto}
            .preview-badge{position:absolute;bottom:0;left:0;right:0;font-size:9px;text-align:center;padding:2px 0;background:rgba(0,0,0,.5);color:#fff}
            .preview-badge.done{background:rgba(14,124,91,.85)}
            .preview-badge.active{background:rgba(196,94,18,.85)}
            
            /* ── RIGHT PANEL ── */
            .right-panel{display:flex;flex-direction:column;overflow:hidden}
            
            .toolbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 1.25rem;height:48px;display:none;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
            .view-tabs{display:flex;gap:2px;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:3px}
            .tab-btn{font-size:12px;padding:4px 12px;border-radius:5px;border:none;background:none;color:var(--muted);cursor:pointer;transition:all .15s;white-space:nowrap}
            .tab-btn.active{background:var(--accent);color:#fff}
            .tab-btn:not(.active):hover{background:var(--accent-bg);color:var(--accent)}
            
            .action-group{display:flex;gap:5px}
            .act-btn{font-size:12px;color:var(--accent);background:none;border:1px solid var(--border);border-radius:6px;padding:4px 10px;cursor:pointer;transition:background .15s;white-space:nowrap}
            .act-btn:hover{background:var(--accent-bg)}

            /* Report select bar */
            .report-bar{background:var(--accent-bg);border-bottom:1px solid var(--border);padding:10px 1.25rem;display:none;align-items:center;gap:10px;flex-wrap:wrap}
            .report-bar label{font-size:12px;font-weight:600;color:var(--accent-dk)}
            .report-bar .req{color:var(--red)}
            .report-bar select{font-size:13px;padding:6px 10px;border:1px solid var(--border2);border-radius:6px;background:#fff;color:var(--text);min-width:240px;outline:none}
            .report-bar select:focus{border-color:var(--accent)}
            .report-bar select.invalid{border-color:var(--red);background:var(--red-bg)}
            
            /* Search */
            .search-row{background:var(--bg);border-bottom:1px solid var(--border);padding:8px 1.25rem;display:none;gap:8px;align-items:center}
            .search-row input{flex:1;font-size:13px;padding:5px 10px;border:1px solid var(--border);border-radius:6px;outline:none;min-width:0;background:#fff}
            .search-row input:focus{border-color:var(--accent)}
            .search-count{font-size:11px;color:var(--muted);white-space:nowrap}
            
            /* Content area */
            .content-area{flex:1;overflow:hidden;position:relative}
            .view-panel{position:absolute;inset:0;overflow:auto;display:none}
            
            /* Placeholder */
            #viewPlaceholder{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--muted2)}
            #viewPlaceholder.active{display:flex}
            .placeholder-icon{font-size:3rem;opacity:.4}
            .placeholder-text{font-size:14px;text-align:center;line-height:1.6}
            .placeholder-pills{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px}
            .placeholder-pill{font-size:11px;background:var(--bg);border:1px solid var(--border);border-radius:99px;padding:3px 10px;color:var(--muted)}
            
            /* Loading overlay */
            #viewLoading{display:none;align-items:center;justify-content:center;background:var(--surface);flex-direction:column;gap:10px;color:var(--accent)}
            #viewLoading.active{display:flex}
            .spinner{width:30px;height:30px;border:2.5px solid var(--accent-bg);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
            @keyframes spin{to{transform:rotate(360deg)}}
            
            /* Error */
            #viewError{display:none;padding:2rem;flex-direction:column;align-items:center;gap:10px;color:var(--red);text-align:center}
            #viewError.active{display:flex}
            .err-icon{font-size:2rem}
            .err-msg{font-size:13px;max-width:420px;line-height:1.6;background:var(--red-bg);border:1px solid #fca5a5;border-radius:8px;padding:12px 16px}
            
            /* ── HTML RENDERED VIEW ── */
            #viewHTML{padding:2rem 2.5rem}
            #viewHTML h1{font-size:22px;font-weight:700;margin:1rem 0 .5rem;color:var(--accent-dk);line-height:1.3}
            #viewHTML h2{font-size:18px;font-weight:600;margin:.9rem 0 .4rem;color:var(--accent-dk)}
            #viewHTML h3{font-size:15px;font-weight:600;margin:.7rem 0 .35rem}
            #viewHTML h4,#viewHTML h5,#viewHTML h6{font-size:14px;font-weight:600;margin:.5rem 0 .25rem}
            #viewHTML p{margin-bottom:.7rem;line-height:1.8}
            #viewHTML strong,#viewHTML b{font-weight:600}
            #viewHTML em,#viewHTML i{font-style:italic}
            #viewHTML u{text-decoration:underline}
            #viewHTML table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:13px}
            #viewHTML th{background:var(--accent-bg);padding:7px 12px;text-align:left;font-weight:600;border:1px solid #bfdbfe;color:var(--accent-dk)}
            #viewHTML td{padding:6px 12px;border:1px solid var(--border)}
            #viewHTML tr:hover td{background:var(--bg)}
            #viewHTML ul,#viewHTML ol{padding-left:1.8rem;margin-bottom:.7rem}
            #viewHTML li{margin-bottom:.25rem;line-height:1.7}
            #viewHTML blockquote{border-left:3px solid #93c5fd;padding:.4rem 1rem;margin:.75rem 0;color:#374151;background:#f0f9ff;border-radius:0 6px 6px 0}
            #viewHTML img{max-width:100%;border-radius:6px;margin:.5rem 0}
            #viewHTML a{color:var(--accent);text-decoration:underline}
            
            /* ── PLAIN TEXT ── */
            #viewText{padding:1.5rem 2rem;font-family:'Courier New',monospace;font-size:13px;line-height:1.85;white-space:pre-wrap;color:var(--text);background:var(--bg)}
            
            /* ── XML RAW ── */
            #viewXMLRaw{padding:1.25rem 1.5rem;font-family:'Courier New',monospace;font-size:12.5px;background:#0f172a;color:#e2e8f0;line-height:1.7}
            .xml-tag{color:#7dd3fc}.xml-attr{color:#fbbf24}.xml-val{color:#86efac}.xml-comment{color:#6b7280;font-style:italic}
            
            /* ── XML TREE ── */
            #viewXMLTree{padding:1.25rem 1.5rem;font-family:'Courier New',monospace;font-size:12.5px;background:#0f172a;color:#e2e8f0;line-height:1.75}
            .xt{cursor:pointer;color:#94a3b8;user-select:none}
            .xt:hover{color:#f1f5f9}
            .xc{margin-left:1.3rem}
            .xc.collapsed{display:none}
            
            /* ── TABLE (XLSX / XML structured) ── */
            #viewTable{overflow:auto}
            #viewTable table{width:100%;border-collapse:collapse;font-size:13px}
            #viewTable th{background:var(--accent-bg);padding:8px 12px;text-align:left;font-weight:600;border-bottom:1px solid var(--border);color:var(--accent-dk);position:sticky;top:0;white-space:nowrap}
            #viewTable td{padding:7px 12px;border-bottom:1px solid var(--border);white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}
            #viewTable tr:hover td{background:var(--bg)}
            .row-num{color:var(--muted2);font-size:11px;text-align:right;user-select:none}
            
            /* Sheet tabs (XLSX) */
            .sheet-tabs{display:flex;gap:4px;padding:8px 1rem;border-bottom:1px solid var(--border);background:var(--surface);flex-wrap:wrap;display:none}
            .sheet-tab{font-size:12px;padding:4px 12px;border-radius:5px;border:1px solid var(--border);background:#fff;color:var(--muted);cursor:pointer;transition:all .15s}
            .sheet-tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}
            .sheet-tab:not(.active):hover{background:var(--accent-bg);color:var(--accent)}
            
            /* OCR page sections */
            .ocr-page-divider{display:inline-block;background:var(--orange-bg);color:var(--orange);font-size:11px;font-weight:600;padding:2px 10px;border-radius:6px;margin:1rem 0 .4rem}
            
            /* Highlights */
            mark{background:#fef08a;border-radius:2px;padding:0 1px}
            mark.cur{background:#fb923c;color:#fff}
            
            /* Error msg inline */
            .inline-err{display:none;margin:1.25rem;background:var(--red-bg);border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;color:var(--red)}
            
            @media(max-width:780px){
              .layout{grid-template-columns:1fr}
              .left-panel{border-right:none;border-bottom:1px solid var(--border)}
              .header{padding:0 1rem}
              .supported-types{display:none}
            }
            </style>
            </head>
            <body>
            
            <header class="header">
              <div style="display:flex;align-items:center;gap:14px">
                <div class="logo"><span>File Reader</span></div>
                <a href="/app/center/card.nl?sc=-29&whence=" class="home-link">🏠 Home</a>
              </div>
              <div class="supported-types">
                <span class="type-pill">DOC</span>
                <span class="type-pill">DOCX</span>
                <span class="type-pill">XLS</span>
                <span class="type-pill">XLSX</span>
                <span class="type-pill">PDF</span>
                <span class="type-pill">PDF Scan</span>
                <span class="type-pill">XML</span>
              </div>
            </header>
            
            <div class="layout">
            
              <!-- ══ LEFT PANEL ══ -->
              <div class="left-panel">
            
                <!-- Drop zone -->
                <div class="drop-zone" id="dropZone">
                  <span class="drop-icon">📂</span>
                  <div class="drop-title">Chọn hoặc kéo thả file</div>
                  <div class="drop-hint">.doc · .docx · .xls · .xlsx<br>.pdf · .pdf scan · .xml</div>
                  <input type="file" id="fileInput" accept=".doc,.docx,.xls,.xlsx,.pdf,.xml"/>
                </div>
            
                <!-- OCR settings (chỉ hiện khi detect PDF scan) -->
                <div class="ocr-settings" id="ocrSettings">
                  <div class="ocr-settings-title">⚙️ Cài đặt OCR (PDF Scan)</div>
                  <label>Ngôn ngữ nhận dạng</label>
                  <select id="ocrLang">
                    <option value="vie">Tiếng Việt</option>
                    <option value="eng">English</option>
                    <option value="vie+eng">Việt + English</option>
                    <option value="chi_sim">Tiếng Trung</option>
                    <option value="jpn">Tiếng Nhật</option>
                  </select>
                  <label>Độ phân giải render</label>
                  <select id="ocrScale">
                    <option value="2">Trung bình (×2)</option>
                    <option value="3" selected>Cao (×3) — khuyến nghị</option>
                    <option value="4">Rất cao (×4)</option>
                  </select>
                </div>
            
                <!-- Progress -->
                <div class="progress-box" id="progressBox">
                  <div class="progress-status">
                    <span id="progressStatus">Đang xử lý...</span>
                    <span id="progressPct">0%</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
                  <div class="progress-detail" id="progressDetail"></div>
                </div>
            
                <!-- OCR page previews -->
                <div class="page-previews" id="pagePreviews"></div>
            
                <!-- File info -->
                <div class="file-info" id="fileInfo">
                  <div class="file-card">
                    <div class="file-card-top">
                      <span class="file-icon-lg" id="fileIconLg">📄</span>
                      <div class="file-meta">
                        <div class="file-name" id="fileName">—</div>
                        <div class="file-size" id="fileSize">—</div>
                      </div>
                      <span class="kind-badge" id="kindBadge">—</span>
                    </div>
                    <div class="stats-row" id="statsRow"></div>
                  </div>
                </div>
            
                <!-- Warnings -->
                <div class="warnings-box" id="warningsBox"></div>
            
                <!-- Inline error -->
                <div class="inline-err" id="inlineErr"></div>
            
              </div>
            
              <!-- ══ RIGHT PANEL ══ -->
              <div class="right-panel">

                <!-- Report type selector -->
                <div class="report-bar" id="reportBar">
                  <label for="reportType">Loại báo cáo <span class="req">*</span></label>
                  <select id="reportType" onchange="this.classList.remove('invalid')">
                    <option value="">-- Chọn loại báo cáo --</option>
                    <option value="bc_1">Báo cáo lưu chuyển tiền tệ trực tiếp</option>
                    <option value="bc_2">Báo cáo lưu chuyển tiền tệ gián tiếp</option>
                    <option value="bc_3">BS Report</option>
                    <option value="bc_4">PL Report</option>
                    <option value="bc_5">BẢNG THUYẾT MINH BÁO CÁO TÀI CHÍNH</option>
                    <option value="bc_6">BẢNG THUYẾT MINH BÁO CÁO TÀI CHÍNH Word</option>
                  </select>

                  <label for="subsidiary">Subsidiary <span class="req">*</span></label>
                  <select id="subsidiary" onchange="this.classList.remove('invalid')">
                    <option value="">-- Chọn subsidiary --</option>
                    ${subsidiaryOptions}
                  </select>
                </div>

                <!-- Toolbar -->
                <div class="toolbar" id="toolbar">
                  <div class="view-tabs" id="viewTabs"></div>
                  <div class="action-group">
                    <button className="act-btn" onClick="toggleSearch()">🔍</button>
                    <button className="act-btn" id="copyBtn" onClick="copyContent()">Sao chép</button>
                    <button className="act-btn" id="downloadBtn" onClick="downloadContent()">Tải xuống</button>
                    <button className="act-btn" id="jsonBtn" onClick="downloadJSON()">Tải JSON</button>
                    <button className="act-btn" id="postDataBtn" onClick="postData()">Post Data</button>
                  </div>
                </div>
            
                <!-- Sheet tabs for XLSX -->
                <div class="sheet-tabs" id="sheetTabs"></div>
            
                <!-- Search -->
                <div class="search-row" id="searchRow">
                  <input id="searchInput" placeholder="Tìm trong nội dung..." oninput="doSearch()" onkeydown="if(event.key==='Enter')navSearch(1)"/>
                  <span class="search-count" id="searchCount"></span>
                  <button class="act-btn" onclick="navSearch(-1)">▲</button>
                  <button class="act-btn" onclick="navSearch(1)">▼</button>
                  <button class="act-btn" onclick="clearSearch()">✕</button>
                </div>
            
                <!-- Content area -->
                <div class="content-area">
            
                  <div class="view-panel active" id="viewPlaceholder">
                    <span class="placeholder-icon">📂</span>
                    <div class="placeholder-text">Chọn file để bắt đầu đọc nội dung<br><span style="font-size:12px;color:var(--muted2)">Tất cả xử lý diễn ra ngay trên trình duyệt của bạn</span></div>
                    <div class="placeholder-pills">
                      <span class="placeholder-pill">DOC / DOCX</span>
                      <span class="placeholder-pill">XLS / XLSX</span>
                      <span class="placeholder-pill">PDF</span>
                      <span class="placeholder-pill">PDF Scan (OCR)</span>
                      <span class="placeholder-pill">XML</span>
                    </div>
                  </div>
            
                  <div class="view-panel" id="viewLoading">
                    <div class="spinner"></div>
                    <span id="loadingMsg" style="font-size:13px;color:var(--muted)">Đang xử lý file...</span>
                  </div>
            
                  <div class="view-panel" id="viewError">
                    <span class="err-icon">⚠️</span>
                    <div class="err-msg" id="errMsgText"></div>
                  </div>
            
                  <div class="view-panel" id="viewHTML"></div>
                  <div class="view-panel" id="viewText"></div>
                  <div class="view-panel" id="viewTable"></div>
                  <div class="view-panel" id="viewXMLRaw"></div>
                  <div class="view-panel" id="viewXMLTree"></div>
            
                </div>
              </div>
            </div>
            
            <!-- External libraries -->
            <script src="https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
            
            <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            // Loại file — lấy từ scv_common_input_data (FileKind), inject từ server
            const FileKind = ${JSON.stringify(commonData.FileKind)};

            // ═══════════════════════════════════════════════════
            // STATE
            // ═══════════════════════════════════════════════════
            const S = {
              mode: null, kind: null,
              rawHTML: '', rawText: '', rawXML: '',
              xlsxWB: null, xlsxSheet: null,
              xmlDoc: null, xmlDoc_treeHTML: '', xmlDoc_rawHTML: '',
              filename: 'file',
              matches: [], matchIdx: -1
            };
            
            const $ = id => document.getElementById(id);
            const VIEWS = ['viewPlaceholder','viewLoading','viewError','viewHTML','viewText','viewTable','viewXMLRaw','viewXMLTree'];
            
            // ═══════════════════════════════════════════════════
            // DRAG & DROP
            // ═══════════════════════════════════════════════════
            const dz = $('dropZone');
            dz.addEventListener('click', () => $('fileInput').click());
            dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
            dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
            dz.addEventListener('drop', e => {
              e.preventDefault(); dz.classList.remove('drag-over');
              const f = e.dataTransfer.files[0]; if (f) dispatch(f);
            });
            $('fileInput').addEventListener('change', e => { if (e.target.files[0]) dispatch(e.target.files[0]); });
            
            // ═══════════════════════════════════════════════════
            // DISPATCHER
            // ═══════════════════════════════════════════════════
            async function dispatch(file) {
              resetUI();
              S.filename = file.name.replace(/\\.[^.]+$/, '');
              const n = file.name.toLowerCase();
            
              try {
                if      (n.endsWith('.docx') || n.endsWith('.doc'))       await readWord(file);
                else if (n.endsWith('.xlsx') || n.endsWith('.xls'))       await readXLSX(file);
                else if (n.endsWith('.pdf'))                               await readPDF(file);
                else if (n.endsWith('.xml'))                               await readXML(file);
                else throw new Error(\`Định dạng "\${file.name}" chưa được hỗ trợ.\\nChấp nhận: .doc .docx .xls .xlsx .pdf .xml\`);
              } catch(e) {
                showErr(e.message || String(e));
              }
            }
            
            // ═══════════════════════════════════════════════════
            // READER A: DOC / DOCX  — mammoth.js
            // ═══════════════════════════════════════════════════
            async function readWord(file) {
              showLoading('Đang đọc tài liệu Word...');
              const ab = await file.arrayBuffer();
              const [hr, tr] = await Promise.all([
                mammoth.convertToHtml({ arrayBuffer: ab }),
                mammoth.extractRawText({ arrayBuffer: ab })
              ]);
              S.kind    = FileKind.WORD;
              S.rawHTML = hr.value;
              S.rawText = tr.value;
            
              const warns = (hr.messages||[]).filter(m=>m.type==='warning').map(m=>m.message);
              if (warns.length) showWarning(warns.map(w=>'• '+w).join('<br>'));
            
              const words  = S.rawText.trim().split(/\\s+/).filter(Boolean).length;
              const chars  = S.rawText.replace(/\\s/g,'').length;
              const paras  = (S.rawHTML.match(/<p[\\s>]/gi)||[]).length;
              const tables = (S.rawHTML.match(/<table[\\s>]/gi)||[]).length;
            
              setFileInfo('📝', file.name, file.size, 'DOCX', '#dbeafe', '#1d4ed8');
              setStats([['Số từ',words],['Số ký tự',chars],['Đoạn văn',paras],['Bảng biểu',tables]]);
            
              $('viewHTML').innerHTML = S.rawHTML || '<p style="color:var(--muted2);padding:2rem">Tài liệu không có nội dung.</p>';
              $('viewText').textContent = S.rawText;
            
              buildTabs([{id:'html',label:'📄 Văn bản'},{id:'text',label:'🔤 Plain Text'}]);
              switchView('html');
            }
            
            // ═══════════════════════════════════════════════════
            // READER B: XLS / XLSX  — SheetJS
            // ═══════════════════════════════════════════════════
            async function readXLSX(file) {
              showLoading('Đang đọc file Excel...');
              const ab   = await file.arrayBuffer();
              const wb   = XLSX.read(new Uint8Array(ab), { type:'array' });
              S.kind     = FileKind.XLSX;
              S.xlsxWB   = wb;
            
              const names = wb.SheetNames;
              setFileInfo('📊', file.name, file.size, file.name.endsWith('.xlsx')?'XLSX':'XLS', '#d1fae5', '#065f46');
            
              // Build sheet tabs
              const tabsEl = $('sheetTabs');
              tabsEl.innerHTML = '';
              names.forEach((name, i) => {
                const btn = document.createElement('button');
                btn.className   = 'sheet-tab' + (i===0?' active':'');
                btn.textContent = name;
                btn.onclick     = () => { document.querySelectorAll('.sheet-tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderSheet(name); };
                tabsEl.appendChild(btn);
              });
              if (names.length > 1) tabsEl.style.display = 'flex';
            
              setStats([['Sheets', names.length],['','']]);
              buildTabs([{id:'table',label:'📊 Bảng dữ liệu'},{id:'text',label:'🔤 CSV Text'}]);
              renderSheet(names[0]);
              switchView('table');
            }
            
            function renderSheet(name) {
              S.xlsxSheet = name;
              const sheet = S.xlsxWB.Sheets[name];
              const rows  = XLSX.utils.sheet_to_json(sheet, { header:1, defval:'' });
            
              if (!rows || rows.length < 2) {
                $('viewTable').innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted2)">Sheet này không có dữ liệu.</div>';
                setStats([['Dòng',0],['Cột',0]]);
                S.rawText = '';
                return;
              }
            
              const headers = rows[0];
              const data    = rows.slice(1).filter(r => r.some(v => v !== ''));
            
              setStats([['Dòng',data.length],['Cột',headers.length]]);
              S.rawText = XLSX.utils.sheet_to_csv(sheet);
            
              let html = '<table><thead><tr><th class="row-num">#</th>';
              headers.forEach(h => { html += \`<th>\${esc(String(h||''))}</th>\`; });
              html += '</tr></thead><tbody>';
              data.forEach((row, i) => {
                html += \`<tr><td class="row-num">\${i+1}</td>\`;
                headers.forEach((_, j) => { html += \`<td>\${esc(String(row[j]!==undefined?row[j]:''))}</td>\`; });
                html += '</tr>';
              });
              html += '</tbody></table>';
              $('viewTable').innerHTML = html;
            }
            
            // ═══════════════════════════════════════════════════
            // READER C: PDF  — detect text vs scan
            // ═══════════════════════════════════════════════════
            async function readPDF(file) {
              showLoading('Đang phân tích file PDF...');
              const ab  = await file.arrayBuffer();
              const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
            
              // Kiểm tra xem có text layer không (thử 3 trang đầu)
              let totalTextLen = 0;
              const checkPages = Math.min(pdf.numPages, 3);
              for (let i = 1; i <= checkPages; i++) {
                const pg  = await pdf.getPage(i);
                const tc  = await pg.getTextContent();
                totalTextLen += tc.items.map(it=>it.str).join('').trim().length;
              }
            
              const isTextPDF = totalTextLen > 30;
            
              if (isTextPDF) {
                await readPDFText(file, pdf, ab);
              } else {
                // Hiện OCR settings, tự động chạy OCR
                $('ocrSettings').style.display = 'block';
                await readPDFOCR(file, pdf);
              }
            }
            
            // ── PDF với text layer ──
            async function readPDFText(file, pdf, ab) {
              showLoading('Đang trích xuất text từ PDF...');
              S.kind = FileKind.PDF_TEXT;
            
              const totalPages = pdf.numPages;
              const pageTexts  = [];
            
              for (let i = 1; i <= totalPages; i++) {
                setProgress(Math.round((i/totalPages)*90), \`Đang đọc trang \${i}/\${totalPages}...\`);
                const pg = await pdf.getPage(i);
                const tc = await pg.getTextContent();
                pageTexts.push(tc.items.map(it=>it.str).join(' '));
              }
            
              S.rawText = pageTexts.join('\\n\\n');
              S.rawHTML = pageTexts.map((t, i) =>
                \`<div class="ocr-page-divider">Trang \${i+1}</div><p>\${esc(t).replace(/\\n/g,'<br>')}</p>\`
              ).join('');
            
              setProgress(100, 'Hoàn tất');
              setFileInfo('📄', file.name, file.size, 'PDF', '#ede9fe', '#6d28d9');
              setStats([['Trang', totalPages],['Ký tự', S.rawText.replace(/\\s/g,'').length]]);
            
              $('viewHTML').innerHTML = S.rawHTML;
              $('viewText').textContent = S.rawText;
            
              buildTabs([{id:'html',label:'📄 Nội dung'},{id:'text',label:'🔤 Plain Text'}]);
              setTimeout(()=>$('progressBox').style.display='none', 1500);
              switchView('html');
            }
            
            // ── PDF scan — OCR ──
            async function readPDFOCR(file, pdf) {
              showLoading('Đang khởi tạo OCR...');
              S.kind = FileKind.PDF_OCR;
              const totalPages = pdf.numPages;
              const lang       = $('ocrLang').value;
              const scale      = parseInt($('ocrScale').value);
              const startTime  = Date.now();
            
              setFileInfo('📷', file.name, file.size, 'PDF Scan', '#fdf0e6', '#c45e12');
            
              // Page previews
              const previewsEl = $('pagePreviews');
              previewsEl.style.display = 'flex';
              const previewItems = [];
              for (let i = 1; i <= totalPages; i++) {
                const item = document.createElement('div');
                item.className = 'preview-item';
                item.innerHTML = \`<canvas></canvas><div class="preview-badge" id="pb\${i}">Trang \${i}</div>\`;
                previewsEl.appendChild(item);
                previewItems.push(item);
              }
            
              setProgress(5, 'Đang tải model ngôn ngữ...');
            
              const worker = await Tesseract.createWorker(lang, 1, {
                logger: m => {
                  if (m.status === 'loading language traineddata') setProgress(15, 'Đang tải language model...');
                  if (m.status === 'initialized api') setProgress(25, 'Sẵn sàng nhận dạng!');
                }
              });
            
              const allPages = [];
              show('viewHTML'); // stream kết quả từng trang
              $('viewHTML').innerHTML = '';
              $('toolbar').style.display = 'flex';
              buildTabs([{id:'html',label:'📄 Nội dung'},{id:'text',label:'🔤 Plain Text'}]);
            
              for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const badge = $(\`pb\${pageNum}\`);
                badge.className = 'preview-badge active';
                badge.textContent = '⏳';
            
                // Render page → canvas
                const page     = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                const canvas   = previewItems[pageNum-1].querySelector('canvas');
                canvas.width   = viewport.width;
                canvas.height  = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            
                const pct = 25 + Math.round(((pageNum-1)/totalPages)*70);
                setProgress(pct, \`OCR trang \${pageNum}/\${totalPages}...\`);
            
                const { data: { text } } = await worker.recognize(canvas);
                const trimmed = text.trim();
                allPages.push({ page: pageNum, text: trimmed });
            
                // Stream vào view ngay
                const divider = document.createElement('span');
                divider.className = 'ocr-page-divider';
                divider.textContent = \`Trang \${pageNum}\`;
                $('viewHTML').appendChild(divider);
                const p = document.createElement('p');
                p.style.cssText = 'margin:.4rem 0 1.2rem;line-height:1.9;padding:0 2.5rem';
                p.textContent = trimmed || '(Không nhận dạng được nội dung trang này)';
                $('viewHTML').appendChild(p);
                $('viewHTML').scrollTop = $('viewHTML').scrollHeight;
            
                badge.className = 'preview-badge done';
                badge.textContent = \`✓ \${pageNum}\`;
              }
            
              await worker.terminate();
            
              S.rawHTML = $('viewHTML').innerHTML;
              S.rawText = allPages.map(p => p.text).join('\\n\\n');
              $('viewText').textContent = S.rawText;
            
              const elapsed = ((Date.now()-startTime)/1000).toFixed(1);
              const chars   = S.rawText.replace(/\\s/g,'').length;
              setStats([['Trang',totalPages],['Ký tự',chars],['Thời gian',elapsed+'s'],['Ngôn ngữ',lang]]);
              setProgress(100, \`✅ Hoàn tất! \${totalPages} trang · \${elapsed}s\`);
              setTimeout(()=>{ $('progressBox').style.display='none'; $('loadingMsg') }, 2000);
              switchView('html');
            }
            
            // ═══════════════════════════════════════════════════
            // READER D: XML
            // ═══════════════════════════════════════════════════
            async function readXML(file) {
              showLoading('Đang phân tích XML...');
              const text   = await file.text();
              S.rawXML     = text;
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(text, 'application/xml');
              const err    = xmlDoc.querySelector('parsererror');
              if (err) throw new Error('XML không hợp lệ: ' + err.textContent.slice(0,200));
              S.xmlDoc = xmlDoc;
            
              // Nhận dạng Word XML
              const rootTag = xmlDoc.documentElement.tagName;
              const isWordXML = rootTag.includes('wordDocument') || rootTag.includes('w:wordDocument')
                || text.includes('schemas.openxmlformats.org/wordprocessingml')
                || text.includes('schemas.microsoft.com/office/word');
            
              // Stats
              let elems=0, attrs=0, txts=0;
              (function walk(n){
                if(n.nodeType===1){elems++;attrs+=n.attributes.length}
                if(n.nodeType===3&&n.nodeValue.trim())txts++;
                n.childNodes.forEach(walk);
              })(xmlDoc.documentElement);
            
              if (isWordXML) {
                S.kind = FileKind.WORD_XML;
                setFileInfo('📋', file.name, file.size, 'Word XML', '#ede9fe', '#6d28d9');
                showWarning('ℹ️ File này là <strong>Word XML (WordprocessingML)</strong> — đã trích xuất văn bản từ thẻ <code>&lt;w:t&gt;</code>.');
                parseWordXML(xmlDoc);
                setStats([['Đoạn văn',elems],['Thuộc tính',attrs],['','']]);
                buildTabs([{id:'html',label:'📄 Văn bản'},{id:'text',label:'🔤 Plain Text'},{id:'xmlraw',label:'🧬 Raw XML'},{id:'xmltree',label:'🌳 XML Tree'}]);
                switchView('html');
              } else {
                S.kind = FileKind.XML;
                setFileInfo('🧬', file.name, file.size, 'XML', '#d1fae5', '#065f46');
                S.rawText = extractAllText(xmlDoc.documentElement).trim();
                $('viewText').textContent = S.rawText;
                renderXMLRaw(text);
                renderXMLTree(xmlDoc);
            
                const tableData = tryParseXMLTable(xmlDoc);
                const tabs = [{id:'xmltree',label:'🌳 XML Tree'},{id:'xmlraw',label:'🧬 Raw XML'},{id:'text',label:'🔤 Text'}];
                if (tableData) { renderXMLTable(tableData); tabs.unshift({id:'table',label:'📊 Bảng dữ liệu'}); }
                setStats([['Phần tử',elems],['Thuộc tính',attrs],['Text nodes',txts],['Ký tự',S.rawText.replace(/\\s/g,'').length]]);
                buildTabs(tabs);
                switchView(tableData ? 'table' : 'xmltree');
              }
            }
            
            function parseWordXML(xmlDoc) {
              const paras  = xmlDoc.querySelectorAll('w\\\\:p, p');
              let html = '', lines = [];
              paras.forEach(para => {
                const styleEl = para.querySelector('w\\\\:pStyle, pStyle');
                const style   = styleEl ? (styleEl.getAttribute('w:val')||styleEl.getAttribute('val')||'') : '';
                const hMatch  = style.match(/^[Hh]eading(\\d)/);
                const runs    = para.querySelectorAll('w\\\\:r, r');
                let lt='', lh='';
                runs.forEach(run => {
                  run.querySelectorAll('w\\\\:t, t').forEach(t => {
                    const txt  = t.textContent||'';
                    const bold = run.querySelector('w\\\\:b, b')!==null;
                    const ital = run.querySelector('w\\\\:i, i')!==null;
                    let seg    = esc(txt);
                    if(bold)seg=\`<strong>\${seg}</strong>\`;
                    if(ital)seg=\`<em>\${seg}</em>\`;
                    lt+=txt; lh+=seg;
                  });
                });
                if (!lt.trim()) { html+='<p></p>'; lines.push(''); return; }
                if (hMatch) { const lv=Math.min(parseInt(hMatch[1]),6); html+=\`<h\${lv}>\${lh}</h\${lv}>\`; }
                else html+=\`<p>\${lh}</p>\`;
                lines.push(lt);
              });
              // tables
              xmlDoc.querySelectorAll('w\\\\:tbl, tbl').forEach(tbl => {
                let th='<table>';
                tbl.querySelectorAll('w\\\\:tr, tr').forEach((row,ri) => {
                  th+='<tr>';
                  row.querySelectorAll('w\\\\:tc, tc').forEach(cell => {
                    const ct = Array.from(cell.querySelectorAll('w\\\\:t, t')).map(t=>t.textContent).join('');
                    th += ri===0?\`<th>\${esc(ct)}</th>\`:\`<td>\${esc(ct)}</td>\`;
                  });
                  th+='</tr>';
                });
                th+='</table>'; html+=th;
              });
              S.rawHTML = html;
              S.rawText = lines.join('\\n');
              $('viewHTML').innerHTML = html;
              $('viewText').textContent = S.rawText;
              renderXMLRaw(S.rawXML);
              renderXMLTree(S.xmlDoc);
            }
            
            function renderXMLRaw(xmlText) {
              const h = xmlText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/(&lt;!--([\\s\\S]*?)--&gt;)/g,'<span class="xml-comment">$1</span>')
                .replace(/(&lt;\\/?)([\\w:\\-\\.]+)([\\s\\S]*?)(&gt;)/g,(m,open,tag,attrs,close)=>{
                  const ah = attrs.replace(/([\\w:\\-\\.]+)=(&quot;|&apos;)([\\s\\S]*?)\\2/g,
                    '<span class="xml-attr">$1</span>=<span class="xml-val">$2$3$2</span>');
                  return \`\${open}<span class="xml-tag">\${tag}</span>\${ah}\${close}\`;
                });
              $('viewXMLRaw').innerHTML = h;
            }
            
            function renderXMLTree(xmlDoc) {
              $('viewXMLTree').innerHTML = '<div style="padding:1.25rem">' + buildTree(xmlDoc.documentElement) + '</div>';
            }
            
            function buildTree(node) {
              if (node.nodeType===3) { const t=node.nodeValue.trim(); return t?\`<span class="xml-text">\${esc(t)}</span>\`:''; }
              if (node.nodeType===8) return \`<div><span class="xml-comment">&lt;!-- \${esc(node.nodeValue)} --&gt;</span></div>\`;
              if (node.nodeType!==1) return '';
              const tag   = node.tagName;
              const attrs = Array.from(node.attributes).map(a=>\` <span class="xml-attr">\${esc(a.name)}</span>=<span class="xml-val">"\${esc(a.value)}"</span>\`).join('');
              const kids  = Array.from(node.childNodes).map(buildTree).join('');
              const hasEl = Array.from(node.childNodes).some(c=>c.nodeType===1);
              const uid   = 'x'+Math.random().toString(36).slice(2,7);
              if (!kids.trim()) return \`<div><span class="xml-tag">&lt;\${esc(tag)}\${attrs}/&gt;</span></div>\`;
              if (!hasEl) return \`<div><span class="xml-tag">&lt;\${esc(tag)}\${attrs}&gt;</span>\${kids}<span class="xml-tag">&lt;/\${esc(tag)}&gt;</span></div>\`;
              return \`<div><span class="xt" onclick="tgl('\${uid}')">▼</span> <span class="xml-tag">&lt;\${esc(tag)}\${attrs}&gt;</span><div class="xc" id="\${uid}">\${kids}</div><span class="xml-tag">&lt;/\${esc(tag)}&gt;</span></div>\`;
            }
            
            window.tgl = uid => {
              const el = document.getElementById(uid);
              const btn = el?.previousElementSibling?.previousElementSibling;
              if (!el) return;
              el.classList.toggle('collapsed');
              if (btn?.classList.contains('xt')) btn.textContent = el.classList.contains('collapsed') ? '▶' : '▼';
            };
            
            function tryParseXMLTable(xmlDoc) {
              const root = xmlDoc.documentElement;
              let elements = Array.from(root.children);
              if (elements.length < 2) {
                const grand = Array.from(root.firstElementChild?.children||[]);
                if (grand.length < 2) return null;
                elements = [];
                Array.from(root.children).forEach(c=>elements.push(...Array.from(c.children)));
              }
              const firstTag = elements[0]?.tagName;
              if (!elements.every(e=>e.tagName===firstTag)) return null;
              const keySet = new Set();
              elements.forEach(el=>{
                Array.from(el.attributes).forEach(a=>keySet.add('@'+a.name));
                Array.from(el.children).forEach(c=>keySet.add(c.tagName));
                if (!el.children.length&&el.textContent.trim()) keySet.add('#text');
              });
              const keys = Array.from(keySet);
              if (!keys.length) return null;
              const rows = elements.map(el=>{
                const row={_tag:el.tagName};
                keys.forEach(k=>{
                  if(k.startsWith('@')) row[k]=el.getAttribute(k.slice(1))||'';
                  else if(k==='#text') row[k]=el.textContent.trim();
                  else { const c=el.querySelector(k); row[k]=c?c.textContent.trim():''; }
                });
                return row;
              });
              return { columns:['_tag',...keys], rows };
            }
            
            function renderXMLTable(td) {
              const {columns,rows}=td;
              let html='<table><thead><tr><th class="row-num">#</th>';
              columns.forEach(c=>{html+=\`<th>\${esc(c)}</th>\`;});
              html+='</tr></thead><tbody>';
              rows.forEach((row,i)=>{
                html+=\`<tr><td class="row-num">\${i+1}</td>\`;
                columns.forEach(c=>{html+=\`<td>\${esc(String(row[c]||''))}</td>\`;});
                html+='</tr>';
              });
              html+='</tbody></table>';
              $('viewTable').innerHTML=html;
            }
            
            // ═══════════════════════════════════════════════════
            // VIEW MANAGEMENT
            // ═══════════════════════════════════════════════════
            function buildTabs(tabs) {
              const el = $('viewTabs');
              el.innerHTML='';
              tabs.forEach(t=>{
                const btn=document.createElement('button');
                btn.className='tab-btn'; btn.dataset.view=t.id; btn.textContent=t.label;
                btn.onclick=()=>switchView(t.id);
                el.appendChild(btn);
              });
            }
            
            function switchView(mode) {
              S.mode=mode; clearSearch();
              VIEWS.forEach(id=>$(id).style.display='none');
              document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));

              const map = {
                html:'viewHTML', text:'viewText', table:'viewTable',
                xmlraw:'viewXMLRaw', xmltree:'viewXMLTree'
              };
              const target = map[mode];
              if (target) $(target).style.display='block';
              $('toolbar').style.display='flex';
              $('reportBar').style.display='flex';

              // Sau khi đọc file xong, default Loại báo cáo theo nội dung (chỉ chạy 1 lần/file)
              if (!S.reportAutoSet) { autoSelectReportType(); S.reportAutoSet = true; }
            }
            
            function show(id) {
              VIEWS.forEach(v=>$(v).style.display='none');
              $(id).style.display='block';
              $('toolbar').style.display='flex';
            }
            
            // ═══════════════════════════════════════════════════
            // SEARCH
            // ═══════════════════════════════════════════════════
            window.toggleSearch = function() {
              const sr=$('searchRow');
              sr.style.display = sr.style.display==='flex'?'none':'flex';
              if (sr.style.display==='flex') $('searchInput').focus();
              else clearSearch();
            };
            
            window.doSearch = function() {
              const q=$('searchInput').value.trim();
              if (!q) { clearSearch(); return; }
              restoreView();
              const el=getActiveEl();
              if(!el) return;
              const re=new RegExp(q.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&'),'gi');
              if(S.mode==='text'||S.mode==='xmlraw'||S.mode==='xmltree'||S.mode==='table'){
                el.innerHTML=(el.innerHTML||el.textContent).replace(re,'<mark>$1</mark>'.replace('$1','$&'));
              } else {
                hlElement(el,q);
              }
              S.matches=Array.from(el.querySelectorAll('mark'));
              S.matchIdx=S.matches.length>0?0:-1;
              updateNav(); if(S.matchIdx>=0) scrollTo(S.matchIdx);
            };
            
            window.navSearch = function(dir) {
              if(!S.matches.length)return;
              S.matches[S.matchIdx]?.classList.remove('cur');
              S.matchIdx=(S.matchIdx+dir+S.matches.length)%S.matches.length;
              scrollTo(S.matchIdx); updateNav();
            };
            
            function scrollTo(i){const m=S.matches[i];if(m){m.classList.add('cur');m.scrollIntoView({block:'center',behavior:'smooth'});}}
            function updateNav(){$('searchCount').textContent=S.matches.length>0?\`\${S.matchIdx+1}/\${S.matches.length}\`:'Không tìm thấy';}
            
            window.clearSearch = function() {
              $('searchInput').value=''; $('searchCount').textContent='';
              restoreView(); S.matches=[]; S.matchIdx=-1;
            };
            
            function restoreView(){
              switch(S.mode){
                case 'html':    $('viewHTML').innerHTML=S.rawHTML; break;
                case 'text':    $('viewText').textContent=S.rawText; break;
                case 'xmlraw':  renderXMLRaw(S.rawXML); break;
                case 'xmltree': if(S.xmlDoc)renderXMLTree(S.xmlDoc); break;
              }
            }
            
            function getActiveEl(){
              const map={html:'viewHTML',text:'viewText',table:'viewTable',xmlraw:'viewXMLRaw',xmltree:'viewXMLTree'};
              return $(map[S.mode]);
            }
            
            function hlElement(el,q){
              const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
              const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);
              const re=new RegExp(q.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&'),'gi');
              nodes.forEach(tn=>{
                if(!re.test(tn.nodeValue))return; re.lastIndex=0;
                const frag=document.createDocumentFragment();let li=0,m;
                while((m=re.exec(tn.nodeValue))!==null){
                  frag.appendChild(document.createTextNode(tn.nodeValue.slice(li,m.index)));
                  const mk=document.createElement('mark');mk.textContent=m[0];frag.appendChild(mk);
                  li=m.index+m[0].length;
                }
                frag.appendChild(document.createTextNode(tn.nodeValue.slice(li)));
                tn.parentNode.replaceChild(frag,tn);
              });
            }
            
            // ═══════════════════════════════════════════════════
            // COPY / DOWNLOAD
            // ═══════════════════════════════════════════════════
            window.copyContent = function() {
              const text = S.mode==='xmlraw' ? S.rawXML : S.rawText;
              navigator.clipboard.writeText(text||'').then(()=>{
                const b=$('copyBtn'); b.textContent='Đã sao chép ✓';
                setTimeout(()=>b.textContent='Sao chép',2000);
              });
            };
            
            window.downloadContent = function() {
              const isXML  = S.mode==='xmlraw';
              const isCSV  = S.kind===FileKind.XLSX;
              const content= isXML ? S.rawXML : S.rawText;
              const ext    = isXML?'.xml': isCSV?'.csv':'.txt';
              const blob   = new Blob([content],{type:'text/plain;charset=utf-8'});
              const a      = document.createElement('a');
              a.href=URL.createObjectURL(blob); a.download=S.filename+ext; a.click();
              URL.revokeObjectURL(a.href);
            };

            window.downloadJSON = function() {
              const data = buildJSONData();
              const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json;charset=utf-8'});
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob); a.download = S.filename + '.json'; a.click();
              URL.revokeObjectURL(a.href);
              const b = $('jsonBtn'); if (b) { b.textContent = 'Đã tải ✓'; setTimeout(()=>b.textContent='Tải JSON', 2000); }
            };

            window.postData = function() {
              const b = $('postDataBtn');

              // Validate: bắt buộc chọn loại báo cáo
              const reportEl = $('reportType');
              const reportType = reportEl ? reportEl.value : '';
              if (!reportType) {
                if (reportEl) { reportEl.classList.add('invalid'); reportEl.focus(); }
                alert('Vui lòng chọn loại báo cáo trước khi post dữ liệu.');
                return;
              }
              if (reportEl) reportEl.classList.remove('invalid');

              // Validate: bắt buộc chọn subsidiary
              const subEl = $('subsidiary');
              const subsidiary = subEl ? subEl.value : '';
              if (!subsidiary) {
                if (subEl) { subEl.classList.add('invalid'); subEl.focus(); }
                alert('Vui lòng chọn subsidiary trước khi post dữ liệu.');
                return;
              }
              if (subEl) subEl.classList.remove('invalid');

              const data = buildJSONData();

              // Disable nút trước khi post để tránh bấm nhiều lần
              if (b) { b.disabled = true; b.style.opacity = '0.6'; b.style.cursor = 'not-allowed'; b.textContent = 'Đang post...'; }

              const resetBtn = (label) => {
                if (!b) return;
                b.textContent = label;
                setTimeout(() => { b.disabled = false; b.style.opacity = ''; b.style.cursor = ''; b.textContent = 'Post Data'; }, 3000);
              };

              // Post data JSON xuống Suitelet xử lý bằng fetch (ajax thuần)
              fetch('${processUrl}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({reportType, subsidiary, data})
              })
              .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
              })
              .then(function(res) {
                console.log('Post thành công:', res);
                resetBtn('Đã post ✓');
              })
              .catch(function(e) {
                console.error('Post lỗi:', e);
                alert('Post dữ liệu thất bại: ' + (e.message || e));
                resetBtn('Lỗi ✕');
              });
            };

            function buildJSONData() {
              const base = { filename: S.filename, kind: S.kind };
              try {
                // XLS/XLSX → từng sheet thành mảng object (dùng hàng đầu làm khóa)
                if (S.kind===FileKind.XLSX && S.xlsxWB) {
                  const sheets = {};
                  S.xlsxWB.SheetNames.forEach(name => {
                    sheets[name] = XLSX.utils.sheet_to_json(S.xlsxWB.Sheets[name], { defval:'' });
                  });
                  return Object.assign(base, { sheets });
                }
                // XML / Word XML → bảng dữ liệu nếu nhận dạng được, ngược lại object lồng nhau
                if ((S.kind===FileKind.XML || S.kind===FileKind.WORD_XML) && S.xmlDoc) {
                  const table = tryParseXMLTable(S.xmlDoc);
                  if (table) return Object.assign(base, { columns: table.columns, rows: table.rows });
                  return Object.assign(base, { data: xmlToObj(S.xmlDoc.documentElement), text: S.rawText });
                }
                // Word / PDF / PDF scan → text + danh sách đoạn
                const paragraphs = (S.rawText||'').split(/\\n{2,}/).map(s=>s.trim()).filter(Boolean);
                return Object.assign(base, { text: S.rawText, paragraphs });
              } catch(e) {
                return Object.assign(base, { text: S.rawText, error: String(e) });
              }
            }

            function xmlToObj(node) {
              const obj = {};
              if (node.attributes && node.attributes.length)
                Array.from(node.attributes).forEach(a => obj['@'+a.name] = a.value);
              const kids = Array.from(node.children);
              if (!kids.length) {
                const txt = node.textContent.trim();
                if (!Object.keys(obj).length) return txt;
                if (txt) obj['#text'] = txt;
                return obj;
              }
              kids.forEach(child => {
                const key = child.tagName, val = xmlToObj(child);
                if (obj[key] === undefined) obj[key] = val;
                else { if (!Array.isArray(obj[key])) obj[key] = [obj[key]]; obj[key].push(val); }
              });
              return obj;
            }

            // ═══════════════════════════════════════════════════
            // AUTO-SELECT LOẠI BÁO CÁO THEO NỘI DUNG FILE
            // ═══════════════════════════════════════════════════
            // Chuẩn hoá: bỏ dấu tiếng Việt, viết thường, gộp khoảng trắng
            function normText(s) {
              return String(s||'').toLowerCase()
                .normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')
                .replace(/\\s+/g,' ').trim();
            }

            // Đọc nội dung file và default Loại báo cáo theo option khớp gần nhất
            function autoSelectReportType() {
              const sel = $('reportType');
              if (!sel) return;
              // Gộp tên file + nội dung đã bóc tách để dò
              const content = normText((S.filename||'') + ' ' + (S.rawText||''));
              if (!content) return;

              // Ưu tiên: nội dung có "Thuyết minh báo cáo tài chính" -> chọn theo loại file
              // (Word -> "... Word", còn lại -> bảng thường), bỏ qua so khớp điểm số bên dưới.
              if (content.indexOf(normText('Thuyết minh báo cáo tài chính')) !== -1) {
                sel.value = (S.kind === FileKind.WORD) ? 'bc_6' : 'bc_5';
                sel.classList.remove('invalid');
                return;
              }

              let best = '', bestScore = 0, bestPos = Infinity;
              Array.from(sel.options).forEach(opt => {
                if (!opt.value) return; // bỏ qua option placeholder
                const label = normText(opt.textContent);
                if (!label) return;

                let score = 0, pos = Infinity;
                // Khớp nguyên cụm nhãn → điểm cao nhất
                const whole = content.indexOf(label);
                if (whole !== -1) { score += 100 + label.length; pos = whole; }
                // Cộng điểm theo từng từ khớp (xử lý trường hợp nội dung không liền cụm)
                label.split(' ').forEach(tok => {
                  if (!tok) return;
                  const p = content.indexOf(tok);
                  if (p !== -1) { score += tok.length; if (p < pos) pos = p; }
                });

                // Điểm cao hơn thắng; bằng điểm thì lấy vị trí xuất hiện sớm nhất
                if (score > bestScore || (score === bestScore && pos < bestPos)) {
                  bestScore = score; best = opt.value; bestPos = pos;
                }
              });

              if (best && bestScore > 0) {
                sel.value = best;
                sel.classList.remove('invalid');
              }
            }

            // ═══════════════════════════════════════════════════
            // UI HELPERS
            // ═══════════════════════════════════════════════════
            function showLoading(msg) {
              VIEWS.forEach(id=>$(id).style.display='none');
              $('viewLoading').style.display='flex';
              $('loadingMsg').textContent=msg||'Đang xử lý...';
              $('progressBox').style.display='block';
              $('toolbar').style.display='none';
              setProgress(0,'Đang chuẩn bị...');
            }
            
            function setProgress(pct,status,detail=''){
              $('progressFill').style.width=pct+'%';
              $('progressPct').textContent=pct+'%';
              $('progressStatus').textContent=status;
              $('progressDetail').textContent=detail;
            }
            
            function showErr(msg){
              VIEWS.forEach(id=>$(id).style.display='none');
              $('viewError').style.display='flex';
              $('errMsgText').textContent=msg;
              $('progressBox').style.display='none';
              $('toolbar').style.display='none';
            }
            
            function showWarning(html){
              $('warningsBox').innerHTML=html;
              $('warningsBox').style.display='block';
            }
            
            function setFileInfo(icon,name,size,label,bgColor,color){
              $('fileIconLg').textContent=icon;
              $('fileName').textContent=name;
              $('fileSize').textContent=fmtBytes(size);
              const b=$('kindBadge');
              b.textContent=label;
              b.style.background=bgColor;
              b.style.color=color;
              $('fileInfo').style.display='flex';
            }
            
            function setStats(pairs){
              const el=$('statsRow');
              el.innerHTML=pairs.filter(([l])=>l).map(([label,val])=>\`
                <div class="stat-item">
                  <div class="stat-item-label">\${label}</div>
                  <div class="stat-item-val">\${typeof val==='number'?val.toLocaleString('vi-VN'):val}</div>
                </div>\`).join('');
            }
            
            function resetUI(){
              VIEWS.forEach(id=>$(id).style.display='none');
              $('viewPlaceholder').style.display='flex';
              $('toolbar').style.display='none';
              $('reportBar').style.display='none';
              $('sheetTabs').style.display='none';
              $('sheetTabs').innerHTML='';
              $('searchRow').style.display='none';
              $('fileInfo').style.display='none';
              $('warningsBox').style.display='none';
              $('inlineErr').style.display='none';
              $('progressBox').style.display='none';
              $('pagePreviews').style.display='none';
              $('pagePreviews').innerHTML='';
              $('ocrSettings').style.display='none';
              const rt=$('reportType'); if(rt){ rt.value=''; rt.classList.remove('invalid'); }
              const sub=$('subsidiary'); if(sub){ sub.classList.remove('invalid'); }
              Object.assign(S,{mode:null,kind:null,rawHTML:'',rawText:'',rawXML:'',xlsxWB:null,xlsxSheet:null,xmlDoc:null,matches:[],matchIdx:-1,reportAutoSet:false});
            }
            
            // ── Utils ──
            function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
            function fmtBytes(b){ if(!b)return''; if(b<1024)return b+' B'; if(b<1048576)return(b/1024).toFixed(1)+' KB'; return(b/1048576).toFixed(2)+' MB'; }
            function extractAllText(node){ if(node.nodeType===3)return node.nodeValue; if(node.nodeType!==1)return ''; return Array.from(node.childNodes).map(extractAllText).join(' '); }
            </script>
            </body>
            </html>
            `;

        return {onRequest}

    });
