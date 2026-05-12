import { PopupComponent } from "/modules/core/js/popupComponent.js";

export class WorkflowActionPopup extends PopupComponent {
    constructor(selector, props) {
        super(selector, props);
        this.dialog = null;
        this.currentId = null;
        this.procId = null;
        this._tableId = props.tableId;
        this.socket = props.socket;
        this.containerId = props.containerId;
        this.endpoint = props.endpoint;
        this.parentDocId = null;
        this.enumIcons = props.enumIcons || {};
        this.options = {
            procId:"items",
        };
        this.diagram = props.diagram || null;
    }

    async loadExecuters() {
        if (this._executersCache) return this._executersCache;

        try {
            const r = await req('/get/workflow/executers', { data: {} });

            // допускаем оба формата:
            // result: ["createMfgOrder", ...] или result: [{id,title}, ...]
            const raw = Array.isArray(r?.result) ? r.result : [];
            const list = raw.map(x => {
                if (typeof x === 'string') return { id: x, title: x };
                if (x && typeof x === 'object') return { id: x.id ?? x.title, title: x.title ?? x.id };
                return null;
            }).filter(Boolean);

            this._executersCache = list;
            return list;
        } catch (e) {
            console.error('loadExecuters error:', e);
            this._executersCache = [];
            return [];
        }
    }

    async addRow(ctx = {})  {
        try {
            this.pipeId = ctx.pipeId || this.pipeId;
            this.nodeId = ctx.nodeId || this.nodeId;
            const data = await this.getAction(this.pipeId, this.itemId);
            await this.initPopup(ctx || {});
            this.show();
            this.onCloseRequest = true;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async editRow(ctx = {}) {
        const { pipeId, nodeId, itemId } = ctx;
        if (!pipeId || !itemId) {
            console.error('editRow: missing pipeId/itemId', ctx);
            return;
        }
        this.pipeId = pipeId;
        this.nodeId = nodeId || this.nodeId;
        this.currentId = itemId;
        const data = await this.getAction(pipeId, itemId);
        try {
            await this.initPopup(data);
            this.show();
            this.onCloseRequest = false;
        } catch (error) {
            console.error('editRow error:', error);
        }
    }

    async addChildRow(ctx) {
        return await this.addRow({ ...ctx, mode: "child" });
    }

    setHeader(type) {
        const header = document.getElementsByClassName('modal-title')[0];
        if(type === "edit"){
            header.textContent = t("edit_document");
        } else {
            header.textContent = t("create_document");
        }
    }

    // addRow -> initPopup -> makeFields
    // мини-экранировщик для безопасной подстановки строк
    esc(v){
        return String(v ?? '')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    async getAction(pipeId, itemId) {
        const res = await req('/workflow/action/get', { pipeId, itemId });
        if (res?.status !== 'ok') {
            throw new Error(res?.msg || 'fetchAction failed');
        }
        return res.data;
    }

    async initPopup(config = {}) {
        const {
            id = '',
            title = {},
            label = '',
            type = 'action',
            action = '',
            params = {},
            when = ''
        } = config;
        const titleText  = i18n(title);
        const paramsText = JSON.stringify(params, null, 2);
        const whenText   = JSON.stringify(when, null, 2);

// чтобы на save знать, что это было объектом
        this._titleObj = title;
        const executers = await this.loadExecuters();
        // const currentExec = this.esc(config.executer || config.executor || '');
        const currentExec = this.esc(action || config.executer || config.executor || '');

        const executerOptions = executers.map(x => {
            const v = this.esc(x.id);
            const t = this.esc(x.title || x.id);
            const sel = (String(x.id) === String(currentExec)) ? 'selected' : '';
            return `<option value="${v}" ${sel}>${t}</option>`;
        }).join('');

        const typeVal = String(type || 'action').toLowerCase();
        const isCond = typeVal === 'condition';

        const typeOptions = `
          <option value="action" ${typeVal === 'action' ? 'selected' : ''}>action</option>
          <option value="condition" ${typeVal === 'condition' ? 'selected' : ''}>condition</option>
        `;
        let formHTML = `
            <div class="form-group">
                <label><h4>ID <span style="color:#ff5b5b">*</span></h4></label>
                <input type="text" name="id" typeId="string" class="form-control styled-input" required value="${this.esc(id)}">
            </div>
            <div class="form-group">
                <label><h4>Title <span style="color:#ff5b5b">*</span></h4></label>
                <input type="text" name="title" typeId="string" class="form-control styled-input" required value="${this.esc(titleText)}">
            </div>
            <div class="form-group">
                <label><h4>Label</h4></label>
                <input type="text" name="label" typeId="string" class="form-control styled-input" value="${this.esc(label)}">
            </div>

            <div class="form-group">
                <label><h4>Type <span style="color:#ff5b5b">*</span></h4></label>
                <select name="type" typeId="select" class="form-control styled-input" required>
                  ${typeOptions}
                </select>
            </div>
              
            <div class="form-group">
              <label><h4>Action <span style="color:#ff5b5b">*</span></h4></label>
              <select name="action" typeId="select" class="form-control styled-input" required>
                ${currentExec ? '' : '<option value="" disabled selected>— выберите —</option>'}
                ${executerOptions}
              </select>
            </div>

            <div class="form-group">
                <label><h4>Params</h4></label>
                <textarea name="params" typeId="textarea" class="form-control styled-input" style="min-height:90px;">${this.esc(paramsText)}</textarea>
            </div>
            
            <div class="form-group when-wrap" style="display:${isCond ? 'block' : 'none'};">
                <label><h4>When <span style="color:#ff5b5b">*</span></h4></label>
                <input type="text" name="when" typeId="string" class="form-control styled-input" value="${this.esc(whenText)}" ${isCond ? 'required' : ''}>
            </div> `;

        const resultHtml = `<div style="overflow:auto;" class="cfg-form"><div>${formHTML}</div></div>`;
        this.resultHtml = resultHtml;
        return resultHtml;
    }

    async deleteRow(ctx = {}) {
        const { pipeId, nodeId, fieldId, subId = "" } = ctx;

        const what = subId ? `child "${subId}"` : `item "${fieldId}"`;
        if (!confirm(`Delete ${what}?`)) return;

        const res = await req('/workflow/exec/del', { pipeId, nodeId, fieldId, subId });

        if (res?.status !== 'ok') {
            alert(res?.msg || 'Delete failed');
            return;
        }

        const diagram = ctx.diagram || this.props?.diagram;
        if (diagram?.refreshFromServer) await diagram.refreshFromServer();
    }

    /**
     * docContainerId = если есть субтаблица то это id родительского документа по отношению к субтаблице
     * @param e
     * @param type
     * @param action
     * @returns {Promise<*>}
     */
    async doOk(e, actionType = 'create', ctx = {}) {
        const popupId = `popup-${this.id}`;
        const body = document.querySelector(`#${popupId} .modal-body`);
        const root = body?.querySelector('.cfg-form') || body; // у тебя cfg-form внутри resultHtml
        if (!root) return false;

        const q = (sel) => root.querySelector(sel);

        const id    = (q('[name="id"]')?.value || '').trim();
        const title = (q('[name="title"]')?.value || '').trim();
        const label = (q('[name="label"]')?.value || '').trim();
        const type  = (q('select[name="type"]')?.value || 'action').trim();
        const action = (q('select[name="action"]')?.value || '').trim();
        const paramsStr = (q('[name="params"]')?.value || '').trim();
        const whenStr   = (q('[name="when"]')?.value || '').trim();

        // минимальная валидация по факту твоих полей
        if (!id || !title || !type || !action) {
            alert('Заполните обязательные поля: id, title, type, action');
            return false;
        }
        if (String(type).toLowerCase() === 'condition' && !whenStr) {
            alert('Для type=condition поле "when" обязательно');
            return false;
        }

        // JSON parse (один раз, не внутри циклов)
        let params = {};
        if (paramsStr) {
            try { params = JSON.parse(paramsStr); }
            catch (err) { alert('Params должен быть валидным JSON'); return false; }
        }

        let when = '';
        if (String(type).toLowerCase() === 'condition') {
            try { when = JSON.parse(whenStr); }   // у тебя when хранится JSON-строкой
            catch (err) { alert('When должен быть валидным JSON'); return false; }
        } else {
            when = ''; // если не condition — когда нет смысла слать when
        }

        const data = { id, title_obj: { en: title }, title: title, label, type, action, params, when };

        if (document.parentDocId) data.parentDocId = document.parentDocId;

        const res = await req('/set/workflow/exec', {
            procId: this.options.procId,
            actionType,
            parentItemId: ctx?.parentItemId,
            docId: this.currentId || '',
            pipeId: this.pipeId || '',
            nodeId: this.nodeId || '',
            data
        });

        if (res?.status === 'ok'){
            if (this.diagram?.refreshFromServer)
                await this.diagram.refreshFromServer();
            return res;
        }

        alert(res?.msg || 'Save failed');
        return false;
    }

    attachEvents() {
        super.attachEvents();
        const popupId = `popup-${this.id}`;
        const popupEl = document.getElementById(popupId);
        if (!popupEl) return;

        const formEl = popupEl.querySelector('.cfg-form');
        if (!formEl) return;

        const typeSel = formEl.querySelector('select[name="type"]');
        const whenWrap = formEl.querySelector('.when-wrap');
        const whenInput = formEl.querySelector('input[name="when"]');

        const toggleWhen = () => {
            const v = String(typeSel?.value || '').toLowerCase();
            const isCond = v === 'condition';
            if (whenWrap) whenWrap.style.display = isCond ? 'block' : 'none';
            if (whenInput) {
                if (isCond) whenInput.setAttribute('required', 'required');
                else whenInput.removeAttribute('required');
                if (!isCond) whenInput.value = ''; // ✅ если не condition — чистим when
            }
        };

        if (typeSel) {
            typeSel.addEventListener('change', toggleWhen);
            toggleWhen();
        }


        this.addEvent('body', `#${popupId} .enum-field .enum-button`, 'click', (e) => this.handleEnumFieldClick(e));

        this.addEvent('body', `#${popupId} .modal-footer .save`, 'click', async (e) => {
            const mode = this.currentId ? 'update' : 'create';
            // const res = await this.doOk(e, mode);
            const res = await this.doOk(e, mode, this.props || {});
            if (!res) return;

            const diagram = this.props?.diagram;

            const nodeId = res.nodeId || this.nodeId || this.props?.node?.id;
            const nodeFields = res.nodeFields || res.node?.fields; // подхват разных форматов ответа

            if (diagram?.applyNodeFields && nodeId && Array.isArray(nodeFields)) {
                diagram.applyNodeFields(nodeId, nodeFields);
            }

            // дальше как было
            res.containerId = this.containerId;
            res.procId = this.options.procId;
            this.emitSocketEvent(`addItem${this._tableId}`, res);

            await this.hide();
            if (this.subTable) { this.subTable.dispose(); this.subTable = null; }
        });

    }

    content() {
        return `
            <style>
                label { text-transform: capitalize; }
                .styled-input {
                    width: 80%;               
                    padding: 10px;             
                    border-radius: 5px;       
                    border: 1px solid #ccc;    
                    outline: none;            
                    font-size: 16px;          
                    font-family: Arial, sans-serif; 
                    transition: all 0.3s ease; 
                }
                .styled-input:focus {
                    border-color: #007bff;    
                    box-shadow: 0px 0px 14px rgba(71,155,246,0.5); 
                }
                .styled-input::placeholder {
                    color: #aaa;              
                    font-style: italic;        
                }
            </style>
            <div class="modal-dialog" style="width:100%; max-height: 90%; margin-bottom:35px; border-radius: 8px; overflow: auto;">
                <div class="modal-content" style="width:100%; height: auto; ">
                    <div class="modal-header">
                        <h3 class="modal-title" style="color:white;">Create document</h3>
                    </div>
                    <div class="modal-body" style="overflow:auto;  height: 80vh; ">
                        <div class="modal-fields">${this.resultHtml}</div>
                        <div id="popup-list-items"></div>
                    </div>
                </div>
            </div>`;
    }

    render() {
        return super.render();
    }
}