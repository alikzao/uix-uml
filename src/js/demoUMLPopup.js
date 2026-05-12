import { PopupComponent } from "/modules/core/js/popupComponent.js";

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function slugify(value, fallback) {
    const slug = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return slug || fallback;
}

function parseFields(value) {
    return String(value || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const [rawId, ...labelParts] = line.split(':');
            const id = slugify(rawId, `field_${index + 1}`);
            const label = labelParts.join(':').trim() || rawId.trim();
            return { id, label, type: 'string' };
        });
}

export class DemoUMLPopup extends PopupComponent {
    constructor(selector, props = {}) {
        super(selector || 'body', { ...props, BToMPage: false, onCloseRequest: false });
        this.isMobile = false;
        this.ctx = props;
        this.kind = props.kind || 'createNode';
        this.node = props.node || null;
    }

    async addRow(ctx = {}) {
        this.ctx = { ...this.ctx, ...ctx };
        this.kind = this.ctx.kind || this.kind;
        this.node = this.ctx.node || this.node;
        this.show();
    }

    attachEvents() {
        super.attachEvents();
        this.addEvent('body', `#popup-${this.id} .modal-footer .save`, 'click', async (event) => {
            event.preventDefault();
            const form = document.querySelector(`#demo-uml-form-${this.id}`);
            if (!form) return;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            if (this.kind === 'createNode') {
                this.ctx.onCreate?.({
                    ...data,
                    fields: parseFields(data.fields)
                });
            } else {
                this.ctx.onCreate?.(data);
            }

            await this.hide(false);
        });
    }

    bottomBarBtn() {
        return `
            <div class="modal-footer demo-uml-popup__footer">
                <div class="btn-group">
                    <button type="button" id="cancel-${this.id}" class="btn btn-secondary cancel">
                        Close
                    </button>
                    <button type="button" class="btn btn-primary save">
                        Save
                    </button>
                </div>
            </div>`;
    }

    content() {
        const isNode = this.kind === 'createNode';
        const title = isNode ? 'Create node' : `Add item to ${this.node?.label || this.node?.id || 'node'}`;

        return `
            <style>
                #popup-content-${this.id} {
                    color: #f6f7fb;
                    flex-direction: column;
                }
                #popup-content-${this.id} .popup-sub-content {
                    display: block;
                    width: 100%;
                    max-width: none;
                    padding: 0;
                    overflow: auto;
                }
                .demo-uml-popup {
                    display: grid;
                    gap: 12px;
                }
                .demo-uml-popup h2 {
                    margin: 0 0 4px;
                    font-size: 16px;
                    line-height: 1.2;
                }
                .demo-uml-popup label {
                    display: grid;
                    gap: 6px;
                    color: #d7dce7;
                    font-size: 13px;
                }
                .demo-uml-popup input,
                .demo-uml-popup select,
                .demo-uml-popup textarea {
                    width: 100%;
                    min-height: 36px;
                    border: 1px solid rgba(255,255,255,.16);
                    border-radius: 6px;
                    background: #303030;
                    color: #fff;
                    padding: 8px 10px;
                    font: inherit;
                }
                .demo-uml-popup textarea {
                    resize: vertical;
                }
                .demo-uml-popup__footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    padding: 14px 0 0;
                    position: static;
                    width: 100%;
                    background: transparent;
                }
                .demo-uml-popup__footer .btn-group {
                    display: flex;
                    gap: 8px;
                }
                .demo-uml-popup__footer .btn {
                    min-height: 34px;
                    border: 0;
                    border-radius: 6px;
                    color: #fff;
                    padding: 0 14px;
                    cursor: pointer;
                }
                .demo-uml-popup__footer .cancel {
                    background: #3a3a3a;
                    border: 1px solid #555;
                }
                .demo-uml-popup__footer .save {
                    background: #2f7dd3;
                }
            </style>
            <div class="popup-sub-content">
                <form id="demo-uml-form-${this.id}" class="demo-uml-popup">
                    <h2>${escapeHtml(title)}</h2>
                    <label>
                        <span>Label</span>
                        <input name="label" value="${isNode ? 'New action' : 'New item'}" required>
                    </label>
                    <label>
                        <span>ID</span>
                        <input name="id" placeholder="${isNode ? 'new_action' : 'new_item'}">
                    </label>
                    ${isNode ? `
                        <label>
                            <span>Type</span>
                            <select name="type">
                                <option value="action_group" selected>Action group</option>
                                <option value="trigger">Trigger</option>
                            </select>
                        </label>
                        <label>
                            <span>Trigger type</span>
                            <select name="triggerTypes">
                                <option value="">None</option>
                                <option value="internal">Internal</option>
                                <option value="external">External</option>
                            </select>
                        </label>
                        <label>
                            <span>Items</span>
                            <textarea name="fields" rows="4" placeholder="id: Label">input: Input
result: Result</textarea>
                        </label>
                    ` : `
                        <label>
                            <span>Type</span>
                            <select name="type">
                                <option value="string" selected>String</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean</option>
                                <option value="object">Object</option>
                                <option value="array">Array</option>
                            </select>
                        </label>
                    `}
                </form>
            </div>
        `;
    }
}
