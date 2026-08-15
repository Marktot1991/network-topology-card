class NetworkTopologyCard extends HTMLElement {
    // รับค่า Config จาก YAML
    setConfig(config) {
        if (!config.router_sensor) {
            console.warn("Network Topology Card: 'router_sensor' is not defined in config.");
        }
        this.config = config;
    }

    // ฟังก์ชันนี้จะถูกเรียกทุกครั้งที่มีการอัปเดตสถานะ (State) ใน Home Assistant
    set hass(hass) {
        this._hass = hass;
        
        // สร้างโครงสร้าง DOM แค่ครั้งแรกครั้งเดียว
        if (!this.content) {
            this.card = document.createElement('ha-card'); 
            this.card.header = this.config.title || 'Smart Home Network Map'; 
            this.content = document.createElement('div');
            
            const style = document.createElement('style');
            style.textContent = `
                .topology-container { display: flex; flex-direction: column; align-items: center; width: 100%; padding-bottom: 20px; }
                
                /* ส่วนของ Router */
                .router-box { border: 2px solid var(--primary-color); border-radius: 12px; padding: 15px 25px; text-align: center; background: var(--secondary-background-color, #f0f9ff); box-shadow: 0 4px 8px rgba(0,0,0,0.1); min-width: 250px; z-index: 2; margin-top: 10px; }
                .router-title { font-size: 16px; font-weight: bold; color: var(--primary-text-color); margin: 8px 0 4px 0; }
                .router-stats { font-size: 12px; color: var(--secondary-text-color); display: flex; flex-direction: column; gap: 3px; }
                .speed-text { color: var(--primary-color); font-weight: 600; }
                
                /* เส้นเชื่อมต่อแกนหลัก */
                .connection-line { width: 3px; height: 30px; background: var(--primary-color); }
                .horizontal-line { width: 90%; max-width: 800px; height: 3px; background: var(--primary-color); border-radius: 3px 3px 0 0; }
                
                /* กล่องบอกสถานะรวม */
                .network-summary { display: flex; justify-content: center; gap: 15px; margin-top: 15px; width: 100%; }
                .summary-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                .badge-total { background: var(--divider-color, #e0e0e0); color: var(--primary-text-color); }
                .badge-online { background: rgba(76, 175, 80, 0.2); color: #2e7d32; }
                .badge-offline { background: rgba(244, 67, 54, 0.2); color: #c62828; }

                /* บังคับ Grid สำหรับอุปกรณ์ ให้เรียง 4 แถว เสมอ */
                .devices-grid { 
                    display: grid; 
                    grid-template-columns: repeat(4, 1fr); 
                    gap: 12px; 
                    width: 100%; 
                    padding-top: 20px; 
                    box-sizing: border-box; 
                    padding-left: 16px; 
                    padding-right: 16px; 
                }
                
                /* ปรับขนาดอัตโนมัติเมื่อดูในมือถือ */
                @media only screen and (max-width: 800px) {
                    .devices-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media only screen and (max-width: 450px) {
                    .devices-grid { grid-template-columns: repeat(1, 1fr); }
                }

                .device-card { display: flex; align-items: center; padding: 10px; border: 1px solid var(--divider-color); border-radius: 10px; background: var(--card-background-color); transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                .device-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                
                /* สถานะจุด Online / Offline ใน Card */
                .status-indicator { width: 10px; height: 10px; border-radius: 50%; margin-right: 12px; flex-shrink: 0; }
                .status-on { background: #4caf50; box-shadow: 0 0 6px rgba(76,175,80,0.6); }
                .status-off { background: #f44336; }
                
                /* จัดระเบียบตัวหนังสือใน Card */
                .device-details { display: flex; flex-direction: column; overflow: hidden; }
                .device-name { font-size: 13px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
                .device-ip { font-size: 11px; color: var(--secondary-text-color); font-family: monospace; }
                .device-icon { margin-right: 8px; color: var(--paper-item-icon-color); }
                
                /* ตัวหนังสือสถานะ Connected / Disconnected ที่เพิ่มเข้ามาใหม่ */
                .status-text { font-size: 10px; font-weight: bold; margin-top: 2px; }
                .text-on { color: #4caf50; }
                .text-off { color: #f44336; }
            `;
            this.card.appendChild(style); 
            this.card.appendChild(this.content); 
            this.appendChild(this.card);
        }

        // ดึงข้อมูลและอัปเดตหน้าจอ
        if (!this.config || !this.config.devices) return;

        const getSensorData = (entityId) => {
            if (!entityId || !this._hass.states[entityId]) return null;
            return { 
                state: this._hass.states[entityId].state, 
                unit: this._hass.states[entityId].attributes.unit_of_measurement || '' 
            };
        };

        const routerIp = getSensorData(this.config.router_sensor)?.state || 'Unknown IP';
        const isp = getSensorData(this.config.isp_sensor)?.state || '-';
        const dl = getSensorData(this.config.download_sensor);
        const ul = getSensorData(this.config.upload_sensor);

        let extraRouterHtml = `<span class="router-stats">`;
        if (this.config.isp_sensor && isp !== '-') {
            extraRouterHtml += `<span>ISP: <b>${isp}</b> | IP: ${routerIp}</span>`;
        } else {
            extraRouterHtml += `<span>IP: ${routerIp}</span>`;
        }
        
        if (dl || ul) {
            extraRouterHtml += `<span class="speed-text" style="margin-top: 4px;">⬇️ ${dl?.state || 0} ${dl?.unit || 'Mbps'} &nbsp;|&nbsp; ⬆️ ${ul?.state || 0} ${ul?.unit || 'Mbps'}</span>`;
        }
        extraRouterHtml += `</span>`;

        let onlineCount = 0;
        let offlineCount = 0;
        let devicesHtml = '';

        this.config.devices.forEach(device => {
            const stateObj = this._hass.states[device.entity];
            const name = device.name || (stateObj ? stateObj.attributes.friendly_name : device.entity);
            const ip = device.ip || (stateObj && stateObj.attributes.ip_address ? stateObj.attributes.ip_address : '-');
            const stateText = stateObj ? stateObj.state.toLowerCase() : 'unknown';
            
            // เช็คสถานะการเชื่อมต่อ
            const isConnected = ['home', 'on', 'connected'].includes(stateText);
            if (isConnected) onlineCount++; else offlineCount++;
            
            const statusClass = isConnected ? 'status-on' : 'status-off';
            
            // ตัวแปรสำหรับข้อความ Connected / Disconnected ใต้เลข IP
            const connText = isConnected ? 'Connected' : 'Disconnected';
            const connTextClass = isConnected ? 'text-on' : 'text-off';

            const icon = device.icon || 'mdi:laptop';
            
            devicesHtml += `
                <div class="device-card">
                    <div class="status-indicator ${statusClass}"></div>
                    <div class="device-icon"><ha-icon icon="${icon}"></ha-icon></div>
                    <div class="device-details">
                        <span class="device-name" title="${name}">${name}</span>
                        <span class="device-ip">${ip}</span>
                        <span class="status-text ${connTextClass}">${connText}</span>
                    </div>
                </div>
            `;
        });

        this.content.innerHTML = `
            <div class="topology-container">
                <div class="router-box">
                    <ha-icon icon="mdi:router-wireless" style="--mdc-icon-size: 40px; color: var(--primary-color); margin-bottom: 5px;"></ha-icon>
                    <div class="router-title">Main Gateway</div>
                    ${extraRouterHtml}
                </div>
                
                <div class="connection-line"></div>
                <div class="horizontal-line"></div>
                
                <div class="network-summary">
                    <span class="summary-badge badge-total">Total: ${this.config.devices.length}</span>
                    <span class="summary-badge badge-online">Online: ${onlineCount}</span>
                    <span class="summary-badge badge-offline">Offline: ${offlineCount}</span>
                </div>

                <div class="devices-grid">
                    ${devicesHtml}
                </div>
            </div>
        `;
    }

    // กำหนดขนาดจำลองให้หน้าจอแก้ไขของ Home Assistant
    getCardSize() {
        return 4;
    }
}

customElements.define('network-topology-card', NetworkTopologyCard);

// เติมโค้ดด้านล่างนี้ต่อท้ายลงไป เพื่อลงทะเบียนให้โชว์ในหน้า UI Add Card
window.customCards = window.customCards || [];
window.customCards.push({
  type: "network-topology-card",
  name: "Network Topology", 
  description: "A custom card for displaying network topology and devices status.",
  preview: true // ให้แสดงหน้า Preview เวลาค้นหาเจอ
});
