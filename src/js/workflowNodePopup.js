import { PopupComponent } from "/modules/core/js/popupComponent.js";

export class WorkflowNodePopup extends PopupComponent {
    constructor(selector, props) {
        super(selector, props);
        this.dialog = null;
        this.currentId = null;
        this.pipeId = props.pipeId ?? null;
        this._tableId = props.tableId;
        this.socket = props.socket;
        this.containerId = props.containerId;
        this.parentDocId = null;
        this.enumIcons = props.enumIcons || {};
        this.options = {
            procId:"items",
        };
        this.diagram = props.diagram || null;
    }

    async addRow()  {
        try {
            this._mode = 'create';
            this._oldNodeId = null;

            await this.initPopup();
            this.show();
            this.onCloseRequest = true;


        } catch (error) {
            console.error('Error:', error);
        }
    }

    async editRow(ctx = {}) {
        try {
            const node = ctx.node || {};           // ✅ сначала объявили
            this._mode = 'edit';
            this._oldNodeId = ctx.nodeId ?? node.id ?? null;

            this.pipeId = ctx.pipeId ?? this.pipeId ?? null;
            this.currentNodeId = this._oldNodeId;

            await this.initPopup(node);
            this.show();
            this.onCloseRequest = false;
            this.setHeader("edit");
        } catch (e) {
            console.error("editRow error:", e);
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

    async initPopup(config = {}) {
        const {
            id = '',
            label = '',
            sort = '',
            turn = false,
            isDoc = 'false',
            isSubDocs = false,   // не рендерю, но можно хранить
            subTable = '',
            parent = '',
            title = { en: '' },
            type = '',
            triggerTypes = 'internal',
            comments = '',
            docType = ''
        } = config;

        // нормализуем булевы: true / "true" → checked
        const isOn = v => (typeof v === 'string' ? v === 'true' : !!v);

        // стартовый режим для первичного заполнения динамики
        let initialKind = '';
        if (docType === 'parent' || docType === 'child') {
            initialKind = docType;
        } else if (subTable) {
            initialKind = 'parent';
        } else if (parent) {
            initialKind = 'child';
        }

        let formHTML = `
            <div class="form-group">
              <label><h4>Id <span style="color:#ff5b5b">*</span></h4></label>
                <input type="text" name="id" class="form-control styled-input" required value="${this.esc(id)}">
            </div>
        
            <div class="form-group">
              <label><h4>Label <span style="color:#ff5b5b">*</span></h4></label>
                <input type="text" name="label" class="form-control styled-input" required value="${this.esc(label)}">
            </div>

            <div class="form-group">
              <label><h4>Title (EN) <span style="color:#ff5b5b">*</span></h4></label>
              <input type="text" name="title_en" class="form-control styled-input" required value="${this.esc(title?.en ?? '')}">
            </div>
            
            <div class="form-group">
              <label><h4>Sort </h4></label>
                <input type="number" name="sort" class="form-control styled-input" value="${this.esc(sort)}">

            </div>
        
            <div class="form-group">
                <label><h4>Node type <span style="color:#ff5b5b">*</span></h4></label>
                <select name="type" class="form-control styled-input" required>
                    <option value="trigger" ${type==="trigger"?"selected":""}>trigger</option>
                    <option value="action_group" ${type==="action_group"?"selected":""}>action_group</option>
                </select>
            </div>
            
            <div class="form-group" data-trigger-types>
                <label><h4>Trigger Types <span style="color:#ff5b5b">*</span></h4></label>
                <select name="triggerTypes" class="form-control styled-input" required>
                    <option value="internal" ${triggerTypes==="internal"?"selected":""}>internal</option>
                    <option value="external" ${triggerTypes==="external"?"selected":""}>external</option>
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

        // простая проверка обязательных полей
        const reqFields = (this._currentMeta?.field_map || []).filter(f => f.visible && f.required);
        const missing = [];
        for (const f of reqFields) {
            const name = f.id;
            const t    = (f.type || '').toLowerCase();
            const nice = i18n(f.title) || name;
            const q = (sel) => fieldsRoot.querySelector(sel);
            if (t === 'bool' || t === 'boolean') {
                const el = q(`input[type=checkbox][name="${name}"]`);
                if (el && !el.checked) missing.push(nice);
            } else if (t === 'enum') {
                const el = q(`input[name="${name}"][type="hidden"]`);
                if (!el || !String(el.value).trim()) missing.push(nice);
            } else if (t === 'array') {
                const el = q(`[name="${name}"]`);
                const v = el?.tomselect ? el.tomselect.getValue() : (el?.selectedOptions ? Array.from(el.selectedOptions).map(o=>o.value) : el?.value);
                const empty = Array.isArray(v) ? v.length === 0 : !String(v||'').trim();
                if (empty) missing.push(nice);
            } else if (t === 'select' || t === "ref") {
                const el = q(`select[name="${name}"]`);
                if (!el || !String(el.value||'').trim()) missing.push(nice);
            } else if (t === 'date' || t === 'number' || t === 'string' || t === 'objectid' || t === 'passwd' || t === 'default') {
                const el = q(`[name="${name}"]`);
                if (!el || !String(el.value||'').trim()) missing.push(nice);
            } else {
                const el = q(`[name="${name}"]`);
                if (!el || !String(el.value||'').trim()) missing.push(nice);
            }
        }
        if (missing.length) {
            alert('Заполните обязательные поля:\n• ' + missing.join('\n• '));
            return false;
        }

        // const inputs = dialog.querySelectorAll(`select.multiselect, input[type=text],input[type=password], input[type=hidden], input[type=checkbox], input[type=radio], select, textarea, div[name]`);
        const inputs = fieldsRoot.querySelectorAll(`select.multiselect, input[type=text], 
                                                                                input[type=password], input[type=hidden], 
                                                                                input[type=checkbox], 
                                                                                input[type=number], input[type=radio]:checked, 
                                                                                select, textarea, div[name]`);
        // const multiSelects = dialog.querySelectorAll('select.multiselect');
        const data = {};
        const docId = this.currentId;
        const parentId = '_';
        const radioGroups = fieldsRoot.querySelectorAll('input[type=radio]');
        radioGroups.forEach(radio => {
            const name = radio.getAttribute('name');
            if (!data[name] && radio.checked) {
                data[name] = radio.value;
            }
        });
        inputs.forEach(input => {
            const name = input.getAttribute('name');
            const typeId = (input.getAttribute('typeId') || input.type || input.tagName).toLowerCase();
            if (!name) return;
            switch (typeId) {
                case 'object':
                    const wrapper = dialog.querySelector(`#wrapper-${name}`);
                    data[name] = {}; // сохраняем как объект { attrTypeId: [values], … }
                    if (wrapper) {
                        // каждый блок — это один выбранный атрибут (тип + значения)
                        const blocks = wrapper.querySelectorAll('.attr-block');
                        blocks.forEach(block => {
                            const selectEl = block.querySelector('select');
                            // из id select-а получаем id типа атрибута
                            // формат id: values-<fieldId>-<attrTypeId>
                            const parts = selectEl.id.split('-');
                            const attrTypeId = parts[parts.length - 1];
                            // соберем все выбранные значения
                            const vals = Array.from(selectEl.selectedOptions).map(opt => opt.value);
                            data[name][attrTypeId] = vals;
                        });
                    }
                    break;
                case 'array':
                    if (input.tomselect) { // Проверяем, связан ли элемент с экземпляром TomSelect
                        data[name] = input.tomselect.getValue(); // Сохраняем значения как массив или строку
                    } else {
                        console.warn(`TomSelect not initialize for element ${name}`);
                    }
                    break;
                case 'bool':
                case 'boolean':
                    data[name] = input.checked ? input.value : '';
                    break;
                case 'string':
                    data[name] = input.value;
                    break;
                case 'number':
                    data[name] = input.value === '' ? '' : Number(input.value);
                    break;
                case 'ref':
                case 'select':
                    // debugger; // ← 2-я пауза: когда читаем конкретный select
                    let v = input.value;
                    if (!v && input.tomselect) v = input.tomselect.getValue();
                    if (!v && input.choices && typeof input.choices.getValue === 'function') {
                        const gv = input.choices.getValue(true);
                        v = Array.isArray(gv) ? gv[0] : gv;
                    }
                    data[name] = v ?? '';
                    break;
                case 'textarea':
                    data[name] = input.value;
                    break;
                case 'div':
                    data[name] = input.innerHTML; // Для div используем внутренний HTML
                    break;
                default:
                    data[name] = input.value;
            }
        });
        const node = {
            id: data.id,
            label: data.label,
            sort: data.sort === '' ? 0 : Number(data.sort),
            type: data.type,
            triggerTypes: data.triggerTypes,
            title: { en: data.title_en || '' },
        };
        const body = { pipeId: this.pipeId, data: node };

        if (this._mode === 'edit') body.nodeId = this._oldNodeId;

        const res = await req('/pipes/upd/data', body);

        if (res.status === 'ok') {
            // console.log('Document created or updated!');
            if (res.status === 'ok') {
                if (this.diagram?.refreshFromServer)
                    await this.diagram.refreshFromServer();
                return res;
            }
        } else if (res.status === 'fail' || res.status === 'error') {
            alert(res.msg);
        } else {
            console.error("doOk is fail");
        }
    }

    async deleteNode(ctx = {}) {
        try {
            const diagram = ctx.diagram || this.props?.diagram || this.diagram;

            const pipeId = ctx.pipeId ?? this.pipeId ?? null;
            const nodeId = ctx.nodeId ?? ctx.node?.id ?? null;

            if (!pipeId || !nodeId) return;

            // ✅ твой отдельный endpoint удаления
            const res = await req('/pipes/wf/node/del', { pipeId, nodeId });

            if (res?.status === 'ok') {
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


    attachEvents() {
        super.attachEvents();

        const popupId = `popup-${this.id}`;
        const root = document.querySelector(`#${popupId}`);
        if (!root) return;

        const nodeTypeSel   = root.querySelector(`select[name="type"]`);
        const triggerBlock  = root.querySelector(`[data-trigger-types]`);
        const triggerSel    = root.querySelector(`select[name="triggerTypes"]`);

        const applyNodeTypeUI = () => {
            const isTrigger = (nodeTypeSel?.value === 'trigger');

            // show/hide блока Trigger Types
            if (triggerBlock) triggerBlock.style.display = isTrigger ? '' : 'none';

            // важно: чтобы валидация не требовала скрытое поле
            if (triggerSel) {
                triggerSel.required = isTrigger;
                if (!isTrigger) triggerSel.value = ''; // убери эту строку, если хочешь сохранять значение
            }
        };

// первичная установка (когда попап открылся)
        applyNodeTypeUI();

// навесить обработчик только один раз
        if (nodeTypeSel && !nodeTypeSel.dataset.boundToggleTriggerTypes) {
            nodeTypeSel.dataset.boundToggleTriggerTypes = '1';
            nodeTypeSel.addEventListener('change', applyNodeTypeUI);
        }

        this.addEvent('body', `#${popupId} .enum-field .enum-button`, 'click', (e) => this.handleEnumFieldClick(e));

        this.addEvent('body', `#${popupId} .modal-footer .save`, 'click', async (e) => {
            const data = await this.doOk(e, this._mode);
            if (!data) return; // обязательные не заполнены

            const diagram = this.props?.diagram || this.diagram;
            if (diagram?.refreshFromServer) {
                await diagram.refreshFromServer();
            }

            data.containerId = this.containerId;
            data.procId = this.options.procId;
            data.pipeId = this.pipeId;
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