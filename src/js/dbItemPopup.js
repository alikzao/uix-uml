import { PopupComponent } from "/modules/core/js/popupComponent.js";

export class DbItemPopup extends PopupComponent {
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

    async addRow(ctx = {})  {
        try {
            this.options.procId = ctx.nodeId;
            await this.initPopup();
            this.show();
            this.onCloseRequest = true;
        } catch (e) {
            console.error('Error:', e);
        }
    }

    async editRow(ctx = {}) {
        this.options.procId = ctx.nodeId;
        const itemId = ctx.itemId;
        this._mode = 'edit';

        const res = await req('/get/db/meta/item', { nodeId: ctx.nodeId, itemId });
        if (res?.status !== 'ok') {
            alert(res?.msg || 'Error');
            return;
        }
        this.currentId = itemId;
        const item = res.item;
        item._id = item.id;
        await this.initPopup(item);
        this.show();
        this.onCloseRequest = false;
    }

    async deleteRow(ctx = {}) {
        const { nodeId, fieldId} = ctx;

        // const what = subId ? `child "${subId}"`subId : `item "${fieldId}"`;
        // if (!confirm(`Delete ${what}?`)) return;

        const res = await req('/del/db/item', { procId:nodeId, itemId:fieldId});

        if (res?.status !== 'ok') {
            alert(res?.msg || 'Delete failed');
            return;
        }

        const diagram = ctx.diagram || this.props?.diagram;
        if (diagram?.refreshFromServer) await diagram.refreshFromServer();
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
    updateDynamicFields(docType, cfg = {}) {
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
            return `
                <div class="form-group">
                  <label><h4>Parent Table <span style="color:#ff5b5b">*</span></h4></label>
                  <select name="parent" class="form-control styled-input" required>
                    ${parentVal ? `<option value="${parentVal}" selected>${parentVal}</option>` : `<option value="" disabled selected>— выберите —</option>`}
                  </select>
                </div>
              `;
        }

        return '';
    };

    async renderTypeDynamicFields(type, cfg = {}) {
        // type: string|bool|date|select|enum|array|object
        const t = String(type || '').toLowerCase();

        // ничего не надо
        if (t === 'string' || t === 'bool' || t === 'date' || t === '') return '';

        // списки справочников
        const needRelation = (t === 'select' || t === 'array' || t === 'object');
        let relationHtml = '';
        if (needRelation) {
            const ids = await this.loadMapIds();
            const current = String(cfg.relation || '');
            const opts = ids.map(id => {
                const escId = this.esc(id);
                const sel = (id === current) ? 'selected' : '';
                return `<option value="${escId}" ${sel}>${escId}</option>`;
            }).join('');

            relationHtml = `
            <div class="form-group">
              <label><h4>Relation (dictionary) <span style="color:#ff5b5b">*</span></h4></label>
              <select name="relation" class="form-control styled-input" required>
                ${current ? '' : `<option value="" disabled selected>— select —</option>`}
                ${opts}
              </select>
            </div>
        `;
        }

        // select: relation + optional refType
        if (t === 'select') {
            const refTypeVal = this.esc(cfg.refType || '');
            return `
            ${relationHtml}
            <div class="form-group">
              <label><h4>refType (optional)</h4></label>
              <input type="text" name="refType" class="form-control styled-input"
                     placeholder="optional" value="${refTypeVal}">
            </div>
        `;
        }

        // array: relation (откуда брать список)
        if (t === 'array') {
            return `${relationHtml}`;
        }

        // object: relation
        if (t === 'object') {
            return `${relationHtml}`;
        }

        // enum: поле data (строкой) — пользователь вписывает массив айди
        if (t === 'enum') {
            const dataVal = this.esc(cfg.data || '');
            return `
            <div class="form-group">
              <label><h4>Enum data (ids array)</h4></label>
              <input type="text" name="data" class="form-control styled-input"
                     placeholder='e.g. ["new","paid","cancel"]' value="${dataVal}">
            </div>
        `;
        }

        return '';
    }

    async applyTypeDynamicUI(root) {
        if (!root) return;
        const typeSel = root.querySelector('select[name="type"]');
        const wrap = root.querySelector('.type-dynamic-fields');
        if (!typeSel || !wrap) return;

        // собрать текущие значения (чтобы не терялись при переключении)
        const current = {};
        const rel = root.querySelector('[name="relation"]'); if (rel) current.relation = rel.value;
        const refType = root.querySelector('[name="refType"]'); if (refType) current.refType = refType.value;
        const data = root.querySelector('[name="data"]'); if (data) current.data = data.value;

        wrap.innerHTML = await this.renderTypeDynamicFields(typeSel.value, current);
    }

    async loadMapIds() {
        if (this._mapIdsCache) return this._mapIdsCache;

        try {
            const r = await req('/get/dbs/meta', {});
            if (r?.status !== 'ok') {
                this._mapIdsCache = [];
                return this._mapIdsCache;
            }
            this._mapIdsCache = (r.data || []).map(x => String(x._id));
            return this._mapIdsCache;
        } catch (e) {
            console.error('loadMapIds error:', e);
            this._mapIdsCache = [];
            return [];
        }
    }

    async initPopup(config = {}) {
        const {
            _id = '',
            title = { en: '' },
            hint  = { en: '' },
            isTranslate = '',
            isEditable = true,
            visible = true,
            onCreate = 'edit',
            type = ''
        } = config;
        const isEdit = !!this.currentId;
        const idVal = isEdit ? (this.currentId || '') : (_id || '');
        // const typeVal = this.esc(type || '');
        const typeVal = String(type || '');

        const dynTypeHtml = await this.renderTypeDynamicFields(typeVal, {
            relation: config.relation,
            refType: config.refType,
            data: config.data
        });
        const isOn = v => (typeof v === 'string' ? v === 'true' : !!v);

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
              <label><h4>Title (EN) <span style="color:#ff5b5b">*</span></h4></label>
                <input type="text" name="title" class="form-control styled-input" required value="${this.esc(title?.en ?? '')}">
            </div>
                        
            <div class="form-group">
              <label><h4>Hint (EN) </h4></label>
                <input type="text" name="hint" class="form-control styled-input" required value="${this.esc(hint?.en ?? '')}">
            </div>
            
            <div class="form-group">
                <label><h4>Type <span style="color:#ff5b5b">*</span></h4></label>
                <select name="type" class="form-control styled-input">
                    <option value="" ${!typeVal ? 'selected' : ''}>Select type...</option>
                    <option value="string" ${typeVal==='string'?'selected':''}>String</option>
                    <option value="bool" ${typeVal==='bool'?'selected':''}>Boolean</option>
                    <option value="select" ${typeVal==='select'?'selected':''}>Reference</option>
                    <option value="date" ${typeVal==='date'?'selected':''}>Date</option>
                    <option value="object" ${typeVal==='object'?'selected':''}>Object</option>
                    <option value="array" ${typeVal==='array'?'selected':''}>Array</option>
                    <option value="enum" ${typeVal==='enum'?'selected':''}>Enum</option>
                </select>
            </div>
            <div class="type-dynamic-fields">${dynTypeHtml}</div>
 
            <div class="form-group">
              <label><h4>isTranslate </h4></label>
                <input type="checkbox" name="isTranslate" class="form-control styled-input" ${isOn(isTranslate) ? 'checked' : ''}>
            </div>
        
            <div class="form-group">
              <label><h4>IsEditable </h4></label>
                <input type="checkbox" name="isEditable" class="form-control styled-input" ${isOn(isEditable) ? 'checked' : ''}>
            </div>
 
            <div class="form-group">
              <label><h4>Visible </h4></label>
                <input type="checkbox" name="visible" class="form-control styled-input" ${isOn(visible) ? 'checked' : ''}>
            </div>
            
            <div class="form-group">
              <label><h4>OnCreate </h4></label>
              <input type="text" name="onCreate" class="form-control styled-input" required value="${this.esc(onCreate)}">
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
     * @returns {Promise<*>}
     */
    async doOk(e, type) {
        const popupId = `popup-${this.id}`;
        const dialog = document.querySelector(`#${popupId} .modal-body`);
        const fieldsRoot = dialog?.querySelector('.modal-fields');
        if (!fieldsRoot) return false;

        // 1) собрать значения (минимально, но покрывает text/date/select/textarea/div + checkbox)
        const inputs = fieldsRoot.querySelectorAll(`
                                                                        input[name][type=text],
                                                                        input[name][type=date],
                                                                        input[name][type=checkbox],
                                                                        input[name][type=radio]:checked,
                                                                        input[name][type=hidden],
                                                                        select[name],
                                                                        textarea[name],
                                                                        div[name]
                                                                      `);

        const data = {};
        inputs.forEach((el) => {
            const name = el.getAttribute('name');
            if (!name) return;
            if (el.type === 'checkbox') {
                data[name] = el.checked; // boolean, не строка
                return;
            }
            if (el.type === 'radio') {
                data[name] = el.value;
                return;
            }
            if (el.tagName === 'DIV') {
                data[name] = el.innerHTML;
                return;
            }
            // select / text / date / textarea / hidden
            data[name] = el.value ?? '';
        });

        // 2) простая обязательность (не прячем ошибки — если meta нет, то валимся явно)
        const reqFields = (this._currentMeta?.field_map || []).filter(f => f.visible && f.required);
        const missing = [];
        for (const f of reqFields) {
            const key = f.id;
            const v = data[key];
            // bool: должен быть true (если required)
            if ((f.type === 'bool' || f.type === 'boolean') && v !== true) {
                missing.push(key);
                continue;
            }
            // остальное: непустое
            if (v === undefined || v === null || String(v).trim() === '') {
                missing.push(key);
            }
        }

        if (missing.length) {
            alert('Заполните обязательные поля:\n• ' + missing.join('\n• '));
            return false;
        }

        // 3) запрос
        const res = await req('/set/db/field', {
            procId: this.options.procId,
            actionType: type,
            docId: this.currentId,
            data,
        });

        if (res?.status === 'ok') {
            if (this.diagram?.refreshFromServer)
                await this.diagram.refreshFromServer();
            return res;
        }

        alert(res?.msg || 'Error');
        return false;
    }

    attachEvents() {
        super.attachEvents();
        const popupId = `popup-${this.id}`;

        const root = document.querySelector(`#${popupId}`);
        if (!root) return;

        const formEl = root.querySelector('.cfg-form');
        if (!formEl) return;

        const typeSel = root.querySelector('select[name="type"]');
        if (typeSel && !typeSel.dataset.boundTypeDyn) {
            typeSel.dataset.boundTypeDyn = '1';
            this.applyTypeDynamicUI(root); // первичная
            typeSel.addEventListener('change', () => this.applyTypeDynamicUI(root));
        }

        this.addEvent('body', `#${popupId} .enum-field .enum-button`, 'click', (e) => this.handleEnumFieldClick(e));

        this.addEvent('body', `#${popupId} .modal-footer .save`, 'click', async (e) => {
            const mode = this._mode === 'edit' ? 'edit' : 'create';
            const data = await this.doOk(e, mode);
            if (!data) return;
            data.containerId = this.containerId;
            data.procId = this.options.procId;
            data.type = this.type;
            this.emitSocketEvent(`addItem${this._tableId}`, data);
            await this.hide();
            if (this.subTable?.dispose) this.subTable.dispose();
            this.subTable = null;
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