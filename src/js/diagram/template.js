export const templateMethods = {
    render() {
        return `
                <div id="${this.ids.container}" class="scroll-area uml-diagram-container" style="position:relative;">
                    <div class="controls-wrap">
                        <div class="controls">
                            <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
    
                                <input id="${this.ids.searchInput}" type="text" class="form-control form-control-sm" placeholder="Find node (id/label)…"
                                   style="width:0px;opacity:0;pointer-events:none;
                                          padding:0;border:0;outline:none; color:black !important;
                                          transition:width .18s ease, opacity .18s ease;"/>
                                <button id="${this.ids.btnSearch}" class="btn btn-sm btn-light" title="Find node">
                                  <i class="bi bi-search"></i>
                                </button>
                            </div>
                            
                            <button id="${this.ids.btnAdd}" class="btn btn-sm btn-light"><i class="bi bi-plus-circle"></i></button>
                            <button id="${this.ids.btnIn}" class="btn btn-sm btn-light"><i class="bi bi-zoom-in"></i></button>
                            <button id="${this.ids.btnOut}" class="btn btn-sm btn-light"><i class="bi bi-zoom-out"></i></button>
                            <button id="${this.ids.btnReset}" class="btn btn-sm btn-light"><i class="bi bi-aspect-ratio"></i></button>
                        </div>
                    </div>
                    <div id="${this.ids.inner}" class="uml-diagram-inner">
                        <svg id="${this.ids.svg}" class="uml-diagram"></svg> 
                    </div>
                    <!-- Липкий нижний горизонтальный скролл (ШАГ 1) -->
                    <div class="uml-hbar uml-hbar--fixed" id="hbar-${this._uid}" style="position:fixed;bottom:0;left:0;width:100vw;visibility:hidden;">
                        <div class="uml-hbar-inner" id="hbar-inner-${this._uid}"></div>
                    </div>
    
                </div> `;
    }
};
