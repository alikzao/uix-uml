import { PopupComponent } from "/modules/core/js/popupComponent.js";

export class DbNodePopup extends PopupComponent {
    constructor(selector, props) {
        super(selector, props);
        this.dialog = null;
        this.currentId = null;
        this.procId = null;
        this._tableId = props.tableId;
        this.socket = props.socket;
        this.containerId = props.containerId;
        this.parentDocId = null;
        this.enumIcons = props.enumIcons || {};
        this._parentOptions = null;
        this.options = {
            procId:"items",
        };
        this.diagram = props.diagram || null;
    }

    async addRow()  {
        try {
            this._mode = 'create';
            await this.initPopup();
            this.show();
            this.onCloseRequest = true;
            this.setHeader("create");
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async editRow(procId, docId, container, type = 'table') {
        console.log('editRow => this.options ======================>', this.options);
        this.type = type;
        this.options.procId = procId;
        const nodeId = this.options.procId.nodeId;
        this.container = container;
        try {

            this._mode = 'edit';
            this.type = type;
            this.container = container;

            const res = await req('/get/db/meta', { nodeId });
            if (res.status !== 'ok') { alert(res.msg); return; }

            this.currentId = res._id;

            const conf = res.conf || {};
            await this.initPopup({
                _id: res._id,

                turn: conf.turn,
                isDoc: conf.isDoc,
                isTreeMode: conf.isTreeMode,
                isSubDocs: conf.isSubDocs,
                subTable: conf.subTable,
                parent: conf.parent,
                title: conf.title || { en: '' },
                type: conf.type || 'templ',
                comments: conf.comments,
                docType: conf.docType
            });
            this.show();
            this.onCloseRequest = false;
            this.setHeader("edit");
        } catch (error) {
            console.error('Error:', error);
        }
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

    // делаю глобальной, т.к. ты вызываешь её inline через onchange
    async updateDynamicFields(docType, cfg = {}) {
        const subTableVal = this.esc(cfg.subTable || '');
        const parentVal   = this.esc(cfg.parent || '');

        if (docType === 'parent') {
            const subIdVal = this.esc(cfg.subTableId || cfg.subTable || '');
            return `
                <div class="form-group">
                  <label><h4>Child Subdocument ID (optional)</h4></label>
                  <input type="text" name="subTableId" class="form-control styled-input"
                         placeholder="Enter child subdocument ID (optional)" value="${subIdVal}">
                </div>
              `;
        }

        if (docType === 'child') {
            const parentVal = this.esc(cfg.parent || '');

            const ids = await this.loadParentOptions();
            const opts = ids
                .map(id => `<option value="${this.esc(id)}" ${id === parentVal ? 'selected' : ''}>${this.esc(id)}</option>`)
                .join('');
            return `
                <div class="form-group">
                    <label><h4>Parent Table <span style="color:#ff5b5b">*</span></h4></label>
                    <select name="parent" class="form-control styled-input" required>
                        ${parentVal ? `<option value="${parentVal}" selected>${parentVal}</option>` : `<option value="" disabled selected>— select —</option>`}
                        ${opts}
                    </select>
                </div>
              `;
        }

        return '';
    };

    async loadParentOptions() {
        // кеш чтобы не дергать сервер каждый раз
        if (this._parentOptions) return this._parentOptions;
        const res = await req('/get/dbs/meta', {});
        if (res?.status !== 'ok') {
            console.error('get/dbs/meta fail', res);
            this._parentOptions = [];
            return this._parentOptions;
        }
        this._parentOptions = (res.data || []).map(x => String(x._id));
        return this._parentOptions;
    }

    async initPopup(config = {}) {
        const {
            _id = '',
            turn = false,
            isDoc = 'false',
            isTreeMode = false,
            isSubDocs = false,   // не рендерю, но можно хранить
            subTable = '',
            parent = '',
            title = { en: '' },
            type = '',
            comments = '',
            docType = ''
        } = config;

        // нормализуем булевы: true / "true" → checked
        const isOn = v => (typeof v === 'string' ? v === 'true' : !!v);
        const isEdit = !!this.currentId;

        // стартовый режим для первичного заполнения динамики
        let initialKind = '';
        if (docType === 'parent' || docType === 'child') {
            initialKind = docType;
        } else if (subTable) {
            initialKind = 'parent';
        } else if (parent) {
            initialKind = 'child';
        }
        const idVal = isEdit ? (this.currentId || '') : (_id || '');
        const dynHtml = await this.updateDynamicFields(initialKind, { subTable, parent });

        let formHTML = `
            <div class="form-group">
                <label><h4>ID <span style="color:#ff5b5b">*</span></h4></label>
                <input
                    type="text"
                    name="_id"
                    class="form-control styled-input"
                    required
                    ${isEdit ? 'readonly' : ''}
                    placeholder="Enter unique id"
                    value="${this.esc(idVal)}" >
            </div>
            <div class="form-group">
              <label><h4>Turn <span style="color:#ff5b5b">*</span></h4></label>
                <input type="checkbox" name="turn" class="form-control styled-input" ${turn ? 'checked' : ''}>
            </div>
        
            <div class="form-group">
              <label><h4>Is Document </h4></label>
              <input type="checkbox" name="isDoc" class="form-control styled-input" ${isOn(isDoc) ? 'checked' : ''}>
            </div>
             
             <div class="form-group">
              <label><h4>Is Tree </h4></label>
              <input type="checkbox" name="isTreeMode" class="form-control styled-input" ${isOn(isTreeMode) ? 'checked' : ''}>
            </div>
        
            <div class="form-group">
              <label><h4>Document Type </h4></label>
              <select name="documentType" class="form-control styled-input">
                <option value="" ${initialKind ? '' : 'selected'}>Select type...</option>
                <option value="parent" ${initialKind==='parent' ? 'selected' : ''}>Parent Document</option>
                <option value="child"  ${initialKind==='child'  ? 'selected' : ''}>Child Document</option>
              </select>
            </div>
        
            <div class="dynamic-fields">
              ${dynHtml}
            </div>
        
            <div class="form-group">
              <label><h4>Title (EN) <span style="color:#ff5b5b">*</span></h4></label>
                <input type="text" name="title" class="form-control styled-input" required value="${this.esc(title?.en ?? '')}">
            </div>
        
            <div class="form-group">
              <label><h4>Type </h4></label>
                <input type="text" name="type" class="form-control styled-input" value="templ" required>
            </div>
        
            <div class="form-group">
              <label>
                <h4>Comments</h4>
              </label>
              <select name="comments" class="form-control styled-input">
                <option value="off" ${comments === 'on' ? '' : 'selected'}>off</option>
                <option value="on"  ${comments === 'on' ? 'selected' : ''}>on</option>
              </select>
            </div>
        
          `;

        const resultHtml = `<div style="overflow:auto;" class="cfg-form"><div>${formHTML}</div></div>`;
        this.resultHtml = resultHtml;
        return resultHtml;
    }

    /**
     * docContainerId = если есть субтаблица то это id родительского документа по отношению к субтаблице
     * @param e
     * @param type
     * @param action
     * @returns {Promise<*>}
     */
    async doOk(e, type, action) {
        const popupId = `popup-${this.id}`;
        const dialog = document.querySelector(`#${popupId} .modal-body`);
        const fieldsRoot = dialog.querySelector('.modal-fields');

        // ✅ берём ТОЛЬКО то, что внутри resultHtml (.cfg-form)
        const cfgRoot = fieldsRoot.querySelector('.cfg-form');
        const data = this.collectCfgFormData(cfgRoot);
        data.lang = getLang();

        data.mode = this.currentId ? 'edit' : 'create';

        if (this.currentId) data._id = this.currentId;
        if (!data._id) { alert('ID must have'); return false; }

        // если тебе всё ещё нужен parentDocId
        if (document.parentDocId) {
            data.parentDocId = document.parentDocId;
        }

        const res = await req('/set/db/scheme', { data });

        if (res.status === 'ok') {
            if (this.diagram?.refreshFromServer)
                await this.diagram.refreshFromServer();
            return res;
        }

        if (res.status === 'fail' || res.status === 'error') {
            alert(res.msg);
            return false;
        }

        console.error("doOk is fail");
        return false;
    }

    async deleteNode(ctx = {}) {
        try {
            const diagram = ctx.diagram || this.props?.diagram || this.diagram;
            const pipeId = ctx.pipeId ?? this.pipeId ?? null;
            const nodeId = ctx.nodeId ?? ctx.node?.id ?? null;
            if (!nodeId) return;
            const res = await req('/del/db/scheme', { pipeId, nodeId });
            if (res.status === 'ok') {
                if (diagram?.refreshFromServer)
                    await diagram.refreshFromServer();
                return res;
            }
            alert(res?.msg || 'delete failed');
            return res;
        } catch (e) {
            console.error("deleteRow error:", e);
        }
    }

    collectCfgFormData(cfgRoot){
        if (!cfgRoot) return {};
        const data = {};
        const els = cfgRoot.querySelectorAll('input[name], select[name], textarea[name], div[name]');
        for (const el of els) {
            const name = el.getAttribute('name');
            if (!name) continue;
            if (el.tagName === 'INPUT' && el.type === 'checkbox') {
                data[name] = el.checked ? 'true' : 'false';
                continue;
            }
            if (el.tagName === 'INPUT' && el.type === 'radio') {
                if (el.checked) data[name] = el.value ?? '';
                continue;
            }
            if (el.tagName === 'DIV') {
                data[name] = el.innerHTML ?? '';
                continue;
            }
            data[name] = el.value ?? '';
        }
        // title_en -> title: { en: ... }
        // data.docTypeMode = data.documentType; delete data.documentType;
        return data;
    }

    attachEvents() {
        super.attachEvents();

        const popupId = `popup-${this.id}`;

        // ✅ СКОУП к текущему попапу (а не document.querySelector('.cfg-form'))
        const formEl = document.querySelector(`#${popupId} .cfg-form`);
        if (!formEl) return;

        const sel = formEl.querySelector('select[name="documentType"]');
        if (sel) {
            sel.addEventListener('change', async (e) => {
                const wrap = formEl.querySelector('.dynamic-fields');
                if (!wrap) return;

                // если хочешь сохранять введённые значения при переключении — можно собрать текущие:
                const current = this.collectCfgFormData(formEl);
                wrap.innerHTML = await this.updateDynamicFields(e.target.value, {
                    subTableId: current.subTableId,
                    subTable: current.subTable,
                    parent: current.parent
                });
            });
        }

        this.addEvent('body', `#${popupId} .enum-field .enum-button`, 'click', (e) => this.handleEnumFieldClick(e));

        this.addEvent('body', `#${popupId} .modal-footer .save`, 'click', async (e) => {
            const data = await this.doOk(e, 'create');
            if (!data) return;

            data.containerId = this.containerId;
            data.procId = this.options.procId;
            data.type = this.type;

            this.emitSocketEvent(`addItem${this._tableId}`, data);
            await this.hide();
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