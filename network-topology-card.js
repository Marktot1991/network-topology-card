class NetworkTopologyCard extends HTMLElement {
    setConfig(config) { 
        if (!config.router_sensor) {
            console.warn("Network Topology Card: 'router_sensor' is not defined.");
        }
        this.config = config; 
    }

    set hass(hass) {
        this._hass = hass;
        // บังคับให้วาดทันทีเมื่อมีข้อมูลเข้ามา
        if (this.content) {
            this.render(); 
        }
    }

    connectedCallback() {
        if (!this.content) {
            this.card = document.createElement('ha-card'); 
            this.card.header = this.config.title || 'Home Network Topology'; 
            this.content = document.createElement('div');
            
            const style = document.createElement('style');
            style.textContent = `
                .topology-container { display: flex; flex-direction: column; align-items: center; width: 100%; position: relative; padding-bottom: 20px; }
                .router-box { border: 2px solid var(--primary-color); border-radius: 12px; padding: 15px 25px; text-align: center; background: var(--secondary-background-color, #f0f9ff); box-shadow: 0 4px 8px rgba(0,0,0,0.1); min-width: 250px; z-index: 2; position: relative; }
                .router-title { font-size: 16px; font-weight: bold; color: var(--primary-text-color); margin: 8px 0 4px 0; }
                .router-stats { font-size: 12px; color: var(--secondary-text-color); display: flex; flex-direction: column; gap: 3px; }
                .speed-text { color: var(--primary-color); font-weight: 600; }
                
                .network-summary { display: flex; justify-content: center; gap: 15px; margin: 15px 0; width: 100%; z-index: 2; position: relative; }
                .summary-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                .badge-total { background: var(--divider-color, #e0e0e0); color: var(--primary-text-color); }
                .badge-online { background: rgba(76, 175, 80, 0.2); color: #2e7d32; }
                .badge-offline { background: rgba(244, 67, 54, 0.2); color: #c62828; }
                
                .spine-top { width: 2px; height: 30px; background: var(--primary-color); margin: 0 auto; z-index: 0; }
                .tree-rows-container { width: 100%; display: flex; flex-direction: column; align-items: center; }
                .tree-row { position: relative; width: 100%; margin-bottom: 25px; }
                .tree-row::before { content: ''; position: absolute; top: 0; bottom: -25px; left: 50%; border-left: 2px solid var(--primary-color); z-index: 0; transform: translateX(-50%); }
                .tree-row:last-child::before { bottom: auto; height: 20px; } 
                
                .tree-row ul { padding-top: 20px; position: relative; display: flex; justify-content: center; margin: 0; padding-left: 0; z-index: 1; }
                .tree-row li { list-style-type: none; position: relative; padding: 20px 8px 0 8px; flex: 1; max-width: 240px; display: flex; justify-content: center; }
                .tree-row li::before, .tree-row li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 2px solid var(--primary-color); width: 50%; height: 20px; z-index: -1; }
                .tree-row li::after { right: auto; left: 50%; border-left: 2px solid var(--primary-color); }
                .tree-row li:only-child::before { display: none; }
                .tree-row li:only-child::after { border-top: none; width: 0; }
                .tree-row li:first-child::before, .tree-row li:last-child::after { border-top: 0 none; }
                
                .device-card { display: flex; align-items: center; padding: 12px; border: 1px solid var(--divider-color); border-radius: 12px; background: var(--card-background-color); width: 100%; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: transform 0.2s; z-index: 2; }
                .device-card:hover { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.1); }
                
                .status-indicator { width: 10px; height: 10px; border-radius: 50%; margin-right: 12px; flex-shrink: 0; }
                .status-on { background: #4caf50; box-shadow: 0 0 6px rgba(76,175,80,0.6); }
                .status-off { background: #f44336; }
                
                .device-details { display: flex; flex-direction: column; overflow: hidden; }
                .device-name { font-size: 13px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
                .device-ip { font-size: 11px; color: var(--secondary-text-color); font-family: monospace; }
                .device-icon { margin-right: 10px; display: flex; align-items: center; justify-content: center; color: var(--paper-item-icon-color); }
            `;
            this.card.appendChild(style); 
            this.card.appendChild(this.content); 
            this.appendChild(this.card);
            
            // ใช้ Event Resize ปกติเพื่อป้องกันการโหลด Error ในหน้า Preview ของ Home Assistant
            window.addEventListener('resize', () => {
                if (this._hass) this.render();
            });
        }
        
        if (this._hass) this.render();
    }

    render() {
        if (!this._hass || !this.config || !this.config.devices) return;
        
        const getSafeState = (entityId) => {
            if (!entityId || !this._hass.states[entityId]) return null;
            return {
                state: this._hass.states[entityId].state,
                unit: this._hass.states[entityId].attributes.unit_of_measurement || ''
            };
        };

        const routerData = getSafeState(this.config.router_sensor);
        const routerIp = routerData ? routerData.state : 'Unknown IP';
        
        const ispData = getSafeState(this.config.isp_sensor);
        const dlData = getSafeState(this.config.download_sensor);
        const ulData = getSafeState(this.config.upload_sensor);

        let extraRouterHtml = `<span class="router-stats">`;
        if (ispData) extraRouterHtml += `<span>ISP: <b>${ispData.state}</b> | IP: ${routerIp}</span>`;
        else extraRouterHtml += `<span>IP: ${routerIp}</span>`;
        
        if (dlData || ulData) {
            extraRouterHtml += `<span class="speed-text">⬇️ ${dlData?.state || 0} ${dlData?.unit || 'Mbps'} &nbsp;|&nbsp; ⬆️ ${ulData?.state || 0} ${ulData?.unit || 'Mbps'}</span>`;
        }
        extraRouterHtml += `</span>`;

        let onlineCount = 0; let offlineCount = 0;
        const deviceCardsHtml = [];

        this.config.devices.forEach(device => {
            const stateObj = this._hass.states[device.entity];
            const name = device.name || (stateObj ? stateObj.attributes.friendly_name : device.entity);
            const ip = device.ip || (stateObj && stateObj.attributes.ip_address ? stateObj.attributes.ip_address : '-');
            const stateText = stateObj ? stateObj.state.toLowerCase() : 'unknown';
            const isConnected = ['home', 'on', 'connected'].includes(stateText);
            
            if (isConnected) onlineCount++; else offlineCount++;
            
            deviceCardsHtml.push(`
                <li>
                    <div class="device-card">
                        <div class="status-indicator ${isConnected ? 'status-on' : 'status-off'}"></div>
                        <div class="device-icon"><ha-icon icon="${device.icon || 'mdi:laptop'}" size="22px"></ha-icon></div>
                        <div class="device-details">
                            <span class="device-name" title="${name}">${name}</span>
                            <span class="device-ip">${ip}</span>
                        </div>
                    </div>
                </li>
            `);
        });

        // ดึงความกว้างของการ์ด ถ้าไม่มีให้ใช้ค่าเริ่มต้น (ป้องกันจอดับในหน้า Preview)
        const currentWidth = this.clientWidth || 800;
        let cols = 5;
        if (currentWidth < 350) cols = 1;      
        else if (currentWidth < 600) cols = 2; 
        else if (currentWidth < 850) cols = 3; 
        else if (currentWidth < 1200) cols = 4; 

        // หั่นเป็นแถวๆ
        let rowsHtml = '';
        for (let i = 0; i < deviceCardsHtml.length; i += cols) {
            const chunk = deviceCardsHtml.slice(i, i + cols);
            rowsHtml += `<div class="tree-row"><ul>${chunk.join('')}</ul></div>`;
        }

        this.content.innerHTML = `
            <div class="topology-container">
                <div class="router-box">
                    <ha-icon icon="mdi:router-wireless" style="--mdc-icon-size: 40px; color: var(--primary-color);"></ha-icon>
                    <div class="router-title">Main Gateway</div>
                    ${extraRouterHtml}
                </div>
                <div class="network-summary">
                    <span class="summary-badge badge-total">Total: ${this.config.devices.length}</span>
                    <span class="summary-badge badge-online">Online: ${onlineCount}</span>
                    <span class="summary-badge badge-offline">Offline: ${offlineCount}</span>
                </div>
                <div class="spine-top"></div>
                <div class="tree-rows-container">
                    ${rowsHtml}
                </div>
            </div>
        `;
    }
}

customElements.define('network-topology-card', NetworkTopologyCard);
